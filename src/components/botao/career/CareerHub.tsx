import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Trophy } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import { nextUserFixture, sortTable } from "../tournament";
import type { Fixture, Tournament } from "../types";
import { CalendarView } from "./CalendarView";
import { ChampionshipModule } from "./ChampionshipModule";
import { NewsPortal } from "./NewsPortal";
import { SovereigntyPanel } from "./SovereigntyPanel";
import { condicaoSombria, conviteTrilha } from "./trilhaIntegracao";
import {
  CUSTO_MANUTENCAO,
  DIVISAO_LABEL,
  DIVISAO_SHORT,
  copaDisponivelNaRodada,
  gerarCopaBrasil,
  proximoJogoCopa,
  resolveTeam,
  usuarioVivoNaCopa,
} from "./competitionApi";
import type { CareerState, Divisao } from "./types";
import type { LigasTemporada } from "./seasonEngine";
import { ZoneLegend } from "./ChampionshipModule";

interface CareerHubProps {
  tour: Tournament;
  userTeam: Team;
  career: CareerState | null;
  ligas?: LigasTemporada | undefined;
  onPlay: () => void;
  onExit: () => void;
  onOpenCelular: () => void;
}

export function CareerHub({
  tour,
  userTeam,
  career,
  ligas,
  onPlay,
  onExit,
  onOpenCelular,
}: CareerHubProps) {
  const [showCalendar, setShowCalendar] = useState(false);
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

  const temDesafioPatrocinador =
    !!career?.desafioPatrocinador && !career.desafioPatrocinador.concluido;
  const mensagensPendentes =
    (career?.eventoPendenteId ? 1 : 0) +
    (career?.suborno?.nodeAtual ? 1 : 0) +
    (career?.narrativa?.cenaAtual ? 1 : 0);
  const temCelular = mensagensPendentes > 0 || temDesafioPatrocinador;

  const proximoJogo =
    copaFixPend &&
    copaDisponivelNaRodada(career?.rodadaAtual ?? 0, copaBrasil, userTeam.id, divisao)
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
              <button
                data-testid="entrar-em-campo"
                onClick={onPlay}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Entrar em campo
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>{userFixture.stage}</span>
              {userPos > 0 && <span>Posição: {userPos}º</span>}
              <span>Custo de manutenção: {custoManutencao}</span>
              {temCelular && <span className="text-amber-300">Celular com mensagens</span>}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aguardando fechamento da temporada...</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Coluna esquerda - Módulos em quadradinhos */}
        <div className="grid gap-3">
          <button onClick={onOpenCelular} className="celular-card">
            <span className="celular-emoji">📱</span>
            <div className="celular-info">
              <span className="celular-title">Celular do Treinador</span>
              <span className="celular-sub">
                {mensagensPendentes > 0
                  ? `${mensagensPendentes} mensagem${mensagensPendentes !== 1 ? "s" : ""} nova${mensagensPendentes !== 1 ? "s" : ""}`
                  : temDesafioPatrocinador
                    ? "Desafio de patrocinador ativo"
                    : "Tudo em dia por aqui"}
              </span>
            </div>
            {mensagensPendentes > 0 && <span className="celular-badge">{mensagensPendentes}</span>}
            <span className="celular-cta">Abrir</span>
          </button>

          {career && (
            <NewsPortal
              headlines={career.headlines}
              userTeam={userTeam}
              coachNome={career.coach.apelido || career.coach.nome}
            />
          )}

          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="panel hover:border-emerald-500/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-emerald-400" />
              <span className="font-display text-sm tracking-wide">Calendário da Temporada</span>
            </div>
            <ChevronRight className={`size-4 transition-transform ${showCalendar ? "rotate-90" : ""}`} />
          </button>
          {showCalendar && (
            <CalendarView
              tour={tour}
              userTeam={userTeam}
              currentDivisao={divisao}
              copaBrasil={copaBrasil}
            />
          )}

          <button onClick={onExit} className="btn-ghost w-full">
            Voltar ao menu
          </button>

          {/* Ritual da Trilha — válvula narrativa: aparece quando a carreira
              está sob a sombra (SOV < 30 ou 3+ derrotas seguidas). */}
          {career && condicaoSombria(career) && (
            <Link
              to="/cidadela"
              className="block rounded-xl border border-red-900/50 bg-gradient-to-br from-red-950/60 via-slate-950 to-slate-950 p-3 transition hover:border-red-700/70"
            >
              <p className="font-display text-sm tracking-wide text-red-300">
                ☾ Ritual da Trilha
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                {conviteTrilha(career)}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-red-400">
                Abra a Cidadela e jogue a Trilha — vencer alivia a sombra: +8 SOV · sequência zerada →
              </p>
            </Link>
          )}
        </div>

        {/* Coluna direita - Classificação sempre visível (top 5) */}
        <div className="panel">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="size-4 text-amber-400" />
            <h3 className="font-display text-sm font-bold tracking-wide">Classificação</h3>
            <span className="text-xs text-muted-foreground">{DIVISAO_LABEL[divisao]}</span>
          </div>
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
