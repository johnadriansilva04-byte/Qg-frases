import { TEAMS, teamById, type Team } from "./data/teams";
import type { Difficulty, Fixture, GroupRow, MatchResult, Tournament } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const GROUP_NAMES = ["A", "B", "C", "D"];

export function createTournament(userTeamId: string, difficulty: Difficulty): Tournament {
  const others = shuffle(TEAMS.filter((t) => t.id !== userTeamId)).slice(0, 15);
  const pool = shuffle([teamById(userTeamId), ...others]);

  const groups = GROUP_NAMES.map((name, gi) => {
    const teamIds = pool.slice(gi * 4, gi * 4 + 4).map((t) => t.id);
    return { name, teamIds, table: teamIds.map(emptyRow) };
  });

  const groupFixtures: Fixture[] = [];
  groups.forEach((g) => {
    const [a, b, c, d] = g.teamIds as [string, string, string, string];
    const rounds: Array<[string, string][]> = [
      [
        [a, b],
        [c, d],
      ],
      [
        [a, c],
        [d, b],
      ],
      [
        [a, d],
        [b, c],
      ],
    ];
    rounds.forEach((round, ri) => {
      round.forEach(([h, aw], mi) => {
        groupFixtures.push({
          id: `g${g.name}-r${ri}-${mi}`,
          homeId: h,
          awayId: aw,
          played: false,
          stage: `Grupo ${g.name} · Rodada ${ri + 1}`,
        });
      });
    });
  });

  return {
    difficulty,
    userTeamId,
    groups,
    groupFixtures,
    knockout: [],
    phase: "grupos",
  };
}

function emptyRow(teamId: string): GroupRow {
  return { teamId, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
}

export function applyResult(t: Tournament, fixture: Fixture, result: MatchResult) {
  fixture.played = true;
  fixture.result = result;
  const group = t.groups.find((g) => g.teamIds.includes(result.homeId) && g.teamIds.includes(result.awayId));
  if (!group) return;
  const rowH = group.table.find((r) => r.teamId === result.homeId)!;
  const rowA = group.table.find((r) => r.teamId === result.awayId)!;
  rowH.j++;
  rowA.j++;
  rowH.gp += result.homeGoals;
  rowH.gc += result.awayGoals;
  rowA.gp += result.awayGoals;
  rowA.gc += result.homeGoals;
  if (result.homeGoals > result.awayGoals) {
    rowH.v++;
    rowH.p += 3;
    rowA.d++;
  } else if (result.homeGoals < result.awayGoals) {
    rowA.v++;
    rowA.p += 3;
    rowH.d++;
  } else {
    rowH.e++;
    rowA.e++;
    rowH.p++;
    rowA.p++;
  }
}

export function sortTable(table: GroupRow[]): GroupRow[] {
  return [...table].sort(
    (a, b) => b.p - a.p || b.gp - b.gc - (a.gp - a.gc) || b.gp - a.gp || a.teamId.localeCompare(b.teamId),
  );
}

/** Simula uma partida CPU x CPU com base na força dos times. */
export function simulateMatch(homeId: string, awayId: string, difficulty: Difficulty, knockout = false): MatchResult {
  const h = teamById(homeId);
  const a = teamById(awayId);
  const goals = (att: Team, def: Team, bonus: number) => {
    const lambda = Math.max(0.25, (att.power - def.power) / 32 + 1.15 + bonus);
    let g = 0;
    let p = Math.exp(-lambda);
    let acc = p;
    const u = Math.random();
    while (u > acc && g < 6) {
      g++;
      p = (p * lambda) / g;
      acc += p;
    }
    return g;
  };
  let homeGoals = goals(h, a, 0.12);
  let awayGoals = goals(a, h, 0);
  const res: MatchResult = { homeId, awayId, homeGoals, awayGoals };
  if (knockout && homeGoals === awayGoals) {
    let ph = 0;
    let pa = 0;
    while (ph === pa) {
      ph = 3 + Math.floor(Math.random() * 3);
      pa = 3 + Math.floor(Math.random() * 3);
    }
    res.penHome = ph;
    res.penAway = pa;
  }
  void difficulty;
  return res;
}

const KO_STAGES = ["Quartas de final", "Semifinal", "Final"];

export function buildKnockout(t: Tournament) {
  const qualified: string[] = [];
  t.groups.forEach((g) => {
    const sorted = sortTable(g.table);
    qualified.push(sorted[0]!.teamId, sorted[1]!.teamId);
  });
  // A1 x B2, C1 x D2, B1 x A2, D1 x C2
  const [a1, a2, b1, b2, c1, c2, d1, d2] = qualified as string[];
  const pairs: [string, string][] = [
    [a1!, b2!],
    [c1!, d2!],
    [b1!, a2!],
    [d1!, c2!],
  ];
  t.knockout = [
    {
      stage: KO_STAGES[0]!,
      fixtures: pairs.map(([h, a], i) => ({
        id: `ko0-${i}`,
        homeId: h,
        awayId: a,
        played: false,
        stage: KO_STAGES[0]!,
      })),
    },
  ];
  t.phase = "mata-mata";
}

export function winnerOf(r: MatchResult): string {
  if (r.homeGoals > r.awayGoals) return r.homeId;
  if (r.awayGoals > r.homeGoals) return r.awayId;
  return (r.penHome ?? 0) > (r.penAway ?? 0) ? r.homeId : r.awayId;
}

export function advanceKnockout(t: Tournament) {
  const current = t.knockout[t.knockout.length - 1]!;
  if (current.fixtures.some((f) => !f.played)) return;
  const winners = current.fixtures.map((f) => winnerOf(f.result!));
  if (winners.length === 1) {
    t.champion = winners[0]!;
    t.phase = "fim";
    return;
  }
  const stageIndex = t.knockout.length;
  const stage = KO_STAGES[stageIndex] ?? "Final";
  const fixtures: Fixture[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    fixtures.push({
      id: `ko${stageIndex}-${i / 2}`,
      homeId: winners[i]!,
      awayId: winners[i + 1]!,
      played: false,
      stage,
    });
  }
  t.knockout.push({ stage, fixtures });
}

export function nextUserFixture(t: Tournament): Fixture | null {
  const isUser = (f: Fixture) => f.homeId === t.userTeamId || f.awayId === t.userTeamId;
  if (t.phase === "grupos") {
    return t.groupFixtures.find((f) => !f.played && isUser(f)) ?? null;
  }
  const current = t.knockout[t.knockout.length - 1];
  if (!current) return null;
  return current.fixtures.find((f) => !f.played && isUser(f)) ?? null;
}
