import { FIELD, type Disc, type Side } from "./physics";
import type { Difficulty } from "../types";

// Ruído angular da mira da CPU. Quanto menor, mais cirúrgica.
const NOISE: Record<Difficulty, number> = { amador: 0.22, profissional: 0.12, lenda: 0.04 };
// Multiplicador de força. Acima de 1 = chutes mais fortes (mais difíceis de defender).
const FORCE: Record<Difficulty, number> = { amador: 0.86, profissional: 0.96, lenda: 1.06 };
// Chance de a CPU acertar o bote (escolher o botão ideal). Mais alta = mais letal.
const ACERTO_BOTE: Record<Difficulty, number> = { amador: 0.8, profissional: 0.9, lenda: 0.97 };

/** Escolhe um botão e devolve o impulso que a CPU vai aplicar. */
export function planAiShot(discs: Disc[], side: Side, difficulty: Difficulty, teamPower: number) {
  const ball = discs.find((d) => d.side === "ball")!;
  const mine = discs.filter((d) => d.side === side && !d.keeper);
  if (!mine.length) return null;

  const targetX = side === "home" ? FIELD.w - FIELD.margin : FIELD.margin;
  // Mira mais centralizada no gol (menos variação) em níveis altos.
  const centraliza = difficulty === "lenda" ? 0.18 : difficulty === "profissional" ? 0.35 : 0.5;
  const targetY = FIELD.h / 2 + (Math.random() - 0.5) * FIELD.goalHeight * centraliza;

  // botão mais próximo da bola; em níveis altos quase sempre o ideal.
  const sorted = [...mine].sort(
    (a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y),
  );
  const acerto = ACERTO_BOTE[difficulty];
  const pickIdx = Math.random() < acerto ? 0 : Math.min(1, sorted.length - 1);
  const shooter = sorted[pickIdx]!;

  // mira: ponto atrás da bola na direção do gol
  const gx = targetX - ball.x;
  const gy = targetY - ball.y;
  const gl = Math.hypot(gx, gy) || 1;
  // Fator de "tocar na bola" mais justo em níveis altos.
  const toque = difficulty === "lenda" ? 0.5 : difficulty === "profissional" ? 0.55 : 0.6;
  const aimX = ball.x - (gx / gl) * (shooter.r + ball.r) * toque;
  const aimY = ball.y - (gy / gl) * (shooter.r + ball.r) * toque;

  let dx = aimX - shooter.x;
  let dy = aimY - shooter.y;
  const dist = Math.hypot(dx, dy) || 1;

  const skill = NOISE[difficulty] * (1 - (teamPower - 58) / 120);
  const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * skill;
  // Força mais calibrada pra alcançar o gol mesmo de longe (mais gol em níveis altos).
  const powerBase = Math.min(1, dist / 240 + 0.6) * FORCE[difficulty];
  // Ruído de força menor em níveis altos (chutes mais consistentes).
  const ruidoForca = difficulty === "lenda" ? 0.08 : difficulty === "profissional" ? 0.14 : 0.2;
  const power = Math.max(0.4, Math.min(1.05, powerBase + (Math.random() - 0.5) * ruidoForca));

  dx = Math.cos(angle);
  dy = Math.sin(angle);

  return { discId: shooter.id, ix: dx * 26 * power, iy: dy * 26 * power };
}
