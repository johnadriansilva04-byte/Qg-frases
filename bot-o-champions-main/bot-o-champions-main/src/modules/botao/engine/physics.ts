export const FIELD = {
  w: 1000,
  h: 620,
  margin: 30,
  goalHeight: 180,
  discR: 24,
  keeperR: 28,
  ballR: 12,
};

export type Side = "home" | "away";

export type Disc = {
  id: string;
  side: Side | "ball";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  keeper?: boolean;
};

const FRICTION = 0.985;
const WALL_BOUNCE = 0.72;
const STOP = 0.06;

export function createDisc(id: string, side: Side | "ball", x: number, y: number, r: number, mass: number, keeper = false): Disc {
  return { id, side, x, y, vx: 0, vy: 0, r, mass, keeper };
}

/** Formação 1-2-2 (goleiro + 4 de linha) espelhada por lado. */
const FORMATION: Array<[number, number]> = [
  [0.16, 0.5],
  [0.3, 0.24],
  [0.3, 0.76],
  [0.44, 0.38],
  [0.44, 0.62],
];

export function initialDiscs(): Disc[] {
  const discs: Disc[] = [];
  const { w, h, discR, keeperR, ballR } = FIELD;

  discs.push(createDisc("home-gk", "home", w * 0.05, h * 0.5, keeperR, 2.2, true));
  discs.push(createDisc("away-gk", "away", w * 0.95, h * 0.5, keeperR, 2.2, true));

  FORMATION.forEach(([fx, fy], i) => {
    if (i === 0) return;
    discs.push(createDisc(`home-${i}`, "home", w * fx, h * fy, discR, 1));
    discs.push(createDisc(`away-${i}`, "away", w * (1 - fx), h * fy, discR, 1));
  });
  // dois avançados extras
  discs.push(createDisc("home-5", "home", w * 0.44, h * 0.5, discR, 1));
  discs.push(createDisc("away-5", "away", w * 0.56, h * 0.5, discR, 1));

  discs.push(createDisc("ball", "ball", w * 0.5, h * 0.5, ballR, 0.35));
  return discs;
}

export function resetPositions(discs: Disc[]) {
  const fresh = initialDiscs();
  discs.forEach((d, i) => {
    const f = fresh[i]!;
    d.x = f.x;
    d.y = f.y;
    d.vx = 0;
    d.vy = 0;
  });
}

export type StepResult = { moving: boolean; goal: Side | null; wallHit: boolean; hit: boolean };

export function step(discs: Disc[]): StepResult {
  const { w, h, margin, goalHeight } = FIELD;
  const goalTop = (h - goalHeight) / 2;
  const goalBottom = goalTop + goalHeight;
  let goal: Side | null = null;
  let wallHit = false;
  let hit = false;

  for (const d of discs) {
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= FRICTION;
    d.vy *= FRICTION;
    if (Math.hypot(d.vx, d.vy) < STOP) {
      d.vx = 0;
      d.vy = 0;
    }
  }

  // colisões entre discos
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i]!;
      const b = discs[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (dist === 0 || dist >= min) continue;
      hit = true;
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = min - dist;
      const totalMass = a.mass + b.mass;
      a.x -= nx * overlap * (b.mass / totalMass);
      a.y -= ny * overlap * (b.mass / totalMass);
      b.x += nx * overlap * (a.mass / totalMass);
      b.y += ny * overlap * (a.mass / totalMass);

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn > 0) continue;
      const e = 0.86;
      const imp = (-(1 + e) * vn) / (1 / a.mass + 1 / b.mass);
      a.vx -= (imp * nx) / a.mass;
      a.vy -= (imp * ny) / a.mass;
      b.vx += (imp * nx) / b.mass;
      b.vy += (imp * ny) / b.mass;
    }
  }

  // paredes
  for (const d of discs) {
    const isBall = d.side === "ball";
    const inGoalMouth = isBall && d.y > goalTop && d.y < goalBottom;

    if (d.y - d.r < margin) {
      d.y = margin + d.r;
      d.vy = Math.abs(d.vy) * WALL_BOUNCE;
      wallHit = true;
    }
    if (d.y + d.r > h - margin) {
      d.y = h - margin - d.r;
      d.vy = -Math.abs(d.vy) * WALL_BOUNCE;
      wallHit = true;
    }
    if (d.x - d.r < margin) {
      if (inGoalMouth && d.x < margin - 2) {
        goal = "away";
      } else if (!inGoalMouth || d.x - d.r < margin - 26) {
        d.x = margin + d.r;
        d.vx = Math.abs(d.vx) * WALL_BOUNCE;
        wallHit = true;
      }
    }
    if (d.x + d.r > w - margin) {
      if (inGoalMouth && d.x > w - margin + 2) {
        goal = "home";
      } else if (!inGoalMouth || d.x + d.r > w - margin + 26) {
        d.x = w - margin - d.r;
        d.vx = -Math.abs(d.vx) * WALL_BOUNCE;
        wallHit = true;
      }
    }
  }

  const moving = discs.some((d) => d.vx !== 0 || d.vy !== 0);
  return { moving, goal, wallHit, hit };
}

export const MAX_POWER = 26;

export function clampImpulse(dx: number, dy: number) {
  const len = Math.hypot(dx, dy);
  const max = 190;
  const k = len > max ? max / len : 1;
  const power = (len * k) / max;
  return { ix: (dx * k * MAX_POWER) / max, iy: (dy * k * MAX_POWER) / max, power };
}
