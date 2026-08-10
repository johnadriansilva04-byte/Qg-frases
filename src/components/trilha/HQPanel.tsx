import { Shield, Skull } from "lucide-react";
import { countOnBoard, type GameState, type Player } from "@/lib/trilha/engine";

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
}

export function HQPanel({
  state,
  p1,
  p2,
  myPlayer,
  status,
  log,
  timeLeft,
  onResign,
  onRestart,
  awaitingCapture,
}: HQPanelProps) {
  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72">
      <div
        className={`rounded-md p-3 bg-surface/50 border border-border ${awaitingCapture ? "ring-2 ring-destructive" : ""}`}
      >
        <p className="text-sm text-foreground">{status}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className={`rounded-md p-3 bg-surface/50 border border-border ${state.turn === 1 ? "ring-2 ring-primary" : ""}`}
        >
          <p className="text-sm font-medium text-foreground">{p1.name}</p>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Campo: {countOnBoard(state.board, 1)}</span>
            <span>Reserva: {state.hand[1]}</span>
          </div>
        </div>
        <div
          className={`rounded-md p-3 bg-surface/50 border border-border ${state.turn === 2 ? "ring-2 ring-primary" : ""}`}
        >
          <p className="text-sm font-medium text-foreground">{p2.name}</p>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Campo: {countOnBoard(state.board, 2)}</span>
            <span>Reserva: {state.hand[2]}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {onRestart && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
            onClick={onRestart}
          >
            <Shield className="h-4 w-4" /> Reiniciar
          </button>
        )}
        {onResign && state.phase !== "over" && (
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-destructive/70 px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive"
            onClick={onResign}
          >
            <Skull className="h-4 w-4" /> Render-se
          </button>
        )}
      </div>
    </aside>
  );
}
