export interface RankingEntry {
  id: string;
  date: string;
  game: string;
  difficulty: string;
  result: "victory" | "defeat";
  score: number;
}

const RANKING_KEY = "qgfrases_ranking";

export function getRanking(): RankingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(RANKING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addRankingEntry(entry: Omit<RankingEntry, "id">): void {
  if (typeof window === "undefined") return;
  try {
    const ranking = getRanking();
    const newEntry: RankingEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    ranking.unshift(newEntry);
    // Manter apenas os últimos 100 registros
    const trimmed = ranking.slice(0, 100);
    localStorage.setItem(RANKING_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Erro ao salvar ranking:", e);
  }
}

export function clearRanking(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RANKING_KEY);
  } catch (e) {
    console.error("Erro ao limpar ranking:", e);
  }
}

export function getTrilhaScore(difficulty: string, result: "victory" | "defeat"): number {
  const baseScores: Record<string, number> = {
    recruta: 10,
    sargento: 25,
    general: 50,
  };
  const base = baseScores[difficulty] || 10;
  return result === "victory" ? base : Math.floor(base * 0.3);
}
