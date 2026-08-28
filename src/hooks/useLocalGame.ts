import { useCallback, useEffect, useRef, useState } from "react";
import { NODE_LABELS } from "@/lib/trilha/board";
import { AI_PROFILES, chooseMove, type Difficulty } from "@/lib/trilha/ai";
import {
  applyMove,
  cloneState,
  createInitialState,
  resign as resignState,
  validateMove,
  millsFormedAt,
  opponent,
  removableTargets,
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
  pendingCapture: boolean;
  captureTargets: number[];
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

  const commit = useCallback((move: Move) => {
    setState((cur) => {
      // Se há movimento pendente esperando captura, completa o movimento primeiro
      if (pendingMove) {
        const completeMove = { ...pendingMove, remove: move.remove };
        // Não usar applyMove pois a mão já foi decrementada no movimento parcial
        const next = cloneState(cur);
        next.board[completeMove.remove!] = 0;
        next.captured[cur.turn] += 1;
        next.ply += 1;
        next.turn = opponent(cur.turn);
        setLog((l: string[]) => [describeMove(completeMove, cur.turn, cur.ply), ...l].slice(0, 60));
        setLastMove(completeMove);
        setPendingMove(null);
        return next;
      }

      // Valida o movimento
      const validation = validateMove(cur, move, cur.turn);
      if (!validation.ok) {
        return cur;
      }

      const actor = cur.turn;
      
      // Verifica se o movimento forma moinho
      const testBoard = [...cur.board];
      if (move.from !== null) testBoard[move.from] = 0;
      testBoard[move.to] = actor;
      
      const formed = millsFormedAt(testBoard, move.to, actor);
      
      // Se formou moinho e não tem captura no movimento, espera captura (sistema de duas etapas)
      if (formed.length > 0 && move.remove === null) {
        const partial = cloneState(cur);
        if (move.from !== null) partial.board[move.from] = 0;
        partial.board[move.to] = actor;
        // Decrementa da mão imediatamente para não permitir colocar mais de 9 peças
        if (move.from === null) {
          partial.hand[actor] -= 1;
        }
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
    if (state.phase === "over" || state.turn === human || pendingMove) return;
    setThinking(true);
    const profile = AI_PROFILES[difficulty];
    timer.current = window.setTimeout(
      () => {
        const decision = chooseMove(state, difficulty);
        setThinking(false);
        setAiInfo({ depth: decision.depth, nodes: decision.nodes, elapsedMs: decision.elapsedMs });
        if (!decision.move) return;
        
        const move = decision.move;
        
        // Verifica se o movimento forma moinho
        const testBoard = [...state.board];
        if (move.from !== null) testBoard[move.from] = 0;
        testBoard[move.to] = state.turn;
        const formed = millsFormedAt(testBoard, move.to, state.turn);
        
        // Se formou moinho e não tem captura, IA precisa escolher captura
        if (formed.length > 0 && move.remove === null) {
          const targets = removableTargets(testBoard, opponent(state.turn));
          if (targets.length > 0) {
            // IA escolhe automaticamente a melhor captura
            const captureTarget = targets[0] ?? null; // Garante que seja null se undefined
            const completeMove = { ...move, remove: captureTarget };
            setState((cur) => {
              const next = applyMove(cur, completeMove);
              setLog((l: string[]) => [describeMove(completeMove, cur.turn, cur.ply), ...l].slice(0, 60));
              setLastMove(completeMove);
              return next;
            });
            return;
          }
        }
        
        // Movimento normal
        setState((cur) => {
          const next = applyMove(cur, move);
          setLog((l: string[]) => [describeMove(move, cur.turn, cur.ply), ...l].slice(0, 60));
          setLastMove(move);
          return next;
        });
      },
      Math.max(320, profile.timeBudgetMs * 0.35),
    );

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      setThinking(false);
    };
  }, [difficulty, human, state, pendingMove]);

  const restart = useCallback(() => {
    setState(createInitialState());
    setLog([]);
    setLastMove(null);
    setAiInfo(null);
    setPendingMove(null);
  }, []);

  const resign = useCallback(() => {
    setState((cur) => resignState(cur, human));
    setLog((l: string[]) => ["Comando brasileiro solicitou cessar-fogo.", ...l]);
    setPendingMove(null);
  }, [human]);

  const captureTargets = pendingMove ? (() => {
    const boardWithMove = [...state.board];
    if (pendingMove.from !== null) boardWithMove[pendingMove.from] = 0;
    boardWithMove[pendingMove.to] = state.turn;
    return removableTargets(boardWithMove, opponent(state.turn));
  })() : [];

  return { state, log, lastMove, thinking, commit, restart, resign, aiInfo, pendingCapture: pendingMove !== null, captureTargets };
}
