import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Trophy, Lock, CheckCircle, XCircle } from "lucide-react";
import { HQPanel } from "./HQPanel";
import { TrilhaBoard } from "./TrilhaBoard";
import { AI_PROFILES, type Difficulty } from "@/lib/trilha/ai";
import { useLocalGame } from "@/hooks/useLocalGame";
import { useTrilhaChampionship } from "@/hooks/useTrilhaChampionship";
import { legalDestinations, legalPlacements, canFly, type Player } from "@/lib/trilha/engine";
import { addRankingEntry, getTrilhaScore } from "@/lib/ranking";

const ORDER: Difficulty[] = ["recruta", "sargento", "general"];

interface TrilhaGameProps {
  onBack?: () => void;
}

export function TrilhaGame({ onBack }: TrilhaGameProps = {}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("sargento");
  const [seed, setSeed] = useState(0);
  const [showChampionship, setShowChampionship] = useState(false);
  const [championshipMode, setChampionshipMode] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  
  const championship = useTrilhaChampionship();

  return (
    <TrilhaGameBoard
      key={`${difficulty}-${seed}-${championshipMode}-${currentMatchId}`}
      difficulty={difficulty}
      onDifficulty={(d) => setDifficulty(d)}
      onReset={() => setSeed((s) => s + 1)}
      onBack={onBack}
      showChampionship={showChampionship}
      setShowChampionship={setShowChampionship}
      championship={championship}
      championshipMode={championshipMode}
      setChampionshipMode={setChampionshipMode}
      currentMatchId={currentMatchId}
      setCurrentMatchId={setCurrentMatchId}
    />
  );
}

function TrilhaGameBoard({
  difficulty,
  onDifficulty,
  onReset,
  onBack,
  showChampionship,
  setShowChampionship,
  championship,
  championshipMode,
  setChampionshipMode,
  currentMatchId,
  setCurrentMatchId,
}: {
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onReset: () => void;
  onBack?: () => void;
  showChampionship: boolean;
  setShowChampionship: (show: boolean) => void;
  championship: ReturnType<typeof useTrilhaChampionship>;
  championshipMode: boolean;
  setChampionshipMode: (mode: boolean) => void;
  currentMatchId: string | null;
  setCurrentMatchId: (id: string | null) => void;
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
      
      // Se estiver em modo campeonato, registrar resultado
      if (championshipMode && currentMatchId) {
        championship.completeMatch(currentMatchId, result);
      }
      
      setGameEnded(true);
    }
    if (game.state.phase !== "over") {
      setGameEnded(false);
    }
  }, [game.state.phase, game.state.winner, difficulty, gameEnded, championshipMode, currentMatchId, championship]);
  
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

  const nextMatch = championship.getNextMatch();
  const canStartChampionship = !championship.championship.started;

  const startChampionshipMatch = () => {
    if (!championship.championship.started) {
      championship.startChampionship();
    }
    const match = championship.getNextMatch();
    if (match) {
      setChampionshipMode(true);
      setCurrentMatchId(match.id);
      onDifficulty(match.difficulty);
      setShowChampionship(false);
    }
  };

  const handleChampionshipReset = () => {
    championship.resetChampionship();
    setChampionshipMode(false);
    setCurrentMatchId(null);
    setShowChampionship(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {showChampionship && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Campeonato da Trilha
              </h2>
              <button
                onClick={() => setShowChampionship(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            </div>

            {!championship.championship.started ? (
              <div className="text-center py-8">
                <p className="text-lg mb-4">Enfrente 7 adversários em sequência!</p>
                <p className="text-muted-foreground mb-6">
                  Cada vitória vale pontos. Derrotas encerram o campeonato.
                </p>
                <button
                  onClick={startChampionshipMatch}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
                >
                  Iniciar Campeonato
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Progresso</span>
                    <span className="text-sm text-muted-foreground">
                      {championship.championship.completed} / {championship.championship.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">Pontuação</span>
                    <span className="text-lg font-bold text-yellow-500">
                      {championship.championship.totalScore}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {championship.championship.matches.map((match, index) => (
                    <div
                      key={match.id}
                      className={`p-4 rounded-lg border ${
                        match.completed
                          ? match.result === "victory"
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-red-500/10 border-red-500/30"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {match.completed ? (
                            match.result === "victory" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{match.opponent}</div>
                            <div className="text-sm text-muted-foreground">
                              {AI_PROFILES[match.difficulty].label} · {match.score} pts
                            </div>
                          </div>
                        </div>
                        {match.completed && match.result === "victory" && (
                          <span className="text-green-500 font-bold">+{match.score}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {championship.isChampion && (
                  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="text-xl font-bold text-yellow-500">CAMPEÃO!</h3>
                    <p className="text-muted-foreground">
                      Pontuação total: {championship.championship.totalScore}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex gap-2">
                  {nextMatch && !championship.isChampion && (
                    <button
                      onClick={startChampionshipMatch}
                      className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90"
                    >
                      Próximo Combate
                    </button>
                  )}
                  <button
                    onClick={handleChampionshipReset}
                    className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/80"
                  >
                    Reiniciar Campeonato
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
          {championshipMode && (
            <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {championship.championship.totalScore} pts
            </div>
          )}
          <button
            onClick={() => setShowChampionship(true)}
            className="flex items-center gap-2 bg-secondary/70 text-foreground hover:bg-secondary px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Campeonato</span>
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
              {championshipMode ? `Combate: ${nextMatch?.opponent || "Finalizado"}` : "Campanha"}
            </h1>
          </div>
          <div className="flex gap-2">
            {!championshipMode && ORDER.map((d) => (
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
            p2={{ name: championshipMode ? nextMatch?.opponent || "Adversário" : `Comando inimigo`, slot: 2, subtitle: profile.label }}
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
