import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Trophy, Target, BookOpen, X, Award, Users, Gamepad2 } from "lucide-react";
import { armarSponsor } from "@/lib/sponsorGate";
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
}

export function TrilhaGame({ onBack }: TrilhaGameProps = {}) {
  const [seed, setSeed] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    return !seen;
  });
  const [showRules, setShowRules] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [gameMode, setGameMode] = useState<"career" | "online" | null>(null);
  const [loading, setLoading] = useState(false);
  const phases = useTrilhaPhases();
  const currentPhaseConfig = phases.getCurrentPhaseConfig();
  const { markFirstGamePlayed } = useAdManager("/trilha");

  // Inicia fases automaticamente se não começou
  useEffect(() => {
    if (!phases.progress.started) {
      phases.startPhases();
    }
  }, [phases]);

  const difficulty = (currentPhaseConfig?.difficulty || "recruta") as Difficulty;

  const handleStartGame = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setShowTutorial(false);
  };

  const handleShowRules = () => {
    setShowTutorial(false);
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
    localStorage.setItem(TUTORIAL_KEY, "true");
  };

  const handleSelectCareerMode = () => {
    setLoading(true);
    setTimeout(() => {
      setGameMode("career");
      setShowModeSelection(false);
      setLoading(false);
    }, 2000);
  };

  const handleSelectOnlineMode = () => {
    setGameMode("online");
    setShowModeSelection(false);
  };

  const handleBackToModeSelection = () => {
    setGameMode(null);
    setShowModeSelection(true);
  };

  // Se estiver no modo online, renderiza o lobby online
  if (gameMode === "online") {
    return <TrilhaOnlineLobby onBack={handleBackToModeSelection} />;
  }

  // Tela de loading
  if (loading) {
    return <TrilhaLoadingScreen onCompleto={() => {}} />;
  }

  return (
    <>
      {showTutorial && <TutorialModal onStart={handleStartGame} onShowRules={handleShowRules} />}
      {showRules && <RulesModal onClose={handleCloseRules} />}
      {showTrophies && <TrophiesModal onClose={() => setShowTrophies(false)} phases={phases} />}
      {showModeSelection && (
        <ModeSelection
          onBack={onBack}
          onSelectCareer={handleSelectCareerMode}
          onSelectOnline={handleSelectOnlineMode}
        />
      )}
      {!showModeSelection && gameMode === "career" && (
        <TrilhaGameBoard
          key={`${difficulty}-${seed}`}
          difficulty={difficulty}
          onReset={() => setSeed((s) => s + 1)}
          onBack={handleBackToModeSelection}
          phases={phases}
          currentPhaseConfig={currentPhaseConfig}
          onShowTrophies={() => setShowTrophies(true)}
        />
      )}
    </>
  );
}

function ModeSelection({ onBack, onSelectCareer, onSelectOnline }: { onBack: (() => void) | undefined; onSelectCareer: () => void; onSelectOnline: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#0a0f1a]">
      <header className="flex items-center justify-between border-b border-slate-700/40 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              TRILHA <span className="text-emerald-400 text-xs font-bold ml-1">FEB</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Estratégia Tática</p>
          </div>
        </div>
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 border border-slate-600/40 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <Target className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            Escolha o Campo de Batalha
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Trilha — jogo de estratégia mental onde formações de três peças neutralizam o inimigo.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid gap-5 md:grid-cols-2 max-w-2xl mx-auto">
          {/* Career mode */}
          <button
            onClick={onSelectCareer}
            className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-slate-950/60 p-6 text-left transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-wide">Modo Carreira</h3>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-blue-400/70 font-bold">Offline · IA</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Enfrente a IA em fases progressivas. Do Recruta ao General — complete todas as fases para se tornar o Mestre da Trilha.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>3 Fases · Sistema de Troféus</span>
              </div>
            </div>
          </button>

          {/* Online mode */}
          <button
            onClick={onSelectOnline}
            className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-950/60 p-6 text-left transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-wide">Modo Online</h3>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-400/70 font-bold">Multijogador</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Desafie outros jogadores em tempo real. Crie mesas, convide amigos e prove sua estratégia.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Users className="h-3.5 w-3.5" />
                <span>1v1 · Salas Privadas</span>
              </div>
            </div>
          </button>
        </div>

        {/* Rules hint */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-600">
            9 peças por jogador · 24 interseções · 16 trilhas possíveis · Derrote o adversário reduzindo-o a 2 peças
          </p>
        </div>
      </main>
    </div>
  );
}

function TutorialModal({ onStart, onShowRules }: { onStart: () => void; onShowRules: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-700/50">
        <div className="text-center mb-6">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Bem-vindo à Trilha!</h2>
          <p className="text-muted-foreground">Jogo de estratégia tática da FEB</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sistema de Fases
            </h3>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>🎯 <strong>Fase 1:</strong> Ganhe 7 jogos consecutivos (Recruta)</li>
              <li>⚔️ <strong>Fase 2:</strong> Ganhe 10 jogos consecutivos (Sargento)</li>
              <li>🏆 <strong>Fase 3:</strong> Ganhe 15 jogos consecutivos (General)</li>
            </ul>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Ao perder, seu contador de vitórias consecutivas reseta. 
              Complete todas as fases para se tornar o <strong>Mestre da Trilha</strong>!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onStart}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98]"
          >
            Já sei jogar — Começar
          </button>
          <button
            onClick={onShowRules}
            className="w-full border border-slate-600/40 bg-slate-800/60 text-slate-300 px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-700/60 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Quero aprender as regras
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Como Jogar Trilha
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2">🎯 Objetivo</h3>
            <p className="text-slate-400">
              Forme "trilhas" (três peças em linha reta) para capturar peças do inimigo. 
              Reduza o adversário a 2 peças ou bloqueie todos os movimentos dele para vencer.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">📦 Fase de Colocação</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Cada jogador coloca 9 peças, uma por vez</li>
              <li>Clique em uma interseção vazia para colocar sua peça</li>
              <li>Forme uma trilha para capturar uma peça inimiga</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">♟️ Fase de Movimentação</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Selecione sua peça clicando nela</li>
              <li>Clique em uma interseção adjacente vazia para mover</li>
              <li>Quando restar apenas 3 peças, você pode "voar" para qualquer casa vazia</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">⚔️ Captura</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Ao formar uma trilha, você deve remover uma peça inimiga</li>
              <li>Não pode remover peças que estão em trilhas (a menos que todas estejam)</li>
              <li>Clique na peça inimiga que deseja capturar</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">🏆 Condições de Vitória</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Reduzir o adversário a 2 peças</li>
              <li>Bloquear todos os movimentos do adversário</li>
            </ul>
          </section>

          <section className="bg-primary/10 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-primary">💡 Dicas</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tente formar trilhas duplas (duas trilhas ao mesmo tempo)</li>
              <li>Bloqueie as trilhas do adversário</li>
              <li>Proteja suas peças em trilhas</li>
              <li>Planeje seus movimentos com antecedência</li>
            </ul>
          </section>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98]"
        >
          Entendi — Começar Jogo
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
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-500" />
            Sala de Troféus
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Próximo Troféu</span>
            <span className="text-sm text-muted-foreground">
              {nextTrophy ? nextTrophy.name : "Todos conquistados!"}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-500" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {nextTrophy ? `${progress.current} / ${progress.required}` : "Parabéns!"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {phases.trophies.map((trophy) => (
            <div
              key={trophy.id}
              className={`p-4 rounded-lg border text-center ${
                trophy.achieved
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-muted/50 border-muted opacity-50"
              }`}
            >
              <div className={`text-4xl mb-2 ${trophy.achieved ? "" : "grayscale"}`}>
                {trophy.icon}
              </div>
              <h3 className={`font-semibold ${trophy.color}`}>{trophy.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{trophy.description}</p>
              {trophy.achieved && (
                <div className="mt-2 text-xs font-medium text-green-500">✓ Conquistado</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Total de vitórias: <span className="font-bold text-foreground">{phases.progress.totalWins}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function TrilhaGameBoard({
  difficulty,
  onReset,
  onBack,
  phases,
  currentPhaseConfig,
  onShowTrophies,
}: {
  difficulty: Difficulty;
  onReset: () => void;
  onBack?: () => void;
  phases: ReturnType<typeof useTrilhaPhases>;
  currentPhaseConfig: Phase | null;
  onShowTrophies: () => void;
}) {
  const game = useLocalGame(difficulty, 1);
  const { markFirstGamePlayed } = useAdManager("/trilha");
  
  const [selected, setSelected] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameResult, setGameResult] = useState<"victory" | "defeat" | "draw">("victory");
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);

  // Salvar resultado no ranking quando o jogo termina
  useEffect(() => {
    if (game.state.phase === "over" && !gameEnded && game.state.winner) {
      const result = game.state.winner === 1 ? "victory" : "defeat";
      const score = getTrilhaScore(difficulty, result);
      addRankingEntry({
        date: new Date().toISOString(),
        game: "trilha",
        difficulty,
        result,
        score,
      });

      // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
      markFirstGamePlayed();
      // Ritual da Trilha: mesmo universo do Modo Carreira — marcar o resultado
      // para o BotaoGame integrar na carreira (SOV, sombra, rede social).
      marcarRitualPendente(result === "victory" ? "vitoria" : "derrota");

      // Registrar vitória/derrota no sistema de fases
      console.log('[TrilhaGame] Resultado:', result, 'Fase atual:', phases.progress.currentPhase);
      if (result === "victory") {
        phases.recordWin();
        console.log('[TrilhaGame] Vitória registrada, nova fase após delay:', phases.progress.currentPhase);

        // Mostrar tela de vitória se completou uma fase
        if (phases.phaseJustCompleted) {
          setShowVictoryScreen(true);
        } else {
          // Se não completou fase, mostra modal de anúncio normal
          setFinalScore(score);
          setGameResult(result);
          setShowAdModal(true);
        }
      } else {
        phases.recordLoss();
        setFinalScore(score);
        setGameResult(result);
        setShowAdModal(true);
      }

      setGameEnded(true);
    }
    if (game.state.phase !== "over") {
      setGameEnded(false);
    }
  }, [game.state.phase, game.state.winner, difficulty, gameEnded, phases, markFirstGamePlayed]);
  
  const targets = useMemo(() => {
    if (game.state.phase === "placing") {
      return new Set(legalPlacements(game.state));
    }
    if (selected !== null) {
      return new Set(legalDestinations(game.state, selected));
    }
    return new Set<number>();
  }, [game.state, selected]);

  const captureTargets = useMemo(() => {
    return new Set(game.captureTargets);
  }, [game.captureTargets]);

  const handleNodeClick = (node: number) => {
    if (game.thinking || game.state.phase === "over") return;
    
    // Se está esperando captura
    if (game.pendingCapture) {
      if (captureTargets.has(node)) {
        // Toca som de captura
        playCaptureSound();
        // Usa o movimento pendente do lastMove
        const from = game.lastMove?.from || null;
        const to = game.lastMove?.to ?? 0; // Usa 0 como fallback se for undefined
        game.commit({ from, to, remove: node });
      }
      return;
    }

    // Fase de colocação de peças
    if (game.state.phase === "placing") {
      if (targets.has(node)) {
        game.commit({ from: null, to: node, remove: null });
      }
      return;
    }

    // Fase de movimentação - apenas turno do jogador
    if (game.state.turn === 1) {
      if (selected === null) {
        // Selecionar peça para mover
        if (game.state.board[node] === 1) {
          setSelected(node);
        }
      } else {
        // Já tem peça selecionada
        if (node === selected) {
          // Deselecionar
          setSelected(null);
        } else if (targets.has(node)) {
          // Mover para destino válido
          game.commit({ from: selected, to: node, remove: null });
          setSelected(null);
        } else if (game.state.board[node] === 1) {
          // Selecionar outra peça própria
          setSelected(node);
        }
      }
    }
  };

  const playCaptureSound = () => {
    // Cria um som simples usando Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Fallback silencioso se Web Audio API não estiver disponível
      console.log('Audio not available');
    }
  };

  const status = useMemo(() => {
    const s = game.state;
    if (s.phase === "over") {
      if (s.winner === 1) return "Vitória brasileira! O inimigo bateu em retirada.";
      const motive =
        s.reason === "blockade"
          ? "Suas tropas ficaram cercadas sem manobra."
          : s.reason === "resign"
            ? "Cessar-fogo solicitado."
            : "Sua tropa foi reduzida abaixo do mínimo operacional.";
      return `Derrota. ${motive}`;
    }
    if (game.pendingCapture)
      return "TRILHA FECHADA! Selecione a peça inimiga a neutralizar.";
    if (game.thinking) return "Rádio em silêncio... o estado-maior inimigo calcula a resposta.";
    if (s.turn !== 1) return "Aguardando o inimigo.";
    if (s.phase === "placing") return `Desdobre um pracinha. Reserva: ${s.hand[1]}.`;
    const flying = canFly(s, 1);
    if (flying) return "Esquadrão em voo: salte para qualquer interseção vazia.";
    if (selected === null)
      return "Selecione um pracinha para manobrar.";
    return "Escolha a interseção adjacente de destino.";
  }, [
    game.state,
    game.thinking,
    game.pendingCapture,
    selected,
  ]);

  const profile = AI_PROFILES[difficulty];

  const handleWatchVideo = async (): Promise<boolean> => {
    // Simular carregamento do anúncio do Google AdSense
    // Na implementação real, isso usaria a API do Google AdSense para rewarded ads
    return new Promise((resolve) => {
      // Simular delay de carregamento do anúncio
      setTimeout(() => {
        // Calcular novos pontos baseados no resultado
        let newScore = finalScore;
        
        if (gameResult === "victory") {
          // Vitória: 3 pontos → 6 pontos (dobro)
          newScore = finalScore * 2;
        } else if (gameResult === "defeat") {
          // Derrota: -3 pontos → -1 ponto (recupera 2)
          newScore = finalScore + 2;
        } else if (gameResult === "draw") {
          // Empate: 1 ponto → 2 pontos (dobro)
          newScore = finalScore * 2;
        }
        
        // Atualizar o ranking com os novos pontos
        addRankingEntry({
          date: new Date().toISOString(),
          game: "trilha",
          difficulty,
          result: gameResult,
          score: newScore,
        });
        
        // Aqui seria a lógica real do Google AdSense
        // Por enquanto, retorna true para simular sucesso
        // Quando integrado com AdSense real, verificaria se o anúncio foi carregado
        resolve(true);
      }, 1000);
    });
  };

  const handleCloseAdModal = () => {
    setShowAdModal(false);
  };

  const handleNextPhase = () => {
    setShowVictoryScreen(false);
    phases.clearPhaseCompleted();
    onReset(); // Reinicia o jogo com a nova dificuldade
  };

  const handleContinueSameLevel = () => {
    setShowVictoryScreen(false);
    phases.clearPhaseCompleted();
    onReset(); // Reinicia no mesmo nível
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#0a0f1a]">
      <header className="flex items-center justify-between border-b border-slate-700/40 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              A TRILHA <span className="text-emerald-400 text-xs font-bold ml-1">FEB</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Estratégia Tática · FEB vs Eixo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentPhaseConfig && (
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {currentPhaseConfig.name}
            </div>
          )}
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            {phases.progress.consecutiveWins} / {currentPhaseConfig?.requiredWins || 7}
          </div>
          <button
            data-tour="trilha-trofeus"
            onClick={onShowTrophies}
            className="flex items-center gap-2 border border-slate-600/40 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            <Award className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Troféus</span>
          </button>
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 border border-slate-600/40 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">
              {currentPhaseConfig?.name || "Campanha"}
            </h1>
            <p className="text-xs text-slate-400">
              {phases.isAllPhasesComplete 
                ? "Parabéns! Você completou todas as fases!" 
                : `Ganhe ${currentPhaseConfig?.requiredWins || 7} jogos consecutivos para avançar`}
            </p>
          </div>
          <button
            onClick={phases.resetPhases}
            className="border border-slate-600/40 bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            Reiniciar
          </button>
        </div>

        {phases.isAllPhasesComplete && (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl text-center shadow-lg shadow-amber-500/5">
            <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h3 className="font-display text-xl font-black text-amber-400 tracking-wide">MESTRE DA TRILHA!</h3>
            <p className="text-xs text-amber-400/70 mt-1">
              Todas as 3 fases conquistadas · {phases.progress.totalWins} vitórias
            </p>
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
            p2={{ name: `Comando inimigo`, slot: 2, subtitle: profile.label }}
            status={status}
            log={game.log}
            awaitingCapture={game.pendingCapture}
            onRestart={onReset}
            onResign={game.resign}
            difficulty={difficulty}
          />
        </div>
      </main>

      {/* Modal de anúncio para dobrar pontos após fim de jogo */}
      <GameEndAdModal
        isOpen={showAdModal}
        result={gameResult}
        baseScore={finalScore}
        onWatchVideo={handleWatchVideo}
        onClose={handleCloseAdModal}
      />

      {/* Card de anúncio no fim de partida (career mode) */}
      {gameEnded && !showAdModal && !showVictoryScreen && <MatchEndAdCard />}

      {/* Tela de vitória ao completar fase */}
      {showVictoryScreen && phases.phaseJustCompleted && (
        <TrilhaRPGScreen
          resultado="vitoria"
          fase={currentPhaseConfig?.difficulty || "recruta"}
          onContinue={handleContinueSameLevel}
        />
      )}
    </div>
  );
}
