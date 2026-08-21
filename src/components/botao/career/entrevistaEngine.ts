/**
 * Engine da Entrevista Coletiva pós-jogo (§6-§12 do mestre).
 *
 * A ENTREVISTA é a principal fonte narrativa da carreira:
 *   PARTIDA → RESULTADO → ENTREVISTA → IA/JORNALISTA → CONTEXTO → MEMÓRIA →
 *   CONSEQUÊNCIAS.
 *
 * Regras embutidas aqui:
 *  - O jornalista (Cícero Ramos) é uma PERSONAGEM-IA com identidade própria,
 *    que consulta APENAS os dados reais permitidos para sua função (§31:
 *    escopo de dados).
 *  - A IA nunca inventa fatos estruturais (§30): placar, adversário e posição
 *    vêm do estado real; a IA interpreta, o sistema registra.
 *  - Declarações livres do jogador são interpretadas (provocação, humildade,
 *    orgulho) e viram memória narrativa persistente (§5, §11), capaz de gerar
 *    consequências futuras (§12: rival responde, imprensa recupera, torcida
 *    comenta).
 */

import type {
  CareerState,
  ConversaCelular,
  DeclaracaoEntrevista,
  EntrevistaRegistro,
  EventoNarrativo,
  Headline,
} from "./types";
import { AIService } from "../ai/AIService";
import { anexarPost, gerarPostManual } from "./rpg/socialEngine";
import { memoriaRpg } from "./rpg/rpgEngine";
import { personagem, relacaoInicial } from "./rpg/personagens";
import type { NpcId } from "./rpg/types";

/* ---------------------------------------------------------------- */
/* Contexto escopado: o que o jornalista tem permissão de saber.    */
/* ---------------------------------------------------------------- */

export interface DadosEntrevista {
  placarUser: number;
  placarAdv: number;
  timeUserNome: string;
  timeAdvNome: string;
  competicao: string;
  rodada: string;
}

/**
 * Monta o prompt de contexto do jornalista com APENAS os dados da partida, a
 * situação esportiva e as declarações passadas do treinador — nunca o banco
 * inteiro (§31 privacidade/escopo de dados).
 */
export function contextoJornalista(career: CareerState, dados: DadosEntrevista): string {
  const partes: string[] = [
    `Partida: ${dados.timeUserNome} ${dados.placarUser}x${dados.placarAdv} ${dados.timeAdvNome}`,
    `Competição: ${dados.competicao} (${dados.rodada})`,
    `Resultado: ${dados.placarUser > dados.placarAdv ? "vitória" : dados.placarUser < dados.placarAdv ? "derrota" : "empate"}`,
    `Temporada ${career.temporada}, rodada ${career.rodadaAtual}, divisão ${career.divisao}`,
    `Moral do elenco: ${career.moralTime}/100`,
  ];
  // Declarações passadas que o jornalista HOJE conhece (só declaracoes).
  const declaracoes = (career.memoriaNarrativa ?? [])
    .filter((e) => e.tipo === "declaracao")
    .slice(0, 4);
  if (declaracoes.length > 0) {
    partes.push("Declarações anteriores que você conhece:");
    for (const d of declaracoes) {
      partes.push(`- ${d.evento} (${d.interpretacao ?? "registro"})`);
    }
  }
  return partes.join("\n");
}

/** Fallback procedural: perguntas de coletiva (voz do jornalista). */
const PERGUNTAS_FALLBACK = [
  "—Como o senhor explica esse placar ao torcedor que paga seu salário?",
  "—O resultado foi consequência do seu trabalho ou do acaso, treinador?",
  "—Tem algum recado para o próximo adversário, ou joga só com a bola?",
  "—O banco ouviu gritos ao final. Tem realmente o controle do grupo?",
  "—O {adv} merecia esse resultado? Responda sem xadrez de microfone.",
];

/** Gera a próxima pergunta do jornalista (IA persona > fallback procedural). */
export async function gerarPerguntaJornalista(
  career: CareerState,
  dados: DadosEntrevista,
): Promise<string> {
  const coach = career.coach.apelido || career.coach.nome || "treinador";
  const persona = personagem("npc-jornalista");
  const fallback = () =>
    PERGUNTAS_FALLBACK[Math.floor(Math.random() * PERGUNTAS_FALLBACK.length)]!
      .replace("{adv}", dados.timeAdvNome)
      .replace("{coach}", coach);
  try {
    const resposta = await AIService.generatePersona(
      persona.systemPrompt,
      `Você entrevista ${coach}. Contexto escopado:\n${contextoJornalista(career, dados)}` +
        `\nFaça UMA pergunta de coletiva (não repetir manchete).`,
    );
    if (resposta) return resposta;
    return fallback();
  } catch {
    return fallback();
  }
}

/* ---------------------------------------------------------------- */
/* Interpretação de texto livre (§11).                              */
/* ---------------------------------------------------------------- */

const PALAVRAS_PROVOCACAO = [
  "fala demais",
  "fácil",
  "facil",
  "time pequeno",
  "não conseguiram",
  "não faz nada",
  "entregou",
  "humilhamos",
  "passei",
  "brincadeira",
  "amadores",
  "chorar",
  "escola",
  "se entrega",
  "não tembal",
];
const PALAVRAS_HUMILDADE = [
  "mérito do grupo",
  "trabalho",
  "honra",
  "respeito",
  "aprendemos",
  "grupo",
  "elenco",
  "humildade",
  "diretor",
  "graças",
  "crédito",
  "torcida",
  "esforço",
];
const PALAVRAS_ORGULHO = [
  "somos os melhores",
  "o melhor",
  "histeria",
  "melhor time",
  "obrigado",
  "gigante",
  "máquina",
  "talento puro",
  "histórico",
  "ideal",
];

/**
 * Interpreta o texto livre do jogador: classifica o tom, decide a importância
 * narrativa e devolve a interpretação usada nas memórias futuras. Não inventa
 * fatos — o texto real do jogador é a única fonte.
 */
export function interpretarDeclaracao(
  texto: string,
  dados: DadosEntrevista,
): DeclaracaoEntrevista {
  const t = texto.toLowerCase();
  const contem = (lista: string[]) => lista.some((p) => t.includes(p));
  const mencionaRival =
    dados.timeAdvNome && t.includes(dados.timeAdvNome.toLowerCase().split(" ")[0]!);

  let tom: DeclaracaoEntrevista["tom"] = "neutro";
  if (contem(PALAVRAS_PROVOCACAO) || (mencionaRival && contem(PALAVRAS_PROVOCACAO))) {
    tom = "provocacao";
  } else if (contem(PALAVRAS_ORGULHO)) {
    tom = "orgulho";
  } else if (contem(PALAVRAS_HUMILDADE)) {
    tom = "humildade";
  }

  const importancia: DeclaracaoEntrevista["importancia"] =
    tom === "provocacao" ? "alta" : tom === "neutro" ? "baixa" : "media";

  const interpretacao =
    tom === "provocacao"
      ? mencionaRival
        ? `Provocação direta ao ${dados.timeAdvNome}`
        : "Provocação com possível repercussão pública"
      : tom === "orgulho"
        ? "Declaração de orgulho/elogio ao próprio elenco"
        : tom === "humildade"
          ? "Declaração de humildade — ressalta grupo e torcida"
          : "Declaração neutra";

  return { texto: texto.trim(), interpretacao, tom, importancia };
}

/* ---------------------------------------------------------------- */
/* Registro, memória e consequências (§5, §12, §26).                */
/* ---------------------------------------------------------------- */

/** Registra a entrevista no histórico e transforma declarações em memória.
 *  Idempotente por `partidaId` (§9): mesma partida nunca duplica registro. */
export function registrarEntrevista(
  career: CareerState,
  registro: EntrevistaRegistro,
): CareerState {
  const jaExiste = (career.entrevistas ?? []).some((e) => e.partidaId === registro.partidaId);
  if (jaExiste) return career;
  const memoriaNova: EventoNarrativo[] = registro.declaracoes.map((d, i) => ({
    id: `mem-${registro.id}-${i}`,
    tipo: "declaracao",
    npc: "npc-jornalista",
    evento: `Na coletiva (${registro.competicao}): "${d.texto.slice(0, 200)}"`,
    interpretacao: d.interpretacao,
    importancia: d.importancia,
    rodada: registro.rodada,
    temporada: registro.temporada,
  }));

  return {
    ...career,
    entrevistas: [registro, ...(career.entrevistas ?? [])].slice(0, 30),
    memoriaNarrativa: [...memoriaNova, ...(career.memoriaNarrativa ?? [])].slice(0, 40),
  };
}

/**
 * Consequências da entrevista (§12, §26): avalia as declarações registradas e
 * devolve o career atualizado + uma lista de REAÇÕES de personagens (rival,
 * torcida, dirigente) a serem entregues no celular, uma por vez.
 */
export function consequenciasEntrevista(
  career: CareerState,
  dados: DadosEntrevista,
): { career: CareerState; reacoes: ConversaCelular[] } {
  const ultima = career.entrevistas?.[0];
  const provocativas = ultima?.declaracoes.filter((d) => d.tom === "provocacao") ?? [];
  const coach = career.coach.apelido || career.coach.nome || "Treinador";
  const timestamp = Date.now();
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const reacoes: ConversaCelular[] = [];
  let atual = career;

  // Provocação → rival (Bragança) reage; headline e feed registra a imprensa.
  if (provocativas.length > 0 && ultima) {
    const citada = provocativas[0]!;
    const mem = memoriaRpg(atual);
    const scoreBraganca = Math.max(
      -100,
      (mem.relacoes["npc-braganca"] ?? relacaoInicial("npc-braganca")) - 12,
    );
    const braganca = personagem("npc-braganca");

    reacoes.push({
      // Id estável por NPC + mensagem determinística por partida: a fila mescla
      // na conversa única do Bragança e retry não duplica a mensagem.
      id: "conv-npc-npc-braganca",
      tipo: "narrativa",
      nome: braganca.nome,
      avatar: braganca.avatar,
      cargo: `${braganca.cargo} · repercussão`,
      npcId: "npc-braganca",
      mensagens: [
        {
          id: `react-rival-m-${ultima.partidaId}`,
          texto:
            `Li sua coletiva, professor. "${citada.texto.slice(0, 120)}" — anota. ` +
            `Na próxima você senta de novo comigo, mas sem os provociantes.`,
          remetente: "outro",
          timestamp: time,
        },
      ],
      naoLida: true,
    });

    const postDecl = gerarPostManual(atual, {
      autor: "Gazeta da Cidadela",
      avatar: "📰",
      selo: "noticia",
      texto:
        `POLEMISSA NA COLETIVA: ${coach} diz "${citada.texto.slice(0, 140)}" ` +
        `após o ${dados.timeUserNome} ${dados.placarUser}x${dados.placarAdv} ${dados.timeAdvNome}. ` +
        `A ${citada.importancia === "alta" ? "repercussão é alta" : "imprensa repercutiu"}.`,
    });
    atual = anexarPost(atual, postDecl);

    const manchete: Headline = {
      id: `head-prov-${timestamp}`,
      manchete: "Treinador provoca adversário na coletiva",
      subtitulo: `"${citada.texto.slice(0, 110)}"`,
      tag: "polemica",
      rodada: atual.rodadaAtual,
    };

    atual = {
      ...atual,
      memoriaRpg: { ...mem, relacoes: { ...mem.relacoes, "npc-braganca": scoreBraganca } },
      headlines: [manchete, ...atual.headlines].slice(0, 12),
      memoriaNarrativa: [
        {
          id: `mem-react-${timestamp}`,
          tipo: "reacao",
          npc: "npc-braganca",
          evento: "Rival respondeu à provocação da coletiva",
          interpretacao: "Rivalidade aumentou com o Bragança",
          importancia: "alta",
          rodada: atual.rodadaAtual,
          temporada: atual.temporada,
        },
        ...(atual.memoriaNarrativa ?? []),
      ],
    };
  }

  // Humildade/outra reação do torcedor (apenas se nada de provocação).
  const humildade = ultima?.declaracoes.some((d) => d.tom === "humildade" || d.tom === "orgulho");
  if (provocativas.length === 0 && humildade && ultima) {
    const torcedor = personagem("npc-torcedor");
    reacoes.push({
      // Id estável por NPC + mensagem determinística por partida (mesma regra
      // da reação do rival): uma conversa só da torcida, sem duplicar em retry.
      id: "conv-npc-npc-torcedor",
      tipo: "evento",
      nome: torcedor.nome,
      avatar: torcedor.avatar,
      cargo: torcedor.cargo,
      npcId: "npc-torcedor" as NpcId,
      mensagens: [
        {
          id: `react-torcida-m-${ultima.partidaId}`,
          texto:
            "É pra isso que a arquibancada tá aqui, professor! Coletiva bonita, " +
            "resposta bonita. VAMO!",
          remetente: "outro",
          timestamp: time,
        },
      ],
      naoLida: true,
    });
  }

  return { career: atual, reacoes };
}

/** Memória escopada a um personagem para contexto futuro (§5, §31). */
export function memoriaDoPersonagem(career: CareerState, npc: NpcId): EventoNarrativo[] {
  return (career.memoriaNarrativa ?? []).filter((e) => e.tipo === "declaracao" || e.npc === npc);
}
