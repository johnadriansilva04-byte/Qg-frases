export interface RankingEntry {
  id: string;
  date: string;
  game: string;
  difficulty: string;
  result: "victory" | "defeat" | "draw";
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

export function getTrilhaScore(difficulty: string, result: "victory" | "defeat" | "draw"): number {
  // Pontos base independentes da dificuldade conforme solicitado:
  // Vitória: 3 pontos, Derrota: -3 pontos, Empate: 1 ponto
  const basePoints = {
    victory: 3,
    defeat: -3,
    draw: 1
  };
  
  return basePoints[result];
}
