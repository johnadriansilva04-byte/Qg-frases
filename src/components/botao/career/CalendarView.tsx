import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Clock, Crown, Shield } from "lucide-react";
import { type Team } from "../data/teams";
import { TeamBadge } from "../components/TeamPicker";
import type { Fixture, Tournament } from "../types";
import { type CopaBrasilState, COPA_RODADAS_GATILHO, dataDaRodada, resolveTeam } from "./competitionApi";
import type { Divisao } from "./types";

type Competicao = "unificado" | "brasileirao" | "copa-brasil";

interface CalendarViewProps {
  tour: Tournament;
  userTeam: Team;
  currentDivisao: Divisao;
  copaBrasil?: CopaBrasilState | null;
}

export function CalendarView({ tour, userTeam, copaBrasil }: CalendarViewProps) {
  const [competicao, setCompeticao] = useState<Competicao>("unificado");
  const [selectedRodada, setSelectedRodada] = useState<string | null>(null);

  // Rodadas do Brasileirão (pontos corridos) agrupadas por stage.
  const rodadasLiga = useMemo(() => {
    const acc: Record<string, Fixture[]> = {};
    tour.groupFixtures.forEach((fixture) => {
      (acc[fixture.stage] ??= []).push(fixture);
    });
    return Object.keys(acc)
      .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
      .map((stage) => ({ stage, fixtures: acc[stage]! }));
  }, [tour]);

  // Linha do tempo unificada: intercala rodadas do Brasileirão com fases da
  // Copa do Brasil numa cronologia única (Copa aparece nas rodadas-gatilho).
  // Ex.: Rodada 1 BR -> Rodada 2 BR -> Copa (Oitavas) -> Rodada 3 BR -> ...
  const unificado = useMemo(() => {
    const itens: Array<{
      stage: string;
      data: string;
      fixtures: Fixture[];
      competicao: "brasileirao" | "copa-brasil";
    }> = [];
    const rodadaCopaIdx = copaBrasil?.rounds ?? [];
    // Mapeia rodada-gatilho do BR -> índice da fase da copa (COPA_RODADAS_GATILHO).
    rodadasLiga.forEach((rodada, idx) => {
      const rodadaNum = idx + 1;
      itens.push({
        stage: rodada.stage,
        data: dataDaRodada(itens.length),
        fixtures: rodada.fixtures,
        competicao: "brasileirao",
      });
      // Se há fase de copa associada a esta rodada-gatilho, insere logo depois.
      const copaIdx = COPA_RODADAS_GATILHO.indexOf(rodadaNum);
      if (copaIdx >= 0 && rodadaCopaIdx[copaIdx]) {
        const fase = rodadaCopaIdx[copaIdx]!;
        itens.push({
          stage: fase.stage,
          data: dataDaRodada(itens.length),
          fixtures: fase.fixtures,
          competicao: "copa-brasil",
        });
      }
    });
    // Fases da copa além das rodadas-gatilho (ex.: finais pós-rodada 18).
    if (rodadaCopaIdx.length > COPA_RODADAS_GATILHO.length) {
      for (let i = COPA_RODADAS_GATILHO.length; i < rodadaCopaIdx.length; i++) {
        const fase = rodadaCopaIdx[i]!;
        itens.push({
          stage: fase.stage,
          data: dataDaRodada(itens.length),
          fixtures: fase.fixtures,
          competicao: "copa-brasil",
        });
      }
    }
    return itens;
  }, [rodadasLiga, copaBrasil]);

  return (
    <div className="panel">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="size-4 text-emerald-400" />
        <h3 className="font-display text-sm font-bold tracking-wide">Calendário da Temporada</h3>
      </div>

      {/* Filtro de competição (Unificado | Brasileirão | Copa do Brasil) */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <CompFilter
          active={competicao === "unificado"}
          onClick={() => setCompeticao("unificado")}
          icon={<Calendar className="size-3.5" />}
          label="Unificado"
        />
        <CompFilter
          active={competicao === "brasileirao"}
          onClick={() => setCompeticao("brasileirao")}
          icon={<Shield className="size-3.5" />}
          label="Brasileirão"
        />
        <CompFilter
          active={competicao === "copa-brasil"}
          onClick={() => setCompeticao("copa-brasil")}
          icon={<Crown className="size-3.5" />}
          label="Copa do Brasil"
        />
      </div>

      {competicao === "unificado" ? (
        <div className="space-y-2">
          {unificado.length > 0 ? (
            unificado.map((item) => (
              <RodadaCard
                key={item.stage + item.data}
                stage={item.stage}
                data={item.data}
                fixtures={item.fixtures}
                userTeam={userTeam}
                isOpen={selectedRodada === item.stage + item.data}
                onToggle={() =>
                  setSelectedRodada(
                    selectedRodada === item.stage + item.data ? null : item.stage + item.data,
                  )
                }
                destaque={item.competicao === "copa-brasil" ? "copa" : undefined}
              />
            ))
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Sem jogos agendados ainda.
            </p>
          )}
        </div>
      ) : competicao === "brasileirao" ? (
        <div className="space-y-2">
          {rodadasLiga.map((rodada, idx) => (
            <RodadaCard
              key={rodada.stage}
              stage={rodada.stage}
              data={dataDaRodada(idx)}
              fixtures={rodada.fixtures}
              userTeam={userTeam}
              isOpen={selectedRodada === rodada.stage}
              onToggle={() => setSelectedRodada(selectedRodada === rodada.stage ? null : rodada.stage)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {copaBrasil && copaBrasil.rounds.length > 0 ? (
            copaBrasil.rounds.map((rodada, idx) => (
              <RodadaCard
                key={rodada.stage}
                stage={rodada.stage}
                data={dataDaRodada(idx + rodadasLiga.length)}
                fixtures={rodada.fixtures}
                userTeam={userTeam}
                isOpen={selectedRodada === rodada.stage}
                onToggle={() => setSelectedRodada(selectedRodada === rodada.stage ? null : rodada.stage)}
                destaque="copa"
              />
            ))
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              A Copa do Brasil será sorteada junto à temporada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CompFilter({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} className={`comp-tab ${active ? "comp-tab-active" : ""}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RodadaCard({
  stage,
  data,
  fixtures,
  userTeam,
  isOpen,
  onToggle,
  destaque,
}: {
  stage: string;
  data: string;
  fixtures: Fixture[];
  userTeam: Team;
  isOpen: boolean;
  onToggle: () => void;
  destaque?: "copa" | undefined;
}) {
  const jogosUsuario = fixtures.filter(
    (f) => (f.homeId === userTeam.id || f.awayId === userTeam.id) && f.homeId !== "TBD",
  ).length;

  return (
    <div className={`cal-rodada ${destaque === "copa" ? "cal-rodada-copa" : ""}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-3 text-muted-foreground" />
          <span className="font-display text-sm font-bold tracking-wide">{stage}</span>
          <span className="text-xs text-muted-foreground">
            · {data} · {fixtures.length} jogo{fixtures.length !== 1 ? "s" : ""}
          </span>
          {destaque === "copa" && <span className="cal-copa-chip">COPA</span>}
          {jogosUsuario > 0 && <span className="cal-user-badge">seu jogo</span>}
        </div>
        <ChevronRight className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {fixtures.map((fixture) => {
            const isTBD = fixture.homeId === "TBD" || fixture.awayId === "TBD";
            const homeTeam = isTBD ? null : resolveTeam(fixture.homeId, userTeam);
            const awayTeam = isTBD ? null : resolveTeam(fixture.awayId, userTeam);
            const isUserMatch =
              !isTBD && (fixture.homeId === userTeam.id || fixture.awayId === userTeam.id);

            return (
              <div
                key={fixture.id}
                className={`cal-jogo ${isUserMatch ? "cal-jogo-user" : ""}`}
              >
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
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    {fixture.played && fixture.result ? (
                      <span className="font-bold text-emerald-300">
                        {fixture.result.homeGoals} - {fixture.result.awayGoals}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{isTBD ? "—" : "a jogar"}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{data}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

