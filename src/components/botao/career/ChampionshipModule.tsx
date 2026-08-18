import { useMemo, useState } from "react";
import { Trophy, ChevronRight, Shield, Crown } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import { type Team } from "../data/teams";
import { sortTable } from "../tournament";
import type { Tournament } from "../types";
import { StatsModule } from "./StatsModule";
import {
  DIVISAO_LABEL,
  DIVISAO_SHORT,
  calcularStats,
  resolveTeam,
  type Competicao,
} from "./competitionApi";
import type { Divisao } from "./types";

interface ChampionshipModuleProps {
  tour: Tournament;
  userTeam: Team;
  currentDivisao: Divisao;
}

export function ChampionshipModule({ tour, userTeam, currentDivisao }: ChampionshipModuleProps) {
  const [competicao, setCompeticao] = useState<Competicao>("brasileirao");
  const [selectedDivisao, setSelectedDivisao] = useState<Divisao>(currentDivisao);
  const [showTable, setShowTable] = useState(false);

  const getTeam = (teamId: string): Team => resolveTeam(teamId, userTeam);

  // Estatísticas REAIS do torneio (mesmo chaveamento), rotuladas pela divisão escolhida.
  const stats = useMemo(
    () => calcularStats(tour, userTeam),
    [tour, userTeam],
  );

  return (
    <div className="space-y-3">
      {/* Submenu de competições: Copa do Brasil | Brasileirão */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-amber-400" />
          <h3 className="font-display text-sm font-bold tracking-wide">Campeonatos</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CompTab
            active={competicao === "copa-brasil"}
            onClick={() => setCompeticao("copa-brasil")}
            icon={<Crown className="size-3.5" />}
            label="Copa do Brasil"
          />
          <CompTab
            active={competicao === "brasileirao"}
            onClick={() => setCompeticao("brasileirao")}
            icon={<Shield className="size-3.5" />}
            label="Brasileirão"
          />
        </div>

        {/* Sub-seleção de série — só aparece no Brasileirão */}
        {competicao === "brasileirao" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Divisão</p>
            <div className="flex gap-1.5">
              {(["serie-a", "serie-b", "serie-c"] as Divisao[]).map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivisao(div)}
                  className={`div-tab ${selectedDivisao === div ? "div-tab-active" : ""}`}
                  data-user-div={div === currentDivisao ? "1" : undefined}
                >
                  {DIVISAO_SHORT[div]}
                  {div === currentDivisao && <span className="div-tab-badge">você</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo por competição */}
      {competicao === "copa-brasil" ? (
        <div className="panel">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="size-4 text-amber-300" />
            <h3 className="font-display text-sm font-bold tracking-wide">Copa do Brasil</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mata-mata nacional com 16 clubes. Os confrontos e datas aparecem no
            calendário da temporada. Dispute as fases para levantar a taça.
          </p>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {COPA_PHASES.map((f, i) => (
              <div key={f} className="copa-phase-chip">
                <span className="copa-phase-num">{i + 1}</span>
                <span className="copa-phase-name">{f}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Painel central de estatísticas (módulos PS2) */}
          {stats && (
            <StatsModule
              title={`Estatísticas · ${DIVISAO_LABEL[selectedDivisao]}`}
              stats={stats}
              divisao={selectedDivisao}
            />
          )}

          {/* Tabela de classificação da divisão */}
          {tour.phase === "grupos" && tour.groups.length > 0 && (
            <div className="panel">
              <button
                onClick={() => setShowTable(!showTable)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold tracking-wide">Classificação</span>
                  <span className="text-xs text-muted-foreground">{DIVISAO_LABEL[selectedDivisao]}</span>
                </div>
                <ChevronRight className={`size-4 transition-transform ${showTable ? "rotate-90" : ""}`} />
              </button>

              {showTable && (
                <div className="mt-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="w-8 py-1">#</th>
                        <th className="py-1">TIME</th>
                        <th className="w-8 text-center">P</th>
                        <th className="w-8 text-center">J</th>
                        <th className="w-6 text-center">V</th>
                        <th className="w-6 text-center">E</th>
                        <th className="w-6 text-center">D</th>
                        <th className="w-8 text-center">GP</th>
                        <th className="w-8 text-center">GC</th>
                        <th className="w-8 text-center">SG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortTable(tour.groups[0]!.table)
                        .filter((r, i, arr) => arr.findIndex((x) => x.teamId === r.teamId) === i)
                        .map((r, i) => {
                        const position = i + 1;
                        const zone =
                          position <= 4 ? "libertadores" : position <= 6 ? "copa-brasil" : position >= 18 ? "rebaixamento" : "";
                        return (
                          <tr
                            key={r.teamId}
                            className={`zone-row zone-${zone} ${r.teamId === tour.userTeamId ? "is-user" : ""}`}
                          >
                            <td className="py-1 text-center font-bold">{position}º</td>
                            <td className="py-1">
                              <span className={i < 2 ? "font-medium" : "text-muted-foreground"}>
                                <TeamBadge team={getTeam(r.teamId)} size="sm" />
                              </span>
                            </td>
                            <td className="py-1 text-center font-bold">{r.p}</td>
                            <td className="py-1 text-center">{r.j}</td>
                            <td className="py-1 text-center text-emerald-300">{r.v}</td>
                            <td className="py-1 text-center text-muted-foreground">{r.e}</td>
                            <td className="py-1 text-center text-rose-300">{r.d}</td>
                            <td className="py-1 text-center">{r.gp}</td>
                            <td className="py-1 text-center">{r.gc}</td>
                            <td className="py-1 text-center font-medium">{r.gp - r.gc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <ZoneLegend />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const COPA_PHASES = ["2ª Fase", "Oitavas", "Quartas", "Semi", "Final"];

function CompTab({
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

export function ZoneLegend() {
  return (
    <div className="mt-3 space-y-1 text-[10px]">
      <div className="flex items-center gap-2">
        <span className="zone-swatch zone-libertadores" />
        <span className="text-sky-300">Libertadores (1º-4º)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="zone-swatch zone-copa-brasil" />
        <span className="text-emerald-300">Copa do Brasil (5º-6º)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="zone-swatch zone-rebaixamento" />
        <span className="text-rose-300">Rebaixamento (18º-20º)</span>
      </div>
    </div>
  );
}

