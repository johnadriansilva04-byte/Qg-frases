import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Trophy, Target, BookOpen, X, Award, Users, Gamepad2, Swords, Crown, ChevronRight, Zap } from "lucide-react";
import { marcarRitualPendente } from "@/components/botao/career/trilhaIntegracao";
import { HQPanel } from "./HQPanel";
import { TrilhaBoard } from "./TrilhaBoard";
import { GameEndAdModal } from "./GameEndAdModal";
import { TrilhaLoadingScreen } from "./TrilhaLoadingScreen";
import { TrilhaRPGScreen } from "./TrilhaRPGScreen";
import { MatchEndAdCard } from "@/components/MatchEndAdCard";
import { AI_PROFILES, type Difficulty } from "@/lib/trilha/ai";
import { useLocalGame } from "@/hooks/useLocalGame";
import { useTrilhaPhases, type Phase } from "@/hooks/useTrilhaChampionship";
import { legalDestinations, legalPlacements, canFly, type Player } from "@/lib/trilha/engine";
import { addRankingEntry, getTrilhaScore } from "@/lib/ranking";
import { TrilhaOnlineLobby } from "./TrilhaOnlineLobby";
import { useAdManager } from "@/lib/adManager";

const TUTORIAL_KEY = "trilha_tutorial_seen";

interface TrilhaGameProps {
  onBack?: () => void;
  /** Link direto (?mesaTrilha=...): abre o lobby online direto na mesa. */
  mesaInicial?: string;
}

type ViewMode = "menu" | "amistoso" | "campeonato" | "online";

export function TrilhaGame({ onBack, mesaInicial }: TrilhaGameProps = {}) {
  const [seed, setSeed] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_KEY));
  const [showRules, setShowRules] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("menu");
  const [loading, setLoading] = useState(false);
  const [champDifficulty, setChampDifficulty] = useState<Difficulty>("recruta");
  const phases = useTrilhaPhases();
  const currentPhaseConfig = phases.getCurrentPhaseConfig();
  const { markFirstGamePlayed } = useAdManager("/trilha");

  useEffect(() => {
    if (!phases.progress.started) phases.startPhases();
  }, [phases]);

  useEffect(() => {
    if (currentPhaseConfig) setChampDifficulty(currentPhaseConfig.difficulty as Difficulty);
  }, [currentPhaseConfig]);

  const handleStartTutorial = () => { localStorage.setItem(TUTORIAL_KEY, "true"); setShowTutorial(false); };
  const handleShowRules = () => { setShowTutorial(false); setShowRules(true); };
  const handleCloseRules = () => { setShowRules(false); localStorage.setItem(TUTORIAL_KEY, "true"); };

  const handleSelectAmistoso = () => {
    setLoading(true);
    setTimeout(() => { setViewMode("amistoso"); setLoading(false); }, 1500);
  };

  const handleSelectCampeonato = () => {
    setLoading(true);
    setTimeout(() => { setViewMode("campeonato"); setLoading(false); }, 1500);
  };

  const handleSelectOnline = () => setViewMode("online");
  const handleBackToMenu = () => setViewMode("menu");

  if (viewMode === "online") return <TrilhaOnlineLobby onBack={handleBackToMenu} mesaInicial={mesaInicial ?? undefined} />;

  if (loading) return <TrilhaLoadingScreen onCompleto={() => {}} />;

  return (
    <>
      {showTutorial && <TutorialModal onStart={handleStartTutorial} onShowRules={handleShowRules} />}
      {showRules && <RulesModal onClose={handleCloseRules} />}
      {showTrophies && <TrophiesModal onClose={() => setShowTrophies(false)} phases={phases} />}

      {viewMode === "menu" && (
        <ModeSelection
          onBack={onBack}
          onSelectAmistoso={handleSelectAmistoso}
          onSelectCampeonato={handleSelectCampeonato}
          onSelectOnline={handleSelectOnline}
          onShowRules={() => setShowRules(true)}
        />
      )}

      {viewMode === "amistoso" && (
        <AmistosoBoard
          key={`amistoso-${seed}`}
          onReset={() => setSeed(s => s + 1)}
          onBack={handleBackToMenu}
        />
      )}

      {viewMode === "campeonato" && (
        <CampeonatoBoard
          key={`champ-${champDifficulty}-${seed}`}
          difficulty={champDifficulty}
          onReset={() => setSeed(s => s + 1)}
          onBack={handleBackToMenu}
          phases={phases}
          currentPhaseConfig={currentPhaseConfig}
          onShowTrophies={() => setShowTrophies(true)}
        />
      )}
    </>
  );
}

/* ───────────── Mode Selection ───────────── */

function ModeSelection({ onBack, onSelectAmistoso, onSelectCampeonato, onSelectOnline, onShowRules }: {
  onBack?: (() => void) | undefined;
  onSelectAmistoso: () => void;
  onSelectCampeonato: () => void;
  onSelectOnline: () => void;
  onShowRules: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              TRILHA <span className="text-emerald-400 text-[10px] font-bold ml-1.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">FEB</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Estratégia Tática</p>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5 shadow-lg shadow-emerald-500/5">
            <Target className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            Campo de Batalha
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Nine Men's Morris — 9 peças, 24 interseções, 16 trilhas.
            <br />
            <span className="text-slate-500">Forme trilhas. Capture tropas. Domine o campo.</span>
          </p>
        </div>

        {/* Mode cards */}
        <div className="space-y-4 max-w-xl mx-auto">
          {/* Amistoso */}
          <button
            onClick={onSelectAmistoso}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent p-5 sm:p-6 text-left transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.06)] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Swords className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-black text-white tracking-wide">Amistoso</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Partida rápida 1v1 contra a IA. Treine estratégias sem pressão.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>

          {/* Campeonato */}
          <button
            onClick={onSelectCampeonato}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent p-5 sm:p-6 text-left transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_40px_rgba(59,130,246,0.06)] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-black text-white tracking-wide">Campeonato</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Fases progressivas com IA. Do Recruta ao General — torne-se Mestre da Trilha.</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">3 Fases</span>
                  <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">Troféus</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>

          {/* Online */}
          <button
            onClick={onSelectOnline}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent p-5 sm:p-6 text-left transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_40px_rgba(168,85,247,0.06)] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-black text-white tracking-wide">Online</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Desafie outros jogadores em tempo real. Crie mesas e compartilhe o link.</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded">1v1</span>
                  <span className="text-[10px] font-bold text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded">Tempo Real</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>
        </div>

        {/* Rules hint */}
        <div className="mt-10 text-center">
          <p className="text-[11px] text-slate-600">
            9 peças por jogador · 24 interseções · 16 trilhas · Derrote reduzindo a 2 peças
          </p>
        </div>
      </main>
    </div>
  );
}

/* ───────────── Amistoso (Friendly) ───────────── */

function AmistosoBoard({ onReset, onBack }: { onReset: () => void; onBack?: () => void }) {
  const game = useLocalGame("recruta", 1);
  const [selected, setSelected] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameResult, setGameResult] = useState<"victory" | "defeat" | "draw">("victory");
  const { markFirstGamePlayed } = useAdManager("/trilha");

  useEffect(() => {
    if (game.state.phase === "over" && !gameEnded && game.state.winner) {
      const result = game.state.winner === 1 ? "victory" : "defeat";
      const score = getTrilhaScore("recruta", result);
      addRankingEntry({ date: new Date().toISOString(), game: "trilha", difficulty: "recruta", result, score });
      markFirstGamePlayed();
      marcarRitualPendente(result === "victory" ? "vitoria" : "derrota");
      setFinalScore(score);
      setGameResult(result);
      setShowAdModal(true);
      setGameEnded(true);
    }
    if (game.state.phase !== "over") setGameEnded(false);
  }, [game.state.phase, game.state.winner, gameEnded, markFirstGamePlayed]);

  const targets = useMemo(() => {
    if (game.state.phase === "placing") return new Set(legalPlacements(game.state));
    if (selected !== null) return new Set(legalDestinations(game.state, selected));
    return new Set<number>();
  }, [game.state, selected]);

  const captureTargets = useMemo(() => new Set(game.captureTargets), [game.captureTargets]);

  const handleNodeClick = useCallback((node: number) => {
    if (game.thinking || game.state.phase === "over") return;
    if (game.pendingCapture) {
      if (captureTargets.has(node)) {
        game.commit({ from: game.lastMove?.from ?? null, to: game.lastMove?.to ?? 0, remove: node });
      }
      return;
    }
    if (game.state.phase === "placing") {
      if (targets.has(node)) game.commit({ from: null, to: node, remove: null });
      return;
    }
    if (game.state.turn === 1) {
      if (selected === null) {
        if (game.state.board[node] === 1) setSelected(node);
      } else {
        if (node === selected) setSelected(null);
        else if (targets.has(node)) { game.commit({ from: selected, to: node, remove: null }); setSelected(null); }
        else if (game.state.board[node] === 1) setSelected(node);
      }
    }
  }, [game, selected, targets, captureTargets]);

  const status = useMemo(() => {
    const s = game.state;
    if (s.phase === "over") {
      if (s.winner === 1) return "🏆 Vitória! O inimigo foi neutralizado.";
      if (s.reason === "blockade") return "💀 Derrota — suas tropas ficaram cercadas.";
      return "💀 Derrota — tropa reduzida abaixo do mínimo.";
    }
    if (game.pendingCapture) return "⚡ TRILHA FECHADA! Selecione a peça inimiga a neutralizar.";
    if (game.thinking) return "⏳ Inimigo calcula...";
    if (s.turn !== 1) return "Aguardando oponente.";
    if (s.phase === "placing") return `📍 Desdobre uma peça. Reserva: ${s.hand[1]}.`;
    if (canFly(s, 1)) return "✈️ Voo livre: salte para qualquer interseção.";
    if (selected === null) return "🎯 Selecione uma peça para manobrar.";
    return "➡️ Escolha o destino adjacente.";
  }, [game.state, game.thinking, game.pendingCapture, selected]);

  const handleWatchVideo = async (): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        let newScore = finalScore;
        if (gameResult === "victory") newScore = finalScore * 2;
        else if (gameResult === "defeat") newScore = finalScore + 2;
        addRankingEntry({ date: new Date().toISOString(), game: "trilha", difficulty: "recruta", result: gameResult, score: newScore });
        resolve(true);
      }, 1000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              AMISTOSO
            </h2>
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-500/70 font-bold">Partida Rápida</p>
          </div>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6 items-start flex-col lg:flex-row">
          <div className="flex flex-1 flex-col items-center w-full">
            <TrilhaBoard
              state={game.state}
              perspective={1}
              selected={selected}
              targets={targets}
              captureTargets={captureTargets}
              lastMove={game.lastMove}
              interactive={!game.thinking}
              onNodeClick={handleNodeClick}
            />
          </div>
          <HQPanel
            state={game.state}
            myPlayer={1}
            p1={{ name: "Pracinhas da FEB", slot: 1, subtitle: "Você" }}
            p2={{ name: "Comando Inimigo", slot: 2, subtitle: "Recruta" }}
            status={status}
            log={game.log}
            awaitingCapture={game.pendingCapture}
            onRestart={onReset}
            onResign={game.resign}
          />
        </div>
      </main>

      <GameEndAdModal isOpen={showAdModal} result={gameResult} baseScore={finalScore} onWatchVideo={handleWatchVideo} onClose={() => setShowAdModal(false)} />
      {gameEnded && !showAdModal && <MatchEndAdCard />}
    </div>
  );
}

/* ───────────── Campeonato (Championship) ───────────── */

function CampeonatoBoard({
  difficulty, onReset, onBack, phases, currentPhaseConfig, onShowTrophies,
}: {
  difficulty: Difficulty;
  onReset: () => void;
  onBack?: () => void;
  phases: ReturnType<typeof useTrilhaPhases>;
  currentPhaseConfig: Phase | null;
  onShowTrophies: () => void;
}) {
  const game = useLocalGame(difficulty, 1);
  const [selected, setSelected] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameResult, setGameResult] = useState<"victory" | "defeat" | "draw">("victory");
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);
  const { markFirstGamePlayed } = useAdManager("/trilha");

  useEffect(() => {
    if (game.state.phase === "over" && !gameEnded && game.state.winner) {
      const result = game.state.winner === 1 ? "victory" : "defeat";
      const score = getTrilhaScore(difficulty, result);
      addRankingEntry({ date: new Date().toISOString(), game: "trilha", difficulty, result, score });
      markFirstGamePlayed();
      marcarRitualPendente(result === "victory" ? "vitoria" : "derrota");

      if (result === "victory") {
        phases.recordWin();
        if (phases.phaseJustCompleted) setShowVictoryScreen(true);
        else { setFinalScore(score); setGameResult(result); setShowAdModal(true); }
      } else {
        phases.recordLoss();
        setFinalScore(score);
        setGameResult(result);
        setShowAdModal(true);
      }
      setGameEnded(true);
    }
    if (game.state.phase !== "over") setGameEnded(false);
  }, [game.state.phase, game.state.winner, difficulty, gameEnded, phases, markFirstGamePlayed]);

  const targets = useMemo(() => {
    if (game.state.phase === "placing") return new Set(legalPlacements(game.state));
    if (selected !== null) return new Set(legalDestinations(game.state, selected));
    return new Set<number>();
  }, [game.state, selected]);

  const captureTargets = useMemo(() => new Set(game.captureTargets), [game.captureTargets]);

  const handleNodeClick = useCallback((node: number) => {
    if (game.thinking || game.state.phase === "over") return;
    if (game.pendingCapture) {
      if (captureTargets.has(node)) {
        game.commit({ from: game.lastMove?.from ?? null, to: game.lastMove?.to ?? 0, remove: node });
      }
      return;
    }
    if (game.state.phase === "placing") {
      if (targets.has(node)) game.commit({ from: null, to: node, remove: null });
      return;
    }
    if (game.state.turn === 1) {
      if (selected === null) {
        if (game.state.board[node] === 1) setSelected(node);
      } else {
        if (node === selected) setSelected(null);
        else if (targets.has(node)) { game.commit({ from: selected, to: node, remove: null }); setSelected(null); }
        else if (game.state.board[node] === 1) setSelected(node);
      }
    }
  }, [game, selected, targets, captureTargets]);

  const status = useMemo(() => {
    const s = game.state;
    if (s.phase === "over") {
      if (s.winner === 1) return "🏆 Vitória! O inimigo foi neutralizado.";
      if (s.reason === "blockade") return "💀 Derrota — suas tropas ficaram cercadas.";
      return "💀 Derrota — tropa reduzida abaixo do mínimo.";
    }
    if (game.pendingCapture) return "⚡ TRILHA FECHADA! Selecione a peça inimiga.";
    if (game.thinking) return "⏳ Inimigo calcula...";
    if (s.turn !== 1) return "Aguardando oponente.";
    if (s.phase === "placing") return `📍 Desdobre uma peça. Reserva: ${s.hand[1]}.`;
    if (canFly(s, 1)) return "✈️ Voo livre: salte para qualquer interseção.";
    if (selected === null) return "🎯 Selecione uma peça para manobrar.";
    return "➡️ Escolha o destino adjacente.";
  }, [game.state, game.thinking, game.pendingCapture, selected]);

  const profile = AI_PROFILES[difficulty];

  const handleWatchVideo = async (): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        let newScore = finalScore;
        if (gameResult === "victory") newScore = finalScore * 2;
        else if (gameResult === "defeat") newScore = finalScore + 2;
        addRankingEntry({ date: new Date().toISOString(), game: "trilha", difficulty, result: gameResult, score: newScore });
        resolve(true);
      }, 1000);
    });
  };

  const handleNextPhase = () => { setShowVictoryScreen(false); phases.clearPhaseCompleted(); onReset(); };
  const handleContinueSameLevel = () => { setShowVictoryScreen(false); phases.clearPhaseCompleted(); onReset(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              CAMPEONATO <span className="text-blue-400 text-[10px] font-bold ml-1.5 bg-blue-500/10 px-1.5 py-0.5 rounded">FEB</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Fase Progressiva</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentPhaseConfig && (
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              {currentPhaseConfig.name}
            </div>
          )}
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
            <Trophy className="h-3 w-3" />
            {phases.progress.consecutiveWins} / {currentPhaseConfig?.requiredWins || 7}
          </div>
          <button onClick={onShowTrophies} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]">
            <Award className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Troféus</span>
          </button>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {phases.isAllPhasesComplete && (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl text-center shadow-lg shadow-amber-500/5">
            <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h3 className="font-display text-xl font-black text-amber-400 tracking-wide">MESTRE DA TRILHA!</h3>
            <p className="text-xs text-amber-400/70 mt-1">Todas as 3 fases conquistadas · {phases.progress.totalWins} vitórias</p>
          </div>
        )}

        <div className="flex gap-6 items-start flex-col lg:flex-row">
          <div className="flex flex-1 flex-col items-center w-full">
            <TrilhaBoard
              state={game.state}
              perspective={1}
              selected={selected}
              targets={targets}
              captureTargets={captureTargets}
              lastMove={game.lastMove}
              interactive={!game.thinking}
              onNodeClick={handleNodeClick}
            />
          </div>
          <HQPanel
            state={game.state}
            myPlayer={1}
            p1={{ name: "Pracinhas da FEB", slot: 1, subtitle: "Você" }}
            p2={{ name: "Comando Inimigo", slot: 2, subtitle: profile.label }}
            status={status}
            log={game.log}
            awaitingCapture={game.pendingCapture}
            onRestart={onReset}
            onResign={game.resign}
            difficulty={difficulty}
          />
        </div>
      </main>

      <GameEndAdModal isOpen={showAdModal} result={gameResult} baseScore={finalScore} onWatchVideo={handleWatchVideo} onClose={() => setShowAdModal(false)} />
      {gameEnded && !showAdModal && !showVictoryScreen && <MatchEndAdCard />}
      {showVictoryScreen && phases.phaseJustCompleted && (
        <TrilhaRPGScreen resultado="vitoria" fase={currentPhaseConfig?.difficulty || "recruta"} onContinue={handleContinueSameLevel} />
      )}
    </div>
  );
}

/* ───────────── Modals ───────────── */

function TutorialModal({ onStart, onShowRules }: { onStart: () => void; onShowRules: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/[0.08]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Target className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo à Trilha!</h2>
          <p className="text-sm text-slate-400">Nine Men's Morris — estratégia tática</p>
        </div>
        <div className="space-y-3 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-emerald-400" />
              Objetivo
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">Forme trilhas (3 peças em linha) para capturar peças inimigas. Reduza o adversário a 2 peças ou bloqueie seus movimentos.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
              <Gamepad2 className="h-4 w-4 text-blue-400" />
              Modos
            </h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• <strong className="text-white">Amistoso:</strong> partida rápida contra IA</li>
              <li>• <strong className="text-white">Campeonato:</strong> fases progressivas com troféus</li>
              <li>• <strong className="text-white">Online:</strong> desafie outros jogadores</li>
            </ul>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={onStart} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98]">
            Começar
          </button>
          <button onClick={onShowRules} className="w-full border border-white/10 bg-white/[0.04] text-slate-300 px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center gap-2">
            <BookOpen className="h-4 w-4" />
            Ver regras completas
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Regras da Trilha
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">🎯 Objetivo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Forme "trilhas" (3 peças em linha reta) para capturar peças inimigas. Reduza o adversário a 2 peças ou bloqueie todos os movimentos dele.</p>
          </section>
          <section>
            <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">📦 Fase 1 — Colocação</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Cada jogador coloca 9 peças, uma por vez</li>
              <li>Clique numa interseção vazia para colocar</li>
              <li>Forme uma trilha para capturar uma peça inimiga</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">♟️ Fase 2 — Movimentação</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Selecione sua peça e clique num destino adjacente vazio</li>
              <li>Com 3 peças restantes, pode "voar" para qualquer casa vazia</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">⚔️ Captura</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Ao fechar uma trilha, capture uma peça inimiga</li>
              <li>Não pode capturar peças em trilhas (a menos que todas estejam)</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">🏆 Vitória</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Reduzir o adversário a 2 peças</li>
              <li>Bloquear todos os movimentos do adversário</li>
            </ul>
          </section>
        </div>
        <button onClick={onClose} className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98]">
          Entendi — Vamos jogar!
        </button>
      </div>
    </div>
  );
}

function TrophiesModal({ onClose, phases }: { onClose: () => void; phases: ReturnType<typeof useTrilhaPhases> }) {
  const nextTrophy = phases.getNextTrophy();
  const progress = phases.getProgressToNextTrophy();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            Troféus
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {nextTrophy && (
          <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Próximo Troféu</span>
              <span className="text-xs text-slate-400">{nextTrophy.name}</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-2">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">{progress.current} / {progress.required}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {phases.trophies.map(trophy => (
            <div key={trophy.id} className={`p-3 rounded-xl border text-center transition-all ${trophy.achieved ? "bg-amber-500/[0.06] border-amber-500/20" : "bg-white/[0.02] border-white/[0.04] opacity-40"}`}>
              <div className={`text-3xl mb-1.5 ${trophy.achieved ? "" : "grayscale"}`}>{trophy.icon}</div>
              <h3 className={`text-xs font-bold ${trophy.color}`}>{trophy.name}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{trophy.description}</p>
              {trophy.achieved && <div className="mt-1.5 text-[10px] font-bold text-emerald-400">✓ Conquistado</div>}
            </div>
          ))}
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500">
            Total de vitórias: <span className="font-bold text-white">{phases.progress.totalWins}</span>
          </p>
        </div>

        <button onClick={onClose} className="w-full mt-5 border border-white/10 bg-white/[0.04] text-slate-300 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-white/[0.08] hover:text-white transition-all">
          Fechar
        </button>
      </div>
    </div>
  );
}
