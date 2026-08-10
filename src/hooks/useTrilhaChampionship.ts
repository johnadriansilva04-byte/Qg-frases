import { useState, useEffect, useCallback } from "react";
import type { Difficulty } from "@/lib/trilha/ai";

export interface ChampionshipMatch {
  id: string;
  opponent: string;
  difficulty: Difficulty;
  completed: boolean;
  result: "victory" | "defeat" | "pending";
  score: number;
}

export interface ChampionshipData {
  matches: ChampionshipMatch[];
  totalScore: number;
  completed: number;
  total: number;
  started: boolean;
  startedAt: string | null;
}

const CHAMPIONSHIP_KEY = "trilha_championship";
const MATCHES_CONFIG: { opponent: string; difficulty: Difficulty; score: number }[] = [
  { opponent: "Recruta Alemão", difficulty: "recruta", score: 50 },
  { opponent: "Recruta Italiano", difficulty: "recruta", score: 50 },
  { opponent: "Sargento Japonês", difficulty: "sargento", score: 100 },
  { opponent: "Sargento Alemão", difficulty: "sargento", score: 100 },
  { opponent: "General Italiano", difficulty: "general", score: 200 },
  { opponent: "General Alemão", difficulty: "general", score: 250 },
  { opponent: "Marechal Supremo", difficulty: "general", score: 300 },
];

export function useTrilhaChampionship() {
  const [championship, setChampionship] = useState<ChampionshipData>(() => {
    const saved = localStorage.getItem(CHAMPIONSHIP_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getInitialChampionship();
      }
    }
    return getInitialChampionship();
  });

  function getInitialChampionship(): ChampionshipData {
    const matches: ChampionshipMatch[] = MATCHES_CONFIG.map((config, index) => ({
      id: `match-${index}`,
      opponent: config.opponent,
      difficulty: config.difficulty,
      completed: false,
      result: "pending",
      score: config.score,
    }));

    return {
      matches,
      totalScore: 0,
      completed: 0,
      total: matches.length,
      started: false,
      startedAt: null,
    };
  }

  const saveChampionship = useCallback((data: ChampionshipData) => {
    localStorage.setItem(CHAMPIONSHIP_KEY, JSON.stringify(data));
    setChampionship(data);
  }, []);

  const startChampionship = useCallback(() => {
    const data = getInitialChampionship();
    data.started = true;
    data.startedAt = new Date().toISOString();
    saveChampionship(data);
  }, [saveChampionship]);

  const getNextMatch = useCallback((): ChampionshipMatch | null => {
    const nextMatch = championship.matches.find((m) => !m.completed);
    return nextMatch || null;
  }, [championship.matches]);

  const completeMatch = useCallback(
    (matchId: string, result: "victory" | "defeat") => {
      const updatedMatches = championship.matches.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            completed: true,
            result,
          };
        }
        return match;
      });

      const completed = updatedMatches.filter((m) => m.completed).length;
      const totalScore = updatedMatches.reduce((sum, match) => {
        if (match.completed && match.result === "victory") {
          return sum + match.score;
        }
        return sum;
      }, 0);

      const updatedData: ChampionshipData = {
        ...championship,
        matches: updatedMatches,
        totalScore,
        completed,
      };

      saveChampionship(updatedData);
    },
    [championship, saveChampionship]
  );

  const resetChampionship = useCallback(() => {
    localStorage.removeItem(CHAMPIONSHIP_KEY);
    setChampionship(getInitialChampionship());
  }, []);

  const isChampion = championship.completed === championship.total && championship.totalScore > 0;

  return {
    championship,
    startChampionship,
    getNextMatch,
    completeMatch,
    resetChampionship,
    isChampion,
  };
}
