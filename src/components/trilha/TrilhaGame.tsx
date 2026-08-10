import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Trophy, Target } from "lucide-react";
import { HQPanel } from "./HQPanel";
import { TrilhaBoard } from "./TrilhaBoard";
import { AI_PROFILES, type Difficulty } from "@/lib/trilha/ai";
import { useLocalGame } from "@/hooks/useLocalGame";
import { useTrilhaPhases } from "@/hooks/useTrilhaChampionship";
import { legalDestinations, legalPlacements, canFly, type Player } from "@/lib/trilha/engine";
import { addRankingEntry, getTrilhaScore } from "@/lib/ranking";

interface TrilhaGameProps {
  onBack?: () => void;
}

export function TrilhaGame({ onBack }: TrilhaGameProps = {}) {
  const [seed, setSeed] = useState(0);
  const phases = useTrilhaPhases();
  const currentPhaseConfig = phases.getCurrentPhaseConfig();

  // Inicia fases automaticamente se não começou
  useEffect(() => {
    if (!phases.progress.started) {
      phases.startPhases();
    }
  }, [phases]);

  const difficulty = (currentPhaseConfig?.difficulty || "recruta") as Difficulty;

  return (
    <TrilhaGameBoard
      key={`${difficulty}-${seed}-${phases.progress.currentPhase}`}
      difficulty={difficulty}
      onReset={() => setSeed((s) => s + 1)}
      onBack={onBack}
      phases={phases}
      currentPhaseConfig={currentPhaseConfig}
    />
  );
}

function TrilhaGameBoard({
  difficulty,
  onReset,
  onBack,
  phases,
  currentPhaseConfig,
}: {
  difficulty: Difficulty;
  onReset: () => void;
  onBack?: () => void;
  phases: ReturnType<typeof useTrilhaPhases>;
  currentPhaseConfig: ReturnType<typeof useTrilhaPhases>["getCurrentPhaseConfig"] | null;
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
        if (game.lastMove) {
          game.commit({ from: game.lastMove.from, to: game.lastMove.to, remove: node });
        }
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
