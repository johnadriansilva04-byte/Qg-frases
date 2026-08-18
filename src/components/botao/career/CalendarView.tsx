import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import { type Team } from "../data/teams";
import { TeamBadge } from "../components/TeamPicker";
import type { Tournament } from "../types";
import {
  construirCalendarioUnificado,
  resolveTeam,
  type CalItem,
  type CopaBrasilState,
} from "./competitionApi";
import type { Divisao } from "./types";

interface CalendarViewProps {
  tour: Tournament;
  userTeam: Team;
  /** Divisão atual (reservada p/ uso futuro de filtragem por divisão). */
  currentDivisao?: Divisao;
  copaBrasil?: CopaBrasilState | null;
}

/**
 * Calendário UNIFICADO da temporada: mescla cronologicamente as rodadas do
 * Brasileirão (pontos corridos) com as fases da Copa do Brasil (ida/volta),
 * exibindo uma timeline sequencial real em vez de listas isoladas.
 */
export function CalendarView({ tour, userTeam, copaBrasil }: CalendarViewProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const timeline: CalItem[] = useMemo(
    () => construirCalendarioUnificado(tour, userTeam, copaBrasil),
    [tour, userTeam, copaBrasil],
  );

  return (
    <div className="panel">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="size-4 text-emerald-400" />
        <h3 className="font-display text-sm font-bold tracking-wide">Calendário da Temporada</h3>
      </div>

      <div className="cal-timeline">
        {timeline.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Sem jogos agendados ainda.
          </p>
        ) : (
          timeline.map((item, idx) => (
            <TimelineCard
              key={`${item.label}-${idx}`}
              item={item}
              userTeam={userTeam}
              isOpen={selectedLabel === item.label}
              onToggle={() =>
                setSelectedLabel(selectedLabel === item.label ? null : item.label)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function TimelineCard({
  item,
  userTeam,
  isOpen,
  onToggle,
}: {
  item: CalItem;
  userTeam: Team;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`cal-item ${item.kind === "copa" ? "cal-item-copa" : "cal-item-br"}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-3 text-muted-foreground" />
          <span className="cal-item-stage">{item.label}</span>
          <span className="cal-item-date">· {item.data}</span>
          {item.jogoDoUsuario && <span className="cal-user-badge">seu jogo</span>}
        </div>
        <ChevronRight className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {item.fixtures.map((fixture) => {
            const isTBD = fixture.homeId === "TBD" || fixture.awayId === "TBD";
            const homeTeam = isTBD ? null : resolveTeam(fixture.homeId, userTeam);
            const awayTeam = isTBD ? null : resolveTeam(fixture.awayId, userTeam);
            const isUserMatch =
              !isTBD && (fixture.homeId === userTeam.id || fixture.awayId === userTeam.id);

            return (
              <div key={fixture.id} className={`cal-jogo ${isUserMatch ? "cal-jogo-user" : ""}`}>
                <div className="flex items-center gap-2">
                  {homeTeam ? (
                    <TeamBadge team={homeTeam} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">A definir</span>
                  )}
                  <span className="text-xs text-muted-foreground">×</span>
                  {awayTeam ? (
                    <TeamBadge team={awayTeam} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">A definir</span>
                  )}
                </div>
                <div className="text-xs">
                  {fixture.played && fixture.result ? (
                    <span className="font-bold text-emerald-300">
                      {fixture.result.homeGoals} - {fixture.result.awayGoals}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{isTBD ? "—" : "a jogar"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

