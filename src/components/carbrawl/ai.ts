/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Advanced AI (from battle-carts-engine-main)
   Complete AI system with difficulty profiles and tactical behavior
   ═══════════════════════════════════════════════════════════════ */

import type { ArenaDef } from "./arenas";
import type { Difficulty, Vehicle, VehicleInput } from "./types";

interface AIProfile {
  /** com que antecedência percebe a borda (0..1 do raio) */
  edgeAwareness: number;
  /** ruído no volante */
  noise: number;
  /** quão bem antecipa a posição do alvo */
  lead: number;
  nitroSkill: number;
  reaction: number;
}

const PROFILES: Record<Difficulty, AIProfile> = {
  easy: { edgeAwareness: 0.9, noise: 0.45, lead: 0.05, nitroSkill: 0.15, reaction: 0.28 },
  medium: { edgeAwareness: 0.82, noise: 0.22, lead: 0.16, nitroSkill: 0.45, reaction: 0.16 },
  hard: { edgeAwareness: 0.74, noise: 0.1, lead: 0.3, nitroSkill: 0.75, reaction: 0.08 },
  insane: { edgeAwareness: 0.68, noise: 0.03, lead: 0.42, nitroSkill: 0.95, reaction: 0.04 },
};

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function pickTarget(self: Vehicle, all: Vehicle[], arena: ArenaDef): Vehicle | null {
  let best: Vehicle | null = null;
  let bestScore = Infinity;
  for (const o of all) {
    if (o.id === self.id || o.state !== "alive") continue;
    const dx = o.x - self.x;
    const dy = o.y - self.y;
    const dist = Math.hypot(dx, dy);
    const edgeDist = arena.radius - Math.hypot(o.x, o.y);
    // prefere alvos perto da borda e perto de mim
    const score = dist * 0.65 + edgeDist * 0.9;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

export function computeAIInput(
  self: Vehicle,
  all: Vehicle[],
  arena: ArenaDef,
  dt: number,
): VehicleInput {
  const p = PROFILES[self.difficulty] ?? PROFILES["medium"]!;
  if (!p) return { throttle: 0, steer: 0, nitro: false };

  self.aiTimer -= dt;
  if (self.aiTimer <= 0) {
    self.aiTimer = p.reaction + Math.random() * p.reaction;
    self.aiJitter = (Math.random() * 2 - 1) * p.noise;
    const t = pickTarget(self, all, arena);
    self.aiTargetId = t ? t.id : null;
  }

  const distCenter = Math.hypot(self.x, self.y);
  const forwardSpeed = self.vx * Math.cos(self.angle) + self.vy * Math.sin(self.angle);

  let desiredAngle: number;
  let throttle = 1;
  let nitro = false;

  const danger = distCenter / arena.radius;
  // Prevê onde estará em ~0.6s: se sair da arena, volta imediatamente.
  const futureX = self.x + self.vx * 0.6;
  const futureY = self.y + self.vy * 0.6;
  const futureOut = Math.hypot(futureX, futureY) > arena.radius * 0.98;

  if (danger > p.edgeAwareness || futureOut) {
    // fugir da borda: mirar no centro
    desiredAngle = Math.atan2(-self.y, -self.x);
    const diff = angleDiff(desiredAngle, self.angle);
    if (Math.abs(diff) > 2.0) {
      // é mais rápido dar ré
      throttle = -1;
      const steer = Math.max(-1, Math.min(1, -angleDiff(desiredAngle + Math.PI, self.angle) * 2));
      return { throttle, steer, nitro: false };
    }
    throttle = Math.abs(diff) > 1.1 ? 0.45 : 1;
    nitro = Math.abs(diff) < 0.35 && danger > 0.95 && self.nitro > 20;
    const steer = Math.max(-1, Math.min(1, diff * 2.2 + self.aiJitter * 0.3));
    return { throttle, steer, nitro };
  }

  const target = all.find((v) => v.id === self.aiTargetId && v.state === "alive");
  if (!target) {
    desiredAngle = Math.atan2(-self.y, -self.x);
    const steer = Math.max(-1, Math.min(1, angleDiff(desiredAngle, self.angle) * 2 + self.aiJitter));
    return { throttle: 0.5, steer, nitro: false };
  }

  const lead = p.lead;
  const tx = target.x + target.vx * lead;
  const ty = target.y + target.vy * lead;
  desiredAngle = Math.atan2(ty - self.y, tx - self.x);
  const diff = angleDiff(desiredAngle, self.angle) + self.aiJitter * 0.5;
  const dist = Math.hypot(tx - self.x, ty - self.y);

  if (Math.abs(diff) > 2.1 && Math.abs(forwardSpeed) < 90) {
    // manobra de ré para reposicionar
    return { throttle: -1, steer: diff > 0 ? -1 : 1, nitro: false };
  }

  throttle = Math.abs(diff) > 1.2 ? 0.5 : 1;

  // acelera para empurrar quando alinhado e perto, e o alvo está mais perto da borda
  const targetEdge = arena.radius - Math.hypot(target.x, target.y);
  const worthPush = targetEdge < arena.radius * 0.55;
  nitro =
    self.nitro > 25 &&
    Math.abs(diff) < 0.3 &&
    dist < 260 &&
    worthPush &&
    Math.random() < p.nitroSkill;

  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  return { throttle, steer, nitro };
}
