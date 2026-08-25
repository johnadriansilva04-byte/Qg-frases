import { useEffect, useRef, useState } from "react";
import { MatchEngine } from "@/engine/MatchEngine";
import type { EngineAction } from "@/engine/input";
import type { MatchEvent, MatchLiveState, MatchResult, MatchSetup } from "@/engine/types";
import { VirtualStick } from "./VirtualStick";
import { ActionPad } from "./ActionPad";

type MatchState = "intro" | "playing" | "finished";

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
  const [matchState, setMatchState] = useState<MatchState>("intro");
  const [finalResult, setFinalResult] = useState<MatchResult | null>(null);
  const [erroInicio, setErroInicio] = useState<string | null>(null);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const startMatch = () => {
    if (!canvasRef.current || engineRef.current) {
      if (!canvasRef.current) console.error("Canvas ref is null");
      return;
    }
    try {
      setErroInicio(null);
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      const engine = new MatchEngine(canvas, setup, {
        onState: setLive,
        onEvent: (e) => onEvent?.(e),
        onFinish: (result) => {
          setFinalResult(result);
          setMatchState("finished");
        },
      });
      engineRef.current = engine;
      engine.start();
      setMatchState("playing");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : "";
      console.error("Error starting match:", error);
      // Falha visível (WebGL indisponível, GPU bloqueada...) — nunca um
      // clique que "não faz nada". O usuário pode tentar de novo ou voltar.
      (window as unknown as { __ultimoErro3d?: string }).__ultimoErro3d = `${msg}\n${stack ?? ""}`;
      setErroInicio(msg);
    }
  };

  // O canvas NUNCA é desmontado entre intro/partida/fim — o WebGLRenderer fica
  // preso ao elemento original; trocar de canvas deixava a tela preta.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const controlled =
    (setup.controlledSide === "home" ? setup.home : setup.away).players.find(
      (p) => p.id === setup.controlledPlayerId
    ) ?? null;

  const act = (a: EngineAction) => engineRef.current?.input.press(a);

  // Canvas único e persistente: intro, partida e fim são overlays sobre ele.
  // Remontar o canvas entre estados desconectava o contexto WebGL (tela preta).
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      {matchState === "intro" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          {/* Match Info */}
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white/90">{setup.competition}</h2>
            <p className="text-sm text-white/60">{setup.stadium || "Estádio Municipal"}</p>
          </div>

          {/* Teams */}
          <div className="mb-8 flex items-center gap-8">
            <div className="text-center">
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl">
                ⚽
              </div>
              <h3 className="text-xl font-bold text-white">{setup.home.name}</h3>
              <p className="text-sm text-white/60">{setup.home.shortName}</p>
            </div>

            <div className="text-3xl font-black text-white/40">VS</div>

            <div className="text-center">
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl">
                ⚽
              </div>
              <h3 className="text-xl font-bold text-white">{setup.away.name}</h3>
              <p className="text-sm text-white/60">{setup.away.shortName}</p>
            </div>
          </div>

          {/* Player Info */}
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-center">
            <p className="text-sm text-white/60">Você controla</p>
            <p className="text-lg font-bold text-white">
              #{controlled?.number} {controlled?.name}
            </p>
            <p className="text-sm text-white/60">{controlled?.role}</p>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={startMatch}
            className="rounded-full bg-accent px-8 py-3 text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all hover:scale-105 hover:bg-accent/90"
          >
            INICIAR PARTIDA
          </button>

          {erroInicio && (
            <div className="mt-4 max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-red-300">
                Não foi possível iniciar a partida 3D neste navegador.
              </p>
              <p className="mt-1 break-words text-xs text-red-200/70">{erroInicio}</p>
              <p className="mt-1 text-xs text-white/50">
                Ative a aceleração de hardware/WebGL ou jogue no modo Técnico.
              </p>
            </div>
          )}

          {/* Controls Hint */}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
            <p className="font-semibold text-white/80">Controles:</p>
            <p>WASD mover · SHIFT sprint · ESPAÇO passe · ENTER chute · E pedir bola</p>
          </div>
        </div>
      )}

      {matchState === "finished" && finalResult && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          {/* Result */}
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">FIM DE JOGO</h2>

            <div className="mb-6 flex items-center gap-8">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{setup.home.name}</h3>
                <p className="text-5xl font-black text-accent">{finalResult.score.home}</p>
              </div>

              <div className="text-2xl font-black text-white/40">-</div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{setup.away.name}</h3>
                <p className="text-5xl font-black text-accent">{finalResult.score.away}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-6 py-4">
              <p className="text-lg font-bold text-white">
                {finalResult.outcome === "draw" ? "EMPATE" :
                 finalResult.outcome === "home" ? setup.home.name + " VENCEU" :
                 setup.away.name + " VENCEU"}
              </p>
            </div>
          </div>

          {/* Player Stats */}
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-white/80">Suas Estatísticas</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-accent">{finalResult.controlledPlayer.goals}</p>
                <p className="text-xs text-white/60">Gols</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{finalResult.controlledPlayer.passes}</p>
                <p className="text-xs text-white/60">Passes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{finalResult.controlledPlayer.rating.toFixed(1)}</p>
                <p className="text-xs text-white/60">Nota</p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={() => onFinish(finalResult)}
            className="rounded-full bg-accent px-8 py-3 text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all hover:scale-105 hover:bg-accent/90"
          >
            CONTINUAR
          </button>
        </div>
      )}

      {matchState === "playing" && (
        <>
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
              WASD mover · SHIFT sprint · segure ESPAÇO passe · segure ENTER chute · E pedir bola · BACKSPACE carrinho
            </div>
          )}

          {/* Barra de força (DOM — espelha a barra 3D acima da cabeça) */}
          {(live?.charge ?? 0) > 0 && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 w-56 -translate-x-1/2">
              <div className="h-2.5 overflow-hidden rounded-full border border-hud-line bg-hud/80 backdrop-blur-md">
                <div
                  className="h-full rounded-full transition-[width] duration-75"
                  style={{
                    width: `${Math.round((live?.charge ?? 0) * 100)}%`,
                    backgroundColor:
                      (live?.charge ?? 0) < 0.3
                        ? "#4ade80"
                        : (live?.charge ?? 0) < 0.6
                          ? "#facc15"
                          : (live?.charge ?? 0) < 0.85
                            ? "#fb923c"
                            : "#ef4444",
                  }}
                />
              </div>
              <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Força
              </p>
            </div>
          )}

          {/* Mobile controls */}
          {touch && (
            <>
              <div className="absolute bottom-5 left-4">
                <VirtualStick onChange={(x, y) => engineRef.current?.input.setStick(x, y)} />
              </div>
              <div className="absolute bottom-5 right-4">
                <ActionPad
                  onAction={act}
                  onSprint={(a) => engineRef.current?.input.setTouchSprint(a)}
                  onHold={(a, on) => engineRef.current?.input.setTouchHold(a, on)}
                />
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
        </>
      )}
    </div>
  );
}
