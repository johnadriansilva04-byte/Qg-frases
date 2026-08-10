import { useCallback, useEffect, useRef, useState } from "react";
import { NODE_LABELS } from "@/lib/trilha/board";
import { AI_PROFILES, chooseMove, type Difficulty } from "@/lib/trilha/ai";
import {
  applyMove,
  createInitialState,
  resign as resignState,
  validateMove,
  millsFormedAt,
  cloneState,
  opponent,
  type GameState,
  type Move,
  type Player,
} from "@/lib/trilha/engine";

export function describeMove(move: Move, actor: Player, ply: number): string {
  const who = actor === 1 ? "FEB" : "EIXO";
  const action =
    move.from === null
      ? `desdobra em ${NODE_LABELS[move.to]}`
      : `avança ${NODE_LABELS[move.from]} → ${NODE_LABELS[move.to]}`;
  const capture = move.remove !== null ? ` · TRILHA! neutraliza ${NODE_LABELS[move.remove]}` : "";
  return `#${String(ply + 1).padStart(2, "0")} ${who} ${action}${capture}`;
}

export interface LocalGame {
  state: GameState;
  log: string[];
  lastMove: Move | null;
  thinking: boolean;
  commit: (move: Move) => void;
  restart: () => void;
  resign: () => void;
  aiInfo: { depth: number; nodes: number; elapsedMs: number } | null;
}

/** Partida local contra a máquina; o humano é sempre o slot 1 (FEB). */
export function useLocalGame(difficulty: Difficulty, human: Player = 1): LocalGame {
  const [state, setState] = useState<GameState>(createInitialState);
  const [log, setLog] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);
  const [aiInfo, setAiInfo] = useState<LocalGame["aiInfo"]>(null);
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const timer = useRef<number | null>(null);

  const push = useCallback((s: GameState, move: Move) => {
    const actor = s.turn;
    const next = applyMove(s, move);
    setLog((l) => [describeMove(move, actor, s.ply), ...l].slice(0, 60));
    setLastMove(move);
    setState(next);
    return next;
  }, []);

  const commit = useCallback((move: Move) => {
    setState((cur) => {
      // Se há um movimento pendente (esperando captura), completa o movimento
      if (pendingMove) {
        const completeMove = { ...pendingMove, remove: move.remove };
        const next = applyMove(cur, completeMove);
        setLog((l: string[]) => [describeMove(completeMove, cur.turn, cur.ply), ...l].slice(0, 60));
        setLastMove(completeMove);
        setPendingMove(null);
        return next;
      }

      // Valida o movimento
      if (!validateMove(cur, move, cur.turn).ok) {
        return cur;
      }

      const actor = cur.turn;
      
      // Verifica se o movimento forma moinho
      const testBoard = [...cur.board];
      if (move.from !== null) testBoard[move.from] = 0;
      testBoard[move.to] = actor;
      
      const formed = millsFormedAt(testBoard, move.to, actor);
      
      // Se formou moinho e não tem captura no movimento, espera captura
      if (formed.length > 0 && move.remove === null) {
        // Atualiza o tabuleiro parcialmente mas mantém o turno
        const partial = cloneState(cur);
        if (move.from !== null) partial.board[move.from] = 0;
        partial.board[move.to] = actor;
        if (move.from === null) partial.hand[actor] = partial.hand[actor] - 1;
        setPendingMove(move);
        setLastMove(move);
        return partial;
      }

      // Movimento normal ou com captura incluída
      const next = applyMove(cur, move);
      setLog((l: string[]) => [describeMove(move, actor, cur.ply), ...l].slice(0, 60));
      setLastMove(move);
      return next;
    });
  }, [pendingMove]);

  // Turno da máquina
  useEffect(() => {
    if (state.phase === "over" || state.turn === human) return;
    setThinking(true);
    const profile = AI_PROFILES[difficulty];
    timer.current = window.setTimeout(
      () => {
        const decision = chooseMove(state, difficulty);
        setThinking(false);
        setAiInfo({ depth: decision.depth, nodes: decision.nodes, elapsedMs: decision.elapsedMs });
        if (!decision.move) return;
        push(state, decision.move);
      },
      Math.max(320, profile.timeBudgetMs * 0.35),
    );

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      setThinking(false);
    };
  }, [difficulty, human, push, state]);

  const restart = useCallback(() => {
    setState(createInitialState());
    setLog([]);
    setLastMove(null);
    setAiInfo(null);
    setPendingMove(null);
  }, []);

  const resign = useCallback(() => {
    setState((cur) => resignState(cur, human));
    setLog((l) => ["Comando brasileiro solicitou cessar-fogo.", ...l]);
    setPendingMove(null);
  }, [human]);

  return { state, log, lastMove, thinking, commit, restart, resign, aiInfo };
}
