import { useEffect, useRef, useState } from "react";
import { MatchEngine } from "@/engine/MatchEngine";
import { playerModelCache, FBX_PATHS } from "@/engine/playerModelCache";
import { TOTAL_COBRANCAS } from "@/engine/cobrancas";
import type { MatchEvent, MatchLiveState, MatchResult, MatchSetup } from "@/engine/types";

type MatchState = "intro" | "playing" | "finished";

interface Props {
  setup: MatchSetup;
  /** Called once when the match ends — hand this straight to the main system. */
  onFinish: (result: MatchResult) => void;
  onEvent?: (e: MatchEvent) => void;
}

const INSTRUCOES_JOGO = [
  "TOQUE, ARRASTE E SOLTE para cobrar — a direção do gesto mira a bola.",
  "Arraste mais longo = mais força. Arraste subindo = bola mais alta.",
  "Cobranças 1 a 10 são pênaltis; as 5 últimas são faltas de longe.",
  "O goleiro escolhe um canto — capriche no canto oposto.",
];

const INSTRUCOES_CIDADELA = [
  "Vitórias rendem SOV para o caixa do clube e salário para você.",
  "No celular chegam mensagens, convites e a Bolsa de Valores da Cidadela.",
  "A tabela atualiza ao fim da rodada — suba de divisão para ganhar mais.",
];

/**
 * Shell de apresentação da disputa de cobranças: canvas + HUD + swipe.
 * Todo o jogo vive dentro do MatchEngine; este componente só monta.
 */
export function Match3DView({ setup, onFinish, onEvent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatchEngine | null>(null);
  const [live, setLive] = useState<MatchLiveState | null>(null);
  const [matchState, setMatchState] = useState<MatchState>("intro");
  const [finalResult, setFinalResult] = useState<MatchResult | null>(null);
  const [erroInicio, setErroInicio] = useState<string | null>(null);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const modelosPromiseRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    // Carregamento AUTOMÁTICO dos jogadores 3D já na intro: quando o usuário
    // clica INICIAR, na maioria dos casos os modelos reais já estão prontos.
    // O MatchEngine tem upgrade-in-place como rede de segurança.
    setCarregandoModelos(true);
    modelosPromiseRef.current = playerModelCache
      .loadModel(
        FBX_PATHS.BASE_MODEL,
        new Map<string, string>([
          ["run", FBX_PATHS.ANIMATIONS.run],
          ["save", FBX_PATHS.ANIMATIONS.save],
          ["trip", FBX_PATHS.ANIMATIONS.trip],
        ])
      )
      .catch((err: unknown) => {
        console.warn("[Match3DView] Preload FBX falhou — partida usará modelos procedurais:", err);
      })
      .finally(() => setCarregandoModelos(false));
  }, []);

  const startMatch = async () => {
    if (!canvasRef.current || engineRef.current) {
      if (!canvasRef.current) console.error("Canvas ref is null");
      return;
    }
    try {
      setErroInicio(null);
      // Aguarda o preload (teto de 20s — modelo de 50MB em conexão lenta).
      // Timeout/erro NÃO bloqueia: nasce procedural e o engine faz upgrade.
      if (!playerModelCache.isLoaded(FBX_PATHS.BASE_MODEL) && modelosPromiseRef.current) {
        setCarregandoModelos(true);
        await Promise.race([
          modelosPromiseRef.current,
          new Promise((r) => setTimeout(r, 20000)),
        ]).catch(() => {});
        setCarregandoModelos(false);
      }
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

  // Canvas único e persistente: intro, partida e fim são overlays sobre ele.
  // Remontar o canvas entre estados desconectava o contexto WebGL (tela preta).
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      {matchState === "intro" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          {/* Match Info */}
          <div className="mb-6 text-center">
            <h2 className="mb-1 text-2xl font-bold text-white/90">{setup.competition}</h2>
            <p className="text-sm text-white/60">{setup.stadium || "Estádio Municipal"}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-accent">
              Disputa de cobranças — {TOTAL_COBRANCAS} por equipe
            </p>
          </div>

          {/* Teams */}
          <div className="mb-6 flex items-center gap-8">
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

          {/* Tela de loading com instruções (jogo + Cidadela) enquanto os
              jogadores 3D carregam automaticamente. */}
          <div className="mb-6 w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-5 py-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
              {carregandoModelos ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-accent" />
                  Carregando jogadores 3D...
                </>
              ) : (
                <>✅ Jogadores 3D prontos</>
              )}
            </p>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">Como jogar</p>
            <ul className="mb-3 space-y-1 text-xs text-white/70">
              {INSTRUCOES_JOGO.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">Na Cidadela</p>
            <ul className="space-y-1 text-xs text-white/60">
              {INSTRUCOES_CIDADELA.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={startMatch}
            disabled={carregandoModelos}
            className="rounded-full bg-accent px-8 py-3 text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all hover:scale-105 hover:bg-accent/90 disabled:opacity-60"
          >
            {carregandoModelos ? "CARREGANDO JOGADORES 3D..." : "INICIAR DISPUTA"}
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
            <h3 className="mb-3 text-sm font-semibold text-white/80">Suas Cobranças</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-accent">{finalResult.controlledPlayer.shots}</p>
                <p className="text-xs text-white/60">Cobranças</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{finalResult.controlledPlayer.goals}</p>
                <p className="text-xs text-white/60">Gols</p>
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
          {/* Placar da disputa: cobranças e gols dos dois lados */}
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full border border-hud-line bg-hud/80 px-4 py-2 text-sm font-semibold backdrop-blur-md">
              <span>{setup.home.shortName}</span>
              <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-base tabular-nums text-accent">
                {live?.score.home ?? 0} : {live?.score.away ?? 0}
              </span>
              <span>{setup.away.shortName}</span>
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-white/80">
              SUAS COBRANÇAS {live?.shotIndex ?? 1}/{live?.shotsTotal ?? TOTAL_COBRANCAS}
              {" · "}GOLS {live?.playerGoals ?? 0}
              {" · "}ADV GOLS {live?.opponentGoals ?? 0}
            </p>
            {live?.opponentFeed && (
              <p className="mt-1 text-center text-[11px] text-muted-foreground">{live.opponentFeed}</p>
            )}
          </div>

          {/* Cobrador + tipo da cobrança */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-hud-line bg-hud/70 px-3 py-2 text-xs backdrop-blur-md">
            <p className="font-semibold">
              #{controlled?.number} {controlled?.name}
            </p>
            <p className="uppercase tracking-wider text-accent">
              {live?.tipo === "falta" ? "Falta" : "Pênalti"} {live?.shotIndex ?? 1}/{live?.shotsTotal ?? TOTAL_COBRANCAS}
            </p>
          </div>

          {/* Banner do resultado da cobrança */}
          {live?.phase === "outcome" && live.lastOutcome && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
              <p
                className={`rounded-2xl px-8 py-3 text-4xl font-black tracking-wide backdrop-blur-md ${
                  live.lastOutcome === "GOL"
                    ? "bg-emerald-500/25 text-emerald-300"
                    : "bg-red-500/25 text-red-300"
                }`}
              >
                {live.lastOutcome}
              </p>
            </div>
          )}

          {/* Dica de controle (swipe) */}
          {live?.phase === "aim" && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-hud-line bg-hud/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur-md">
              Arraste na direção do canto e solte — arraste mais longo = mais força
            </div>
          )}

          {/* Barra de força do arraste (DOM) */}
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
