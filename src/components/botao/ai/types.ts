/**
 * Tipos compartilhados pelo AIService (voz central do jogo).
 *
 * O AIService é modular e expansível: o mesmo `generateText(context, promptType)`
 * atende ao Torneio Offline (prioritário) e pode ser reusado em outros modos.
 */

export type PromptType =
  | "comentarista"
  | "coletiva"
  | "medico"
  | "redes_sociais"
  | "noticia";

/**
 * Contexto real do jogo repassado à IA. Os nomes (time do jogador, adversário,
 * treinador) vêm da base Futebol SQL no Supabase — nunca hardcode.
 */
export interface AIContext {
  /** Nome/apelido do treinador do usuário. */
  coach?: string | undefined;
  /** Nome do time do usuário. */
  timeNome?: string | undefined;
  /** Nome do time vencedor (geral, para análises de outros jogos). */
  vencedor?: string | undefined;
  /** Nome do time perdedor. */
  perdedor?: string | undefined;
  /** Treinador do time vencedor. */
  coachVencedor?: string | undefined;
  /** Treinador do time perdedor. */
  coachPerdedor?: string | undefined;
  /** Gols marcados pelo usuário (ou time analisado). */
  golsPro?: number | undefined;
  /** Gols sofridos. */
  golsContra?: number | undefined;
  /** Diferença de gols (absoluta). */
  diff?: number | undefined;
  /** Rodada atual do Brasileirão. */
  rodada?: number | undefined;
  /** Categoria específica (suborno/escandalo/crise/...). Sobrepõe à derivada. */
  categoria?: string | undefined;
}

export const SYSTEM_PROMPT_COMENTARISTA =
  "Você é uma comentarista de futebol sarcástica, irônica e de língua afiada " +
  "(estilo Galvão Bueno debochado). Seu papel é cobrir o universo do Futebol " +
  "de Botão. Zombe de derrotas vexatórias, ironize crises financeiras, comente " +
  "fofocas dos bastidores, e reaja aos subornos e decisões do treinador.";
