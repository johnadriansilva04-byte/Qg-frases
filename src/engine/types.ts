/**
 * MATCH ENGINE CONTRACT
 * =====================
 * This is the ONLY boundary between the existing game (career, clubs, economy,
 * SOV, bank, marketplace, seasons, rankings, stats, progression, saving) and the
 * 3D match engine.
 *
 *   MAIN SYSTEM --(MatchSetup)--> 3D ENGINE --(MatchResult + MatchEvent[])--> MAIN SYSTEM
 *
 * The engine never computes economy, career, ranking or persistence. It only
 * plays the match and reports what happened.
 */

export type TeamSide = "home" | "away";

export type PositionRole = "GK" | "DF" | "MF" | "FW";

export type Formation = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

/** Formato da partida: 3x3 (1 goleiro + 2 de linha) ou 11x11 tradicional. */
export type MatchFormat = "3x3" | "11x11";

/** Attributes come from the existing player system (0-100). */
export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  technique: number;
  /** Stamina attribute from the existing system. The engine only consumes it. */
  stamina: number;
}

export interface MatchPlayerInput {
  id: string;
  name: string;
  number: number;
  role: PositionRole;
  attributes: PlayerAttributes;
}

export interface MatchTeamInput {
  id: string;
  name: string;
  shortName: string;
  formation: Formation;
  colors: { primary: string; secondary: string };
  /** Elenco do time. No 3x3 o motor escala 1 GK + 2 de linha; no 11x11, 11. */
  players: MatchPlayerInput[];
}

export interface MatchSetup {
  matchId: string;
  competition: string;
  stadium?: string;
  home: MatchTeamInput;
  away: MatchTeamInput;
  /** Which side the user plays for. */
  controlledSide: TeamSide;
  /** Id of the single player the user controls (the other 21 are AI). */
  controlledPlayerId: string;
  /** In-game minutes per half (default 45). */
  minutesPerHalf?: number;
  /** Real seconds each half takes (default 120). */
  realSecondsPerHalf?: number;
  /** Optional starting state when resuming a match from the main system. */
  initialScore?: { home: number; away: number };
  /** Formato da partida (default: "3x3" — ver matchFormat.ts). */
  format?: MatchFormat;
}

export type MatchEventType =
  | "kickoff"
  | "pass"
  | "shot"
  | "goal"
  | "save"
  | "tackle"
  | "foul"
  | "out"
  | "corner"
  | "goalkick"
  | "penalty"
  | "halftime"
  | "fulltime";

export interface MatchEvent {
  type: MatchEventType;
  /** In-game minute. */
  minute: number;
  side?: TeamSide;
  playerId?: string;
  playerName?: string;
  detail?: string;
}

export interface MatchPlayerStats {
  playerId: string;
  name: string;
  side: TeamSide;
  goals: number;
  shots: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  fouls: number;
  touches: number;
  distanceKm: number;
  /** 0-10, derived from actions. The main system may ignore it. */
  rating: number;
}

export interface MatchResult {
  matchId: string;
  score: { home: number; away: number };
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  events: MatchEvent[];
  players: MatchPlayerStats[];
  controlledPlayer: MatchPlayerStats;
  outcome: "home" | "away" | "draw";
  finishedAt: string;
  aborted: boolean;
}

/** Live snapshot used only by the in-match HUD. */
export interface MatchLiveState {
  minute: number;
  half: 1 | 2;
  score: { home: number; away: number };
  possession: { home: number; away: number };
  possessionSide: TeamSide | null;
  stamina: number;
  /** Carga atual da barra de força (0 = escondida). */
  charge: number;
  lastEvent?: MatchEvent;
  running: boolean;
}
