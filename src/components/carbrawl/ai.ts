/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Advanced AI (from battle-carts-engine-main)
   Complete AI system with difficulty profiles and tactical behavior
   ═══════════════════════════════════════════════════════════════ */

import type { ArenaDef } from "./arenas";
import type { Vehicle } from "./types";

export type Difficulty = "easy" | "medium" | "hard" | "insane";

export interface VehicleInput {
  throttle: number;
  steer: number;
  nitro: boolean;
}

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

/** Map difficulty strings from AIState to profile keys */
function mapDifficulty(d: string): Difficulty {
  if (d === "dificil") return "hard";
  if (d === "medio") return "medium";
  if (d === "facil") return "easy";
  return "medium";
}

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
    if (o.id === self.id || !o.alive || o.eliminated) continue;
    const dx = o.pos.x - self.pos.x;
    const dy = o.pos.y - self.pos.y;
    const dist = Math.hypot(dx, dy);
    const edgeDist = arena.radius - Math.hypot(o.pos.x, o.pos.y);
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
  const diffKey = mapDifficulty(self.aiState.difficulty);
  const p = PROFILES[diffKey] ?? PROFILES["medium"]!;
  if (!p) return { throttle: 0, steer: 0, nitro: false };

  // Timer-based decision update (stored in aiState.timer)
  self.aiState.timer -= dt;
  if (self.aiState.timer <= 0) {
    self.aiState.timer = p.reaction + Math.random() * p.reaction;
    const t = pickTarget(self, all, arena);
    self.aiState.targetId = t ? t.id : null;
  }

  const distCenter = Math.hypot(self.pos.x, self.pos.y);
  const forwardSpeed = self.vel.x * Math.cos(self.angle) + self.vel.y * Math.sin(self.angle);

  let desiredAngle: number;
  let throttle = 1;
  let nitro = false;

  const danger = distCenter / arena.radius;
  // Prevê onde estará em ~0.6s: se sair da arena, volta imediatamente.
  const futureX = self.pos.x + self.vel.x * 0.6;
  const futureY = self.pos.y + self.vel.y * 0.6;
  const futureOut = Math.hypot(futureX, futureY) > arena.radius * 0.98;

  if (danger > p.edgeAwareness || futureOut) {
    // fugir da borda: mirar no centro
    desiredAngle = Math.atan2(-self.pos.y, -self.pos.x);
    const diff = angleDiff(desiredAngle, self.angle);
    if (Math.abs(diff) > 2.0) {
      // é mais rápido dar ré
      throttle = -1;
      const steer = Math.max(-1, Math.min(1, -angleDiff(desiredAngle + Math.PI, self.angle) * 2));
      return { throttle, steer, nitro: false };
    }
    throttle = Math.abs(diff) > 1.1 ? 0.45 : 1;
    nitro = Math.abs(diff) < 0.35 && danger > 0.95 && self.nitroAmount > 20;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    return { throttle, steer, nitro };
  }

  const target = all.find((v) => v.id === self.aiState.targetId && v.alive && !v.eliminated);
  if (!target) {
    desiredAngle = Math.atan2(-self.pos.y, -self.pos.x);
    const steer = Math.max(-1, Math.min(1, angleDiff(desiredAngle, self.angle) * 2));
    return { throttle: 0.5, steer, nitro: false };
  }

  const lead = p.lead;
  const tx = target.pos.x + target.vel.x * lead;
  const ty = target.pos.y + target.vel.y * lead;
  desiredAngle = Math.atan2(ty - self.pos.y, tx - self.pos.x);
  const diff = angleDiff(desiredAngle, self.angle);
  const dist = Math.hypot(tx - self.pos.x, ty - self.pos.y);

  if (Math.abs(diff) > 2.1 && Math.abs(forwardSpeed) < 90) {
    // manobra de ré para reposicionar
    return { throttle: -1, steer: diff > 0 ? -1 : 1, nitro: false };
  }

  throttle = Math.abs(diff) > 1.2 ? 0.5 : 1;

  // acelera para empurrar quando alinhado e perto, e o alvo está mais perto da borda
  const targetEdge = arena.radius - Math.hypot(target.pos.x, target.pos.y);
  const worthPush = targetEdge < arena.radius * 0.55;
  nitro =
    self.nitroAmount > 25 &&
    Math.abs(diff) < 0.3 &&
    dist < 260 &&
    worthPush &&
    Math.random() < p.nitroSkill;

  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  return { throttle, steer, nitro };
}
