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

export function createDisc(
  id: string,
  side: Side | "ball",
  x: number,
  y: number,
  r: number,
  mass: number,
  keeper = false,
): Disc {
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

/**
 * Cria o conjunto inicial de discos. Aceita uma formação opcional (5 posições
 * [x,y] em fração do campo) para personalização PS2. A primeira posição é o
 * "zagueiro-base"; as 4 seguintes são distribuídas como de linha + 1 avançado
 * extra centralizado para fechar os 5 botões de campo.
 */
export function initialDiscs(formation?: Array<[number, number]>): Disc[] {
  const discs: Disc[] = [];
  const { w, h, discR, keeperR, ballR } = FIELD;
  const f = formation && formation.length >= 5 ? formation : FORMATION;

  discs.push(createDisc("home-gk", "home", w * 0.05, h * 0.5, keeperR, 2.2, true));
  discs.push(createDisc("away-gk", "away", w * 0.95, h * 0.5, keeperR, 2.2, true));

  // Índices 1..4 da formação (pula o 0, que vira o "extra" central abaixo).
  f.forEach(([fx, fy], i) => {
    if (i === 0) return;
    discs.push(createDisc(`home-${i}`, "home", w * fx, h * fy, discR, 1));
    discs.push(createDisc(`away-${i}`, "away", w * (1 - fx), h * fy, discR, 1));
  });
  // quinto botão de linha (avançado central) usando a posição do índice 0.
  const [bx, by] = f[0]!;
  discs.push(createDisc("home-5", "home", w * bx, h * by, discR, 1));
  discs.push(createDisc("away-5", "away", w * (1 - bx), h * by, discR, 1));

  discs.push(createDisc("ball", "ball", w * 0.5, h * 0.5, ballR, 0.35));
  return discs;
}

export function resetPositions(discs: Disc[], formation?: Array<[number, number]>) {
  const fresh = initialDiscs(formation);
  const n = Math.min(discs.length, fresh.length);
  for (let i = 0; i < n; i++) {
    const d = discs[i]!;
    const fr = fresh[i]!;
    d.x = fr.x;
    d.y = fr.y;
    d.vx = 0;
    d.vy = 0;
  }
}

export type StepResult = {
  moving: boolean;
  goal: Side | null;
  wallHit: boolean;
  hit: boolean;
  ownGoal?: boolean;
};

export function step(discs: Disc[]): StepResult {
  const { w, h, margin, goalHeight } = FIELD;
  const goalTop = (h - goalHeight) / 2;
  const goalBottom = goalTop + goalHeight;
  let goal: Side | null = null;
  let wallHit = false;
  let hit = false;
  let lastTouchSide: Side | null = null;

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

      // Rastrear qual side tocou a bola por último
      if (a.side === "ball" && b.side !== "ball") lastTouchSide = b.side;
      if (b.side === "ball" && a.side !== "ball") lastTouchSide = a.side;
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
  // Detectar gol contra: se gol foi no lado do último toque
  const ownGoal = goal ? lastTouchSide === goal : false;
  return { moving, goal, wallHit, hit, ownGoal };
}

export const MAX_POWER = 26;

export function clampImpulse(dx: number, dy: number) {
  const len = Math.hypot(dx, dy);
  const max = 250; // Aumentado de 190 para permitir mais força no chute
  const k = len > max ? max / len : 1;
  const power = (len * k) / max;
  return { ix: (dx * k * MAX_POWER) / max, iy: (dy * k * MAX_POWER) / max, power };
}
