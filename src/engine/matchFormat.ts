/**
 * Configuração central de formato da partida.
 *
 * Uma única estrutura define quantos jogadores cada equipe escala e qual
 * campo é construído — alterar aqui muda o jogo inteiro de forma
 * determinística, sem tocar na lógica do motor.
 */
import { FIELD, FIELD_3V3, type FieldDims } from "./field";
import type { MatchFormat } from "./types";

export interface MatchFormatSpec {
  /** Jogadores escalados por equipe (goleiro incluído). */
  playersPerTeam: number;
  field: FieldDims;
}

export const MATCH_FORMATS: Record<MatchFormat, MatchFormatSpec> = {
  "3x3": { playersPerTeam: 3, field: FIELD_3V3 },
  "11x11": { playersPerTeam: 11, field: FIELD },
};

/** Formato padrão do jogo: futebol 3x3 (1 goleiro + 2 de linha por equipe). */
export const DEFAULT_MATCH_FORMAT: MatchFormat = "3x3";

export function resolveFormat(format?: MatchFormat): MatchFormatSpec {
  return MATCH_FORMATS[format ?? DEFAULT_MATCH_FORMAT];
}
