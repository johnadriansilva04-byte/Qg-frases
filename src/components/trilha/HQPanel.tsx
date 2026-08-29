import { Skull, RotateCcw, Zap, Shield, Swords } from "lucide-react";
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
        className={`rounded-xl p-3.5 border transition-all duration-300 ${
          awaitingCapture
            ? "bg-red-500/[0.08] border-red-500/30 shadow-lg shadow-red-500/10"
            : isOver
            ? state.winner === 1
              ? "bg-emerald-500/[0.08] border-emerald-500/30"
              : "bg-red-500/[0.08] border-red-500/30"
            : "bg-white/[0.03] border-white/[0.06]"
        }`}
      >
        <p className="text-sm font-medium text-white/90 leading-relaxed">{status}</p>
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* P1 - Player */}
        <div
          className={`relative rounded-xl p-3 border transition-all duration-300 ${
            state.turn === 1 && !isOver
              ? "bg-blue-500/[0.08] border-blue-500/30 shadow-lg shadow-blue-500/10"
              : "bg-white/[0.02] border-white/[0.05]"
          }`}
        >
          {state.turn === 1 && !isOver && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-[11px] font-bold text-white/90 truncate">{p1.name}</p>
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>
              Campo:{" "}
              <span className="font-mono font-bold text-white/70">{p1OnBoard}</span>
            </span>
            <span>
              Reserva:{" "}
              <span className="font-mono font-bold text-white/70">{state.hand[1]}</span>
            </span>
          </div>
          <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
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
              ? "bg-red-500/[0.08] border-red-500/30 shadow-lg shadow-red-500/10"
              : "bg-white/[0.02] border-white/[0.05]"
          }`}
        >
          {state.turn === 2 && !isOver && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Swords className="w-3 h-3 text-red-400" />
            </div>
            <p className="text-[11px] font-bold text-white/90 truncate">{p2.name}</p>
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>
              Campo:{" "}
              <span className="font-mono font-bold text-white/70">{p2OnBoard}</span>
            </span>
            <span>
              Reserva:{" "}
              <span className="font-mono font-bold text-white/70">{state.hand[2]}</span>
            </span>
          </div>
          <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${(p2OnBoard / 9) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game phase indicator */}
      <div className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {state.phase === "placing"
            ? "Colocação"
            : state.phase === "moving"
            ? "Movimentação"
            : state.winner === 1
            ? "Vitória!"
            : "Derrota"}
        </span>
        <span className="text-[10px] font-mono text-white/25">
          #{state.ply}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onRestart && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/60 transition-all hover:bg-white/[0.08] hover:border-white/15 hover:text-white active:scale-[0.97]"
            onClick={onRestart}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        )}
        {onResign && !isOver && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-800/30 bg-red-900/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400/80 transition-all hover:bg-red-800/20 hover:border-red-700/30 hover:text-red-400 active:scale-[0.97]"
            onClick={onResign}
          >
            <Skull className="h-3.5 w-3.5" /> Rendir-se
          </button>
        )}
      </div>

      {/* Move log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
            Registro
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
            {log.slice(0, 15).map((entry, i) => (
              <p
                key={i}
                className={`text-[10px] font-mono leading-relaxed ${
                  i === 0 ? "text-white/70" : "text-white/25"
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
