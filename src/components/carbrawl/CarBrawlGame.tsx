/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Main Game Component
   Full game flow: Menu → Build → Arena → Play → Result
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  Vehicle, Arena, GameScreen, GameMode, VehicleStats,
  ArenaType, MatchResult, CareerProgress, GameConfig,
} from "./types";
import {
  ARENAS, CAR_PRESETS, DEFAULT_CONFIG, TOTAL_BUILD_POINTS,
  MAX_SINGLE_STAT, SOV_REWARDS, defaultStats, statsPointsUsed,
  computePhysics, defaultCareerPhases,
} from "./types";
import {
  spawnVehicles, physicsStep, checkGameOver, updateAI, dist,
} from "./engine";

const BOT_NAMES = ["Turbo", "Nitro", "Blitz", "Drift", "V8", "Rush", "Volt", "Shock", "Storm", "Fury", "Axle", "Bolt", "Clutch", "Engine", "Turbo", "Storm"];

// ─── Championship Bracket ───
interface ChampMatch {
  p1: string;
  p2: string;
  winner: string | null;
  played: boolean;
}
interface ChampBracket {
  rounds: ChampMatch[][];
  currentRound: number;
  currentMatch: number;
  champion: string | null;
}

function getNextUnplayedMatch(bracket: ChampBracket): { round: number; match: number } {
  for (let r = 0; r < bracket.rounds.length; r++) {
    const round = bracket.rounds[r]!;
    if (round.some((m) => !m.played)) {
      const idx = round.findIndex((m) => !m.played);
      return { round: r, match: idx };
    }
  }
  return { round: -1, match: -1 };
}

interface Props {
  onBack: () => void;
}

export function CarBrawlGame({ onBack }: Props) {
  // ── Screen state ──
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [gameMode, setGameMode] = useState<GameMode>("solo");

  // ── Build ──
  const [buildStats, setBuildStats] = useState<VehicleStats>(defaultStats());

  // ── Arena ──
  const [selectedArena, setSelectedArena] = useState<ArenaType>("lava");
  const [soloDifficulty, setSoloDifficulty] = useState<"facil" | "medio" | "dificil">("medio");
  const [soloBotCount, setSoloBotCount] = useState(4);

  // ── Championship bracket ──
  const [champBracket, setChampBracket] = useState<ChampBracket>({ rounds: [], currentRound: 0, currentMatch: 0, champion: null });

  // ── Match ──
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [matchTime, setMatchTime] = useState(0);

  // ── Career ──
  const [career, setCareer] = useState<CareerProgress>({
    currentPhase: 1,
    phases: defaultCareerPhases(),
    totalStars: 0,
    totalWins: 0,
    totalMatches: 0,
  });

  // ── Canvas ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 600 });

  // ── Refs (mutable, no re-renders) ──
  const cfgRef = useRef<GameConfig>(DEFAULT_CONFIG);
  const arenaRef = useRef<Arena>({ cx: 200, cy: 300, radius: 180, type: "lava", modifier: ARENAS.lava.modifier });
  const vehiclesRef = useRef<Vehicle[]>([]);
  const explosionsRef = useRef<{ x: number; y: number; t0: number }[]>([]);
  const inputRef = useRef({ thrust: 0, steer: 0, brake: false, nitro: false });
  const keysRef = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>(0);
  const screenRef = useRef<GameScreen>("menu");
  const matchTimeRef = useRef(0);
  const countdownRef = useRef(3);
  const champMatchRef = useRef<{ round: number; matchIdx: number } | null>(null);

  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── Resize (runs continuously via ResizeObserver) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;
      setCanvasSize({ w, h });
      const r = Math.min(w, h) * 0.38;
      cfgRef.current.arenaRadius = r;
      cfgRef.current.carWidth = Math.max(12, r * 0.12);
      cfgRef.current.carLength = Math.max(20, r * 0.2);
      arenaRef.current = { ...arenaRef.current, cx: w / 2, cy: h / 2, radius: r };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen]);

  // ── Keyboard ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key.toLowerCase()); };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Fullscreen ──
  const requestFullscreen = useCallback(() => {
    try {
      const el = containerRef.current;
      if (el && document.fullscreenElement !== el) {
        el.requestFullscreen?.();
      }
    } catch { /* ignore */ }
  }, []);

  // ═══════════════════════════════════════════
  //  START MATCH
  // ═══════════════════════════════════════════

  const startMatch = useCallback((mode: GameMode, arenaType: ArenaType, botCount: number, difficulty: "facil" | "medio" | "dificil") => {
    requestFullscreen();

    const arena = arenaRef.current;
    arena.type = arenaType;
    arena.modifier = ARENAS[arenaType].modifier;

    const names = ["Você", ...BOT_NAMES.slice(0, botCount)];
    const colors = CAR_PRESETS.slice(0, botCount + 1);
    const physics = computePhysics(buildStats);

    const vs = spawnVehicles(arena, botCount + 1, names, colors, buildStats, 0);

    // Set AI difficulty
    for (let i = 1; i < vs.length; i++) {
      vs[i]!.aiState.difficulty = difficulty;
    }

    vehiclesRef.current = vs;
    explosionsRef.current = [];
    matchTimeRef.current = 0;

    setVehicles([...vs]);
    setCountdown(DEFAULT_CONFIG.countdown);
    countdownRef.current = DEFAULT_CONFIG.countdown;
    setMatchTime(0);
    setScreen("countdown");

    // Countdown
    let cd = DEFAULT_CONFIG.countdown;
    const timer = setInterval(() => {
      cd--;
      setCountdown(cd);
      countdownRef.current = cd;
      if (cd <= 0) {
        clearInterval(timer);
        setScreen("playing");
      }
    }, 1000);
  }, [buildStats, requestFullscreen]);

  // ═══════════════════════════════════════════
  //  CAREER START
  // ═══════════════════════════════════════════

  const startCareerPhase = useCallback((phaseId: number) => {
    const phase = career.phases.find((p) => p.id === phaseId);
    if (!phase || !phase.unlocked) return;
    startMatch("career", phase.arena, phase.opponents, phase.difficulty);
  }, [career, startMatch]);

  // ═══════════════════════════════════════════
  //  CHAMPIONSHIP
  // ═══════════════════════════════════════════

  const startChampionship = useCallback((arenaType: ArenaType) => {
    const names = ["Você", ...BOT_NAMES.slice(0, 7)];
    // 8 players → 3 rounds: QF(4 matches), SF(2), F(1)
    const qf: ChampMatch[] = [
      { p1: names[0]!, p2: names[7]!, winner: null, played: false },
      { p1: names[3]!, p2: names[4]!, winner: null, played: false },
      { p1: names[1]!, p2: names[6]!, winner: null, played: false },
      { p1: names[2]!, p2: names[5]!, winner: null, played: false },
    ];
    const sf: ChampMatch[] = [
      { p1: "?", p2: "?", winner: null, played: false },
      { p1: "?", p2: "?", winner: null, played: false },
    ];
    const final: ChampMatch[] = [
      { p1: "?", p2: "?", winner: null, played: false },
    ];
    setChampBracket({ rounds: [qf, sf, final], currentRound: 0, currentMatch: 0, champion: null });
    setSelectedArena(arenaType);
  }, []);

  const startChampMatch = useCallback((round: number, matchIdx: number) => {
    const m = champBracket.rounds[round]?.[matchIdx];
    if (!m || m.played) return;
    // Player is always index 0 in the match
    const isPlayerP1 = m.p1 === "Você";
    const botCount = 1; // 1v1 championship
    // Start the match — result will be handled in the result screen
    champMatchRef.current = { round, matchIdx };
    const difficulty = round >= 2 ? "dificil" : "medio";
    startMatch("championship", selectedArena, botCount, difficulty);
  }, [champBracket, selectedArena, startMatch]);

  // ═══════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      gameLoopRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 16.667, 3);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const st = screenRef.current;
      const cfg = cfgRef.current;
      const arena = arenaRef.current;

      // ── Read input for player ──
      const keys = keysRef.current;
      const player = vehiclesRef.current.find((v) => v.isPlayer && v.alive);
      if (player && st === "playing") {
        let steer = 0;
        let thrust = 0;
        let brake = false;
        let nitro = false;

        if (keys.has("arrowleft") || keys.has("a")) steer -= 1;
        if (keys.has("arrowright") || keys.has("d")) steer += 1;
        if (keys.has("arrowup") || keys.has("w")) thrust = 1;
        if (keys.has("s")) brake = true;
        if (keys.has("shift") || keys.has(" ")) nitro = true;

        // Touch input
        const touch = inputRef.current;
        if (touch.steer !== 0) steer = touch.steer;
        if (touch.thrust > 0) thrust = touch.thrust;
        if (touch.brake) brake = true;
        if (touch.nitro) nitro = true;

        player.steer = steer;
        player.thrust = Math.max(0, thrust);
        player.brake = brake;
        if (nitro && player.nitroAmount > 0) player.nitro = true;
      }

      // ── Physics ──
      if (st === "playing") {
        // Update AI
        for (const v of vehiclesRef.current) {
          updateAI(v, vehiclesRef.current, arena, dt);
        }

        // Physics step
        const { eliminated, killer } = physicsStep(vehiclesRef.current, arena, cfg, dt);

        // Track match time
        matchTimeRef.current += dt / 60;
        setMatchTime(Math.floor(matchTimeRef.current));

        // Handle eliminations
        for (const id of eliminated) {
          const v = vehiclesRef.current.find((c) => c.id === id);
          if (v) {
            explosionsRef.current.push({ x: v.pos.x, y: v.pos.y, t0: now });
            // Award kill
            const killerId = killer[id];
            if (killerId) {
              const killerV = vehiclesRef.current.find((c) => c.id === killerId);
              if (killerV) killerV.kills++;
            }
          }
        }

        // Check game over
        const { over, winner } = checkGameOver(vehiclesRef.current);
        if (over) {
          const playerAlive = player?.alive ?? false;
          const playerPos = playerAlive ? 1 : vehiclesRef.current.filter((v) => v.eliminated).length + 2;
          const sovReward = playerAlive ? SOV_REWARDS.win : SOV_REWARDS.loss + (player?.kills ?? 0) * SOV_REWARDS.elimination;

          setResult({
            position: playerPos,
            eliminations: player?.kills ?? 0,
            survived: playerAlive,
            sovReward,
          });
          setScreen("result");
        }
      }

      // ── Render ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena
      drawArena(ctx, arena, now);

      // Vehicles
      for (const v of vehiclesRef.current) {
        if (v.eliminated && v.fallProgress >= 1) continue;
        drawVehicle(ctx, v, cfg, now);
      }

      // Explosions
      explosionsRef.current = explosionsRef.current.filter((e) => {
        const progress = (now - e.t0) / 600;
        if (progress >= 1) return false;
        drawExplosion(ctx, e.x, e.y, progress);
        return true;
      });

      // HUD during play
      if (st === "playing" && player) {
        drawHUD(ctx, canvas, player, arena, matchTimeRef.current);
      }

      // Countdown
      if (st === "countdown") {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 64px system-ui";
        ctx.textAlign = "center";
        const cdVal = countdownRef.current;
        ctx.fillStyle = cdVal > 0 ? "#fbbf24" : "#22c55e";
        ctx.fillText(cdVal > 0 ? String(cdVal) : "BRAWL!", canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
      }
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, []);

  // ── Touch handlers ──
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]!;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0]!;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const deadzone = 15;

    inputRef.current.steer = Math.abs(dx) > deadzone ? clamp(dx / 50, -1, 1) : 0;
    inputRef.current.thrust = dy < -deadzone ? clamp(-dy / 50, 0, 1) : 0;
    inputRef.current.brake = dy > deadzone;
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    inputRef.current = { thrust: 0, steer: 0, brake: false, nitro: false };
  }, []);

  const handleNitroTouch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    inputRef.current.nitro = true;
  }, []);

  const handleNitroRelease = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    inputRef.current.nitro = false;
  }, []);

  // ═══════════════════════════════════════════
  //  SCREENS
  // ═══════════════════════════════════════════

  const pointsLeft = TOTAL_BUILD_POINTS - statsPointsUsed(buildStats);

  const updateStat = (key: keyof VehicleStats, delta: number) => {
    setBuildStats((prev) => {
      const newVal = Math.max(0, Math.min(MAX_SINGLE_STAT, prev[key] + delta));
      const newStats = { ...prev, [key]: newVal };
      if (statsPointsUsed(newStats) > TOTAL_BUILD_POINTS) return prev;
      return newStats;
    });
  };

  // ── MENU ──
  if (screen === "menu") {
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={onBack} className="text-xs font-bold text-white/50 hover:text-white/80">← Voltar</button>
          <h1 className="text-lg font-display font-black">🏎️ <span className="text-red-400">Car</span> <span className="text-amber-400">Brawl</span></h1>
          <div className="w-12" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <div className="text-center mb-4">
            <p className="text-xs text-white/40">Sumo com carros — empurre para fora da arena!</p>
          </div>

          <MenuButton label="🏁 Solo" desc="Batalhe contra bots" onClick={() => { setGameMode("solo"); setScreen("build"); }} />
          <MenuButton label="🏆 Carreira" desc="Progredir por fases" onClick={() => { setGameMode("career"); setScreen("career_map"); }} />
          <MenuButton label="🌐 Online" desc="Mesa com amigos" onClick={() => { setGameMode("online"); setScreen("online_lobby"); }} />
          <MenuButton label="🏆 Campeonato" desc="Eliminação direta" onClick={() => { setGameMode("championship"); setScreen("championship"); }} />

          <p className="mt-6 text-[10px] text-white/20">WASD/Setas · SHIFT = Nitro · Toque no celular</p>
        </div>
      </div>
    );
  }

  // ── BUILD ──
  if (screen === "build") {
    const statLabels: { key: keyof VehicleStats; label: string; icon: string; desc: string }[] = [
      { key: "peso", label: "Peso", icon: "⚖️", desc: "Inércia e resistência a empurrões" },
      { key: "potencia", label: "Potência", icon: "🔥", desc: "Aceleração e força de colisão" },
      { key: "aderencia", label: "Aderência", icon: "🛞", desc: "Tração, controle e frenagem" },
      { key: "velocidade", label: "Velocidade", icon: "💨", desc: "Limite de velocidade máxima" },
      { key: "resistencia", label: "Resistência", icon: "🛡️", desc: "Tolerância a impactos" },
      { key: "estabilidade", label: "Estabilidade", icon: "⚖️", desc: "Controle nas bordas e colisões" },
    ];

    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => setScreen("menu")} className="text-xs font-bold text-white/50">← Voltar</button>
          <h2 className="text-sm font-display font-black">Monte seu Carrinho</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-center mb-2">
            <span className={`text-lg font-bold ${pointsLeft > 0 ? "text-emerald-400" : pointsLeft === 0 ? "text-amber-400" : "text-red-400"}`}>
              {pointsLeft}
            </span>
            <span className="text-xs text-white/40 ml-1">pontos restantes</span>
          </div>
          {statLabels.map((s) => (
            <div key={s.key} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-lg w-8 text-center">{s.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white/80">{s.label}</span>
                  <span className="text-xs font-bold text-amber-400">{buildStats[s.key]}</span>
                </div>
                <p className="text-[9px] text-white/30 mb-1">{s.desc}</p>
                <div className="flex gap-1.5 items-center">
                  <button onClick={() => updateStat(s.key, -5)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 active:scale-95 transition min-w-[40px]">-5</button>
                  <button onClick={() => updateStat(s.key, -1)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 active:scale-95 transition min-w-[40px]">-1</button>
                  <div className="flex-1 mx-1">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(buildStats[s.key] / MAX_SINGLE_STAT) * 100}%` }} />
                    </div>
                  </div>
                  <button onClick={() => updateStat(s.key, 1)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 active:scale-95 transition min-w-[40px]">+1</button>
                  <button onClick={() => updateStat(s.key, 5)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 active:scale-95 transition min-w-[40px]">+5</button>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setScreen("arena_select")}
            disabled={pointsLeft < 0}
            className={`w-full py-3 rounded-xl font-bold text-sm transition ${pointsLeft >= 0 ? "bg-gradient-to-r from-red-500 to-amber-500 hover:scale-[1.02]" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
          >
            Próximo →
          </button>
        </div>
      </div>
    );
  }

  // ── ARENA SELECT ──
  if (screen === "arena_select") {
    const arenaKeys = Object.keys(ARENAS) as ArenaType[];
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => setScreen("build")} className="text-xs font-bold text-white/50">← Voltar</button>
          <h2 className="text-sm font-display font-black">Escolha a Arena</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Solo mode: difficulty & bot count */}
          {gameMode === "solo" && (
            <>
              <div className="flex gap-2">
                {(["facil", "medio", "dificil"] as const).map((d) => (
                  <button key={d} onClick={() => setSoloDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${
                      soloDifficulty === d
                        ? d === "facil" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : d === "medio" ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                        : "bg-red-500/20 border-red-500/50 text-red-400"
                        : "border-white/10 bg-white/5 text-white/40"
                    }`}
                  >
                    {d === "facil" ? "Fácil" : d === "medio" ? "Médio" : "Difícil"}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-xs text-white/60">Oponentes</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSoloBotCount(Math.max(2, soloBotCount - 1))} className="w-7 h-7 rounded bg-white/10 text-xs font-bold hover:bg-white/20">-</button>
                  <span className="text-sm font-bold text-amber-400 w-6 text-center">{soloBotCount}</span>
                  <button onClick={() => setSoloBotCount(Math.min(7, soloBotCount + 1))} className="w-7 h-7 rounded bg-white/10 text-xs font-bold hover:bg-white/20">+</button>
                </div>
              </div>
            </>
          )}
          {arenaKeys.map((key) => {
            const a = ARENAS[key]!;
            return (
              <button
                key={key}
              onClick={() => {
                setSelectedArena(key);
                if (gameMode === "career") {
                  const phase = career.phases.find((p) => p.id === career.currentPhase);
                  startMatch("career", key, phase?.opponents ?? 4, phase?.difficulty ?? "medio");
                } else {
                  startMatch(gameMode, key, soloBotCount, soloDifficulty);
                }
              }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-white/10 bg-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition text-left"
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <h3 className="font-bold text-sm">{a.label}</h3>
                  <p className="text-[10px] text-white/40">
                    {a.modifier.frictionMult < 0.8 ? "Aderência reduzida" : a.modifier.frictionMult > 1 ? "Aderência aumentada" : "Normal"}
                    {a.modifier.hasObstacles ? " · Obstáculos" : ""}
                    {a.modifier.gravity < 0.8 ? " · Gravidade baixa" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── CAREER MAP ──
  if (screen === "career_map") {
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => setScreen("menu")} className="text-xs font-bold text-white/50">← Voltar</button>
          <h2 className="text-sm font-display font-black">Carreira</h2>
          <span className="text-xs text-amber-400">⭐ {career.totalStars}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {career.phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => phase.unlocked && startCareerPhase(phase.id)}
              disabled={!phase.unlocked}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition text-left ${
                phase.completed
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : phase.unlocked
                    ? "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50"
                    : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-lg font-bold">
                {phase.completed ? "✓" : phase.id}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">{phase.label}</h3>
                <p className="text-[10px] text-white/40">{phase.description}</p>
              </div>
              <div className="text-right">
                <div className="text-xs">
                  {phase.completed ? "⭐".repeat(phase.stars) : "☆".repeat(3)}
                </div>
                <p className="text-[9px] text-white/30">{ARENAS[phase.arena].icon} {ARENAS[phase.arena].label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── ONLINE LOBBY ──
  if (screen === "online_lobby") {
    const arenaKeys = Object.keys(ARENAS) as ArenaType[];
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => setScreen("menu")} className="text-xs font-bold text-white/50">← Voltar</button>
          <h2 className="text-sm font-display font-black">🌐 Online</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-white/40 text-center mb-2">Escolha a arena e comece a batalha!</p>
          {arenaKeys.map((key) => {
            const a = ARENAS[key]!;
            return (
              <button key={key}
                onClick={() => {
                  setSelectedArena(key);
                  startMatch("online", key, 3, "medio");
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-white/10 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition text-left"
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <h3 className="font-bold text-sm">{a.label}</h3>
                  <p className="text-[10px] text-white/40">
                    {a.modifier.frictionMult < 0.8 ? "Aderência reduzida" : a.modifier.frictionMult > 1 ? "Aderência aumentada" : "Normal"}
                    {a.modifier.hasObstacles ? " · Obstáculos" : ""}
                  </p>
                </div>
                <span className="text-white/30 text-xs ml-auto">3 oponentes →</span>
              </button>
            );
          })}
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-center">
            <p className="text-[10px] text-white/30">Modo online local — jogue contra 3 bots na arena escolhida!</p>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAMPIONSHIP BRACKET ──
  if (screen === "championship") {
    const arenaKeys = Object.keys(ARENAS) as ArenaType[];
    // Championship hasn't started yet — show setup
    if (champBracket.rounds.length === 0) {
      return (
        <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button onClick={() => setScreen("menu")} className="text-xs font-bold text-white/50">← Voltar</button>
            <h2 className="text-sm font-display font-black">🏆 Campeonato</h2>
            <div className="w-12" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-white/40 text-center mb-2">Eliminação direta — escolha a arena para o campeonato!</p>
            {arenaKeys.map((key) => {
              const a = ARENAS[key]!;
              return (
                <button key={key}
                  onClick={() => {
                    setSelectedArena(key);
                    startChampionship(key);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-white/10 bg-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition text-left"
                >
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <h3 className="font-bold text-sm">{a.label}</h3>
                    <p className="text-[10px] text-white/40">8 jogadores · 3 rodadas · Difícil</p>
                  </div>
                  <span className="text-white/30 text-xs ml-auto">→</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    // Championship bracket view
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => { setChampBracket({ rounds: [], currentRound: 0, currentMatch: 0, champion: null }); setScreen("menu"); }} className="text-xs font-bold text-white/50">← Sair</button>
          <h2 className="text-sm font-display font-black">🏆 Campeonato — {ARENAS[selectedArena]?.icon} {ARENAS[selectedArena]?.label}</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {champBracket.champion ? (
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">🏆</span>
              <h3 className="text-2xl font-display font-black text-amber-400 mb-2">CAMPEÃO!</h3>
              <p className="text-sm text-white/60 mb-2">{champBracket.champion}</p>
              <p className="text-xs text-white/30 mb-6">Campeonato finalizado com sucesso!</p>
              <button onClick={() => { setChampBracket({ rounds: [], currentRound: 0, currentMatch: 0, champion: null }); setScreen("menu"); }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 font-bold text-sm">Voltar ao Menu</button>
            </div>
          ) : (
            <div className="space-y-3">
              {champBracket.rounds.map((round, ri) => (
                <div key={ri}>
                  <h3 className="text-xs font-bold text-white/50 mb-2">
                    {ri === 0 ? "Oitavas" : ri === 1 ? "Quartas" : ri === 2 ? "Semifinal" : "Final"} ({round.length > 0 ? round[0]?.winner ? "Finalizada" : round[0]?.played ? "Em jogo" : "Aguardando" : "—"})
                  </h3>
                  <div className="space-y-1">
                    {round.map((m, mi) => (
                      <div key={mi} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                        m.played ? "border-white/10 bg-white/5" : m.winner ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-white/[0.02]"
                      }`}>
                        <span className={`flex-1 ${m.winner === m.p1 ? "font-bold text-amber-400" : m.played && m.winner !== m.p1 ? "text-white/30" : "text-white/70"}`}>{m.p1}</span>
                        <span className="text-white/20">vs</span>
                        <span className={`flex-1 text-right ${m.winner === m.p2 ? "font-bold text-amber-400" : m.played && m.winner !== m.p2 ? "text-white/30" : "text-white/70"}`}>{m.p2}</span>
                        {m.played && m.winner && <span className="text-[9px] text-emerald-400">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Next match button */}
              {(() => {
                const { round, match } = getNextUnplayedMatch(champBracket);
                if (round >= 0 && match >= 0) {
                  const m = champBracket.rounds[round]?.[match];
                  if (m && !m.played) {
                    return (
                      <button onClick={() => startChampMatch(round, match)} className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 font-bold text-sm">
                        🏁 {m.p1} vs {m.p2}
                      </button>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (screen === "result" && result) {
    return (
      <div className="flex flex-col h-full bg-[#0a0e1a] text-white items-center justify-center p-6">
        <div className="text-center">
          <h2 className={`text-3xl font-display font-black mb-2 ${result.survived ? "text-amber-400" : "text-red-400"}`}>
            {result.survived ? "🏆 VITÓRIA!" : `#${result.position}`}
          </h2>
          <p className="text-sm text-white/50 mb-6">
            {result.survived ? "Último carrinho na arena!" : `Eliminado em ${result.position}º lugar`}
          </p>
          <div className="flex gap-6 justify-center mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">+{result.sovReward}</p>
              <p className="text-[10px] text-white/40">SOV</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{result.eliminations}</p>
              <p className="text-[10px] text-white/40">Eliminações</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                if (gameMode === "career") {
                  // Update career progress
                  if (result.survived) {
                    setCareer((prev) => {
                      const phases = [...prev.phases];
                      const idx = phases.findIndex((p) => p.id === career.currentPhase);
                      if (idx >= 0) {
                        phases[idx] = { ...phases[idx]!, completed: true, stars: Math.min(3, result.eliminations + 1) };
                        // Unlock next
                        if (idx + 1 < phases.length) {
                          phases[idx + 1] = { ...phases[idx + 1]!, unlocked: true };
                        }
                      }
                      return { ...prev, phases, totalStars: phases.reduce((s, p) => s + p.stars, 0) };
                    });
                  }
                  setScreen("career_map");
                } else if (gameMode === "championship" && champMatchRef.current) {
                  // Advance championship bracket
                  const { round, matchIdx } = champMatchRef.current;
                  const winnerName = result.survived ? "Você" : (vehiclesRef.current.find((v) => v.alive)?.name ?? "Bot");
                  setChampBracket((prev) => {
                    const rounds = prev.rounds.map((r) => r.map((m) => ({ ...m })));
                    const match = rounds[round]![matchIdx]!;
                    match.winner = winnerName;
                    match.played = true;
                    // Advance winner to next round
                    const nextRound = round + 1;
                    if (nextRound < rounds.length) {
                      const nextMatchIdx = Math.floor(matchIdx / 2);
                      const nextMatch = rounds[nextRound]![nextMatchIdx]!;
                      if (matchIdx % 2 === 0) {
                        nextMatch.p1 = winnerName;
                      } else {
                        nextMatch.p2 = winnerName;
                      }
                    }
                    // Check if championship is complete
                    const finalRound = rounds[rounds.length - 1]!;
                    const champion = finalRound[0]?.winner ?? null;
                    if (champion) {
                      return { ...prev, rounds, champion };
                    }
                    return { ...prev, rounds };
                  });
                  champMatchRef.current = null;
                  setScreen("championship");
                } else if (gameMode === "online") {
                  setScreen("online_lobby");
                } else {
                  setScreen("menu");
                }
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 font-bold text-sm"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME (countdown + playing) ──
  const player = vehiclesRef.current.find((v) => v.isPlayer);

  return (
    <div className="flex flex-col h-full bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <button onClick={() => setScreen("menu")} className="text-[10px] font-bold text-white/50">✕ Sair</button>
        <div className="flex gap-3 text-[10px]">
          {vehicles.filter((v) => v.alive).map((v) => (
            <span key={v.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
              <span className="text-white/60">{v.name}</span>
            </span>
          ))}
        </div>
        <span className="text-[10px] text-white/30">{matchTime}s</span>
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
        />

        {/* Touch controls overlay */}
        {screen === "playing" && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
            {/* Nitro button */}
            <button
              onTouchStart={handleNitroTouch}
              onTouchEnd={handleNitroRelease}
              className="pointer-events-auto px-4 py-3 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold active:bg-amber-500/40"
            >
              NITRO
              {player && (
                <div className="mt-1 h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${player.nitroAmount}%` }} />
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="px-3 py-2 border-t border-white/10 shrink-0">
        <div className="flex gap-2 overflow-x-auto">
          {vehicles.sort((a, b) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0)).map((v) => (
            <div key={v.id} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] shrink-0 ${
              v.alive ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-40"
            }`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
              <span className="text-white/60">{v.name}</span>
              {v.kills > 0 && <span className="font-bold text-amber-400">{v.kills}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  DRAWING FUNCTIONS
// ═══════════════════════════════════════════

function drawArena(ctx: CanvasRenderingContext2D, arena: Arena, time: number) {
  const { cx, cy, radius, type } = arena;

  // Floor
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  floorGrad.addColorStop(0, "rgba(15, 23, 42, 0.95)");
  floorGrad.addColorStop(1, "rgba(15, 23, 42, 0.8)");
  ctx.fillStyle = floorGrad;
  ctx.fill();

  // Danger zone (edge area)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = type === "lava" ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.06)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const borderColor = type === "lava" ? "rgba(239, 68, 68, 0.4)" :
    type === "agua" ? "rgba(59, 130, 246, 0.3)" :
    type === "gelo" ? "rgba(147, 197, 253, 0.3)" :
    "rgba(148, 163, 184, 0.25)";
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.03)";
  ctx.lineWidth = 0.5;
  for (let i = -radius; i <= radius; i += 25) {
    ctx.beginPath();
    ctx.moveTo(cx + i, cy - radius);
    ctx.lineTo(cx + i, cy + radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + i);
    ctx.lineTo(cx + radius, cy + i);
    ctx.stroke();
  }

  // Arena type effect
  if (type === "lava") {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.02 + Math.sin(time / 500) * 0.01})`;
    ctx.fill();
  } else if (type === "gelo") {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(147, 197, 253, ${0.02 + Math.sin(time / 800) * 0.01})`;
    ctx.fill();
  }
}

function drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, cfg: GameConfig, time: number) {
  const { pos, angle, color, accent, name, alive, fallProgress, isPlayer, nitro, thrust } = v;
  const cw = cfg.carWidth;
  const cl = cfg.carLength;

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Fall animation
  if (v.eliminated) {
    const scale = 1 - fallProgress * 0.8;
    const alpha = 1 - fallProgress;
    ctx.globalAlpha = alpha;
    ctx.scale(scale, scale);
    ctx.translate(0, fallProgress * 40);
    ctx.rotate(fallProgress * 2);
  }

  ctx.rotate(angle);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(2, 3, cl * 0.45, cw * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // Car body
  ctx.beginPath();
  ctx.roundRect(-cl / 2, -cw / 2, cl, cw, 4);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Windshield
  ctx.beginPath();
  ctx.roundRect(cl * 0.05, -cw * 0.3, cl * 0.25, cw * 0.6, 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  // Headlights
  ctx.beginPath();
  ctx.arc(cl / 2 - 2, -cw * 0.25, 1.5, 0, Math.PI * 2);
  ctx.arc(cl / 2 - 2, cw * 0.25, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = alive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)";
  ctx.fill();

  // Thrust flame
  if (thrust > 0.1 && alive) {
    const flameLen = 3 + thrust * 12;
    ctx.beginPath();
    ctx.moveTo(-cl / 2, -cw * 0.2);
    ctx.lineTo(-cl / 2 - flameLen, 0);
    ctx.lineTo(-cl / 2, cw * 0.2);
    ctx.closePath();
    ctx.fillStyle = nitro
      ? `rgba(255, 100, 0, ${0.5 + thrust * 0.4})`
      : `rgba(255, ${180 + thrust * 70}, 50, ${0.3 + thrust * 0.3})`;
    ctx.fill();
  }

  // Nitro glow
  if (nitro && alive) {
    ctx.beginPath();
    ctx.arc(0, 0, cl * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.1 + Math.sin(time / 100) * 0.05})`;
    ctx.fill();
  }

  ctx.restore();

  // Name label
  ctx.save();
  ctx.font = "bold 8px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(name, pos.x, pos.y - cw - 4);
  ctx.restore();

  // Player indicator
  if (isPlayer && alive) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cw + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
  const r = 30 * progress;
  const alpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.5})`;
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, player: Vehicle, arena: Arena, time: number) {
  // Nitro bar
  const barW = 80;
  const barH = 6;
  const barX = 10;
  const barY = canvas.height - 20;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(barX, barY, barW * (player.nitroAmount / player.nitroMax), barH);
  ctx.font = "8px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("NITRO", barX, barY - 3);

  // Alive count
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.floor(time)}s`, canvas.width - 10, 15);
}

function MenuButton({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-xs flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-amber-500/40 hover:bg-amber-500/10 transition text-left"
    >
      <div className="flex-1">
        <h3 className="font-bold text-sm text-white/90">{label}</h3>
        <p className="text-[10px] text-white/40">{desc}</p>
      </div>
      <span className="text-white/30 text-xs">→</span>
    </button>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
