/**
 * TRILHA INTEGRAÇÃO — a Trilha como válvula narrativa do Modo Carreira.
 *
 * Mesmo universo: a condição sombria do futebol (SOV < 30 OU 3+ derrotas
 * seguidas) convida o treinador ao Ritual da Trilha. Vencer na Trilha alivia
 * a sombra: +8 SOV, zera a sequência negativa e a Rede da Cidadela comenta.
 * A Trilha NÃO é um jogo à parte — ela lê e escreve no MESMO CareerState.
 */

import type { CareerState, ConversaCelular } from "./types";
import { anexarConversa } from "./conversasEngine";
import { anexarPost, gerarPostManual } from "./rpg/socialEngine";
import { memoriaRpg } from "./rpg/rpgEngine";
import { personagem } from "./rpg/personagens";

export type ResultadoTrilha = "vitoria" | "derrota" | "empate";

/** Flag deixada pela TrilhaGame ao terminar (mesma origem, sessionStorage). */
export const RITUAL_STORAGE_KEY = "trilha_ritual_pendente";

export interface RitualPendente {
  resultado: ResultadoTrilha;
  timestamp: number;
}

/** Condição narrativa: SOV baixo OU 3+ derrotas seguidas → a sombra chama. */
export function condicaoSombria(career: CareerState): boolean {
  const derrotas = career.memoriaRpg?.derrotasSeguidas ?? 0;
  return career.coach.sov < 30 || derrotas >= 3;
}

/** Marca (deixada pela TrilhaGame) informando que um ritual foi jogado. */
export function marcarRitualPendente(resultado: ResultadoTrilha): void {
  try {
    sessionStorage.setItem(
      RITUAL_STORAGE_KEY,
      JSON.stringify({ resultado, timestamp: Date.now() } satisfies RitualPendente),
    );
  } catch {
    // sem storage: o ritual simplesmente não integra — jogo segue
  }
}

/** Consome a marca (retorna null se não houver ou se estiver velha > 2h). */
export function consumirRitualPendente(): RitualPendente | null {
  try {
    const raw = sessionStorage.getItem(RITUAL_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RITUAL_STORAGE_KEY);
    const parsed = JSON.parse(raw) as RitualPendente;
    if (Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Aplica o efeito do ritual na carreira. Vitória limpa a sombra e rende SOV;
 * derrota não pune (a Trilha é válvula de escape, nunca armadilha).
 * Retorna deltaSov para registro no Banco Central SOV (nunca modifica coach.sov diretamente).
 */
export function aplicarRitualNaCarreira(
  career: CareerState,
  resultado: ResultadoTrilha,
): { career: CareerState; resumo: string; deltaSov: number } {
  const mem = memoriaRpg(career);
  const hoje = new Date().toISOString().slice(0, 10);
  const ritual = career.trilhaRitual?.ultimoDia === hoje ? career.trilhaRitual : { jogosHoje: 0, vitoriasHoje: 0, ultimoDia: hoje, pagasHoje: [] };

  const novoRitual = {
    ultimoDia: hoje,
    jogosHoje: ritual.jogosHoje + 1,
    vitoriasHoje: ritual.vitoriasHoje + (resultado === "vitoria" ? 1 : 0),
    pagasHoje: [...(ritual.pagasHoje ?? [])],
  };

  // Missões diárias da Trilha: paga o delta do que completou com ESTE ritual.
  const base: CareerState = { ...career, trilhaRitual: novoRitual };
  const completasAgora = missoesTrilha(base).filter(
    (m) => m.completa && !novoRitual.pagasHoje.includes(m.id),
  );
  let bonusMissoes = 0;
  for (const m of completasAgora) {
    bonusMissoes += m.recompensaSov;
    novoRitual.pagasHoje.push(m.id);
  }

  const eraSombria = condicaoSombria(career);
  const novo: CareerState = {
    ...base,
    moralTime: Math.min(100, (career.moralTime ?? 50) + (resultado === "vitoria" ? 4 : 0)),
    memoriaRpg: { ...mem, derrotasSeguidas: resultado === "vitoria" ? 0 : mem.derrotasSeguidas },
  };

  const comPost = anexarPost(
    novo,
    gerarPostManual(novo, {
      autor: "Zé do Arquibanco",
      avatar: "📣",
      selo: "torcedor",
      texto: eraSombria
        ? `O TÉCNICO FOI À TRILHA E VOLTOU OUTRO. O clube respira. 90 minutos de tabuleiro valeram mais que mil reuniões. SOMBRAS, PODEM RECUAR.`
        : `Ritual da Trilha cumprido com vitória. O treinador sabe buscar paz onde o futebol não dá.`,
    }),
  );

  const deltaSov = resultado === "vitoria" ? 8 + bonusMissoes : bonusMissoes;
  return {
    career: comPost,
    resumo:
      resultado === "vitoria"
        ? eraSombria
          ? `Vitória no ritual: a sombra recuou (+${deltaSov} SOV, sequência negativa zerada).`
          : `Vitória no ritual da Trilha (+${deltaSov} SOV).`
        : bonusMissoes > 0
          ? `Ritual jogado: missão da Trilha completa (+${deltaSov} SOV).`
          : "O ritual não aliviou a sombra desta vez. A Trilha aguarda sua volta.",
    deltaSov,
  };
}

/** Texto de convite exibido no hub quando a sombra está ativa. */
export function conviteTrilha(career: CareerState): string {
  const derrotas = career.memoriaRpg?.derrotasSeguidas ?? 0;
  if (career.coach.sov < 30 && derrotas >= 3) {
    return "Os cofres gemem e o vestiário emudeceu. Os mais antigos dizem: quando tudo fecha, a Trilha abre. Jogue o ritual — vencer lá alivia a sombra aqui.";
  }
  if (derrotas >= 3) {
    return `${derrotas} derrotas seguidas. A torcida sussurra que você precisa de outro tabuleiro por uma noite. A Trilha aceita jogadores desesperados — e devolve treinadores mais leves.`;
  }
  return "SOV abaixo de 30. O Corretor sorri demais quando você passa. Antes que a sombra assine mais favores, jogue o ritual da Trilha.";
}

/**
 * Envia o convite do Ritual da Trilha como NOTIFICAÇÃO no celular do
 * treinador (mensagem do Pracinha), quando a sombra está ativa. Idempotente
 * por rodada: um convite por temporada/rodada, sem duplicar conversas.
 */
export function convidarRitualTrilha(career: CareerState): CareerState {
  if (!condicaoSombria(career)) return career;

  // Idempotente por rodada: a MENSAGEM tem id determinístico por
  // temporada/rodada — mesmo após reload (estado vem do JSONB) o convite não
  // se repete. E entra na conversa EXISTENTE do Pracinha (uma conversa por
  // contato), nunca numa conversa nova.
  const conviteId = `ritual-trilha-${career.temporada ?? 1}-r${career.rodadaAtual ?? 0}`;
  const mensagemId = `ritual-m-${conviteId}`;
  const conversas = Array.isArray(career.conversas) ? career.conversas : [];
  if (conversas.some((c) => c.mensagens.some((m) => m.id === mensagemId))) return career;

  const npc = personagem("npc-pracinha");
  const timestamp = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const mensagem =
    `${conviteTrilha(career)}\n\n` +
    `☾ Quando quiser, é só tocar no link abaixo: a Trilha fica na Cidadela. ` +
    `Vencer o ritual alivia a sombra: +8 de soberania e a sequência negativa zera.`;
  const conversa: ConversaCelular = {
    id: "conv-npc-npc-pracinha",
    tipo: "narrativa",
    nome: npc.nome,
    avatar: npc.avatar,
    cargo: `${npc.cargo} · Ritual da Trilha`,
    npcId: "npc-pracinha",
    mensagens: [{ id: mensagemId, texto: mensagem, remetente: "outro", timestamp }],
    naoLida: true,
    linkExterno: { rotulo: "☾ Jogar o Ritual da Trilha", to: "/cidadela" },
  };
  return anexarConversa(career, conversa);
}

/** Missões locais da Trilha (mescladas com as missões diárias do Pracinha). */
export interface MissaoTrilhaLocal {
  id: string;
  titulo: string;
  descricao: string;
  alvo: number;
  progresso: number;
  completa: boolean;
  recompensaSov: number;
}

export function missoesTrilha(career: CareerState): MissaoTrilhaLocal[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const ritual = career.trilhaRitual?.ultimoDia === hoje ? career.trilhaRitual : null;
  const jogos = ritual?.jogosHoje ?? 0;
  const vitorias = ritual?.vitoriasHoje ?? 0;
  return [
    {
      id: "trilha-jogar",
      titulo: "Jogar 1 partida na Trilha",
      descricao: "Os moradores da Cidadela alternam entre os dois tabuleiros. Mostre que você também domina a Trilha.",
      alvo: 1,
      progresso: Math.min(jogos, 1),
      completa: jogos >= 1,
      recompensaSov: 2,
    },
    {
      id: "trilha-vencer",
      titulo: "Vencer 1 partida na Trilha",
      descricao: "A vitória na Trilha reverbera no vestiário. A torcida gosta de treinador completo.",
      alvo: 1,
      progresso: Math.min(vitorias, 1),
      completa: vitorias >= 1,
      recompensaSov: 4,
    },
  ];
}
