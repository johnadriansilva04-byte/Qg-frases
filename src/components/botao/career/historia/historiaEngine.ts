/**
 * Engine da História Principal — a pesquisa de John Adrian (§8–§31, §38–§42).
 *
 * Regras duras:
 *  - O GATILHO de progressão é a ENTREVISTA pós-partida concluída (§20, §39).
 *    Quem pula a coletiva não avança a história naquele momento (§40) — a
 *    carreira, a economia e os demais sistemas seguem normalmente (§23).
 *  - Cada entrevista avança NO MÁXIMO um capítulo; idempotente por partidaId.
 *  - Toda decisão/progresso vira entrada no Narrative Ledger persistido no
 *    CareerState (§29, §30) — sair e voltar não perde nada.
 *  - A tese nunca é revelada de início (§11, §27): mensagens crípticas,
 *    fragmentos parciais, a conexão é montada pelo jogador.
 *  - Engine puro (sem IO): o chamador (BotaoGame) persiste, entrega as
 *    conversas na fila do celular e registra a recompensa no SOV Bank.
 */

import type { CareerState, ConversaCelular, DeclaracaoEntrevista } from "../types";
import type { NpcId } from "../rpg/types";
import { personagem } from "../rpg/personagens";
import {
  CAPITULO_DESFECHO,
  HISTORIA_INICIAL,
  type DecisaoHistoria,
  type HistoriaState,
  type PerfilDecisao,
  type PosicaoFinal,
} from "./types";
import { pergaminhosDoCapitulo, pergaminhoPorId } from "./pergaminhos";

/** Recompensa por capítulo de investigação (SOV) — discreta no extrato (§31). */
const RECOMPENSA_CAPITULO = 15;
const RECOMPENSA_DESFECHO = 40;

export function historia(career: CareerState): HistoriaState {
  return career.historia ?? HISTORIA_INICIAL;
}

/** Acumula o perfil de decisão a partir dos tons das respostas (§21). */
function acumularPerfil(perfil: PerfilDecisao, declaracoes: DeclaracaoEntrevista[]): PerfilDecisao {
  const p = { ...perfil };
  for (const d of declaracoes) {
    if (d.tom === "provocacao") p.confronto += 1;
    else if (d.tom === "humildade") p.prudencia += 1;
    else if (d.tom === "orgulho") p.curiosidade += 1;
    else p.ceticismo += 1;
  }
  return p;
}

/** Traço dominante do perfil — varia o TOM da revelação, nunca uma moralidade. */
export function tracoDominante(perfil: PerfilDecisao): keyof PerfilDecisao {
  const entradas = Object.entries(perfil) as Array<[keyof PerfilDecisao, number]>;
  entradas.sort((a, b) => b[1] - a[1]);
  return entradas[0]?.[0] ?? "curiosidade";
}

function entradaLedger(
  capitulo: number,
  sourceEvent: string,
  playerChoice: string,
  consequencia: string,
  proximo: number,
): DecisaoHistoria {
  return {
    decisaoId: `dec-${sourceEvent}-${Date.now()}`,
    capitulo,
    sourceEvent,
    playerChoice,
    timestamp: new Date().toISOString(),
    consequencia,
    nextState: `capitulo:${proximo}`,
  };
}

function conversaDoNpc(
  npcId: NpcId,
  texto: string,
  seloCargo: string,
  partidaId: string,
): ConversaCelular {
  const npc = personagem(npcId);
  const ts = Date.now();
  return {
    id: `hist-${npcId}-${partidaId}`,
    tipo: "narrativa",
    nome: npc.nome,
    avatar: npc.avatar,
    cargo: `${npc.cargo} · ${seloCargo}`,
    npcId,
    mensagens: [
      {
        id: `hist-m-${ts}`,
        texto,
        remetente: "outro",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    naoLida: true,
  };
}

/** Linha de abertura da revelação variando pelo perfil acumulado (§21). */
function linhaDePerfil(perfil: PerfilDecisao): string {
  switch (tracoDominante(perfil)) {
    case "confronto":
      return "Suas coletivas dizem que você não foge de briga. Bom: o que eu pesquiso exige coragem de olhar.";
    case "prudencia":
      return "Você pesa cada palavra em público. É o cuidado certo para o que estou prestes a te mostrar.";
    case "ceticismo":
      return "Você não compra discurso fácil. Ótimo. Duvide de mim também — é assim que se testa uma ideia.";
    default:
      return "Você respondeu à imprensa com fome de entender o jogo. Talvez queira entender o que tem atrás dele.";
  }
}

type ResultadoGatilho = {
  career: CareerState;
  conversas: ConversaCelular[];
  /** SOV a registrar no SOV Bank pelo chamador (0 = sem progresso). */
  recompensaSov: number;
  /** Post críptico para a Rede (§26) — nunca revela a tese. */
  post?: { autor: string; avatar: string; selo: "noticia" | "rumor"; texto: string };
};

/**
 * O gatilho central (§20, §39): chamado SOMENTE quando o jogador conclui uma
 * entrevista pós-partida. Idempotente por partidaId — a mesma entrevista nunca
 * avança dois capítulos nem entrega o mesmo fragmento duas vezes.
 */
export function processarGatilhoEntrevista(
  career: CareerState,
  partidaId: string,
  declaracoes: DeclaracaoEntrevista[],
): ResultadoGatilho {
  const h = historia(career);
  if (h.entrevistasProcessadas.includes(partidaId)) {
    return { career, conversas: [], recompensaSov: 0 };
  }
  if (h.capitulo >= CAPITULO_DESFECHO) {
    // Arco concluído: a entrevista ainda conta para o perfil, mas não avança.
    const hFinal: HistoriaState = {
      ...h,
      perfil: acumularPerfil(h.perfil, declaracoes),
      entrevistasProcessadas: [...h.entrevistasProcessadas, partidaId].slice(-30),
    };
    return { career: { ...career, historia: hFinal }, conversas: [], recompensaSov: 0 };
  }

  const proximo = h.capitulo + 1;
  const perfil = acumularPerfil(h.perfil, declaracoes);
  const fragmentos = pergaminhosDoCapitulo(proximo);
  const novosIds = fragmentos.map((f) => f.id);

  // Mensageiro: Helena (Biblioteca) nos caps 1-3; John Adrian assume depois (§13).
  const mensageiro: NpcId = proximo <= 3 ? "npc-bibliotecaria" : "npc-john-adrian";
  const texto = mensagemDoCapitulo(proximo, perfil, career.coach.apelido || career.coach.nome);

  const entrada = entradaLedger(
    proximo,
    `entrevista:${partidaId}`,
    declaracoes.map((d) => d.texto.slice(0, 80)).join(" | ") || "(sem declarações)",
    `Capítulo ${proximo} revelado: ${fragmentos.map((f) => f.titulo).join(", ")}`,
    proximo,
  );

  const hNova: HistoriaState = {
    ...h,
    capitulo: proximo,
    perfil,
    pergaminhos: [...h.pergaminhos, ...novosIds],
    ledger: [entrada, ...h.ledger].slice(0, 60),
    entrevistasProcessadas: [...h.entrevistasProcessadas, partidaId].slice(-30),
    ultimoMensageiro: mensageiro,
  };

  const conversa = conversaDoNpc(
    mensageiro,
    texto,
    proximo >= CAPITULO_DESFECHO ? "arquivo aberto" : "um documento chamou sua atenção",
    partidaId,
  );

  // Notícia críptica (§26, §27): o mundo reage sem entregar o segredo.
  const post =
    proximo <= 3
      ? {
          autor: "Gazeta da Cidadela",
          avatar: "📰",
          selo: "noticia" as const,
          texto: `Bastidores: treinador foi visto na Biblioteca do Campus após a coletiva. A bibliotecária não comenta o assunto.`,
        }
      : {
          autor: "Correio do Campus",
          avatar: "🗞️",
          selo: "rumor" as const,
          texto: `Circula no Campus a informação de que um pesquisador procurou o treinador. Ninguém confirma. Ninguém nega.`,
        };

  return {
    career: { ...career, historia: hNova },
    conversas: [conversa],
    recompensaSov: RECOMPENSA_CAPITULO,
    post,
  };
}

/**
 * Desfecho do primeiro arco (§28): disponível no Arquivo quando todos os
 * fragmentos foram reunidos. O jogador registra sua posição — NUNCA há
 * conclusão dogmática; as três saídas são legítimas.
 */
export function registrarPosicaoFinal(
  career: CareerState,
  posicao: PosicaoFinal,
): ResultadoGatilho {
  const h = historia(career);
  if (h.capitulo < CAPITULO_DESFECHO || h.posicaoFinal) {
    return { career, conversas: [], recompensaSov: 0 };
  }

  const consequencia =
    posicao === "padrao_existe"
      ? "O jogador concluiu que as evidências sustentam a hipótese de um padrão."
      : posicao === "padrao_nao_existe"
        ? "O jogador concluiu que as evidências não sustentam a hipótese."
        : "O jogador concluiu que faltam evidências para decidir.";

  const entrada = entradaLedger(
    CAPITULO_DESFECHO,
    "arquivo:desfecho",
    `Posição final: ${posicao}`,
    consequencia,
    CAPITULO_DESFECHO,
  );

  const hNova: HistoriaState = {
    ...h,
    posicaoFinal: posicao,
    ledger: [entrada, ...h.ledger].slice(0, 60),
  };

  const john = conversaDoNpc(
    "npc-john-adrian",
    posicao === "padrao_existe"
      ? "Você viu o padrão. Agora a parte difícil: continue testando. Tese boa é tese que sobrevive a quem tenta derrubá-la."
      : posicao === "padrao_nao_existe"
        ? "Você pesou e discordou. Honesto. Guardar uma hipótese falsa é pior que descartá-la. Obrigado por ler até o fim."
        : "Não decidir ainda também é uma resposta de pesquisador. O arquivo fica aberto para quando as evidências mudarem.",
    "fim do primeiro arco",
    `desfecho-${Date.now()}`,
  );

  return {
    career: { ...career, historia: hNova },
    conversas: [john],
    recompensaSov: RECOMPENSA_DESFECHO,
  };
}

/** Fragmentos coletados (para o Arquivo), em ordem de capítulo. */
export function pergaminhosColetados(h: HistoriaState) {
  return h.pergaminhos
    .map((id) => pergaminhoPorId(id))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.capitulo - b.capitulo);
}

/**
 * Dica de progresso da investigação para a UI — VAGA de propósito (§27):
 * nunca menciona tese, eugenia ou o conteúdo dos próximos capítulos.
 */
export function dicaInvestigacao(h: HistoriaState): string {
  if (h.posicaoFinal) return "Primeiro arco concluído. O arquivo permanece aberto.";
  switch (h.capitulo) {
    case 0:
      return "Nada fora do comum. Por enquanto.";
    case 1:
      return "Um documento fora de lugar. Provavelmente não é nada.";
    case 2:
      return "As anotações falam de cidades e de quem decide o lugar de cada um.";
    case 3:
      return "Alguém estudava como histórias são esquecidas.";
    case 4:
      return "Os fragmentos começam a conversar entre si.";
    case 5:
      return "Resta a última página. O autor quer te encontrar.";
    default:
      return "Você tem todos os fragmentos. A pergunta final é sua.";
  }
}

function mensagemDoCapitulo(capitulo: number, perfil: PerfilDecisao, coach: string): string {
  const nome = coach || "treinador";
  switch (capitulo) {
    case 1:
      return (
        `${nome}, aqui é Helena, da Biblioteca do Campus. Aquele papel que ficou com você na ` +
        `saída da coletiva não é do acervo de esportes — é uma ficha antiga, fora de ordem. ` +
        `Guardei uma cópia para você no Arquivo. Estranho alguém catalogar aquilo assim.`
      );
    case 2:
      return (
        `Helena de novo. Descobri de onde veio a ficha: um lote de anotações de estudo sobre ` +
        `cidades — ruas, vizinhos, quem pertence aonde. Nada a ver com futebol. Deixei o ` +
        `fragmento no seu Arquivo.`
      );
    case 3:
      return (
        `Mais uma página do mesmo lote, ${nome}. Dessa vez sobre memória de guerra — brasileiros ` +
        `na Itália, e o que acontece com a lembrança deles. Alguém estava estudando como as ` +
        `histórias somem. O fragmento está no Arquivo.`
      );
    case 4:
      return (
        `${linhaDePerfil(perfil)} Meu nome é John Adrian, pesquisador do Campus. Os papéis que ` +
        `chegaram até você são meus cadernos. Dois fragmentos novos no seu Arquivo. Leia devagar: ` +
        `um é fato histórico, o outro é a minha hipótese. Não confunda os dois.`
      );
    case 5:
      return (
        `John Adrian. Duas fichas agora: uma sobre invenção, patente e financiamento; outra sobre ` +
        `uma alegação famosa que a justiça chamou de fraude. Ciência também é instituição — e ` +
        `instituições erram nos dois sentidos. Está tudo no Arquivo.`
      );
    default:
      return (
        `Última página do meu caderno, ${nome}. Não vou te entregar conclusão nenhuma — pesquisador ` +
        `que entrega resposta pronta está vendendo certeza, não verdade. Os fragmentos estão no seu ` +
        `Arquivo. A pergunta final é sua.`
      );
  }
}
