/* ═══ Car Brawl — Types ═══ */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Car {
  id: string;
  pos: Vec2;
  vel: Vec2;
  angle: number;       // radians
  angularVel: number;
  thrust: number;      // 0..1
  steer: number;       // -1..1
  color: string;
  accent: string;
  name: string;
  alive: boolean;
  isPlayer: boolean;
  /** AI state */
  aiTarget?: Vec2;
  aiThrustTimer?: number;
}

export interface Arena {
  /** Center of the arena */
  cx: number;
  cy: number;
  /** Radius of the circular arena */
  radius: number;
}

export type GameState = "menu" | "countdown" | "playing" | "gameover";

export interface GameConfig {
  /** Arena radius in pixels */
  arenaRadius: number;
  /** Car radius in pixels */
  carRadius: number;
  /** Max speed */
  maxSpeed: number;
  /** Thrust power */
  thrustPower: number;
  /** Friction */
  friction: number;
  /** Push force on collision */
  pushForce: number;
  /** Countdown seconds */
  countdown: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  arenaRadius: 160,
  carRadius: 18,
  maxSpeed: 3.5,
  thrustPower: 0.12,
  friction: 0.985,
  pushForce: 2.5,
  countdown: 3,
};

export const CAR_PRESETS: { color: string; accent: string }[] = [
  { color: "#ef4444", accent: "#fca5a5" },  // Red
  { color: "#3b82f6", accent: "#93c5fd" },  // Blue
  { color: "#22c55e", accent: "#86efac" },  // Green
  { color: "#f59e0b", accent: "#fcd34d" },  // Amber
  { color: "#a855f7", accent: "#d8b4fe" },  // Purple
  { color: "#ec4899", accent: "#f9a8d4" },  // Pink
];
