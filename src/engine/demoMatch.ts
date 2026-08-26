import type { Formation, MatchPlayerInput, MatchSetup, MatchTeamInput, PositionRole } from "./types";

/**
 * DEMO ADAPTER ONLY.
 * The real game must build the MatchSetup from its own career/club/squad data.
 * This file exists so the engine can be run and tested in isolation.
 */

const NAMES_A = ["Rafael", "Léo", "Kaká"];
const NAMES_B = ["Marcos", "Tiago", "Rui"];

function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function makePlayers(names: string[], formation: Formation, base: number): MatchPlayerInput[] {
  // Formato 3x3: 1 goleiro + 2 jogadores de linha.
  const roles: PositionRole[] = ["GK", "MF", "FW"];
  return names.map((name, i) => ({
    id: `${base}-${i}`,
    name,
    number: i + 1,
    role: roles[i]!,
    attributes: {
      pace: rand(base - 10, base + 10),
      shooting: rand(base - 15, base + 10),
      passing: rand(base - 10, base + 10),
      defending: rand(base - 12, base + 12),
      physical: rand(base - 10, base + 10),
      technique: rand(base - 10, base + 10),
      stamina: rand(base - 5, base + 12),
    },
  }));
}

export function createDemoSetup(): MatchSetup {
  const home: MatchTeamInput = {
    id: "club-home",
    name: "Atlético Aurora",
    shortName: "AUR",
    formation: "4-3-3",
    colors: { primary: "#e63946", secondary: "#1d1d1d" },
    players: makePlayers(NAMES_A, "4-3-3", 72),
  };
  const away: MatchTeamInput = {
    id: "club-away",
    name: "Real Litoral",
    shortName: "LIT",
    formation: "4-4-2",
    colors: { primary: "#f1f5f9", secondary: "#1e3a8a" },
    players: makePlayers(NAMES_B, "4-4-2", 70),
  };
  return {
    matchId: `demo-${Date.now()}`,
    competition: "Campeonato Nacional — Rodada 7",
    stadium: "Arena Aurora",
    home,
    away,
    controlledSide: "home",
    controlledPlayerId: home.players[2]!.id,
    minutesPerHalf: 45,
    realSecondsPerHalf: 120,
  };
}
