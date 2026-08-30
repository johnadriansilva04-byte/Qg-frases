/* ═══════════════════════════════════════════════════════════════
   CAR BRAWL — Advanced Arenas (from battle-carts-engine-main)
   Multiple arenas with modifiers (grip, gravity, obstacles, hazards)
   ═══════════════════════════════════════════════════════════════ */

export type HazardKind = "lava" | "water" | "void" | "abyss" | "ice-water";

export interface Obstacle {
  x: number;
  y: number;
  r: number;
}

export interface ArenaDef {
  id: string;
  name: string;
  radius: number;
  /** multiplicador de aderência da superfície (gelo = baixo) */
  gripMul: number;
  hazard: HazardKind;
  /** aceleração constante aplicada a todos (arena inclinada) */
  gravity: { x: number; y: number };
  obstacles: Obstacle[];
  ground: string;
  groundAlt: string;
  edge: string;
  outside: string;
  description: string;
}

function ring(count: number, dist: number, r: number, offset = 0): Obstacle[] {
  return Array.from({ length: count }, (_, i) => {
    const a = offset + (i / count) * Math.PI * 2;
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, r };
  });
}

export const ARENAS: ArenaDef[] = [
  {
    id: "classic",
    name: "Plataforma Clássica",
    radius: 430,
    gripMul: 1,
    hazard: "abyss",
    gravity: { x: 0, y: 0 },
    obstacles: [],
    ground: "#3a3f4b",
    groundAlt: "#333845",
    edge: "#8b93a5",
    outside: "#0b0d12",
    description: "Arena limpa. Abismo em volta.",
  },
  {
    id: "lava",
    name: "Cratera de Lava",
    radius: 400,
    gripMul: 0.95,
    hazard: "lava",
    gravity: { x: 0, y: 0 },
    obstacles: ring(3, 170, 26, 0.4),
    ground: "#4a3129",
    groundAlt: "#422b24",
    edge: "#ff7a2f",
    outside: "#8f1d05",
    description: "Rochas centrais e lava fora da plataforma.",
  },
  {
    id: "ice",
    name: "Lago Congelado",
    radius: 445,
    gripMul: 0.34,
    hazard: "ice-water",
    gravity: { x: 0, y: 0 },
    obstacles: [],
    ground: "#cfe6f2",
    groundAlt: "#c2dcec",
    edge: "#7fb7d6",
    outside: "#123a53",
    description: "Aderência muito baixa. Derrapagem constante.",
  },
  {
    id: "water",
    name: "Doca Flutuante",
    radius: 415,
    gripMul: 0.9,
    hazard: "water",
    gravity: { x: 0, y: 0 },
    obstacles: ring(4, 230, 22, 0.8),
    ground: "#5b4a37",
    groundAlt: "#514230",
    edge: "#a98a5f",
    outside: "#0e3d5c",
    description: "Contêineres espalhados e água em volta.",
  },
  {
    id: "sky",
    name: "Plataforma Celeste",
    radius: 385,
    gripMul: 1.05,
    hazard: "void",
    gravity: { x: 0, y: 0 },
    obstacles: [{ x: 0, y: 0, r: 42 }],
    ground: "#dfe6ef",
    groundAlt: "#d2dae5",
    edge: "#f2c14e",
    outside: "#6fb3e0",
    description: "Pequena, com pilar central. Queda livre.",
  },
  {
    id: "slope",
    name: "Rampa Inclinada",
    radius: 425,
    gripMul: 0.8,
    hazard: "abyss",
    gravity: { x: 46, y: 34 },
    obstacles: [],
    ground: "#404a3a",
    groundAlt: "#394233",
    edge: "#9fb08a",
    outside: "#0b0d12",
    description: "O piso empurra tudo para um lado.",
  },
  {
    id: "industrial",
    name: "Pátio Industrial",
    radius: 460,
    gripMul: 1.1,
    hazard: "abyss",
    gravity: { x: 0, y: 0 },
    obstacles: [...ring(6, 200, 28), ...ring(3, 90, 20, 0.9)],
    ground: "#43464d",
    groundAlt: "#3b3e45",
    edge: "#c9a227",
    outside: "#101216",
    description: "Muitos obstáculos. Colisões constantes.",
  },
];

export function getArena(id: string): ArenaDef {
  return ARENAS.find((a) => a.id === id) ?? (ARENAS[0] as ArenaDef);
}

export const HAZARD_LABEL: Record<HazardKind, string> = {
  lava: "Lava",
  water: "Água",
  void: "Vazio",
  abyss: "Abismo",
  "ice-water": "Água gelada",
};
