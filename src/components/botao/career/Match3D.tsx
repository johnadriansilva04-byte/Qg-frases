import { useEffect, useState } from "react";
import { Match3DView } from "@/components/match3d/Match3DView";
import type { MatchSetup } from "@/engine/types";
import type { Fixture, MatchResult } from "../types";
import { teamByIdSync, type Team } from "../data/teams";
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
      stadium: "Estádio Municipal",
      home: {
        id: homeTeam.id,
        name: homeTeam.name,
        shortName: homeTeam.short,
        formation: "4-4-2",
        colors: { primary: homeTeam.primary ?? "#ff0000", secondary: homeTeam.secondary ?? "#ffffff" },
        players: generateMockPlayers(homeTeam),
      },
      away: {
        id: awayTeam.id,
        name: awayTeam.name,
        shortName: awayTeam.short,
        formation: "4-4-2",
        colors: { primary: awayTeam.primary ?? "#0000ff", secondary: awayTeam.secondary ?? "#ffffff" },
        players: generateMockPlayers(awayTeam),
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
    <div className="fixed inset-0 z-40 bg-background">
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
          // Converte o resultado do motor 3D para o contrato da carreira.
          onResult({
            homeId: fixture.homeId,
            awayId: fixture.awayId,
            homeGoals: result.score.home,
            awayGoals: result.score.away,
          });
        }}
      />
    </div>
  );
}

const NOMES = [
  "Rafael", "Thiago", "Lucas", "Gabriel", "Matheus", "Pedro", "Caio", "Bruno",
  "André", "Felipe", "Diego", "Rodrigo", "Vinícius", "Gustavo", "Leandro",
  "Fábio", "Marcelo", "Renato", "Igor", "Daniel", "Eduardo", "Fernando",
];
const SOBRENOMES = [
  "Silva", "Santos", "Souza", "Lima", "Costa", "Rocha", "Alves", "Ribeiro",
  "Carvalho", "Ferreira", "Martins", "Barbosa", "Cardoso", "Teixeira",
];

/** Hash determinístico (FNV-1a) — mesma semente, mesmo elenco, em todo F5. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Gera o elenco de um clube para o motor 3D de forma DETERMINÍSTICA:
 * derivada do id/power reais do time (a força do clube da carreira define o
 * nível dos jogadores), com variação por hash — nunca aleatório (o elenco
 * não pode mudar entre telas nem entre F5). Quando existir um sistema de
 * jogadores nomeados por clube, esta função deve ser substituída por ele.
 */
function generateMockPlayers(team: Team) {
  const roles: Array<"GK" | "DF" | "MF" | "FW"> = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"];
  // power do clube (28-88) → nível base dos atributos do elenco (30-80)
  const base = 30 + Math.round(((team.power - 28) / 60) * 50);
  return roles.map((role, idx) => {
    const h = hashStr(`${team.id}:${idx}`);
    const variacao = (attr: number) => ((h >>> (attr * 4)) % 21) - 10; // -10..+10 por atributo
    const attr = (v: number) => Math.max(25, Math.min(95, base + v));
    return {
      id: `${team.id}_player_${idx}`,
      name: `${NOMES[h % NOMES.length]} ${SOBRENOMES[(h >>> 8) % SOBRENOMES.length]}`,
      number: idx + 1,
      role,
      attributes: {
        pace: attr(variacao(0) + (role === "FW" ? 8 : role === "GK" ? -6 : 0)),
        shooting: attr(variacao(1) + (role === "FW" ? 10 : role === "MF" ? 2 : -8)),
        passing: attr(variacao(2) + (role === "MF" ? 8 : role === "GK" ? -4 : 0)),
        defending: attr(variacao(3) + (role === "DF" ? 10 : role === "GK" ? 6 : -8)),
        physical: attr(variacao(4) + (role === "DF" ? 6 : 0)),
        technique: attr(variacao(5) + (role === "MF" ? 6 : role === "FW" ? 4 : 0)),
        stamina: attr(variacao(6) + 15),
      },
    };
  });
}
