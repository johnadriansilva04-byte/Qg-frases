import { useMemo, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { HQPanel } from "./HQPanel";
import { TrilhaBoard } from "./TrilhaBoard";
import { AI_PROFILES, type Difficulty } from "@/lib/trilha/ai";
import { useLocalGame } from "@/hooks/useLocalGame";
import { legalDestinations, legalPlacements, removableTargets, type Player } from "@/lib/trilha/engine";
import { addRankingEntry, getTrilhaScore } from "@/lib/ranking";

const ORDER: Difficulty[] = ["recruta", "sargento", "general"];

interface TrilhaGameProps {
  onBack?: () => void;
}

export function TrilhaGame({ onBack }: TrilhaGameProps = {}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("sargento");
  const [seed, setSeed] = useState(0);
  return (
    <TrilhaGameBoard
      key={`${difficulty}-${seed}`}
      difficulty={difficulty}
      onDifficulty={(d) => setDifficulty(d)}
      onReset={() => setSeed((s) => s + 1)}
      onBack={onBack}
    />
  );
}

function TrilhaGameBoard({
  difficulty,
  onDifficulty,
  onReset,
  onBack,
}: {
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onReset: () => void;
  onBack?: () => void;
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
      setGameEnded(true);
    }
    if (game.state.phase !== "over") {
      setGameEnded(false);
    }
  }, [game.state.phase, game.state.winner, difficulty, gameEnded]);
  
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
    if (game.state.phase === "over") return new Set<number>();
    const lastMove = game.lastMove;
    if (!lastMove || lastMove.remove !== null) return new Set<number>();
    
    // Verifica se o último movimento formou um moinho
    const actor = game.state.turn === 1 ? 2 : 1; // O oponente do turno atual fez o movimento
    const foe = actor;
    return new Set(removableTargets(game.state.board, foe));
  }, [game.state, game.lastMove]);

  const awaitingCapture = captureTargets.size > 0;

  const handleNodeClick = (node: number) => {
    if (game.thinking || game.state.phase === "over") return;
    
    if (awaitingCapture) {
      if (captureTargets.has(node)) {
        const lastMove = game.lastMove;
        if (lastMove) {
          game.commit({ from: lastMove.from, to: lastMove.to, remove: node });
        }
      }
      return;
    }

    if (game.state.phase === "placing") {
      if (targets.has(node)) {
        game.commit({ from: null, to: node, remove: null });
      }
      return;
    }

    if (game.state.turn === 1) {
      if (selected === null) {
        if (game.state.board[node] === 1) {
          setSelected(node);
        }
      } else {
        if (node === selected) {
          setSelected(null);
        } else if (targets.has(node)) {
          game.commit({ from: selected, to: node, remove: null });
          setSelected(null);
        } else if (game.state.board[node] === 1) {
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
    if (awaitingCapture)
      return "TRILHA FECHADA! Selecione a peça inimiga a neutralizar.";
    if (game.thinking) return "Rádio em silêncio... o estado-maior inimigo calcula a resposta.";
    if (s.turn !== 1) return "Aguardando o inimigo.";
    if (s.phase === "placing") return `Desdobre um pracinha. Reserva: ${s.hand[1]}.`;
    if (selected === null)
      return "Selecione um pracinha para manobrar.";
    return "Escolha a interseção adjacente de destino.";
  }, [
    game.state,
    game.thinking,
    awaitingCapture,
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
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar à Cidadela</span>
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campanha</h1>
          </div>
          <div className="flex gap-2">
            {ORDER.map((d) => (
              <button
                key={d}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  d === difficulty
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70 text-foreground hover:bg-secondary"
                }`}
                onClick={() => {
                  onDifficulty(d);
                  onReset();
                }}
              >
                {AI_PROFILES[d].label}
              </button>
            ))}
          </div>
        </div>

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
            awaitingCapture={awaitingCapture}
            onRestart={onReset}
            onResign={game.resign}
          />
        </div>
      </main>
    </div>
  );
}
