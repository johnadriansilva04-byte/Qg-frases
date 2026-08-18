import { TEAMS as TEAMS_LOCAL, teamByIdSync, type Team } from "../data/teams";
import { shuffle, sortTable } from "../tournament";
import type { Difficulty, Fixture, Tournament } from "../types";
import type { Divisao } from "./types";

export type Competicao = "brasileirao" | "copa-brasil";

export interface StatsData {
  artilheiro?: { team: Team; gols: number };
  goleiro?: { team: Team; gols: number };
  maiorGoleada?: { vencedor: Team; perdedor: Team; placar: string; diff: number } | null;
}

export const DIVISAO_LABEL: Record<Divisao, string> = {
  "serie-a": "Série A",
  "serie-b": "Série B",
  "serie-c": "Série C",
};

export const DIVISAO_SHORT: Record<Divisao, string> = {
  "serie-a": "SÉRIE A",
  "serie-b": "SÉRIE B",
  "serie-c": "SÉRIE C",
};

/** Resolve um time pelo id, caindo para o time do usuário quando for o clube personalizado. */
export function resolveTeam(teamId: string, userTeam: Team): Team {
  if (teamId === userTeam.id) return userTeam;
  return teamByIdSync(teamId);
}

/**
 * Calcula as estatísticas reais de um torneio (liga de pontos corridos).
 * Os dados são derivados da tabela e das partidas já disputadas — nunca duplicados,
 * pois cada time é resolvido pelo seu id real.
 */
export function calcularStats(tour: Tournament, userTeam: Team): StatsData | null {
  if (tour.phase !== "grupos" || tour.groups.length === 0) return null;
  const tabela = sortTable(tour.groups[0]!.table);
  if (tabela.length === 0) return null;

  const artilheiro = tabela.reduce((max, r) => (r.gp > max.gp ? r : max), tabela[0]!);
  const menosGols = tabela.reduce((min, r) => (r.gc < min.gc ? r : min), tabela[0]!);

  let maiorVitoria: { homeId: string; awayId: string; homeGoals: number; awayGoals: number; diff: number } | null = null;
  for (const f of tour.groupFixtures) {
    if (!f.result || !f.played) continue;
    const diff = Math.abs(f.result.homeGoals - f.result.awayGoals);
    if (!maiorVitoria || diff > maiorVitoria.diff) {
      maiorVitoria = {
        homeId: f.homeId,
        awayId: f.awayId,
        homeGoals: f.result.homeGoals,
        awayGoals: f.result.awayGoals,
        diff,
      };
    }
  }

  let maiorGoleada: StatsData["maiorGoleada"] = null;
  if (maiorVitoria) {
    const m = maiorVitoria;
    const vencedorId = m.homeGoals > m.awayGoals ? m.homeId : m.awayId;
    const perdedorId = m.homeGoals > m.awayGoals ? m.awayId : m.homeId;
    maiorGoleada = {
      vencedor: resolveTeam(vencedorId, userTeam),
      perdedor: resolveTeam(perdedorId, userTeam),
      placar: `${m.homeGoals}-${m.awayGoals}`,
      diff: m.diff,
    };
  }

  return {
    artilheiro: { team: resolveTeam(artilheiro.teamId, userTeam), gols: artilheiro.gp },
    goleiro: { team: resolveTeam(menosGols.teamId, userTeam), gols: menosGols.gc },
    maiorGoleada,
  };
}

/**
 * Mata-mata da Copa do Brasil. Gera um chaveamento de 16 times (oitavas -> final)
 * com a 2ª fase já definida e as fases seguintes como confrontos pendentes (TBD),
 * que vão se resolvendo conforme o usuário avança. As rodadas ganham rótulos próprios
 * para aparecerem no calendário da temporada.
 */
export const COPA_BRASIL_STAGES = [
  "Copa do Brasil · 2ª Fase",
  "Copa do Brasil · Oitavas",
  "Copa do Brasil · Quartas",
  "Copa do Brasil · Semifinal",
  "Copa do Brasil · Final",
];

export interface CopaBrasilState {
  rounds: { stage: string; fixtures: Fixture[] }[];
  champion: string | null;
  finished: boolean;
}

export function gerarCopaBrasil(
  userTeam: Team,
  _difficulty: Difficulty,
): CopaBrasilState {
  // Sorteia 15 adversários reais do banco local + o time do usuário = 16.
  const others = shuffle(
    Array.from(new Set([userTeam, ...TEAMS_LOCAL])).filter((t) => t.id !== userTeam.id),
  ).slice(0, 15);
  const participantes = shuffle([userTeam, ...others]);

  const rounds: { stage: string; fixtures: Fixture[] }[] = [];
  // 2ª fase: 8 confrontos definidos.
  const primeira: Fixture[] = [];
  for (let i = 0; i < participantes.length; i += 2) {
    primeira.push({
      id: `copa-r0-${i}`,
      homeId: participantes[i]!.id,
      awayId: participantes[i + 1]!.id,
      played: false,
      stage: COPA_BRASIL_STAGES[0]!,
    });
  }
  rounds.push({ stage: COPA_BRASIL_STAGES[0]!, fixtures: primeira });

  // Fases seguintes: confrontos pendentes (TBD), preenchidos conforme avança.
  let count = primeira.length / 2; // 4 oitavas...
  for (let r = 1; r < COPA_BRASIL_STAGES.length; r++) {
    count = Math.max(1, count / 2);
    const fixtures: Fixture[] = [];
    for (let i = 0; i < count; i++) {
      fixtures.push({
        id: `copa-r${r}-${i}`,
        homeId: "TBD",
        awayId: "TBD",
        played: false,
        stage: COPA_BRASIL_STAGES[r]!,
      });
    }
    rounds.push({ stage: COPA_BRASIL_STAGES[r]!, fixtures });
  }

  return { rounds, champion: null, finished: false };
}

/** Rótulo de rodada + "data" simbólica derivada do índice, para o calendário. */
export function dataDaRodada(indice: number): string {
  const base = new Date();
  base.setDate(base.getDate() + indice * 7);
  return base.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
