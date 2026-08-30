/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Physics Engine
   Complete physics simulation for vehicle combat
   ═══════════════════════════════════════════════════════════════ */

import type { Vehicle, Arena, GameConfig, Vec2, VehicleStats, AIBehavior, AIState } from "./types";
import { computePhysics, DEFAULT_CONFIG } from "./types";

// ─── Vector Math ───

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Vec2): Vec2 {
  const len = Math.hypot(a.x, a.y);
  return len > 0 ? { x: a.x / len, y: a.y / len } : { x: 0, y: 0 };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Vehicle Factory ───

let vehicleCounter = 0;

export function createVehicle(
  pos: Vec2,
  name: string,
  color: string,
  accent: string,
  stats: VehicleStats,
  isPlayer: boolean = false,
): Vehicle {
  const id = `v-${vehicleCounter++}`;
  return {
    id,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    angle: 0,
    angularVel: 0,
    thrust: 0,
    steer: 0,
    brake: false,
    nitro: false,
    nitroAmount: 100,
    nitroMax: 100,
    color,
    accent,
    name,
    alive: true,
    eliminated: false,
    fallProgress: 0,
    isPlayer,
    stats: { ...stats },
    physics: computePhysics(stats),
    aiState: { behavior: "hunt", targetId: null, timer: 0, difficulty: "medio" },
    kills: 0,
  };
}

// ─── Spawn vehicles in arena ───

function randomBotStats(): VehicleStats {
  const total = 120;
  const base = Math.floor(total / 6);
  const s: VehicleStats = { peso: base, potencia: base, aderencia: base, velocidade: base, resistencia: base, estabilidade: base };
  // Give each bot a specialty + weakness
  const keys: (keyof VehicleStats)[] = ["peso", "potencia", "aderencia", "velocidade", "resistencia", "estabilidade"];
  // Boost one stat
  const boost = keys[Math.floor(Math.random() * keys.length)]!;
  s[boost] = Math.min(60, s[boost] + 15 + Math.floor(Math.random() * 10));
  // Weaken another
  const weak = keys.filter((k) => k !== boost)[Math.floor(Math.random() * (keys.length - 1))!]!;
  s[weak] = Math.max(5, s[weak] - 10 - Math.floor(Math.random() * 10));
  return s;
}

export function spawnVehicles(
  arena: Arena,
  count: number,
  names: string[],
  colors: { color: string; accent: string }[],
  playerStats: VehicleStats,
  playerIndex: number = 0,
): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const spawnR = arena.radius * 0.5;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const pos: Vec2 = {
      x: arena.cx + Math.cos(angle) * spawnR,
      y: arena.cy + Math.sin(angle) * spawnR,
    };
    const preset = colors[i % colors.length]!;
    const isPlayer = i === playerIndex;
    const vStats = isPlayer ? playerStats : randomBotStats();
    const v = createVehicle(pos, names[i] ?? `Bot ${i + 1}`, preset.color, preset.accent, vStats, isPlayer);
    // Face outward
    v.angle = Math.atan2(pos.y - arena.cy, pos.x - arena.cx);
    vehicles.push(v);
  }
  return vehicles;
}

// ─── Physics Step ───

export interface StepResult {
  eliminated: string[];
  killer: Record<string, string | null>; // victimId → killerId
}

export function physicsStep(
  vehicles: Vehicle[],
  arena: Arena,
  cfg: GameConfig = DEFAULT_CONFIG,
  dt: number = 1,
): StepResult {
  const alive = vehicles.filter((v) => v.alive);
  const eliminated: string[] = [];
  const killer: Record<string, string | null> = {};

  // 1. Apply controls + physics to each vehicle
  for (const v of alive) {
    const p = v.physics;
    const arenaMod = arena.modifier;

    // ── Steering ──
    v.angularVel = v.steer * p.turnRate * (v.nitro ? 0.8 : 1.0); // less turning during nitro
    v.angle += v.angularVel * dt;
    v.angle = normalizeAngle(v.angle);

    // ── Thrust ──
    const fwd = rotate({ x: 1, y: 0 }, v.angle);
    let power = v.thrust * p.acceleration;

    // Nitro boost
    if (v.nitro && v.nitroAmount > 0) {
      power *= 1.8;
      v.nitroAmount = Math.max(0, v.nitroAmount - (100 / (cfg.nitroDuration * 60)) * dt);
      if (v.nitroAmount <= 0) {
        v.nitro = false;
      }
    }

    // Mass affects acceleration (heavier = slower)
    const massFactor = 1.0 / p.mass;
    v.vel.x += fwd.x * power * massFactor * dt;
    v.vel.y += fwd.y * power * massFactor * dt;

    // ── Braking ──
    if (v.brake) {
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed > 0.1) {
        // Regular brake
        const brakeForce = cfg.brakePower * p.friction;
        v.vel.x *= (1 - brakeForce * dt);
        v.vel.y *= (1 - brakeForce * dt);
      } else {
        // Reverse
        v.vel.x -= fwd.x * power * 0.4 * dt;
        v.vel.y -= fwd.y * power * 0.4 * dt;
      }
    }

    // ── Friction ──
    const friction = Math.pow(p.friction * arenaMod.frictionMult, dt);
    v.vel.x *= friction;
    v.vel.y *= friction;

    // ── Speed Cap ──
    const maxSpd = v.nitro ? p.maxSpeed * cfg.nitroBoost : p.maxSpeed;
    const speed = Math.hypot(v.vel.x, v.vel.y);
    if (speed > maxSpd) {
      const scale2 = maxSpd / speed;
      v.vel.x *= scale2;
      v.vel.y *= scale2;
    }

    // ── Move ──
    v.pos.x += v.vel.x * dt;
    v.pos.y += v.vel.y * dt;
  }

  // 2. Vehicle-vehicle collisions
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]!;
      const b = alive[j]!;
      const d = dist(a.pos, b.pos);
      const minDist = cfg.carWidth * 2;

      if (d < minDist && d > 0) {
        // Direction of collision
        const nx = (b.pos.x - a.pos.x) / d;
        const ny = (b.pos.y - a.pos.y) / d;

        // Separate overlapping vehicles
        const overlap = minDist - d;
        const totalMass = a.physics.mass + b.physics.mass;
        const aRatio = b.physics.mass / totalMass;
        const bRatio = a.physics.mass / totalMass;
        a.pos.x -= nx * overlap * aRatio;
        a.pos.y -= ny * overlap * aRatio;
        b.pos.x += nx * overlap * bRatio;
        b.pos.y += ny * overlap * bRatio;

        // Relative velocity
        const relVx = a.vel.x - b.vel.x;
        const relVy = a.vel.y - b.vel.y;
        const relDot = relVx * nx + relVy * ny;

        if (relDot > 0) {
          // The car that is moving INTO the other is the attacker;
          // Potencia decides how violently the target is launched, and the
          // target's mass resists that launch.  The attacker keeps the speed
          // it carried into the hit, so a strong car trades solidly while
          // still pushing hard.

          const attacker = relDot > 0 ? a : b;
          const pushed = attacker === a ? b : a;
          const direction = attacker === a ? 1 : -1;
          const attackerBrake = attacker.physics.pushForce * (attacker.nitro ? 1.5 : 1.0);

          // Knockback: proportional to the attacker's Potencia and the closing
          // speed, resisted by the target's mass (Peso).
          const impulse = relDot * attackerBrake * cfg.pushForce;
          const impulseOnPushed = impulse / (1 + pushed.physics.mass);

          pushed.vel.x += direction * nx * impulseOnPushed;
 pushed.vel.y += direction * ny * impulseOnPushed;

          // The attacker only takes a small reaction nudge — scaled down by
          // its own Resistencia (impactResist) so well-built cars barely recoil.

          const resistFactor = attacker.physics.impactResist;

          const reactionFactor = 0.04 + 0.10 * (1 - resistFactor);

          attacker.vel.x += -direction * nx * impulse * reactionFactor;

          attacker.vel.y += -direction * ny * impulse * reactionFactor;

          // Track killer — only the car that DID the pushing gets the credit,
          // never a car that merely got hit.

          if (Math.hypot(pushed.vel.x, pushed.vel.y) >  3) {

            killer[pushed.id] = attacker.id;

          }
        }
// 3. Arena boundary
  for (const v of alive) {
    const d = dist(v.pos, { x: arena.cx, y: arena.cy });

    if (d > arena.radius) {
      // OUT OF ARENA — eliminated!
      v.alive = false;
      v.eliminated = true;
      eliminated.push(v.id);
    } else if (d > arena.radius * 0.92) {
      // Near edge — gentle inward nudge (must be possible to push cars off)
      const nx = (arena.cx - v.pos.x) / d;
      const ny = (arena.cy - v.pos.y) / d;
      const edgeDist = d - arena.radius * 0.92;
      // Weak grip — only resists slow cars, fast-moving cars break through
      const speed = Math.hypot(v.vel.x, v.vel.y);
      const grip = Math.max(0, v.physics.edgeGrip * 0.003 - speed * 0.0005);
      const pushback = edgeDist * grip * arena.modifier.gravity;
      v.vel.x += nx * pushback;
      v.vel.y += ny * pushback;
    }
  }

  // 4. Update falling animation for eliminated
  for (const v of vehicles) {
    if (v.eliminated && v.fallProgress < 1) {
      v.fallProgress = Math.min(1, v.fallProgress + 0.03 * dt);
    }
  }

  return { eliminated, killer };
}

// ─── Game Over Check ───

export function checkGameOver(vehicles: Vehicle[]): { over: boolean; winner: Vehicle | null } {
  const alive = vehicles.filter((v) => v.alive);
  if (alive.length <= 1) {
    return { over: true, winner: alive[0] ?? null };
  }
  return { over: false, winner: null };
}

// ─── AI ───

function pickBehavior(v: Vehicle, vehicles: Vehicle[], arena: Arena): AIBehavior {
  const dFromCenter = dist(v.pos, { x: arena.cx, y: arena.cy });
  const dangerZone = arena.radius * 0.75;
  const alive = vehicles.filter((o) => o.alive && o.id !== v.id);

  // Near edge → flee to center
  if (dFromCenter > dangerZone) return "flee";

  // No opponents left → patrol
  if (alive.length === 0) return "patrol";

  // Low health/resist → avoid edge
  if (v.stats.resistencia < 20 && dFromCenter > arena.radius * 0.5) return "avoid_edge";

  return "hunt";
}

function findNearestEnemy(v: Vehicle, vehicles: Vehicle[]): Vehicle | null {
  let nearest: Vehicle | null = null;
  let nearDist = Infinity;
  for (const o of vehicles) {
    if (o.id === v.id || !o.alive) continue;
    const d = dist(v.pos, o.pos);
    if (d < nearDist) {
      nearDist = d;
      nearest = o;
    }
  }
  return nearest;
}

function findMostDangerous(v: Vehicle, vehicles: Vehicle[]): Vehicle | null {
  // Target the one closest to edge (easy kill) or with most kills
  let best: Vehicle | null = null;
  let bestScore = -Infinity;
  for (const o of vehicles) {
    if (o.id === v.id || !o.alive) continue;
    const dCenter = dist(o.pos, { x: 0, y: 0 }); // assume center is 0,0 relative
    const score = -dCenter + o.kills * 10;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

export function updateAI(v: Vehicle, vehicles: Vehicle[], arena: Arena, dt: number): void {
  if (!v.alive || v.isPlayer) return;

  const ai = v.aiState;
  const diffMod = ai.difficulty === "facil" ? 0.6 : ai.difficulty === "medio" ? 0.85 : 1.0;

  // Update behavior periodically
  ai.timer -= dt;
  if (ai.timer <= 0) {
    ai.behavior = pickBehavior(v, vehicles, arena);
    ai.timer = 30 + Math.random() * 60; // re-evaluate every 0.5-1s
  }

  const nearest = findNearestEnemy(v, vehicles);
  const toCenter = normalize(sub({ x: arena.cx, y: arena.cy }, v.pos));

  switch (ai.behavior) {
    case "flee": {
      // Drive toward center
      const angleToCenter = Math.atan2(toCenter.y, toCenter.x);
      const diff = normalizeAngle(angleToCenter - v.angle);
      v.steer = clamp(diff * 3 * diffMod, -1, 1);
      v.thrust = 0.8 * diffMod;
      v.brake = false;
      break;
    }
    case "hunt": {
      if (nearest) {
        const toTarget = normalize(sub(nearest.pos, v.pos));
        const angleToTarget = Math.atan2(toTarget.y, toTarget.x);
        const diff = normalizeAngle(angleToTarget - v.angle);
        v.steer = clamp(diff * 3 * diffMod, -1, 1);
        // Charge if roughly facing target
        v.thrust = Math.abs(diff) < Math.PI / 3 ? 1.0 * diffMod : 0.4 * diffMod;
        v.brake = false;
        // Use nitro when close and facing
        if (dist(v.pos, nearest.pos) < 80 && Math.abs(diff) < 0.3 && v.nitroAmount > 30) {
          v.nitro = true;
        }
      }
      break;
    }
    case "patrol": {
      const angleToCenter = Math.atan2(toCenter.y, toCenter.x);
      const diff = normalizeAngle(angleToCenter - v.angle);
      v.steer = clamp(diff * 2 * diffMod, -1, 1);
      v.thrust = 0.3 * diffMod;
      v.brake = false;
      break;
    }
    case "charge": {
      if (nearest) {
        const toTarget = normalize(sub(nearest.pos, v.pos));
        const angleToTarget = Math.atan2(toTarget.y, toTarget.x);
        const diff = normalizeAngle(angleToTarget - v.angle);
        v.steer = clamp(diff * 4 * diffMod, -1, 1);
        v.thrust = 1.0 * diffMod;
        v.brake = false;
      }
      break;
    }
    case "avoid_edge": {
      const angleToCenter = Math.atan2(toCenter.y, toCenter.x);
      const diff = normalizeAngle(angleToCenter - v.angle);
      v.steer = clamp(diff * 4 * diffMod, -1, 1);
      v.thrust = 0.6 * diffMod;
      v.brake = false;
      break;
    }
  }
}
