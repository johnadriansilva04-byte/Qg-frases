import type { Formation, PositionRole } from "./types";

/**
 * Tactical slots in normalized pitch space:
 *   nx: -1 = own goal line, +1 = opponent goal line
 *   nz: -1 = left touchline, +1 = right touchline
 * Index 0 is always the goalkeeper.
 */
export interface Slot {
  nx: number;
  nz: number;
  role: PositionRole;
}

const F: Record<Formation, Slot[]> = {
  "4-4-2": [
    { nx: -0.95, nz: 0, role: "GK" },
    { nx: -0.62, nz: -0.62, role: "DF" },
    { nx: -0.68, nz: -0.22, role: "DF" },
    { nx: -0.68, nz: 0.22, role: "DF" },
    { nx: -0.62, nz: 0.62, role: "DF" },
    { nx: -0.2, nz: -0.68, role: "MF" },
    { nx: -0.28, nz: -0.22, role: "MF" },
    { nx: -0.28, nz: 0.22, role: "MF" },
    { nx: -0.2, nz: 0.68, role: "MF" },
    { nx: 0.22, nz: -0.24, role: "FW" },
    { nx: 0.22, nz: 0.24, role: "FW" },
  ],
  "4-3-3": [
    { nx: -0.95, nz: 0, role: "GK" },
    { nx: -0.62, nz: -0.62, role: "DF" },
    { nx: -0.68, nz: -0.22, role: "DF" },
    { nx: -0.68, nz: 0.22, role: "DF" },
    { nx: -0.62, nz: 0.62, role: "DF" },
    { nx: -0.3, nz: 0, role: "MF" },
    { nx: -0.12, nz: -0.35, role: "MF" },
    { nx: -0.12, nz: 0.35, role: "MF" },
    { nx: 0.3, nz: -0.6, role: "FW" },
    { nx: 0.34, nz: 0, role: "FW" },
    { nx: 0.3, nz: 0.6, role: "FW" },
  ],
  "3-5-2": [
    { nx: -0.95, nz: 0, role: "GK" },
    { nx: -0.66, nz: -0.4, role: "DF" },
    { nx: -0.7, nz: 0, role: "DF" },
    { nx: -0.66, nz: 0.4, role: "DF" },
    { nx: -0.22, nz: -0.75, role: "MF" },
    { nx: -0.3, nz: -0.3, role: "MF" },
    { nx: -0.34, nz: 0, role: "MF" },
    { nx: -0.3, nz: 0.3, role: "MF" },
    { nx: -0.22, nz: 0.75, role: "MF" },
    { nx: 0.24, nz: -0.22, role: "FW" },
    { nx: 0.24, nz: 0.22, role: "FW" },
  ],
  "4-2-3-1": [
    { nx: -0.95, nz: 0, role: "GK" },
    { nx: -0.62, nz: -0.62, role: "DF" },
    { nx: -0.68, nz: -0.22, role: "DF" },
    { nx: -0.68, nz: 0.22, role: "DF" },
    { nx: -0.62, nz: 0.62, role: "DF" },
    { nx: -0.35, nz: -0.2, role: "MF" },
    { nx: -0.35, nz: 0.2, role: "MF" },
    { nx: -0.02, nz: -0.6, role: "MF" },
    { nx: -0.02, nz: 0, role: "MF" },
    { nx: -0.02, nz: 0.6, role: "MF" },
    { nx: 0.3, nz: 0, role: "FW" },
  ],
};

/**
 * Formação única do formato 3x3: 1 goleiro + 2 jogadores de linha
 * (um fixo mais recuado, um pivô mais avançado).
 */
const SLOTS_3V3: Slot[] = [
  { nx: -0.92, nz: 0, role: "GK" },
  { nx: -0.3, nz: -0.45, role: "DF" },
  { nx: 0.15, nz: 0.45, role: "FW" },
];

export function formationSlots(formation: Formation, playersPerTeam = 11): Slot[] {
  if (playersPerTeam === 3) return SLOTS_3V3;
  return F[formation] ?? F["4-4-2"];
}
