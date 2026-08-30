/* ═══ Car Brawl — Physics Engine ═══ */

import type { Car, Arena, GameConfig, Vec2 } from "./types";
import { DEFAULT_CONFIG } from "./types";

/** Distance between two points */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Normalize angle to -PI..PI */
function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Clamp value */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Rotate vector by angle */
function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Spawn cars in a circle around arena center */
export function spawnCars(
  arena: Arena,
  count: number,
  carRadius: number,
  names: string[],
  colors: { color: string; accent: string }[],
  playerIndex: number = 0,
): Car[] {
  const cars: Car[] = [];
  const spawnRadius = arena.radius * 0.55;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = arena.cx + Math.cos(angle) * spawnRadius;
    const y = arena.cy + Math.sin(angle) * spawnRadius;
    // Face outward from center
    const faceAngle = Math.atan2(y - arena.cy, x - arena.cx);
    const preset = colors[i % colors.length]!;
    cars.push({
      id: `car-${i}`,
      pos: { x, y },
      vel: { x: 0, y: 0 },
      angle: faceAngle,
      angularVel: 0,
      thrust: 0,
      steer: 0,
      color: preset.color,
      accent: preset.accent,
      name: names[i] ?? `Car ${i + 1}`,
      alive: true,
      isPlayer: i === playerIndex,
    });
  }
  return cars;
}

/** Update AI for a single car */
function updateAI(car: Car, cars: Car[], arena: Arena, cfg: GameConfig, dt: number): void {
  if (!car.alive || car.isPlayer) return;

  // Find nearest alive opponent
  let nearest: Car | null = null;
  let nearDist = Infinity;
  for (const other of cars) {
    if (other.id === car.id || !other.alive) continue;
    const d = dist(car.pos, other.pos);
    if (d < nearDist) {
      nearDist = d;
      nearest = other;
    }
  }

  // If near arena edge, steer toward center
  const distFromCenter = dist(car.pos, { x: arena.cx, y: arena.cy });
  const dangerZone = arena.radius * 0.7;

  if (distFromCenter > dangerZone && !nearest) {
    // Retreat to center
    const toCenter = Math.atan2(arena.cy - car.pos.y, arena.cx - car.pos.x);
    const angleDiff = normalizeAngle(toCenter - car.angle);
    car.steer = clamp(angleDiff * 3, -1, 1);
    car.thrust = 0.7;
    return;
  }

  if (nearest) {
    // Chase nearest opponent, but watch out for arena edge
    if (distFromCenter > dangerZone) {
      // Mix: 40% center, 60% opponent
      const toCenter = Math.atan2(arena.cy - car.pos.y, arena.cx - car.pos.x);
      const toOpp = Math.atan2(nearest.pos.y - car.pos.y, nearest.pos.x - car.pos.x);
      const targetAngle = normalizeAngle(toCenter) * 0.4 + normalizeAngle(toOpp) * 0.6;
      const angleDiff = normalizeAngle(targetAngle - car.angle);
      car.steer = clamp(angleDiff * 2.5, -1, 1);
      car.thrust = 0.6;
    } else {
      // Aggressive: charge at opponent
      const toOpp = Math.atan2(nearest.pos.y - car.pos.y, nearest.pos.x - car.pos.x);
      const angleDiff = normalizeAngle(toOpp - car.angle);
      car.steer = clamp(angleDiff * 3, -1, 1);
      // Only thrust if roughly facing opponent
      car.thrust = Math.abs(angleDiff) < Math.PI / 3 ? 1.0 : 0.4;
    }
  } else {
    // No opponent — patrol center
    const toCenter = Math.atan2(arena.cy - car.pos.y, arena.cx - car.pos.x);
    const angleDiff = normalizeAngle(toCenter - car.angle);
    car.steer = clamp(angleDiff * 2, -1, 1);
    car.thrust = 0.3;
  }
}

/** Single physics step */
export function step(
  cars: Car[],
  arena: Arena,
  cfg: GameConfig = DEFAULT_CONFIG,
  dt: number = 1,
): { eliminated: string[] } {
  const alive = cars.filter((c) => c.alive);
  const eliminated: string[] = [];

  // 1. Update AI
  for (const car of alive) {
    updateAI(car, alive, arena, cfg, dt);
  }

  // 2. Apply steering + thrust to velocity
  for (const car of alive) {
    // Steering
    car.angularVel = car.steer * 0.08;
    car.angle += car.angularVel * dt;
    car.angle = normalizeAngle(car.angle);

    // Thrust direction
    const fwd = rotate({ x: 1, y: 0 }, car.angle);
    const power = car.thrust * cfg.thrustPower;
    car.vel.x += fwd.x * power * dt;
    car.vel.y += fwd.y * power * dt;

    // Friction
    car.vel.x *= cfg.friction;
    car.vel.y *= cfg.friction;

    // Speed limit
    const speed = Math.hypot(car.vel.x, car.vel.y);
    if (speed > cfg.maxSpeed) {
      const scale = cfg.maxSpeed / speed;
      car.vel.x *= scale;
      car.vel.y *= scale;
    }

    // Move
    car.pos.x += car.vel.x * dt;
    car.pos.y += car.vel.y * dt;
  }

  // 3. Car-car collisions
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]!;
      const b = alive[j]!;
      const d = dist(a.pos, b.pos);
      const minDist = cfg.carRadius * 2;

      if (d < minDist && d > 0) {
        // Separate
        const overlap = minDist - d;
        const nx = (b.pos.x - a.pos.x) / d;
        const ny = (b.pos.y - a.pos.y) / d;
        a.pos.x -= nx * overlap * 0.5;
        a.pos.y -= ny * overlap * 0.5;
        b.pos.x += nx * overlap * 0.5;
        b.pos.y += ny * overlap * 0.5;

        // Push — sumo style: momentum transfer
        const relVelX = a.vel.x - b.vel.x;
        const relVelY = a.vel.y - b.vel.y;
        const relDot = relVelX * nx + relVelY * ny;

        if (relDot > 0) {
          const impulse = relDot * cfg.pushForce;
          a.vel.x -= nx * impulse * 0.5;
          a.vel.y -= ny * impulse * 0.5;
          b.vel.x += nx * impulse * 0.5;
          b.vel.y += ny * impulse * 0.5;
        }
      }
    }
  }

  // 4. Arena boundary — cars pushed out are eliminated
  for (const car of alive) {
    const d = dist(car.pos, { x: arena.cx, y: arena.cy });
    if (d > arena.radius) {
      car.alive = false;
      eliminated.push(car.id);
    } else if (d > arena.radius * 0.9) {
      // At edge: apply inward nudge (arena wall)
      const nx = (arena.cx - car.pos.x) / d;
      const ny = (arena.cy - car.pos.y) / d;
      const pushback = (d - arena.radius * 0.9) * 0.05;
      car.vel.x += nx * pushback;
      car.vel.y += ny * pushback;
    }
  }

  return { eliminated };
}

/** Check if game is over (1 or 0 alive) */
export function isGameOver(cars: Car[]): { over: boolean; winner: Car | undefined } {
  const alive = cars.filter((c) => c.alive);
  if (alive.length <= 1) {
    return { over: true, winner: alive[0] };
  }
  return { over: false, winner: undefined };
}
