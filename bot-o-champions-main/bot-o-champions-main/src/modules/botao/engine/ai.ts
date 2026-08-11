import { FIELD, type Disc, type Side } from "./physics";
import type { Difficulty } from "../types";

const NOISE: Record<Difficulty, number> = { amador: 0.34, profissional: 0.18, lenda: 0.07 };
const FORCE: Record<Difficulty, number> = { amador: 0.72, profissional: 0.88, lenda: 1 };

/** Escolhe um botão e devolve o impulso que a CPU vai aplicar. */
export function planAiShot(discs: Disc[], side: Side, difficulty: Difficulty, teamPower: number) {
  const ball = discs.find((d) => d.side === "ball")!;
  const mine = discs.filter((d) => d.side === side && !d.keeper);
  if (!mine.length) return null;

  const targetX = side === "home" ? FIELD.w - FIELD.margin : FIELD.margin;
  const targetY = FIELD.h / 2 + (Math.random() - 0.5) * FIELD.goalHeight * 0.5;

  // botão mais próximo da bola, com leve variação
  const sorted = [...mine].sort(
    (a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y),
  );
  const pickIdx = Math.random() < 0.82 ? 0 : Math.min(1, sorted.length - 1);
  const shooter = sorted[pickIdx]!;

  // mira: ponto atrás da bola na direção do gol
  const gx = targetX - ball.x;
  const gy = targetY - ball.y;
  const gl = Math.hypot(gx, gy) || 1;
  const aimX = ball.x - (gx / gl) * (shooter.r + ball.r) * 0.55;
  const aimY = ball.y - (gy / gl) * (shooter.r + ball.r) * 0.55;

  let dx = aimX - shooter.x;
  let dy = aimY - shooter.y;
  const dist = Math.hypot(dx, dy) || 1;

  const skill = NOISE[difficulty] * (1 - (teamPower - 58) / 120);
  const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * skill;
  const powerBase = Math.min(1, dist / 260 + 0.55) * FORCE[difficulty];
  const power = Math.max(0.35, Math.min(1, powerBase + (Math.random() - 0.5) * 0.18));

  dx = Math.cos(angle);
  dy = Math.sin(angle);

  return { discId: shooter.id, ix: dx * 26 * power, iy: dy * 26 * power };
}
