import { Shield, Skull } from "lucide-react";
import { countOnBoard, type GameState, type Player } from "@/lib/trilha/engine";
import { useEffect, useState } from "react";

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
  const [showPanelAd, setShowPanelAd] = useState(false);

  // Mostrar anúncio no painel após algumas jogadas
  useEffect(() => {
    if (state.phase === "moving" && state.turn === 1) {
      // Mostrar anúncio aleatoriamente durante a fase de movimentação
      const randomChance = Math.random();
      if (randomChance < 0.1) { // 10% de chance
        setShowPanelAd(true);
        setTimeout(() => setShowPanelAd(false), 3000); // Mostra por 3 segundos
      }
    }
  }, [state.phase, state.turn]);

  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72">
      <div
        className={`rounded-md p-3 bg-surface/50 border border-border ${awaitingCapture ? "ring-2 ring-destructive" : ""}`}
      >
        <p className="text-sm text-foreground">{status}</p>
      </div>

      {/* Monetag Banner Estratégico no Painel */}
      {showPanelAd && (
        <div className="rounded-md bg-surface/30 border border-border/50 p-2">
          <div className="text-center text-xs text-muted-foreground mb-1">
            Publicidade
          </div>
          <div
            id="monetag-panel-ad"
            className="min-h-[90px] flex items-center justify-center"
          >
            <ins
              className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client="ca-pub-2783546143377409"
              data-ad-slot="3577664762"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}

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
