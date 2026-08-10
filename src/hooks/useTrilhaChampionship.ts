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

    const updatedData: PhaseProgress = {
      ...progress,
      currentPhase: newCurrentPhase,
      consecutiveWins: newConsecutiveWins,
      totalWins: progress.totalWins + 1,
      completedPhases: newCompletedPhases,
    };

    saveProgress(updatedData);
  }, [progress, saveProgress]);

  const recordLoss = useCallback(() => {
    const updatedData: PhaseProgress = {
      ...progress,
      consecutiveWins: 0,
    };
    saveProgress(updatedData);
  }, [progress, saveProgress]);

  const resetPhases = useCallback(() => {
    localStorage.removeItem(PHASE_KEY);
    setProgress(getInitialProgress());
  }, []);

  const getCurrentPhaseConfig = (): Phase | null => {
    return PHASES.find((p) => p.id === progress.currentPhase) || null;
  };

  const isAllPhasesComplete = progress.completedPhases.length === PHASES.length;

  return {
    progress,
    phases: PHASES,
    startPhases,
    recordWin,
    recordLoss,
    resetPhases,
    getCurrentPhaseConfig,
    isAllPhasesComplete,
  };
}
