import { useState, useMemo } from "react";
import { Trophy, ChevronRight } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import { type Team } from "../data/teams";
import { sortTable } from "../tournament";
import type { Tournament } from "../types";
import { StatsModule } from "./StatsModule";

type Divisao = "serie-a" | "serie-b" | "serie-c";

interface ChampionshipModuleProps {
  tour: Tournament;
  userTeam: Team;
  currentDivisao: Divisao;
}

export function ChampionshipModule({ tour, userTeam, currentDivisao }: ChampionshipModuleProps) {
  const [selectedDivisao, setSelectedDivisao] = useState<Divisao>(currentDivisao);
  const [showStats, setShowStats] = useState(false);

  const getTeam = (teamId: string): Team => {
    if (teamId === userTeam.id) return userTeam;
    // Para simulação, vamos usar o mesmo torneio para todas as séries
    // Em produção, cada série teria seu próprio torneio
    return userTeam;
  };

  // Calcular estatísticas (simulado para a divisão atual)
  const stats = useMemo(() => {
    if (tour.phase !== "grupos" || tour.groups.length === 0) return null;
    
    const tabela = sortTable(tour.groups[0]!.table);
    const artilheiro = tabela.reduce((max, r) => (r.gp > max.gp ? r : max), tabela[0]!);
    const menosGols = tabela.reduce((min, r) => (r.gc < min.gc ? r : min), tabela[0]!);
    
    let maiorVitoria: any = null;
    tour.groupFixtures.forEach(f => {
      if (f.result && f.played) {
        const diff = Math.abs(f.result.homeGoals - f.result.awayGoals);
        if (!maiorVitoria || diff > maiorVitoria.diff) {
          maiorVitoria = {
            homeId: f.homeId,
            awayId: f.awayId,
            homeGoals: f.result.homeGoals,
            awayGoals: f.result.awayGoals,
            diff
          };
        }
      }
    });

    let maiorVitoriaStats = null;
    if (maiorVitoria) {
      const vencedorId = maiorVitoria.homeGoals > maiorVitoria.awayGoals ? maiorVitoria.homeId : maiorVitoria.awayId;
      const perdedorId = maiorVitoria.homeGoals > maiorVitoria.awayGoals ? maiorVitoria.awayId : maiorVitoria.homeId;
      maiorVitoriaStats = {
        vencedor: getTeam(vencedorId),
        perdedor: getTeam(perdedorId),
        placar: `${maiorVitoria.homeGoals}-${maiorVitoria.awayGoals}`,
        diff: maiorVitoria.diff
      };
    }

    return {
      artilheiro: { team: getTeam(artilheiro.teamId), gols: artilheiro.gp },
      goleiro: { team: getTeam(menosGols.teamId), gols: menosGols.gc },
      maiorGoleada: maiorVitoriaStats
    };
  }, [tour, userTeam]);

  return (
    <div className="space-y-3">
      {/* Seleção de Divisão */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-yellow-400" />
          <h3 className="font-bold text-sm">Campeonatos</h3>
        </div>
        <div className="flex gap-2">
          {(["serie-a", "serie-b", "serie-c"] as Divisao[]).map((div) => (
            <button
              key={div}
              onClick={() => setSelectedDivisao(div)}
              className={`px-3 py-1 text-xs rounded transition ${
                selectedDivisao === div
                  ? "bg-yellow-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {div === "serie-a" ? "SÉRIE A" : div === "serie-b" ? "SÉRIE B" : "SÉRIE C"}
            </button>
          ))}
        </div>
      </div>

      {/* Estatísticas da Divisão */}
      {stats && (
        <StatsModule
          title={`Estatísticas ${selectedDivisao === "serie-a" ? "Série A" : selectedDivisao === "serie-b" ? "Série B" : "Série C"}`}
          artilheiro={stats.artilheiro}
          goleiro={stats.goleiro}
          maiorGoleada={stats.maiorGoleada}
          color={selectedDivisao === "serie-a" ? "emerald" : selectedDivisao === "serie-b" ? "blue" : "purple"}
        />
      )}

      {/* Tabela da Divisão */}
      {tour.phase === "grupos" && tour.groups.length > 0 && (
        <div className="panel">
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold">Classificação</span>
              <span className="text-xs text-muted-foreground">
                {selectedDivisao === "serie-a" ? "Série A" : selectedDivisao === "serie-b" ? "Série B" : "Série C"}
              </span>
            </div>
            <ChevronRight className={`size-4 transition-transform ${showStats ? "rotate-90" : ""}`} />
          </button>

          {showStats && (
            <div className="mt-3">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-1 w-8">#</th>
                    <th className="py-1">TIME</th>
                    <th className="w-8 text-center">P</th>
                    <th className="w-8 text-center">J</th>
                    <th className="w-10 text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {sortTable(tour.groups[0]!.table).slice(0, 5).map((r, i) => {
                    const position = i + 1;
                    const zone = position <= 4 ? "libertadores" : position <= 6 ? "copa-brasil" : position >= 18 ? "rebaixamento" : "";
                    return (
                      <tr
                        key={r.teamId}
                        className={`${r.teamId === tour.userTeamId ? "text-accent-foreground" : ""} ${
                          zone === "libertadores" ? "bg-blue-500/10" :
                          zone === "copa-brasil" ? "bg-green-500/10" :
                          zone === "rebaixamento" ? "bg-red-500/10" : ""
                        }`}
                      >
                        <td className="text-center py-1 font-bold">{position}º</td>
                        <td className="py-1">
                          <span className={i < 2 ? "font-medium" : "text-muted-foreground"}>
                            <TeamBadge team={getTeam(r.teamId)} size="sm" />
                          </span>
                        </td>
                        <td className="text-center py-1">{r.p}</td>
                        <td className="text-center py-1">{r.j}</td>
                        <td className="text-center py-1">{r.gp - r.gc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
