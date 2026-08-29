import { Skull, RotateCcw, Zap } from "lucide-react";
import { countOnBoard, type GameState, type Player } from "@/lib/trilha/engine";
import type { Difficulty } from "@/lib/trilha/ai";

export interface SideInfo {
  name: string;
  slot: Player;
  subtitle?: string;
}

export interface HQPanelProps {
  state: GameState;
  p1: SideInfo;
  p2: SideInfo;
  myPlayer: Player | null;
  status: string;
  log: string[];
  timeLeft?: number | null | undefined;
  onResign?: (() => void) | undefined;
  onRestart?: (() => void) | undefined;
  awaitingCapture?: boolean | undefined;
  difficulty?: Difficulty;
}

export function HQPanel({
  state,
  p1,
  p2,
  myPlayer,
  status,
  log,
  onResign,
  onRestart,
  awaitingCapture,
  difficulty,
}: HQPanelProps) {
  const p1OnBoard = countOnBoard(state.board, 1);
  const p2OnBoard = countOnBoard(state.board, 2);
  const isOver = state.phase === "over";

  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72">
      {/* Status bar */}
      <div
        className={`rounded-xl p-3 border transition-all duration-300 ${
          awaitingCapture
            ? "bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/10"
            : isOver
            ? state.winner === 1
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
            : "bg-slate-800/60 border-slate-700/40"
        }`}
      >
        <p className="text-sm font-medium text-slate-200 leading-relaxed">{status}</p>
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* P1 - Player */}
        <div
          className={`relative rounded-xl p-3 border transition-all duration-300 ${
            state.turn === 1 && !isOver
              ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10"
              : "bg-slate-800/40 border-slate-700/30"
          }`}
        >
          {state.turn === 1 && !isOver && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
            </div>
            <p className="text-xs font-bold text-slate-200 truncate">{p1.name}</p>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>
              Campo:{" "}
              <span className="font-mono font-bold text-slate-200">{p1OnBoard}</span>
            </span>
            <span>
              Reserva:{" "}
              <span className="font-mono font-bold text-slate-200">{state.hand[1]}</span>
            </span>
          </div>
          {/* Piece bar */}
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${(p1OnBoard / 9) * 100}%` }}
            />
          </div>
        </div>

        {/* P2 - AI/Enemy */}
        <div
          className={`relative rounded-xl p-3 border transition-all duration-300 ${
            state.turn === 2 && !isOver
              ? "bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10"
              : "bg-slate-800/40 border-slate-700/30"
          }`}
        >
          {state.turn === 2 && !isOver && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <p className="text-xs font-bold text-slate-200 truncate">{p2.name}</p>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>
              Campo:{" "}
              <span className="font-mono font-bold text-slate-200">{p2OnBoard}</span>
            </span>
            <span>
              Reserva:{" "}
              <span className="font-mono font-bold text-slate-200">{state.hand[2]}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${(p2OnBoard / 9) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game phase indicator */}
      <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-800/40 border border-slate-700/30 p-2">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {state.phase === "placing"
            ? "Fase de Colocação"
            : state.phase === "moving"
            ? "Fase de Movimentação"
            : state.winner === 1
            ? "Vitória!"
            : "Derrota"}
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          #{state.ply}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onRestart && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-600/40 bg-slate-800/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-700/60 hover:border-slate-500/40 hover:text-white active:scale-[0.97]"
            onClick={onRestart}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        )}
        {onResign && !isOver && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-800/40 bg-red-900/30 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 transition-all hover:bg-red-800/30 hover:border-red-700/40 hover:text-red-300 active:scale-[0.97]"
            onClick={onResign}
          >
            <Skull className="h-3.5 w-3.5" /> Render-se
          </button>
        )}
      </div>

      {/* Move log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700/30 p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Registro de Operações
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
            {log.slice(0, 15).map((entry, i) => (
              <p
                key={i}
                className={`text-[10px] font-mono leading-relaxed ${
                  i === 0 ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {entry}
              </p>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
