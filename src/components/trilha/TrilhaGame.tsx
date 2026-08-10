import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Trophy, Target, BookOpen, X, Award } from "lucide-react";
import { HQPanel } from "./HQPanel";
import { TrilhaBoard } from "./TrilhaBoard";
import { AI_PROFILES, type Difficulty } from "@/lib/trilha/ai";
import { useLocalGame } from "@/hooks/useLocalGame";
import { useTrilhaPhases } from "@/hooks/useTrilhaChampionship";
import { legalDestinations, legalPlacements, canFly, type Player } from "@/lib/trilha/engine";
import { addRankingEntry, getTrilhaScore } from "@/lib/ranking";

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
  const phases = useTrilhaPhases();
  const currentPhaseConfig = phases.getCurrentPhaseConfig();

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

  return (
    <>
      {showTutorial && <TutorialModal onStart={handleStartGame} onShowRules={handleShowRules} />}
      {showRules && <RulesModal onClose={handleCloseRules} />}
      {showTrophies && <TrophiesModal onClose={() => setShowTrophies(false)} phases={phases} />}
      <TrilhaGameBoard
        key={`${difficulty}-${seed}-${phases.progress.currentPhase}`}
        difficulty={difficulty}
        onReset={() => setSeed((s) => s + 1)}
        onBack={onBack}
        phases={phases}
        currentPhaseConfig={currentPhaseConfig}
        onShowTrophies={() => setShowTrophies(true)}
      />
    </>
  );
}

function TutorialModal({ onStart, onShowRules }: { onStart: () => void; onShowRules: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-lg w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Bem-vindo à Trilha!</h2>
          <p className="text-muted-foreground">Jogo de estratégia tática da FEB</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-primary/10 p-4 rounded-lg">
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
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Já sei jogar - Começar
          </button>
          <button
            onClick={onShowRules}
            className="w-full bg-secondary/70 text-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2"
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Como Jogar Trilha
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2">🎯 Objetivo</h3>
            <p className="text-muted-foreground">
              Forme "trilhas" (três peças em linha reta) para capturar peças do inimigo. 
              Reduza o adversário a 2 peças ou bloqueie todos os movimentos dele para vencer.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">📦 Fase de Colocação</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Cada jogador coloca 9 peças, uma por vez</li>
              <li>Clique em uma interseção vazia para colocar sua peça</li>
              <li>Forme uma trilha para capturar uma peça inimiga</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">♟️ Fase de Movimentação</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Selecione sua peça clicando nela</li>
              <li>Clique em uma interseção adjacente vazia para mover</li>
              <li>Quando restar apenas 3 peças, você pode "voar" para qualquer casa vazia</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">⚔️ Captura</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Ao formar uma trilha, você deve remover uma peça inimiga</li>
              <li>Não pode remover peças que estão em trilhas (a menos que todas estejam)</li>
              <li>Clique na peça inimiga que deseja capturar</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">🏆 Condições de Vitória</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
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
          className="w-full mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Entendi! Começar Jogo
        </button>
      </div>
    </div>
  );
}

function TrophiesModal({ onClose, phases }: { onClose: () => void; phases: ReturnType<typeof useTrilhaPhases> }) {
  const nextTrophy = phases.getNextTrophy();
  const progress = phases.getProgressToNextTrophy();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
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
  currentPhaseConfig: ReturnType<typeof useTrilhaPhases>["getCurrentPhaseConfig"] | null;
  onShowTrophies: () => void;
}) {
  const game = useLocalGame(difficulty, 1);
  
  const [selected, setSelected] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);

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
      
      // Registrar vitória/derrota no sistema de fases
      if (result === "victory") {
        phases.recordWin();
      } else {
        phases.recordLoss();
      }
      
      setGameEnded(true);
    }
    if (game.state.phase !== "over") {
      setGameEnded(false);
    }
  }, [game.state.phase, game.state.winner, difficulty, gameEnded, phases]);
  
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
        // Usa o movimento pendente armazenado no estado do hook
        const from = game.lastMove?.from || null;
        const to = game.lastMove?.to || node;
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

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="texto-marca text-lg sm:text-xl">A TRILHA</h2>
            <p className="text-xs text-muted-foreground">
              Jogo de estratégia tática · FEB vs Eixo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentPhaseConfig && (
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4" />
              {currentPhaseConfig.name}
            </div>
          )}
          <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            {phases.progress.consecutiveWins} / {currentPhaseConfig?.requiredWins || 7}
          </div>
          <button
            onClick={onShowTrophies}
            className="flex items-center gap-2 bg-secondary/70 text-foreground hover:bg-secondary px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Troféus</span>
          </button>
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar à Cidadela</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {currentPhaseConfig?.name || "Campanha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {phases.isAllPhasesComplete 
                ? "Parabéns! Você completou todas as fases!" 
                : `Ganhe ${currentPhaseConfig?.requiredWins || 7} jogos consecutivos para avançar`}
            </p>
          </div>
          <button
            onClick={phases.resetPhases}
            className="bg-secondary/70 text-foreground hover:bg-secondary px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Reiniciar Progresso
          </button>
        </div>

        {phases.isAllPhasesComplete && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-yellow-500">MESTRE DA TRILHA!</h3>
            <p className="text-muted-foreground">
              Você completou todas as 3 fases com {phases.progress.totalWins} vitórias totais!
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
          />
        </div>
      </main>
    </div>
  );
}
