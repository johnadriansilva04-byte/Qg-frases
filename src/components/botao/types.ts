export type Difficulty = "amador" | "profissional" | "lenda";

export const DIFFICULTIES: { id: Difficulty; label: string; desc: string; titlesToUnlock: number }[] = [
  { id: "amador", label: "Amador", desc: "Várzea de domingo. CPU erra bastante.", titlesToUnlock: 0 },
  { id: "profissional", label: "Profissional", desc: "Mira firme e força medida.", titlesToUnlock: 3 },
  { id: "lenda", label: "Lenda", desc: "Precisão cirúrgica. Boa sorte.", titlesToUnlock: 3 },
];

export type MatchResult = {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  penHome?: number;
  penAway?: number;
};

export type GroupRow = {
  teamId: string;
  p: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
};

export type Fixture = {
  id: string;
  homeId: string;
  awayId: string;
  played: boolean;
  result?: MatchResult;
  stage: string;
};

export type Tournament = {
  format?: "copa" | "pontos-corridos";
  difficulty: Difficulty;
  userTeamId: string;
  groups: { name: string; teamIds: string[]; table: GroupRow[] }[];
  groupFixtures: Fixture[];
  knockout: { stage: string; fixtures: Fixture[] }[];
  phase: "grupos" | "mata-mata" | "fim";
  champion?: string;
};
