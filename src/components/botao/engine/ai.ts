import { FIELD, type Disc, type Side } from "./physics";
import { escolherFinalizador } from "./estrategia";
import type { Difficulty } from "../types";

// Ruído angular da mira da CPU. Quanto menor, mais cirúrgica.
const NOISE: Record<Difficulty, number> = { amador: 0.22, profissional: 0.12, lenda: 0.04 };
// Multiplicador de força. Acima de 1 = chutes mais fortes (mais difíceis de defender).
const FORCE: Record<Difficulty, number> = { amador: 0.86, profissional: 0.96, lenda: 1.06 };

/** Escolhe um botão e devolve o impulso que a CPU vai aplicar. */
export function planAiShot(discs: Disc[], side: Side, difficulty: Difficulty, teamPower: number) {
  const ball = discs.find((d) => d.side === "ball")!;
  const mine = discs.filter((d) => d.side === side && !d.keeper);
  const adversarios = discs.filter((d) => d.side !== side && d.side !== "ball");
  if (!mine.length) return null;

  const targetX = side === "home" ? FIELD.w - FIELD.margin : FIELD.margin;
  // Mira mais centralizada no gol (menos variação) em níveis altos.
  const centraliza = difficulty === "lenda" ? 0.18 : difficulty === "profissional" ? 0.35 : 0.5;
  const targetY = FIELD.h / 2 + (Math.random() - 0.5) * FIELD.goalHeight * centraliza;
  const alvo = { x: targetX, y: targetY };

  // Geometria de finalização (mesma do cérebro estratégico): só chuta quem
  // está ATRÁS da bola; sem ângulo limpo, reposiciona em vez de entregar.
  const escolha = escolherFinalizador(mine, ball, alvo, adversarios);
  const shooter = escolha && escolha.cos >= 0.12
    ? escolha.disc
    : // fallback: o mais próximo da bola (jogada de aproximação)
      [...mine].sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0]!;

  // mira: ponto atrás da bola na direção do gol
  const gx = alvo.x - ball.x;
  const gy = alvo.y - ball.y;
  const gl = Math.hypot(gx, gy) || 1;
  // Fator de "tocar na bola" mais justo em níveis altos.
  const toque = difficulty === "lenda" ? 0.5 : difficulty === "profissional" ? 0.55 : 0.6;
  const aimX = ball.x - (gx / gl) * (shooter.r + ball.r) * toque;
  const aimY = ball.y - (gy / gl) * (shooter.r + ball.r) * toque;

  let dx = aimX - shooter.x;
  let dy = aimY - shooter.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Força do clube reduz o ruído de forma acentuada (elite = cirúrgico).
  const n = Math.max(0, Math.min(1, (teamPower - 28) / 71));
  const skill = NOISE[difficulty] * (1.35 - n);
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
