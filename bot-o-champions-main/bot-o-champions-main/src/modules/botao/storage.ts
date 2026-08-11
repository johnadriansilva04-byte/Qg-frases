import type { Difficulty } from "./types";

const KEY = "botao:progress:v1";

export type Progress = {
  titles: Record<Difficulty, number>;
  trophies: { difficulty: Difficulty; teamId: string; date: string }[];
  friendlies: { w: number; d: number; l: number };
};

const EMPTY: Progress = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Progress) };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function isUnlocked(p: Progress, d: Difficulty) {
  if (d === "amador") return true;
  if (d === "profissional") return p.titles.amador >= 3;
  return p.titles.profissional >= 3;
}
