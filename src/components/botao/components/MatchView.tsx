import { useCallback, useEffect, useRef, useState } from "react";
import { FIELD, clampImpulse, initialDiscs, resetPositions, step, type Disc, type Side } from "../engine/physics";
import { planAiShot } from "../engine/ai";
import { teamById } from "../data/teams";
import type { Difficulty, MatchResult } from "../types";

type Props = {
  homeId: string;
  awayId: string;
  userSide: Side;
  difficulty: Difficulty;
  turns?: number;
  knockout?: boolean;
  stageLabel: string;
  onFinish: (result: MatchResult) => void;
  onQuit: () => void;
  isOnline?: boolean; // Nova prop para indicar modo online
};

type Aim = { discId: string; px: number; py: number } | null;

export function MatchView({
  homeId,
  awayId,
  userSide,
  difficulty,
  turns = 24,
  knockout = false,
  stageLabel,
  onFinish,
  onQuit,
  isOnline = false,
}: Props) {
  const home = teamById(homeId);
  const away = teamById(awayId);
  const cpuSide: Side = userSide === "home" ? "away" : "home";
  // No modo online, não há CPU - ambos os lados são jogadores reais
  const hasCpu = !isOnline;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const discsRef = useRef<Disc[]>(initialDiscs());
  const aimRef = useRef<Aim>(null);
  const simRef = useRef(false);
  const turnRef = useRef<Side>("home");
  const portraitRef = useRef(false);
  const scaleRef = useRef(1);

  const [score, setScore] = useState({ home: 0, away: 0 });
  const [turnsLeft, setTurnsLeft] = useState(turns);
  const [turn, setTurn] = useState<Side>("home");
  const [flash, setFlash] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [pens, setPens] = useState<{ home: number[]; away: number[] } | null>(null);
  const [aimPower, setAimPower] = useState(0);
  const [ownGoalPenalty, setOwnGoalPenalty] = useState(false); // Flag para jogar duas vezes após gol contra
  const [difficultyMultiplier, setDifficultyMultiplier] = useState(1); // Multiplicador de dificuldade após gol contra

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const turnsRef = useRef(turnsLeft);
  turnsRef.current = turnsLeft;
  const endedRef = useRef(false);

  /* ---------- render loop ---------- */
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const W = wrap.clientWidth;
      const portrait = W < 620;
      portraitRef.current = portrait;
      const s = portrait ? W / FIELD.h : W / FIELD.w;
      scaleRef.current = s;
      const cw = W;
      const ch = portrait ? FIELD.w * s : FIELD.h * s;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        canvas.style.height = `${ch}px`;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      if (portrait) ctx.setTransform(0, s * dpr, -s * dpr, 0, cw * dpr, 0);
      else ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);

      drawField(ctx);
      drawDiscs(ctx, discsRef.current, home.primary, home.secondary, away.primary, away.secondary);
      const aim = aimRef.current;
      if (aim) {
        const d = discsRef.current.find((x) => x.id === aim.discId);
        if (d) drawAim(ctx, d, aim.px, aim.py);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [home.primary, home.secondary, away.primary, away.secondary]);

  /* ---------- turn flow ---------- */
  const finishMatch = useCallback(
    (hg: number, ag: number) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      if (knockout && hg === ag) {
        const shoot = (): number[] => Array.from({ length: 5 }, () => (Math.random() < 0.72 ? 1 : 0));
        let h = shoot();
        let a = shoot();
        let hs = h.reduce((x, y) => x + y, 0);
        let as = a.reduce((x, y) => x + y, 0);
        while (hs === as) {
          const eh = Math.random() < 0.7 ? 1 : 0;
          const ea = Math.random() < 0.7 ? 1 : 0;
          h = [...h, eh];
          a = [...a, ea];
          hs += eh;
          as += ea;
        }
        setPens({ home: h, away: a });
        setTimeout(() => onFinish({ homeId, awayId, homeGoals: hg, awayGoals: ag, penHome: hs, penAway: as }), 2600);
      } else {
        setTimeout(() => onFinish({ homeId, awayId, homeGoals: hg, awayGoals: ag }), 1400);
      }
    },
    [knockout, onFinish, homeId, awayId],
  );

  const runSimulation = useCallback(() => {
    simRef.current = true;
    let frames = 0;
    let ownGoalDetected = false;
    const loop = () => {
      let goal: Side | null = null;
      for (let i = 0; i < 2; i++) {
        const r = step(discsRef.current);
        if (r.goal) goal = r.goal;
        if (r.ownGoal) ownGoalDetected = true;
        if (goal) break;
      }
      frames++;
      const moving = discsRef.current.some((d) => d.vx !== 0 || d.vy !== 0);
      if (goal) {
        const next = { ...scoreRef.current, [goal]: scoreRef.current[goal] + 1 };
        setScore(next);
        
        if (ownGoalDetected) {
          setFlash("GOL CONTRA!");
          // Após gol contra, aumentar dificuldade e não decrementar turnos
          setDifficultyMultiplier(prev => prev + 0.5); // Aumentar dificuldade
          setOwnGoalPenalty(true); // Ativar flag para jogar duas vezes
          setTimeout(() => setFlash(null), 1500);
          resetPositions(discsRef.current);
          simRef.current = false;
          // Não decrementa turnos após gol contra - deve jogar de novo
          turnRef.current = turnRef.current; // Mantém o mesmo turno
          setTurn(turnRef.current);
          return;
        }
        
        setFlash("GOOOOL!");
        resetPositions(discsRef.current);
        setTimeout(() => setFlash(null), 1200);
        const conceding: Side = goal === "home" ? "away" : "home";
        // Quem sofreu o gol (conceding) recebe o próximo turno
        simRef.current = false;
        const left = turnsRef.current - 1;
        setTurnsLeft(left);
        if (left <= 0) {
          finishMatch(next.home, next.away);
          return;
        }
        turnRef.current = conceding;
        setTurn(conceding);
        return;
      }
      if (!moving || frames > 900) {
        simRef.current = false;
        const left = turnsRef.current - 1;
        
        // Se estava em penalidade de gol contra, decrementa apenas após a segunda jogada
        if (ownGoalPenalty) {
          setOwnGoalPenalty(false); // Remove a flag após a segunda jogada
          setTurnsLeft(left); // Decrementa turnos
          if (left <= 0) {
            finishMatch(scoreRef.current.home, scoreRef.current.away);
            return;
          }
          turnRef.current = turnRef.current === "home" ? "away" : "home";
          setTurn(turnRef.current);
          return;
        }
        
        setTurnsLeft(left);
        if (left <= 0) {
          finishMatch(scoreRef.current.home, scoreRef.current.away);
          return;
        }
        turnRef.current = turnRef.current === "home" ? "away" : "home";
        setTurn(turnRef.current);
        return;
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }, [finishMatch]);

  // jogada da CPU (desabilitado no modo online)
  useEffect(() => {
    if (!hasCpu || ended || turn !== cpuSide || simRef.current) return;
    const cpuTeam = cpuSide === "home" ? home : away;
    // Aplicar multiplicador de dificuldade após gol contra
    const adjustedDifficulty = ownGoalPenalty ? 
      (difficulty === 'amador' ? 'medio' : difficulty === 'medio' ? 'profissional' : 'profissional') : 
      difficulty;
    const t = setTimeout(() => {
      const shot = planAiShot(discsRef.current, cpuSide, adjustedDifficulty, cpuTeam.power * difficultyMultiplier);
      if (!shot) return;
      const d = discsRef.current.find((x) => x.id === shot.discId);
      if (!d) return;
      d.vx = shot.ix;
      d.vy = shot.iy;
      runSimulation();
    }, 750);
    return () => clearTimeout(t);
  }, [hasCpu, turn, cpuSide, difficulty, difficultyMultiplier, ownGoalPenalty, ended, home, away, runSimulation]);

  /* ---------- input ---------- */
  const toField = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const s = scaleRef.current;
    if (portraitRef.current) return { x: sy / s, y: (rect.width - sx) / s };
    return { x: sx / s, y: sy / s };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // No modo online, só permite input se for o turno do usuário
    if (ended || simRef.current || turn !== userSide) return;
    const { x, y } = toField(e);
    const hit = discsRef.current
      .filter((d) => d.side === userSide)
      .find((d) => Math.hypot(d.x - x, d.y - y) < d.r * 1.5);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    aimRef.current = { discId: hit.id, px: x, py: y };
    setAimPower(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!aimRef.current) return;
    const { x, y } = toField(e);
    aimRef.current = { ...aimRef.current, px: x, py: y };
    const d = discsRef.current.find((dd) => dd.id === aimRef.current!.discId);
    if (d) setAimPower(clampImpulse(d.x - x, d.y - y).power);
  };

  const onPointerUp = () => {
    const aim = aimRef.current;
    aimRef.current = null;
    setAimPower(0);
    if (!aim || ended || simRef.current) return;
    const d = discsRef.current.find((x) => x.id === aim.discId);
    if (!d) return;
    const { ix, iy, power } = clampImpulse(d.x - aim.px, d.y - aim.py);
    if (power < 0.06) return;
    d.vx = ix;
    d.vy = iy;
    runSimulation();
  };

  const userTeam = userSide === "home" ? home : away;
  const yourTurn = turn === userSide && !ended;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-8">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">{stageLabel}</p>
          <h2 className="truncate font-display text-lg text-foreground sm:text-2xl">
            {home.short} <span className="text-muted-foreground">vs</span> {away.short}
          </h2>
        </div>
        <button onClick={onQuit} className="btn-ghost shrink-0">
          Sair
        </button>
      </div>

      <div className="scoreboard mb-3">
        <TeamChip team={home} align="left" />
        <div className="text-center">
          <div className="font-display text-3xl leading-none text-foreground sm:text-4xl">
            {score.home} <span className="text-muted-foreground">-</span> {score.away}
          </div>
          <div className="mt-1 text-[11px] tracking-widest text-muted-foreground uppercase">
            {ended ? "Fim de jogo" : `${turnsLeft} jogadas`}
          </div>
        </div>
        <TeamChip team={away} align="right" />
      </div>

      <div ref={wrapRef} className="relative">
        <canvas
          ref={canvasRef}
          className="pitch-canvas w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {flash && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="goal-flash font-display text-4xl sm:text-6xl">{flash}</span>
          </div>
        )}
        {pens && (
          <div className="absolute inset-0 grid place-items-center bg-background/85 px-4">
            <div className="text-center">
              <p className="font-display text-2xl text-foreground">Disputa de pênaltis</p>
              <p className="mt-2 font-mono text-sm text-muted-foreground">
                {home.short}: {pens.home.map((v) => (v ? "●" : "○")).join(" ")}
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {away.short}: {pens.away.map((v) => (v ? "●" : "○")).join(" ")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {ended ? (
            "Apurando o resultado..."
          ) : yourTurn ? (
            <>
              Sua vez, <span className="text-foreground">{userTeam.short}</span> — arraste um botão pra trás e solte.
            </>
          ) : isOnline ? (
            "Aguardando o oponente..."
          ) : (
            "A CPU está pensando..."
          )}
        </p>
        <div className="power-bar shrink-0" aria-hidden>
          <span style={{ width: `${Math.round(aimPower * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function TeamChip({ team, align }: { team: ReturnType<typeof teamById>; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span
        className="size-6 shrink-0 rounded-full border-2 sm:size-8"
        style={{ background: team.primary, borderColor: team.secondary }}
      />
      <span className="truncate font-display text-sm text-foreground sm:text-base">{team.short}</span>
    </div>
  );
}

/* ---------- drawing ---------- */
function drawField(ctx: CanvasRenderingContext2D) {
  const { w, h, margin, goalHeight } = FIELD;
  ctx.fillStyle = "#0e6b3c";
  ctx.fillRect(0, 0, w, h);
  // listras
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let i = 0; i < 10; i += 2) ctx.fillRect(margin + (i * (w - margin * 2)) / 10, margin, (w - margin * 2) / 10, h - margin * 2);

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
  ctx.beginPath();
  ctx.moveTo(w / 2, margin);
  ctx.lineTo(w / 2, h - margin);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 78, 0, Math.PI * 2);
  ctx.stroke();

  const areaH = 300;
  const areaW = 130;
  ctx.strokeRect(margin, (h - areaH) / 2, areaW, areaH);
  ctx.strokeRect(w - margin - areaW, (h - areaH) / 2, areaW, areaH);

  // gols
  const gt = (h - goalHeight) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(margin - 22, gt, 22, goalHeight);
  ctx.fillRect(w - margin, gt, 22, goalHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeRect(margin - 22, gt, 22, goalHeight);
  ctx.strokeRect(w - margin, gt, 22, goalHeight);
}

function drawDiscs(
  ctx: CanvasRenderingContext2D,
  discs: Disc[],
  hp: string,
  hs: string,
  ap: string,
  as: string,
) {
  for (const d of discs) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y + 3, d.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    if (d.side === "ball") {
      ctx.fillStyle = "#fdfdfd";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#333";
      ctx.stroke();
    } else {
      const primary = d.side === "home" ? hp : ap;
      const secondary = d.side === "home" ? hs : as;
      const grad = ctx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.15, d.x, d.y, d.r);
      grad.addColorStop(0, "rgba(255,255,255,0.55)");
      grad.addColorStop(0.35, primary);
      grad.addColorStop(1, primary);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = d.keeper ? 6 : 4;
      ctx.strokeStyle = secondary;
      ctx.stroke();
      if (d.keeper) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = secondary;
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawAim(ctx: CanvasRenderingContext2D, d: Disc, px: number, py: number) {
  const { ix, iy, power } = clampImpulse(d.x - px, d.y - py);
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255, 214, 90, ${0.4 + power * 0.6})`;
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(d.x + ix * 9, d.y + iy * 9);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,214,90,0.85)";
  ctx.fill();
  ctx.restore();
}
