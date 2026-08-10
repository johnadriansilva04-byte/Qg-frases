import { useState, useCallback } from "react";

export interface Phase {
  id: number;
  name: string;
  requiredWins: number;
  difficulty: "recruta" | "sargento" | "general";
}

const PHASES: Phase[] = [
  { id: 1, name: "Fase 1: Básico", requiredWins: 7, difficulty: "recruta" },
  { id: 2, name: "Fase 2: Intermediário", requiredWins: 10, difficulty: "sargento" },
  { id: 3, name: "Fase 3: Avançado", requiredWins: 15, difficulty: "general" },
];

export interface PhaseProgress {
  currentPhase: number;
  consecutiveWins: number;
  totalWins: number;
  completedPhases: number[];
  started: boolean;
}

const PHASE_KEY = "trilha_phases";

export interface Trophy {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: number;
  achieved: boolean;
}

const TROPHIES: Trophy[] = [
  {
    id: "bronze",
    name: "Bronze",
    description: "Complete a Fase 1",
    icon: "🥉",
    color: "text-amber-600",
    requirement: 1,
    achieved: false,
  },
  {
    id: "silver",
    name: "Prata",
    description: "Complete a Fase 2",
    icon: "🥈",
    color: "text-gray-400",
    requirement: 2,
    achieved: false,
  },
  {
    id: "gold",
    name: "Ouro",
    description: "Complete a Fase 3",
    icon: "🥇",
    color: "text-yellow-500",
    requirement: 3,
    achieved: false,
  },
  {
    id: "diamond",
    name: "Diamante",
    description: "50 vitórias totais",
    icon: "💎",
    color: "text-cyan-400",
    requirement: 50,
    achieved: false,
  },
  {
    id: "legendary",
    name: "Lendário",
    description: "100 vitórias totais",
    icon: "👑",
    color: "text-purple-500",
    requirement: 100,
    achieved: false,
  },
  {
    id: "mythic",
    name: "Mítico",
    description: "200 vitórias totais",
    icon: "🌟",
    color: "text-pink-500",
    requirement: 200,
    achieved: false,
  },
  {
    id: "godlike",
    name: "Divino",
    description: "500 vitórias totais",
    icon: "⚡",
    color: "text-orange-500",
    requirement: 500,
    achieved: false,
  },
];

const TROPHY_KEY = "trilha_trophies";

export function useTrilhaPhases() {
  const [progress, setProgress] = useState<PhaseProgress>(() => {
    const saved = localStorage.getItem(PHASE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getInitialProgress();
      }
    }
    return getInitialProgress();
  });

  const [trophies, setTrophies] = useState<Trophy[]>(() => {
    const saved = localStorage.getItem(TROPHY_KEY);
    if (saved) {
      try {
        const savedTrophies = JSON.parse(saved);
        return TROPHIES.map((t) => ({
          ...t,
          achieved: savedTrophies.includes(t.id),
        }));
      } catch {
        return TROPHIES;
      }
    }
    return TROPHIES;
  });

  function getInitialProgress(): PhaseProgress {
    return {
      currentPhase: 1,
      consecutiveWins: 0,
      totalWins: 0,
      completedPhases: [],
      started: false,
    };
  }

  const saveProgress = useCallback((data: PhaseProgress) => {
    localStorage.setItem(PHASE_KEY, JSON.stringify(data));
    setProgress(data);
  }, []);

  const saveTrophies = useCallback((achievedIds: string[]) => {
    localStorage.setItem(TROPHY_KEY, JSON.stringify(achievedIds));
    setTrophies(TROPHIES.map((t) => ({
      ...t,
      achieved: achievedIds.includes(t.id),
    })));
  }, []);

  const startPhases = useCallback(() => {
    const data = getInitialProgress();
    data.started = true;
    saveProgress(data);
  }, [saveProgress]);

  const recordWin = useCallback(() => {
    const currentPhaseConfig = PHASES.find((p) => p.id === progress.currentPhase);
    if (!currentPhaseConfig) return;

    let newConsecutiveWins = progress.consecutiveWins + 1;
    let newCurrentPhase = progress.currentPhase;
    let newCompletedPhases = [...progress.completedPhases];

    // Verifica se completou a fase
    if (newConsecutiveWins >= currentPhaseConfig.requiredWins) {
      newCompletedPhases.push(progress.currentPhase);
      
      // Avança para próxima fase se existir
      const nextPhase = PHASES.find((p) => p.id === progress.currentPhase + 1);
      if (nextPhase) {
        newCurrentPhase = nextPhase.id;
        newConsecutiveWins = 0;
      }
    }

    const newTotalWins = progress.totalWins + 1;

    const updatedData: PhaseProgress = {
      ...progress,
      currentPhase: newCurrentPhase,
      consecutiveWins: newConsecutiveWins,
      totalWins: newTotalWins,
      completedPhases: newCompletedPhases,
    };

    saveProgress(updatedData);

    // Verifica conquistas de troféus
    const achievedIds = trophies.filter((t) => t.achieved).map((t) => t.id);
    let newAchievedIds = [...achievedIds];

    // Troféus de fases
    if (newCompletedPhases.includes(1) && !achievedIds.includes("bronze")) {
      newAchievedIds.push("bronze");
    }
    if (newCompletedPhases.includes(2) && !achievedIds.includes("silver")) {
      newAchievedIds.push("silver");
    }
    if (newCompletedPhases.includes(3) && !achievedIds.includes("gold")) {
      newAchievedIds.push("gold");
    }

    // Troféus de vitórias totais
    if (newTotalWins >= 50 && !achievedIds.includes("diamond")) {
      newAchievedIds.push("diamond");
    }
    if (newTotalWins >= 100 && !achievedIds.includes("legendary")) {
      newAchievedIds.push("legendary");
    }
    if (newTotalWins >= 200 && !achievedIds.includes("mythic")) {
      newAchievedIds.push("mythic");
    }
    if (newTotalWins >= 500 && !achievedIds.includes("godlike")) {
      newAchievedIds.push("godlike");
    }

    if (newAchievedIds.length > achievedIds.length) {
      saveTrophies(newAchievedIds);
    }
  }, [progress, trophies, saveProgress, saveTrophies]);

  const recordLoss = useCallback(() => {
    const updatedData: PhaseProgress = {
      ...progress,
      consecutiveWins: 0,
    };
    saveProgress(updatedData);
  }, [progress, saveProgress]);

  const resetPhases = useCallback(() => {
    localStorage.removeItem(PHASE_KEY);
    localStorage.removeItem(TROPHY_KEY);
    setProgress(getInitialProgress());
    setTrophies(TROPHIES);
  }, []);

  const getCurrentPhaseConfig = (): Phase | null => {
    return PHASES.find((p) => p.id === progress.currentPhase) || null;
  };

  const isAllPhasesComplete = progress.completedPhases.length === PHASES.length;

  const getNextTrophy = (): Trophy | null => {
    return trophies.find((t) => !t.achieved) || null;
  };

  const getProgressToNextTrophy = (): { current: number; required: number; percentage: number } => {
    const nextTrophy = getNextTrophy();
    if (!nextTrophy) {
      return { current: progress.totalWins, required: progress.totalWins, percentage: 100 };
    }

    // Se é troféu de fase
    if (["bronze", "silver", "gold"].includes(nextTrophy.id)) {
      const phaseId = nextTrophy.requirement;
      const phase = PHASES.find((p) => p.id === phaseId);
      if (phase) {
        const currentPhaseProgress = progress.completedPhases.includes(phaseId - 1) 
          ? progress.consecutiveWins 
          : 0;
        return {
          current: currentPhaseProgress,
          required: phase.requiredWins,
          percentage: (currentPhaseProgress / phase.requiredWins) * 100,
        };
      }
    }

    // Se é troféu de vitórias totais
    return {
      current: progress.totalWins,
      required: nextTrophy.requirement,
      percentage: Math.min((progress.totalWins / nextTrophy.requirement) * 100, 100),
    };
  };

  return {
    progress,
    phases: PHASES,
    trophies,
    startPhases,
    recordWin,
    recordLoss,
    resetPhases,
    getCurrentPhaseConfig,
    isAllPhasesComplete,
    getNextTrophy,
    getProgressToNextTrophy,
  };
}
