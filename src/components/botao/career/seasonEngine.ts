import { resolveTeam } from "./competitionApi";
import { timesDaDivisao, type Team } from "../data/teams";
import { simulateMatch, sortTable } from "../tournament";
import type { Difficulty, Fixture, GroupRow, Tournament } from "../types";
import type { Divisao } from "./types";

export type ComposicoesDivisoes = Record<Divisao, string[]>;
export type LigasTemporada = Record<Divisao, Tournament>;

const DIVISOES: Divisao[] = ["serie-a", "serie-b", "serie-c"];
const TAMANHO_DIVISAO = 20;

function emptyRow(teamId: string): GroupRow {
  return { teamId, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
}

function teamFromId(teamId: string, userTeam: Team): Team {
  return resolveTeam(teamId, userTeam);
}

/** Liga de pontos corridos determinística a partir de uma comparação explícita. */
export function criarLigaComTimes(
  teamIds: string[],
  difficulty: Difficulty,
  userTeam: Team,
): Tournament {
  const ids = [...new Set(teamIds)];
  if (ids.length !== TAMANHO_DIVISAO) {
    const fallback = timesDaDivisao("serie-a").map((team) => team.id);
    for (const id of fallback) {
      if (ids.length >= TAMANHO_DIVISAO) break;
      if (!ids.includes(id)) ids.push(id);
    }
  }

  const teams = ids.map((id) => teamFromId(id, userTeam));
  const table = teams.map((team) => emptyRow(team.id));
  const group = { name: "Liga", teamIds: teams.map((team) => team.id), table };

  const arr = [...teams.map((team) => team.id)];
  if (arr.length % 2 !== 0) arr.push("__BYE__");
  const rounds: Array<[string, string][]> = [];
  const n = arr.length;
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]!;
      const b = arr[n - 1 - i]!;
      if (a !== "__BYE__" && b !== "__BYE__") {
        round.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!);
  }

  const groupFixtures: Fixture[] = [];
  rounds.forEach((round, ri) => {
    round.forEach(([homeId, awayId], mi) => {
      groupFixtures.push({
        id: `liga-r${ri}-${mi}`,
        homeId,
        awayId,
        played: false,
        stage: `Rodada ${ri + 1}`,
      });
    });
  });

  return {
    format: "pontos-corridos",
    difficulty,
    userTeamId: userTeam.id,
    groups: [group],
    groupFixtures,
    knockout: [],
    phase: "grupos",
  };
}

/** Garante que o time personalizado está presente na divisão em que o usuário joga. */
function normalizeDivisionIds(divisao: Divisao, ids: string[], userTeam: Team, activeDivision: Divisao): string[] {
  const clean = [...new Set(ids)].filter(Boolean);
  if (activeDivision === divisao && !clean.includes(userTeam.id)) {
    clean.splice(Math.min(clean.length, TAMANHO_DIVISAO - 1), 0, userTeam.id);
  }
  const base = timesDaDivisao(divisao).map((team) => team.id);
  while (clean.length < TAMANHO_DIVISAO) {
    const next = base.find((id) => !clean.includes(id));
    if (!next) break;
    clean.push(next);
  }
  return clean.slice(0, TAMANHO_DIVISAO);
}

export function composicoesIniciais(userTeam: Team, activeDivision: Divisao): ComposicoesDivisoes {
  return {
    "serie-a": normalizeDivisionIds(
      "serie-a",
      timesDaDivisao("serie-a").map((team) => team.id),
      userTeam,
      activeDivision,
    ),
    "serie-b": normalizeDivisionIds(
      "serie-b",
      timesDaDivisao("serie-b").map((team) => team.id),
      userTeam,
      activeDivision,
    ),
    "serie-c": normalizeDivisionIds(
      "serie-c",
      timesDaDivisao("serie-c").map((team) => team.id),
      userTeam,
      activeDivision,
    ),
  };
}

export function criarLigasDaTemporada(
  composicoes: ComposicoesDivisoes,
  userTeam: Team,
  difficulty: Difficulty,
): LigasTemporada {
  return {
    "serie-a": criarLigaComTimes(composicoes["serie-a"], difficulty, userTeam),
    "serie-b": criarLigaComTimes(composicoes["serie-b"], difficulty, userTeam),
    "serie-c": criarLigaComTimes(composicoes["serie-c"], difficulty, userTeam),
  };
}

/**
 * Simula a mesma rodada nas três divisões. O jogo real do usuário já foi aplicado
 * na liga ativa pelo chamador, então a função só resolve fixtures ainda abertos.
 */
export function simularRodadaDivisoes(
  ligas: LigasTemporada,
  userTeamId: string,
  stage: string,
  difficulty: Difficulty,
): LigasTemporada {
  const next = structuredClone(ligas);
  for (const divisao of DIVISOES) {
    const liga = next[divisao];
    if (!liga || liga.phase !== "grupos") continue;
    for (const fixture of liga.groupFixtures) {
      if (fixture.played || fixture.stage !== stage) continue;
      if (fixture.homeId === userTeamId || fixture.awayId === userTeamId) continue;
      const result = simulateMatch(fixture.homeId, fixture.awayId, difficulty);
      applyFixtureResult(liga, fixture, result);
    }
    if (liga.groupFixtures.every((fixture) => fixture.played)) {
      const table = sortTable(liga.groups[0]?.table ?? []);
      const champion = table[0]?.teamId;
      if (champion) liga.champion = champion;
      liga.phase = "fim";
    }
  }
  return next;
}

function applyFixtureResult(tournament: Tournament, fixture: Fixture, result: ReturnType<typeof simulateMatch>) {
  fixture.played = true;
  fixture.result = result;
  const group = tournament.groups.find(
    (g) => g.teamIds.includes(result.homeId) && g.teamIds.includes(result.awayId),
  );
  if (!group) return;
  const home = group.table.find((row) => row.teamId === result.homeId);
  const away = group.table.find((row) => row.teamId === result.awayId);
  if (!home || !away) return;
  home.j++;
  away.j++;
  home.gp += result.homeGoals;
  home.gc += result.awayGoals;
  away.gp += result.awayGoals;
  away.gc += result.homeGoals;
  if (result.homeGoals > result.awayGoals) {
    home.v++;
    home.p += 3;
    away.d++;
  } else if (result.homeGoals < result.awayGoals) {
    away.v++;
    away.p += 3;
    home.d++;
  } else {
    home.e++;
    away.e++;
    home.p++;
    away.p++;
  }
}

export function ligasConcluidas(ligas: LigasTemporada): boolean {
  return DIVISOES.every(
    (divisao) => ligas[divisao].groupFixtures.every((fixture) => fixture.played),
  );
}

export interface ResultadoTemporada {
  novaDivisao: Divisao;
  promovido: boolean;
  rebaixado: boolean;
  campeao: boolean;
  posicao: number;
  composicoes: ComposicoesDivisoes;
}

/** Calcula promoção/rebaixamento e constrói a comparação da próxima temporada. */
export function processarResultadoTemporada(
  ligas: LigasTemporada,
  userTeamId: string,
): ResultadoTemporada {
  const a = sortTable(ligas["serie-a"].groups[0]?.table ?? []);
  const b = sortTable(ligas["serie-b"].groups[0]?.table ?? []);
  const c = sortTable(ligas["serie-c"].groups[0]?.table ?? []);

  const userInA = a.some((row) => row.teamId === userTeamId);
  const userInB = b.some((row) => row.teamId === userTeamId);
  const userInC = c.some((row) => row.teamId === userTeamId);

  const divisaoAtual: Divisao = userInA ? "serie-a" : userInB ? "serie-b" : "serie-c";
  const table = divisaoAtual === "serie-a" ? a : divisaoAtual === "serie-b" ? b : c;
  const posicao = Math.max(1, table.findIndex((row) => row.teamId === userTeamId) + 1);
  const promovido =
    posicao <= 2 && divisaoAtual !== "serie-a" ? true : false;
  const rebaixado =
    posicao >= table.length - 1 && divisaoAtual !== "serie-c" ? true : false;
  const novaDivisao: Divisao = promovido
    ? divisaoAtual === "serie-c"
      ? "serie-b"
      : "serie-a"
    : rebaixado
      ? divisaoAtual === "serie-a"
        ? "serie-b"
        : "serie-c"
      : divisaoAtual;

  const nextA = [...a.slice(0, a.length - 2), ...b.slice(0, 2)].map((row) => row.teamId);
  const nextB = [...b.slice(2, -2), ...a.slice(-2), ...c.slice(0, 2)].map((row) => row.teamId);
  const nextC = [...c.slice(2), ...b.slice(-2)].map((row) => row.teamId);

  return {
    novaDivisao,
    promovido,
    rebaixado,
    campeao: posicao === 1,
    posicao,
    composicoes: {
      "serie-a": nextA,
      "serie-b": nextB,
      "serie-c": nextC,
    },
  };
}

export function divisaoComTime(userTeamId: string, ligas: LigasTemporada): Divisao {
  for (const divisao of DIVISOES) {
    if (ligas[divisao].groups.some((g) => g.teamIds.includes(userTeamId))) return divisao;
  }
  return "serie-c";
}

export function ativoDoUsuario(ligas: LigasTemporada, userTeamId: string): Tournament | null {
  const divisao = divisaoComTime(userTeamId, ligas);
  return ligas[divisao] ?? null;
}
