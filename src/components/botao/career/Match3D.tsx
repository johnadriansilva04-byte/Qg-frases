import { useEffect, useState } from "react";
import { Match3DView } from "@/components/match3d/Match3DView";
import type { MatchResult, MatchSetup } from "@/engine/types";
import type { Fixture, Team } from "../types";
import { teamByIdSync } from "../data/teams";
import type { CareerState } from "./types";

interface Props {
  fixture: Fixture;
  userTeam: Team;
  career: CareerState | null;
  onResult: (result: MatchResult) => void;
  onBack: () => void;
}

/**
 * Adaptador entre o sistema existente e o motor 3D.
 * Converte os dados da carreira para o formato MatchSetup e processa o resultado.
 */
export function Match3D({ fixture, userTeam, career, onResult, onBack }: Props) {
  const [setup, setSetup] = useState<MatchSetup | null>(null);

  useEffect(() => {
    // Converter dados do sistema existente para o formato do motor 3D
    const homeTeam = teamByIdSync(fixture.homeId);
    const awayTeam = teamByIdSync(fixture.awayId);

    const matchSetup: MatchSetup = {
      matchId: fixture.id,
      competition: career?.divisao ?? "serie-c",
      stadium: "Estádio Municipal", // Placeholder - pode vir do sistema
      home: {
        id: homeTeam.id,
        name: homeTeam.name,
        shortName: homeTeam.shortName,
        formation: "4-4-2",
        colors: { primary: homeTeam.primary ?? "#ff0000", secondary: homeTeam.secondary ?? "#ffffff" },
        players: generateMockPlayers(homeTeam, "home"),
      },
      away: {
        id: awayTeam.id,
        name: awayTeam.name,
        shortName: awayTeam.shortName,
        formation: "4-4-2",
        colors: { primary: awayTeam.primary ?? "#0000ff", secondary: awayTeam.secondary ?? "#ffffff" },
        players: generateMockPlayers(awayTeam, "away"),
      },
      controlledSide: fixture.homeId === userTeam.id ? "home" : "away",
      controlledPlayerId: fixture.homeId === userTeam.id ? homeTeam.id + "_player_10" : awayTeam.id + "_player_10",
      minutesPerHalf: 45,
      realSecondsPerHalf: 120,
    };

    setSetup(matchSetup);
  }, [fixture, userTeam, career]);

  if (!setup) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando partida 3D...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm backdrop-blur-sm hover:bg-background"
      >
        ← Voltar
      </button>
      <Match3DView
        setup={setup}
        onFinish={(result) => {
          // Processar o resultado e devolver ao sistema principal
          onResult(result);
        }}
      />
    </div>
  );
}

/**
 * Gera jogadores fictícios para o motor 3D.
 * TODO: Integrar com o sistema real de jogadores quando existir.
 */
function generateMockPlayers(team: Team, side: "home" | "away") {
  const roles: Array<"GK" | "DF" | "MF" | "FW"> = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"];
  return roles.map((role, idx) => ({
    id: `${team.id}_player_${idx}`,
    name: `Jogador ${idx + 1}`,
    number: idx + 1,
    role,
    attributes: {
      pace: 50 + Math.floor(Math.random() * 40),
      shooting: 40 + Math.floor(Math.random() * 50),
      passing: 40 + Math.floor(Math.random() * 50),
      defending: 40 + Math.floor(Math.random() * 50),
      physical: 40 + Math.floor(Math.random() * 50),
      technique: 40 + Math.floor(Math.random() * 50),
      stamina: 70 + Math.floor(Math.random() * 30),
    },
  }));
}
