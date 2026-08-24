import { useEffect, useRef, useState } from "react";
import { MatchEngine } from "@/engine/MatchEngine";
import type { EngineAction } from "@/engine/input";
import type { MatchEvent, MatchLiveState, MatchResult, MatchSetup } from "@/engine/types";
import { VirtualStick } from "./VirtualStick";
import { ActionPad } from "./ActionPad";

interface Props {
  setup: MatchSetup;
  /** Called once when the match ends — hand this straight to the main system. */
  onFinish: (result: MatchResult) => void;
  onEvent?: (e: MatchEvent) => void;
}

/**
 * Presentation shell for the engine: canvas + HUD + touch controls.
 * All gameplay lives inside MatchEngine; this component only mounts it.
 */
export function Match3DView({ setup, onFinish, onEvent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatchEngine | null>(null);
  const [live, setLive] = useState<MatchLiveState | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new MatchEngine(canvasRef.current, setup, {
      onState: setLive,
      onEvent: (e) => onEvent?.(e),
      onFinish,
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.matchId]);

  const controlled =
    (setup.controlledSide === "home" ? setup.home : setup.away).players.find(
      (p) => p.id === setup.controlledPlayerId
    ) ?? null;

  const act = (a: EngineAction) => engineRef.current?.input.press(a);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      {/* Scoreboard */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-hud-line bg-hud/80 px-4 py-2 text-sm font-semibold backdrop-blur-md">
          <span>{setup.home.shortName}</span>
          <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-base tabular-nums text-accent">
            {live?.score.home ?? 0} : {live?.score.away ?? 0}
          </span>
          <span>{setup.away.shortName}</span>
          <span className="ml-1 font-mono text-xs text-muted-foreground tabular-nums">
            {String(live?.minute ?? 0).padStart(2, "0")}'
          </span>
        </div>
        {live?.lastEvent && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {live.lastEvent.minute}' {live.lastEvent.type.toUpperCase()}
            {live.lastEvent.playerName ? ` — ${live.lastEvent.playerName}` : ""}
            {live.lastEvent.detail ? ` (${live.lastEvent.detail})` : ""}
          </p>
        )}
      </div>

      {/* Controlled player + stamina */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-hud-line bg-hud/70 px-3 py-2 text-xs backdrop-blur-md">
        <p className="font-semibold">
          #{controlled?.number} {controlled?.name}
        </p>
        <p className="text-muted-foreground">
          {controlled?.role} · {setup.competition}
        </p>
        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${live?.stamina ?? 100}%` }}
          />
        </div>
      </div>

      {/* Desktop key hints */}
      {!touch && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-hud-line bg-hud/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur-md">
          WASD mover · SHIFT sprint · ESPAÇO passe · ENTER chute · BACKSPACE carrinho
        </div>
      )}

      {/* Mobile controls */}
      {touch && (
        <>
          <div className="absolute bottom-5 left-4">
            <VirtualStick onChange={(x, y) => engineRef.current?.input.setStick(x, y)} />
          </div>
          <div className="absolute bottom-5 right-4">
            <ActionPad onAction={act} onSprint={(a) => engineRef.current?.input.setTouchSprint(a)} />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => engineRef.current?.finish(true)}
        className="absolute right-3 top-3 rounded-lg border border-hud-line bg-hud/70 px-3 py-1.5 text-xs font-medium backdrop-blur-md hover:bg-accent/20"
      >
        Encerrar
      </button>
    </div>
  );
}
