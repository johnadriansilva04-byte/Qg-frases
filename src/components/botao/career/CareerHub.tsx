import { useMemo } from "react";
import { Calendar, ChevronRight, Coins, Trophy, Building2 } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import { nextUserFixture, sortTable } from "../tournament";
import type { Fixture, Tournament } from "../types";
import { NewsPortal } from "./NewsPortal";
import { SovereigntyPanel } from "./SovereigntyPanel";
import {
  CUSTO_MANUTENCAO,
  DIVISAO_LABEL,
  DIVISAO_SHORT,
  copaDisponivelNaRodada,
  gerarCopaBrasil,
  proximoJogoCopa,
  resolveTeam,
} from "./competitionApi";
import type { CareerState } from "./types";
import type { LigasTemporada } from "./seasonEngine";
import { ZoneLegend } from "./ClassificacaoScreen";

interface CareerHubProps {
  tour: Tournament;
  userTeam: Team;
  career: CareerState | null;
  ligas?: LigasTemporada | undefined;
  onPlay: () => void;
  onExit: () => void;
  /** Abre a tela dedicada de Classificação Completa (área própria, fora do hub). */
  onOpenClassificacao: () => void;
  /** Abre a tela dedicada do Calendário (módulo em tela própria, §17). */
  onOpenCalendario: () => void;
  /** Abre a Bolsa de Valores da Cidadela (módulo em tela própria, §17). */
  onOpenEconomia: () => void;
  /** Abre a tela de Propriedade de Clubes (sistema de cotas → proprietário). */
  onOpenPropriedade: () => void;
}

/**
 * Hub do Modo Carreira (§16-§18): MENOS ELEMENTOS + MAIS FOCO. Módulos abrem
 * em tela própria (Calendário, Bolsa, Tabela). O celular oficial é o FIXO do
 * canto inferior direito — nenhum card/celular interno no hub (§15).
 */
export function CareerHub({
  tour,
  userTeam,
  career,
  ligas,
  onPlay,
  onExit,
  onOpenClassificacao,
  onOpenCalendario,
  onOpenEconomia,
  onOpenPropriedade,
}: CareerHubProps) {
  const next = useMemo(() => nextUserFixture(tour), [tour]);
  const copaBrasil = career?.copaBrasil ?? gerarCopaBrasil(userTeam, tour.difficulty);
  const copaFixPend = copaBrasil ? proximoJogoCopa(copaBrasil, userTeam.id) : null;
  const divisao = career?.divisao ?? "serie-c";
  const temporada = career?.temporada ?? 1;
  const custoManutencao = CUSTO_MANUTENCAO[divisao];
  const nextLiga = ligas?.[divisao] ?? tour;
  const userPos =
    nextLiga.phase === "grupos" && nextLiga.groups.length > 0
      ? sortTable(nextLiga.groups[0]!.table).findIndex((row) => row.teamId === userTeam.id) + 1
      : 0;

  const getTeam = (teamId: string): Team => resolveTeam(teamId, userTeam);

  const proximoJogo =
    copaFixPend && copaDisponivelNaRodada(career?.rodadaAtual ?? 0, copaBrasil, userTeam.id, divisao)
      ? { fixture: copaFixPend, tipo: "Copa do Brasil" }
      : next
        ? {
            fixture: next,
            tipo: tour.phase === "grupos" ? "Brasileirão" : (tour.knockout.at(-1)?.stage ?? "Mata-mata"),
          }
        : null;

  const userFixture: Fixture | null = proximoJogo?.fixture ?? null;

  return (
    <div className="space-y-5">
      {career?.coach.nome && (
        <SovereigntyPanel
          coach={career.coach}
          moral={career.moralTime}
          temporada={temporada}
          divisao={divisao}
        />
      )}

      <section className="next-match-card">
        <div className="next-match-head">
          <span className="next-match-tag">
            {tour.phase === "fim" ? "Campanha encerrada" : (proximoJogo?.tipo ?? "Aguardando")}
          </span>
          <span className="next-match-div">{DIVISAO_SHORT[divisao]}</span>
        </div>
        {tour.phase === "fim" ? (
          <p className="mt-3 font-display text-2xl">
            Campeão: <TeamBadge team={resolveTeam(tour.champion!, userTeam)} />
          </p>
        ) : userFixture ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TeamBadge team={resolveTeam(userFixture.homeId, userTeam)} size="md" />
                <span className="font-display text-2xl text-muted-foreground">×</span>
                <TeamBadge team={resolveTeam(userFixture.awayId, userTeam)} size="md" />
              </div>
              <button data-testid="entrar-em-campo" onClick={onPlay} className="btn-primary px-5 py-2.5 text-sm">
                Entrar em campo
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>{userFixture.stage}</span>
              {userPos > 0 && <span>Posição: {userPos}º</span>}
              <span>Custo: {custoManutencao}</span>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aguardando fechamento da temporada...</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Coluna esquerda: módulos em botões compactos (§17) + portal de notícias. */}
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onOpenCalendario} className="menu-card menu-accent-sky !p-3">
              <span className="menu-card-icon menu-accent-sky !size-9">
                <Calendar className="size-4" />
              </span>
              <span className="mt-1 block font-display text-xs">Calendário</span>
            </button>
            <button onClick={onOpenEconomia} className="menu-card menu-accent-emerald !p-3">
              <span className="menu-card-icon menu-accent-emerald !size-9">
                <Coins className="size-4" />
              </span>
              <span className="mt-1 block font-display text-xs">Bolsa de Valores</span>
            </button>
            <button onClick={onOpenPropriedade} className="menu-card menu-accent-amber !p-3">
              <span className="menu-card-icon menu-accent-amber !size-9">
                <Building2 className="size-4" />
              </span>
              <span className="mt-1 block font-display text-xs">Mercado de Clubes</span>
            </button>
          </div>

          {career && (
            <NewsPortal
              headlines={career.headlines}
              userTeam={userTeam}
              coachNome={career.coach.apelido || career.coach.nome}
            />
          )}

          <button onClick={onExit} className="btn-ghost w-full text-xs">
            Voltar ao Estádio
          </button>
        </div>

        {/* Coluna direita - Classificação resumida (top 5) → tela própria completa. */}
        <div className="panel !p-3">
          <button onClick={onOpenClassificacao} className="mb-3 flex w-full items-center gap-2 text-left">
            <Trophy className="size-4 text-amber-400" />
            <h3 className="font-display text-sm font-bold tracking-wide">Classificação</h3>
            <span className="text-xs text-muted-foreground">{DIVISAO_LABEL[divisao]}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              Completa
              <ChevronRight className="size-3.5" />
            </span>
          </button>
          {nextLiga.phase === "grupos" && nextLiga.groups.length > 0 ? (
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
                  <th className="w-8 text-center">SG</th>
                </tr>
              </thead>
              <tbody>
                {sortTable(nextLiga.groups[0]!.table)
                  .filter((r, i, arr) => arr.findIndex((x) => x.teamId === r.teamId) === i)
                  .slice(0, 5)
                  .map((r, i) => {
                    const position = i + 1;
                    const zone =
                      position <= 4 ? "libertadores" : position <= 6 ? "copa-brasil" : position >= 18 ? "rebaixamento" : "";
                    return (
                      <tr
                        key={r.teamId}
                        className={`zone-row zone-${zone} ${r.teamId === nextLiga.userTeamId ? "is-user" : ""}`}
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
                        <td className="py-1 text-center font-medium">{r.gp - r.gc}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">Classificação indisponível nesta fase.</p>
          )}
          <ZoneLegend />
        </div>
      </div>
    </div>
  );
}
