/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Complete Type System
   ═══════════════════════════════════════════════════════════════ */

// ─── Vector ───
export interface Vec2 { x: number; y: number }

// ─── Vehicle Attributes (build points) ───
export interface VehicleStats {
  peso: number;       // 0-40  — mass, inertia, push resistance
  potencia: number;   // 0-40  — acceleration, collision force
  aderencia: number;  // 0-40  — traction, braking, control
  velocidade: number; // 0-40  — max speed cap
  resistencia: number;// 0-40  — impact tolerance
  estabilidade: number;// 0-40 — edge/collision stability
}

export const TOTAL_BUILD_POINTS = 120;
export const MAX_SINGLE_STAT = 60;

// Derived physics values from stats
export interface VehiclePhysics {
  mass: number;           // from peso
  acceleration: number;   // from potencia
  maxSpeed: number;       // from velocidade
  friction: number;       // from aderencia
  turnRate: number;       // from aderencia + estabilidade
  pushForce: number;      // from potencia
  impactResist: number;   // from resistencia
  edgeGrip: number;       // from estabilidade + aderencia
}

// ─── Vehicle ───
export interface Vehicle {
  id: string;
  pos: Vec2;
  vel: Vec2;
  angle: number;
  angularVel: number;
  thrust: number;        // 0..1
  steer: number;         // -1..1
  brake: boolean;
  nitro: boolean;
  nitroAmount: number;   // 0..100
  nitroMax: number;
  color: string;
  accent: string;
  name: string;
  alive: boolean;
  eliminated: boolean;
  fallProgress: number;  // 0..1 animation of falling off
  isPlayer: boolean;
  stats: VehicleStats;
  physics: VehiclePhysics;
  // AI state
  aiState: AIState;
  // Points earned this match
  kills: number;
}

// ─── AI State ───
export type AIBehavior = "hunt" | "flee" | "patrol" | "charge" | "avoid_edge";

export interface AIState {
  behavior: AIBehavior;
  targetId: string | null;
  timer: number;
  difficulty: "facil" | "medio" | "dificil";
}

// ─── Arena ───
export type ArenaType = "lava" | "agua" | "ceu" | "industrial" | "gelo";

export interface ArenaModifier {
  frictionMult: number;    // 1.0 = normal
  gravity: number;         // 1.0 = normal
  edgeDamage: boolean;     // instant elimination
  hasObstacles: boolean;
  hasBorders: boolean;     // walls vs open edges
}

export interface Arena {
  cx: number;
  cy: number;
  radius: number;
  type: ArenaType;
  modifier: ArenaModifier;
}

export const ARENAS: Record<ArenaType, { label: string; icon: string; modifier: ArenaModifier }> = {
  lava:      { label: "Arena de Lava",      icon: "🌋", modifier: { frictionMult: 1.0, gravity: 1.0, edgeDamage: true,  hasObstacles: false, hasBorders: false } },
  agua:      { label: "Arena Aquática",     icon: "🌊", modifier: { frictionMult: 0.8, gravity: 0.8, edgeDamage: false, hasObstacles: false, hasBorders: false } },
  ceu:       { label: "Arena Celeste",      icon: "☁️", modifier: { frictionMult: 0.6, gravity: 0.5, edgeDamage: false, hasObstacles: false, hasBorders: false } },
  industrial:{ label: "Arena Industrial",   icon: "⚙️", modifier: { frictionMult: 1.2, gravity: 1.0, edgeDamage: true,  hasObstacles: true,  hasBorders: true  } },
  gelo:      { label: "Arena de Gelo",      icon: "🧊", modifier: { frictionMult: 0.4, gravity: 1.0, edgeDamage: true,  hasObstacles: false, hasBorders: false } },
};

// ─── Game State ───
export type GameScreen =
  | "menu"
  | "build"
  | "arena_select"
  | "countdown"
  | "playing"
  | "result"
  | "career_map"
  | "online_lobby"
  | "championship"
  | "loading";

export type GameMode = "solo" | "career" | "online" | "championship";

// ─── Build Screen ───
export interface BuildState {
  stats: VehicleStats;
  pointsLeft: number;
}

// ─── Match Result ───
export interface MatchResult {
  position: number;        // 1st, 2nd, etc
  eliminations: number;
  survived: boolean;
 sovReward: number;
  phaseReward?: number;    // career only
}

// ─── Career ───
export interface CareerPhase {
  id: number;
  label: string;
  description: string;
  opponents: number;       // how many bots
  difficulty: "facil" | "medio" | "dificil";
  arena: ArenaType;
  unlocked: boolean;
  completed: boolean;
  stars: number;           // 0-3
}

export interface CareerProgress {
  currentPhase: number;
  phases: CareerPhase[];
  totalStars: number;
  totalWins: number;
  totalMatches: number;
}

// ─── Online ───
export type RoomStatus = "waiting" | "ready" | "playing" | "finished";

export interface RoomPlayer {
  userId: string;
  name: string;
  ready: boolean;
  isBot: boolean;
  vehicleStats?: VehicleStats;
}

export interface OnlineRoom {
  roomId: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: RoomStatus;
  arena: ArenaType;
  createdAt: string;
}

// ─── Championship ───
export type ChampSize = 8 | 12 | 16 | 32;

export interface ChampMatch {
  round: number;
  matchIndex: number;
  player1: string;
  player2: string;
  winner: string | null;
  played: boolean;
}

export interface Championship {
  id: string;
  size: ChampSize;
  rounds: number;          // log2(size)
  currentRound: number;
  matches: ChampMatch[];
  champion: string | null;
  arena: ArenaType;
}

// ─── SOV Rewards ───
export type SovRewardType = "win" | "loss" | "phase_complete" | "championship" | "elimination" | "achievement";

export interface SovTransaction {
  type: SovRewardType;
  amount: number;
  description: string;
  timestamp: string;
}

// ─── Config ───
export interface GameConfig {
  arenaRadius: number;
  carWidth: number;
  carLength: number;
  maxSpeed: number;
  thrustPower: number;
  brakePower: number;
  friction: number;
  pushForce: number;
  nitroBoost: number;
  nitroDuration: number;   // seconds
  countdown: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  arenaRadius: 180,
  carWidth: 14,
  carLength: 24,
  maxSpeed: 4,
  thrustPower: 0.15,
  brakePower: 0.08,
  friction: 0.98,
  pushForce: 2.0,
  nitroBoost: 1.8,
  nitroDuration: 3,
  countdown: 3,
};

// ─── Car Colors ───
export const CAR_PRESETS: { color: string; accent: string }[] = [
  { color: "#ef4444", accent: "#fca5a5" },
  { color: "#3b82f6", accent: "#93c5fd" },
  { color: "#22c55e", accent: "#86efac" },
  { color: "#f59e0b", accent: "#fcd34d" },
  { color: "#a855f7", accent: "#d8b4fe" },
  { color: "#ec4899", accent: "#f9a8d4" },
  { color: "#06b6d4", accent: "#67e8f9" },
  { color: "#84cc16", accent: "#bef264" },
];

// ─── Helper: Stats → Physics ───
export function computePhysics(stats: VehicleStats): VehiclePhysics {
  return {
    mass: 0.5 + (stats.peso / MAX_SINGLE_STAT) * 2.0,            // 0.5..2.5
    acceleration: 0.05 + (stats.potencia / MAX_SINGLE_STAT) * 0.15, // 0.05..0.20
    maxSpeed: 2.0 + (stats.velocidade / MAX_SINGLE_STAT) * 3.0,   // 2.0..5.0
    friction: 0.96 + (stats.aderencia / MAX_SINGLE_STAT) * 0.035, // 0.96..0.995
    turnRate: 0.04 + (stats.aderencia / MAX_SINGLE_STAT) * 0.06
              + (stats.estabilidade / MAX_SINGLE_STAT) * 0.02,     // 0.04..0.12
    pushForce: 1.0 + (stats.potencia / MAX_SINGLE_STAT) * 3.0,    // 1.0..4.0
    impactResist: 0.3 + (stats.resistencia / MAX_SINGLE_STAT) * 0.7, // 0.3..1.0
    edgeGrip: 0.1 + (stats.estabilidade / MAX_SINGLE_STAT) * 0.4
              + (stats.aderencia / MAX_SINGLE_STAT) * 0.2,         // 0.1..0.7
  };
}

// Default balanced build
export function defaultStats(): VehicleStats {
  const each = Math.floor(TOTAL_BUILD_POINTS / 6);
  return { peso: each, potencia: each, aderencia: each, velocidade: each, resistencia: each, estabilidade: each };
}

export function statsPointsUsed(s: VehicleStats): number {
  return s.peso + s.potencia + s.aderencia + s.velocidade + s.resistencia + s.estabilidade;
}

// ─── Career Phases ───
export function defaultCareerPhases(): CareerPhase[] {
  return [
    { id: 1,  label: "Treinamento",     description: "3 oponentes fáceis na arena de lava",     opponents: 3, difficulty: "facil",   arena: "lava",       unlocked: true,  completed: false, stars: 0 },
    { id: 2,  label: "Desafio Inicial",  description: "4 oponentes fáceis na arena de água",     opponents: 4, difficulty: "facil",   arena: "agua",       unlocked: false, completed: false, stars: 0 },
    { id: 3,  label: "Arena de Gelo",    description: "4 oponentes médios na arena de gelo",     opponents: 4, difficulty: "medio",   arena: "gelo",       unlocked: false, completed: false, stars: 0 },
    { id: 4,  label: "Névoa Celeste",    description: "5 oponentes médios na arena celeste",     opponents: 5, difficulty: "medio",   arena: "ceu",        unlocked: false, completed: false, stars: 0 },
    { id: 5,  label: "Fábrica Abandonada",description:"5 oponentes médios na arena industrial",   opponents: 5, difficulty: "medio",   arena: "industrial", unlocked: false, completed: false, stars: 0 },
    { id: 6,  label: "Desafio Avançado", description: "6 oponentes difíceis na arena de lava",    opponents: 6, difficulty: "dificil", arena: "lava",       unlocked: false, completed: false, stars: 0 },
    { id: 7,  label: "Prova de Fogo",    description: "6 oponentes difíceis na arena de gelo",    opponents: 6, difficulty: "dificil", arena: "gelo",       unlocked: false, completed: false, stars: 0 },
    { id: 8,  label: "O Campeão",        description: "7 oponentes difíceis na arena de lava",    opponents: 7, difficulty: "dificil", arena: "lava",       unlocked: false, completed: false, stars: 0 },
  ];
}

// ─── SOV Rewards Table ───
export const SOV_REWARDS = {
  win: 50,
  loss: 10,
  elimination: 5,
  phase_complete: 100,
  championship: 250,
} as const;
