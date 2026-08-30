/* ═══ Car Brawl — Main Game Component ═══ */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Car, Arena, GameState, GameConfig } from "./types";
import { DEFAULT_CONFIG, CAR_PRESETS } from "./types";
import {
  spawnCars,
  step,
  isGameOver,
} from "./engine";

const BOT_NAMES = ["Turbo", "Nitro", "Blitz", "Drift", "V8"];

/* ═══ Canvas Renderer ═══ */

function drawArena(ctx: CanvasRenderingContext2D, arena: Arena, cfg: GameConfig, _time: number) {
  const { cx, cy, radius } = arena;

  // Arena floor
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fill();

  // Arena border — pulsing glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Danger zone ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(239, 68, 68, 0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Grid lines (subtle)
  ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
  ctx.lineWidth = 0.5;
  for (let i = -radius; i <= radius; i += 30) {
    ctx.beginPath();
    ctx.moveTo(cx + i, cy - radius);
    ctx.lineTo(cx + i, cy + radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + i);
    ctx.lineTo(cx + radius, cy + i);
    ctx.stroke();
  }
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, cfg: GameConfig, _time: number) {
  if (!car.alive) return;

  const { pos, angle, color, accent, name } = car;
  const r = cfg.carRadius;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(2, 3, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // Car body — rounded rectangle
  ctx.beginPath();
  const bw = r * 1.8;
  const bh = r * 1.2;
  const br = r * 0.3;
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, br);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Windshield
  ctx.beginPath();
  ctx.roundRect(bw * 0.1, -bh * 0.3, bw * 0.35, bh * 0.6, 3);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  // Headlights
  ctx.beginPath();
  ctx.arc(bw / 2 - 2, -bh * 0.25, 2, 0, Math.PI * 2);
  ctx.arc(bw / 2 - 2, bh * 0.25, 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();

  // Thrust flame
  if (car.thrust > 0.1) {
    const flameLen = 4 + car.thrust * 10;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -bh * 0.2);
    ctx.lineTo(-bw / 2 - flameLen, 0);
    ctx.lineTo(-bw / 2, bh * 0.2);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, ${150 + car.thrust * 100}, 50, ${0.4 + car.thrust * 0.4})`;
    ctx.fill();
  }

  ctx.restore();

  // Name label
  ctx.save();
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(name, pos.x, pos.y - r - 6);
  ctx.restore();

  // Player indicator
  if (car.isPlayer) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
  const maxR = 30;
  const r = maxR * progress;
  const alpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.5})`;
  ctx.fill();
}

/* ═══ Main Component ═══ */

interface Props {
  onBack: () => void;
}

export function CarBrawlGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 600 });
  const [gameState, setGameState] = useState<GameState>("menu");
  const [countdown, setCountdown] = useState(DEFAULT_CONFIG.countdown);
  const [winner, setWinner] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  // Game refs (mutable, no re-renders)
  const cfgRef = useRef<GameConfig>(DEFAULT_CONFIG);
  const carsRef = useRef<Car[]>([]);
  const arenaRef = useRef<Arena>({ cx: 200, cy: 300, radius: 160 });
  const explosionsRef = useRef<{ x: number; y: number; t0: number }[]>([]);
  const inputRef = useRef({ thrust: 0, steer: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>(0);
  const stateRef = useRef<GameState>("menu");

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  /* ── Resize ── */
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(Math.min(rect.height, window.innerHeight * 0.7));
      setCanvasSize({ w, h });

      // Recalc arena to fit
      const arenaR = Math.min(w, h) * 0.38;
      cfgRef.current.arenaRadius = arenaR;
      arenaRef.current = { cx: w / 2, cy: h / 2, radius: arenaR };
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ── Keyboard ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ── Start Game ── */
  const startGame = useCallback(() => {
    const cfg = cfgRef.current;
    const arena = arenaRef.current;
    const names = ["Você", ...BOT_NAMES.slice(0, 4)];
    const colors = CAR_PRESETS.slice(0, 5);
    carsRef.current = spawnCars(arena, 5, cfg.carRadius, names, colors, 0);
    explosionsRef.current = [];

    // Init scores
    const s: Record<string, number> = {};
    for (const c of carsRef.current) s[c.name] = 0;
    setScores(s);

    setWinner(null);
    setGameState("countdown");
    setCountdown(cfg.countdown);

    // Countdown
    let cd = cfg.countdown;
    const cdTimer = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(cdTimer);
        setGameState("playing");
      }
    }, 1000);
  }, []);

  /* ── Game Loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let lastTime = performance.now();

    const loop = (now: number) => {
      gameLoopRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 16.667, 2); // normalize to ~60fps
      lastTime = now;

      const cfg = cfgRef.current;
      const arena = arenaRef.current;
      const state = stateRef.current;

      // Read input for player
      const keys = keysRef.current;
      const player = carsRef.current.find((c) => c.isPlayer && c.alive);
      if (player) {
        let steer = 0;
        let thrust = 0;
        if (keys.has("arrowleft") || keys.has("a")) steer -= 1;
        if (keys.has("arrowright") || keys.has("d")) steer += 1;
        if (keys.has("arrowup") || keys.has("w")) thrust = 1;
        if (keys.has("arrowdown") || keys.has("s")) thrust = -0.3;

        // Also use touch joystick input
        const touch = inputRef.current;
        if (touch.steer !== 0) steer = touch.steer;
        if (touch.thrust !== 0) thrust = touch.thrust;

        player.steer = steer;
        player.thrust = Math.max(0, thrust);
      }

      // Physics step (only during gameplay)
      if (state === "playing") {
        const { eliminated } = step(carsRef.current, arena, cfg, dt);
        for (const id of eliminated) {
          const car = carsRef.current.find((c) => c.id === id);
          if (car) {
            explosionsRef.current.push({ x: car.pos.x, y: car.pos.y, t0: now });
            // Award point to last car that pushed them
            const lastPusher = carsRef.current.find(
              (c) => c.alive && c.id !== id,
            );
            if (lastPusher) {
              setScores((prev) => ({
                ...prev,
                [lastPusher.name]: (prev[lastPusher.name] ?? 0) + 1,
              }));
            }
          }
        }

        // Check game over
        const { over, winner: w } = isGameOver(carsRef.current);
        if (over) {
          setWinner(w?.name ?? null);
          setGameState("gameover");
        }
      }

      // ── Render ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawArena(ctx, arena, cfg, now);

      // Draw alive cars
      for (const car of carsRef.current) {
        drawCar(ctx, car, cfg, now);
      }

      // Draw explosions
      explosionsRef.current = explosionsRef.current.filter((e) => {
        const progress = (now - e.t0) / 600;
        if (progress >= 1) return false;
        drawExplosion(ctx, e.x, e.y, progress);
        return true;
      });

      // Countdown overlay
      if (state === "countdown") {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 72px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = countdown > 0 ? "#fbbf24" : "#22c55e";
        ctx.fillText(
          countdown > 0 ? String(countdown) : "BRAWL!",
          canvas.width / 2,
          canvas.height / 2 + 24,
        );
        ctx.restore();
      }

      // Game over overlay
      if (state === "gameover") {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 36px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(
          winner ? `${winner} venceu!` : "Empate!",
          canvas.width / 2,
          canvas.height / 2 - 10,
        );
        ctx.font = "16px system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Toque para jogar novamente", canvas.width / 2, canvas.height / 2 + 30);
        ctx.restore();
      }
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [countdown, winner]);

  /* ── Touch Controls ── */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (stateRef.current === "menu") {
      startGame();
      return;
    }
    if (stateRef.current === "gameover") {
      startGame();
      return;
    }
    const touch = e.touches[0]!;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [startGame]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0]!;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const deadzone = 10;

    // Steer: horizontal drag
    if (Math.abs(dx) > deadzone) {
      inputRef.current.steer = Math.max(-1, Math.min(1, dx / 60));
    } else {
      inputRef.current.steer = 0;
    }

    // Thrust: vertical drag (up = forward)
    if (Math.abs(dy) > deadzone) {
      inputRef.current.thrust = Math.max(-0.3, Math.min(1, -dy / 60));
    } else {
      inputRef.current.thrust = 0;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    inputRef.current = { thrust: 0, steer: 0 };
  }, []);

  /* ── Scoreboard ── */
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <button
          onClick={onBack}
          className="text-xs font-bold text-white/50 hover:text-white/80 transition"
        >
          ← Voltar
        </button>
        <h1 className="text-sm font-display font-black tracking-tight">
          🏎️ <span className="text-red-400">Car</span>{" "}
          <span className="text-amber-400">Brawl</span>
        </h1>
        <div className="w-12" />
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="w-full h-full touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (stateRef.current === "menu") startGame();
            else if (stateRef.current === "gameover") startGame();
          }}
        />

        {/* Menu overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-3xl font-display font-black mb-2">
                <span className="text-red-400">CAR</span>{" "}
                <span className="text-amber-400">BRAWL</span>
              </h2>
              <p className="text-xs text-white/40 mb-6">
                Sumo com carros — empurre os adversários para fora da arena!
              </p>
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-sm hover:scale-105 transition-transform"
              >
                BATALHAR 🏁
              </button>
              <p className="mt-4 text-[10px] text-white/30">
                WASD ou ←↑↓→ · Toque e arraste no celular
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex gap-2 overflow-x-auto">
          {sortedScores.map(([name, score]) => {
            const car = carsRef.current.find((c) => c.name === name);
            return (
              <div
                key={name}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] shrink-0"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: car?.color ?? "#666" }}
                />
                <span className="text-white/70">{name}</span>
                <span className="font-bold text-white/90">{score}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
