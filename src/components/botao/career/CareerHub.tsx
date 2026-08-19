import { useMemo, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import { nextUserFixture, sortTable } from "../tournament";
import type { Fixture, Tournament } from "../types";
import { CalendarView } from "./CalendarView";
import { ChampionshipModule } from "./ChampionshipModule";
import { NewsPortal } from "./NewsPortal";
import { SovereigntyPanel } from "./SovereigntyPanel";
import {
  CUSTO_MANUTENCAO,
  DIVISAO_SHORT,
  copaDisponivelNaRodada,
  gerarCopaBrasil,
  proximoJogoCopa,
  resolveTeam,
  usuarioVivoNaCopa,
} from "./competitionApi";
import type { CareerState, Divisao } from "./types";
import type { LigasTemporada } from "./seasonEngine";

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-3">
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
        </div>

        <ChampionshipModule
          tour={tour}
          userTeam={userTeam}
          currentDivisao={divisao}
          ligas={ligas}
          copaBrasil={copaBrasil}
        />
      </div>
    </div>
  );
}
