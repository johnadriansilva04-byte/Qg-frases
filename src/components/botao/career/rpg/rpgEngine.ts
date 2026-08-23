/**
 * Motor de eventos narrativos da Cidadela.
 *
 * O SISTEMA decide QUANDO um evento dispara (gatilhos em estado real: soberania,
 * moral, derrotas seguidas, segredos pendentes). A IA só narra. Escolhas têm
 * efeitos reais aplicados pelo sistema — nunca por texto da LLM.
 */

import type { CareerState, ConversaCelular } from "../types";
import { anexarConversa } from "../conversasEngine";
import { eventoPorId, EVENTOS_RPG } from "./eventos";
import {
  cargoValeria,
  personagem,
  relacaoInicial,
  respostaProcedural,
} from "./personagens";
import {
  MEMORIA_INICIAL,
  type EscolhaRpg,
  type EventoRpg,
  type MemoriaRpg,
  type NpcId,
} from "./types";
import { AIService } from "@/components/botao/ai/AIService";

const ESPACAMENTO_EVENTOS = 3; // mínimo de rodadas entre eventos RPG

export function memoriaRpg(career: CareerState): MemoriaRpg {
  return career.memoriaRpg ?? MEMORIA_INICIAL;
}

function relacaoAtual(mem: MemoriaRpg, npc: NpcId): number {
  return mem.relacoes[npc] ?? relacaoInicial(npc);
}

/** Avalia se algum gatilho deve disparar um evento neste momento. */
function selecionarEvento(career: CareerState): EventoRpg | null {
  const mem = memoriaRpg(career);
  if (career.rodadaAtual - mem.ultimaRodadaEvento < ESPACAMENTO_EVENTOS) return null;

  // 1. Segredos vencidos têm prioridade máxima ("aquela noite" volta a cobrar)
  const segredoVencido = mem.segredos.find(
    (s) => !s.cobrado && career.rodadaAtual >= s.cobraEmRodada,
  );
  if (segredoVencido && !mem.eventosVistos.includes("aquela-noite")) {
    return eventoPorId("aquela-noite") ?? null;
  }

  // 2. A apresentação da Valéria é um GATILHO de rodada (uma vez só) — ela
  // não existe na vida do treinador antes disso, e o vínculo é conquistado.
  const relacaoValeria = relacaoAtual(mem, "npc-valeria");
  if (career.rodadaAtual >= 2 && !mem.eventosVistos.includes("encontro-valeria")) {
    return eventoPorId("encontro-valeria") ?? null;
  }
  // Jantar de oficialização: só quando o vínculo já existe e ainda não virou
  // namoro — nunca repetido.
  if (
    mem.eventosVistos.includes("encontro-valeria") &&
    relacaoValeria >= 30 &&
    relacaoValeria < 60 &&
    !mem.eventosVistos.includes("jantar-valeria")
  ) {
    return eventoPorId("jantar-valeria") ?? null;
  }

  // 3. Gatilhos de estado real
  const sov = career.coach.sov;
  const moral = career.moralTime;

  const candidatos: string[] = [];
  if (sov < 30) candidatos.push("divida-corretor");
  // O "seguidor" só faz sentido quando a Valéria já é próxima do treinador.
  if (mem.derrotasSeguidas >= 3) {
    candidatos.push("demissao-sombra");
    if (relacaoValeria >= 40) candidatos.push("seguidor");
  }
  if (moral < 30) candidatos.push("vestiario-mudo");
  if (sov >= 30 && sov < 120) candidatos.push("proposta-dario");
  if (mem.derrotasSeguidas === 0 && career.rodadaAtual >= 4) candidatos.push("festa-convite");
  if (mem.segredos.length > 0) candidatos.push("mae-preocupada");
  // Folda do Cartório: vínculo formal, defesa e quitação de multa via documento.
  if (career.rodadaAtual >= 2) candidatos.push("contrato-pendente");
  if (career.rodadaAtual >= 3) candidatos.push("peticao-necessaria");
  if (career.rodadaAtual >= 5) candidatos.push("multa-judicial");

  const novos = candidatos.filter((id) => !mem.eventosVistos.includes(id));
  if (novos.length === 0) return null;
  const escolhido = novos[Math.floor(Math.random() * novos.length)]!;
  return eventoPorId(escolhido) ?? null;
}

/** Converte o evento em conversa de celular com escolhas clicáveis. */
function eventoParaConversa(evento: EventoRpg): ConversaCelular {
  const npc = personagem(evento.remetente);
  return {
    // Id estável por NPC + npcId: o merge (anexarConversa) entrega o dilema na
    // conversa EXISTENTE do personagem — nunca cria outra conversa dele.
    id: `conv-npc-${evento.remetente}`,
    tipo: "narrativa",
    nome: npc.nome,
    avatar: npc.avatar,
    cargo: `${npc.cargo} · ${evento.titulo}`,
    npcId: evento.remetente,
    mensagens: [
      {
        // Id determinístico por evento: reprocessar o mesmo evento não duplica
        // a mensagem (dedupe por id no merge).
        id: `rpg-m-${evento.id}`,
        texto: evento.texto,
        remetente: "outro",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    naoLida: true,
    eventoRpg: { eventoId: evento.id, respondido: false, tom: evento.tom },
  };
}

/**
 * Processa os gatilhos após uma partida/rodada. Retorna a career atualizada
 * (com a mensagem do evento anexada à conversa do NPC) ou null se nada disparou.
 */
export function processarEventosRpg(career: CareerState): CareerState | null {
  const evento = selecionarEvento(career);
  if (!evento) return null;

  const mem = memoriaRpg(career);
  const comConversa = anexarConversa(career, eventoParaConversa(evento));
  return {
    ...comConversa,
    memoriaRpg: {
      ...mem,
      eventosVistos: [...mem.eventosVistos, evento.id],
      ultimaRodadaEvento: career.rodadaAtual,
    },
  };
}

/** Atualiza contadores de sequência (derrotas) — chamado após cada partida. */
export function atualizarSequenciaRpg(
  career: CareerState,
  resultado: "vitoria" | "empate" | "derrota",
): CareerState {
  const mem = memoriaRpg(career);
  return {
    ...career,
    memoriaRpg: {
      ...mem,
      derrotasSeguidas: resultado === "derrota" ? mem.derrotasSeguidas + 1 : 0,
    },
  };
}

/** Aplica a escolha do jogador num evento RPG pendente. */
export function aplicarEscolhaRpg(
  career: CareerState,
  conversaId: string,
  indiceEscolha: number,
): { career: CareerState; desfecho: string } {
  const conversa = career.conversas.find((c) => c.id === conversaId);
  const evento = conversa?.eventoRpg ? eventoPorId(conversa.eventoRpg.eventoId) : undefined;
  const escolha: EscolhaRpg | undefined = evento?.escolhas[indiceEscolha];
  if (!conversa || !evento || !escolha) {
    return { career, desfecho: "A noite seguiu em silêncio." };
  }

  const mem = memoriaRpg(career);
  const e = escolha.efeitos;

  const relacoes = { ...mem.relacoes };
  if (e.relacao) {
    const atual = relacaoAtual(mem, e.relacao.npc);
    relacoes[e.relacao.npc] = Math.max(-100, Math.min(100, atual + e.relacao.delta));
  }

  const segredos = [...mem.segredos];
  if (e.segredo) {
    segredos.push({
      id: `seg-${Date.now()}`,
      rodada: career.rodadaAtual,
      cobrado: false,
      descricao: e.segredo.descricao,
      cobraEmRodada: career.rodadaAtual + e.segredo.cobraEmRodada,
    });
  }
  // Evento de cobrança consumido: marca segredos vencidos como cobrados
  if (evento.id === "aquela-noite") {
    for (const s of segredos) {
      if (!s.cobrado && career.rodadaAtual >= s.cobraEmRodada) s.cobrado = true;
    }
  }

  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const msgTimestamp = Date.now();
  const scoreValeria = relacoes["npc-valeria"] ?? relacaoAtual(mem, "npc-valeria");
  const conversas = career.conversas.map((c) => {
    // O vínculo com a Valéria evolui com as escolhas: o rótulo da conversa
    // acompanha (Conhecida → Amiga → Namorada). Nunca começa como namorada.
    const cargoDinamico = c.npcId === "npc-valeria" ? cargoValeria(scoreValeria) : c.cargo;
    return c.id === conversaId
      ? {
          ...c,
          cargo: cargoDinamico,
          naoLida: false,
          eventoRpg: c.eventoRpg ? { ...c.eventoRpg, respondido: true } : c.eventoRpg,
          mensagens: [
            ...c.mensagens,
            { id: `rpg-r-${Date.now()}`, texto: escolha.texto, remetente: "eu" as const, timestamp },
            { id: `rpg-d-${Date.now()}`, texto: escolha.desfecho, remetente: "outro" as const, timestamp },
          ],
        }
      : { ...c, cargo: cargoDinamico };
  });

  // Dívida permitida: escolhas com custo podem levar o saldo a negativo.
  const sov = career.coach.sov + (e.sov ?? 0);
  const moral = Math.max(0, Math.min(100, career.moralTime + (e.moral ?? 0)));

  const novo: CareerState = {
    ...career,
    coach: { ...career.coach, sov },
    moralTime: moral,
    bonusProximaPartida: career.bonusProximaPartida + (e.bonusPoder ?? 0),
    woProximaPartida: career.woProximaPartida || e.wo === true,
    desfalqueBotaoProxima: (career.desfalqueBotaoProxima ?? 0) + (e.desfalqueBotao ?? 0),
    conversas,
    memoriaRpg: { ...mem, relacoes, segredos },
    headlines: [
      {
        id: `rpg-${evento.id}-${msgTimestamp}`,
        manchete: evento.titulo,
        subtitulo: escolha.desfecho.slice(0, 120),
        tag: "polemica" as const,
        rodada: career.rodadaAtual,
      },
      ...career.headlines,
    ].slice(0, 12),
  };
  return { career: novo, desfecho: escolha.desfecho };
}

/**
 * Resposta em tempo real de um NPC no celular: tenta a LLM local com a
 * persona do personagem; se indisponível, usa o banco procedural por faixa
 * de relacionamento. Retorna a career atualizada com a resposta anexada.
 */
export async function responderContatoNpc(
  career: CareerState,
  conversaId: string,
  textoJogador: string,
): Promise<CareerState> {
  const conversa = career.conversas.find((c) => c.id === conversaId);
  if (!conversa || !conversa.npcId) return career;

  const npcId = conversa.npcId;
  const npc = personagem(npcId);
  const mem = memoriaRpg(career);
  const score = relacaoAtual(mem, npcId);

  let resposta: string | null = null;
  try {
    resposta = await AIService.generatePersona(
      npc.systemPrompt,
      `Você fala com ${career.coach.nome}, treinador. ` +
        `Situação: rodada ${career.rodadaAtual}, moral do elenco ${career.moralTime}/100, ` +
        `sov ${career.coach.sov} SOV, relacionamento com você: ${score}/100.\n` +
        `O treinador disse: "${textoJogador}"`,
    );
  } catch {
    resposta = null;
  }
  if (!resposta) resposta = respostaProcedural(npcId, score);

  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const msgTimestamp = Date.now();
  const conversas = career.conversas.map((c) =>
    c.id === conversaId
      ? {
          ...c,
          mensagens: [
            ...c.mensagens,
            { id: `npc-${msgTimestamp}`, texto: resposta!, remetente: "outro" as const, timestamp },
          ],
        }
      : c,
  );
  return { ...career, conversas };
}

/**
 * Garante os contatos-base do RPG na primeira vez que a carreira abre o
 * celular. Idempotente POR CONTATO: só cria a conversa de quem ainda não
 * existe (id estável `conv-npc-{npc}`) — nunca duplica um contato, mesmo
 * rodando a cada hidratação.
 */
export function garantirContatosRpg(career: CareerState): CareerState {
  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  // A Valéria NÃO é contato inicial: o jogador a conhece pelo evento
  // "encontro-valeria" (gatilho de rodada) e conquista o vínculo jogando.
  const iniciais: Array<{ npc: NpcId; msg: string }> = [
    {
      npc: "npc-donacida",
      msg: "Filho, sua mãe tá orgulhosa. Só cuida da saúde e fica longe de gente estranha, tá? Te amo.",
    },
    {
      npc: "npc-torcedor",
      msg: "BEM-VINDO, PROFESSOR! A arquibancada tá com você. Só não decepciona, hein! 📣",
    },
    {
      npc: "npc-pracinha",
      msg: "Olá, treinador! 🤖 Sou o Pracinha, guardião da Cidadela. Vou te avisar por aqui sobre missões, rituais e tudo o que a cidade mexer com o seu time.",
    },
  ];

  let atual = career;
  for (const { npc, msg } of iniciais) {
    // Contato já existe (por npcId, mesmo em conversa legada)? Não recria.
    if ((atual.conversas ?? []).some((c) => c.npcId === npc)) continue;
    const p = personagem(npc);
    atual = anexarConversa(atual, {
      id: `conv-npc-${npc}`,
      tipo: "narrativa" as const,
      nome: p.nome,
      avatar: p.avatar,
      cargo: p.cargo,
      npcId: npc,
      mensagens: [
        { id: `npc-i-${npc}`, texto: msg, remetente: "outro" as const, timestamp },
      ],
      naoLida: true,
    });
  }
  // Carreiras antigas tinham a Valéria criada como "Namorada" desde o início:
  // rebaixa o rótulo para o vínculo REAL da relação (a história das mensagens
  // é preservada — só o rótulo deixa de mentir).
  const scoreValeria = relacaoAtual(memoriaRpg(atual), "npc-valeria");
  const cargoReal = cargoValeria(scoreValeria);
  if ((atual.conversas ?? []).some((c) => c.npcId === "npc-valeria" && c.cargo !== cargoReal)) {
    atual = {
      ...atual,
      conversas: atual.conversas.map((c) =>
        c.npcId === "npc-valeria" ? { ...c, cargo: cargoReal } : c,
      ),
    };
  }
  return atual;
}

export { EVENTOS_RPG };
