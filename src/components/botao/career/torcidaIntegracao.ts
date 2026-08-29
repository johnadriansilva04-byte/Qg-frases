/**
 * torcidaIntegracao — cola entre o torcidaEngine (puro) e o CareerState.
 *
 * O universo tem 60 clubes-base + o time personalizado do usuário. A torcida
 * é criada uma única vez (distribuição inicial proporcional à força) e
 * EVOLUI a cada rodada/título — sempre zero-sum (Σ = 1.000.000).
 */

import { TEAMS, type Team } from "../data/teams";
import type { CareerState } from "./types";
import type { LigasTemporada } from "./seasonEngine";
import { resultadosDaRodada } from "./seasonEngine";
import {
  aplicarResultadoTorcida,
  aplicarTituloTorcida,
  distribuirTorcidaInicial,
  garantirTorcida,
  mapaForcas,
  totalTorcedores,
  type ClubeBase,
  type TorcidaState,
} from "./torcidaEngine";

/** Todos os clubes do universo (60 base + time do usuário). */
function clubesDoUniverso(userTeam: Team): ClubeBase[] {
  const mapa = new Map<string, ClubeBase>();
  for (const t of TEAMS) mapa.set(t.id, { id: t.id, power: t.power });
  mapa.set(userTeam.id, { id: userTeam.id, power: userTeam.power });
  return [...mapa.values()];
}

/**
 * Garante que a carreira tem torcida para TODOS os clubes do universo.
 * Na primeira vez cria a distribuição inicial; depois só cobre clubes
 * faltantes (ex.: time personalizado recém-criado) — zero-sum sempre.
 */
export function garantirTorcidaUniverso(career: CareerState, userTeam: Team): CareerState {
  const clubes = clubesDoUniverso(userTeam);
  const torcida = career.torcida ?? distribuirTorcidaInicial(clubes);
  const coberta = garantirTorcida(torcida, clubes);
  if (coberta === torcida && career.torcida) return career;
  return { ...career, torcida: coberta };
}

/**
 * Aplica a dinâmica de torcida de UMA rodada concluída: cada partida
 * disputada (a real do usuário + todas as simuladas das 3 divisões) migra
 * torcedores entre os clubes envolvidos. O universo evolui mesmo sem o
 * jogador (§8).
 */
export function aplicarRodadaTorcida(
  career: CareerState,
  ligas: LigasTemporada,
  stage: string,
): CareerState {
  if (!career.torcida) return career;
  // Cópia profunda por clube: o engine muta os objetos de torcida — sem isso
  // o estado React ANTERIOR seria mutado por referência.
  let torcida: TorcidaState = Object.fromEntries(
    Object.entries(career.torcida).map(([id, t]) => [id, { ...t }]),
  );
  for (const r of resultadosDaRodada(ligas, stage)) {
    torcida = aplicarResultadoTorcida(torcida, r.homeId, r.awayId, r.homeGoals, r.awayGoals);
  }
  return { ...career, torcida };
}

/**
 * Fim de temporada: cada campeão de divisão atrai torcedores de todos os
 * outros clubes (título = grande ganho, §6). Zero-sum global.
 */
export function aplicarTitulosDaTemporada(
  career: CareerState,
  ligas: LigasTemporada,
): CareerState {
  if (!career.torcida) return career;
  let torcida: TorcidaState = Object.fromEntries(
    Object.entries(career.torcida).map(([id, t]) => [id, { ...t }]),
  );
  for (const liga of Object.values(ligas)) {
    const campeaoId = liga.champion ?? null;
    if (campeaoId) torcida = aplicarTituloTorcida(torcida, campeaoId);
  }
  return { ...career, torcida };
}

/**
 * Mapa id → força efetiva (qualidade + torcida + forma) de todos os clubes —
 * alimenta a simulação das rodadas e a CPU da partida real. O bônus/penalidade
 * tático do time do usuário já está embutido em userTeam.power.
 */
export function forcasDaTemporada(career: CareerState, userTeam: Team): Record<string, number> {
  if (!career.torcida) return {};
  return mapaForcas(career.torcida, clubesDoUniverso(userTeam));
}

/** Torcedores do clube (0 se o universo ainda não foi inicializado). */
export function fansDoClube(career: CareerState, teamId: string): number {
  return career.torcida?.[teamId]?.fans ?? 0;
}

/** Sequência do clube (positivo = vitórias seguidas). */
export function sequenciaDoClube(career: CareerState, teamId: string): number {
  return career.torcida?.[teamId]?.seq ?? 0;
}

/** Forma recente do jogador — alimenta o balanceamento dinâmico da CPU. */
export function formaDoJogador(career: CareerState, userTeamId: string) {
  const seq = sequenciaDoClube(career, userTeamId);
  return {
    sequenciaVitorias: Math.max(0, seq),
    sequenciaDerrotas: Math.max(0, -seq),
    invicto: seq >= 5,
  };
}

/** Invariante de auditoria: a população total do universo. */
export function totalTorcedoresUniverso(career: CareerState): number {
  return career.torcida ? totalTorcedores(career.torcida) : 0;
}
