import { useState } from "react";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import { teamByIdSync, type Team } from "../data/teams";
import { TeamBadge } from "../components/TeamPicker";
import type { Fixture, Tournament } from "../types";

type Divisao = "serie-a" | "serie-b" | "serie-c";

interface CalendarViewProps {
  tour: Tournament;
  userTeam: Team;
  currentDivisao: Divisao;
}

export function CalendarView({ tour, userTeam, currentDivisao }: CalendarViewProps) {
  const [selectedDivisao, setSelectedDivisao] = useState<Divisao>(currentDivisao);
  const [selectedRodada, setSelectedRodada] = useState<string | null>(null);

  // Agrupar fixtures por rodada
  const fixturesByRodada = tour.groupFixtures.reduce((acc, fixture) => {
    const stage = fixture.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(fixture);
    return acc;
  }, {} as Record<string, Fixture[]>);

  const rodadas = Object.keys(fixturesByRodada).sort((a, b) => parseInt(a) - parseInt(b));

  const getTeam = (teamId: string): Team => {
    if (teamId === userTeam.id) return userTeam;
    return teamByIdSync(teamId);
  };

  const divisaoColors = {
    "serie-a": "border-emerald-500/30 bg-emerald-500/5",
    "serie-b": "border-blue-500/30 bg-blue-500/5",
    "serie-c": "border-purple-500/30 bg-purple-500/5",
  };

  const divisaoText = {
    "serie-a": "text-emerald-400",
    "serie-b": "text-blue-400",
    "serie-c": "text-purple-400",
  };

  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="size-4 text-emerald-400" />
        <h3 className="font-bold text-sm">Calendário</h3>
      </div>

      {/* Seleção de Divisão */}
      <div className="flex gap-2 mb-4">
        {(["serie-a", "serie-b", "serie-c"] as Divisao[]).map((div) => (
          <button
            key={div}
            onClick={() => setSelectedDivisao(div)}
            className={`px-3 py-1 text-xs rounded transition ${
              selectedDivisao === div
                ? `${divisaoColors[div]} ${divisaoText[div]}`
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {div === "serie-a" ? "SÉRIE A" : div === "serie-b" ? "SÉRIE B" : "SÉRIE C"}
          </button>
        ))}
      </div>

      {/* Lista de Rodadas */}
      <div className="space-y-2">
        {rodadas.map((rodada) => (
          <div key={rodada} className={`panel ${divisaoColors[selectedDivisao]}`}>
            <button
              onClick={() => setSelectedRodada(selectedRodada === rodada ? null : rodada)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="size-3 text-muted-foreground" />
                <span className="font-display text-sm font-bold">Rodada {rodada}</span>
                <span className="text-xs text-muted-foreground">
                  ({fixturesByRodada[rodada]?.length || 0} jogos)
                </span>
              </div>
              <ChevronRight
                className={`size-4 transition-transform ${
                  selectedRodada === rodada ? "rotate-90" : ""
                }`}
              />
            </button>

            {selectedRodada === rodada && (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                {fixturesByRodada[rodada]?.map((fixture) => {
                  const homeTeam = getTeam(fixture.homeId);
                  const awayTeam = getTeam(fixture.awayId);
                  const isUserMatch =
                    fixture.homeId === userTeam.id || fixture.awayId === userTeam.id;

                  return (
                    <div
                      key={fixture.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        isUserMatch ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TeamBadge team={homeTeam} size="sm" />
                        <span className="text-xs text-muted-foreground">vs</span>
                        <TeamBadge team={awayTeam} size="sm" />
                      </div>
                      <div className="text-xs">
                        {fixture.played && fixture.result ? (
                          <span className="font-bold text-emerald-300">
                            {fixture.result.homeGoals} - {fixture.result.awayGoals}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
