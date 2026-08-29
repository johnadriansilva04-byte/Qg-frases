import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Coins,
  Trophy,
  Building2,
  ArrowLeftRight,
  Heart,
  Crown,
  Zap,
  Target,
  TrendingUp,
  Newspaper,
  ArrowRight,
} from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import { nextUserFixture, sortTable } from "../tournament";
import type { Fixture, Tournament } from "../types";
import { NewsPortal } from "./NewsPortal";
import { ModoJogoModal } from "./ModoJogoModal";
import { salarioDa } from "./clubeFinancas";
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
import { nivelDoTreinador } from "./types";

interface CareerHubProps {
  tour: Tournament;
  userTeam: Team;
  career: CareerState | null;
  ligas?: LigasTemporada | undefined;
  onPlay: () => void;
  onPlay3D?: (fixture: Fixture) => void;
  onExit: () => void;
  onOpenClassificacao: () => void;
  onOpenCalendario: () => void;
  onOpenEconomia: () => void;
  onOpenPropriedade: () => void;
  onOpenTransferencias: () => void;
  ofertasPendentes?: number | undefined;
}

/**
 * Hub do Modo Carreira — Dashboard Next-Gen (estilo EA Sports FC / eSports).
 * Layout modular sem scroll: header com widgets + próximo confronto + grid de módulos.
 */
export function CareerHub({
  tour,
  userTeam,
  career,
  ligas,
  onPlay,
  onPlay3D,
  onExit,
  onOpenClassificacao,
  onOpenCalendario,
  onOpenEconomia,
  onOpenPropriedade,
  onOpenTransferencias,
  ofertasPendentes = 0,
}: CareerHubProps) {
  const [mostrarModalModo, setMostrarModalModo] = useState(false);
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

  // Derived data for widgets
  const coach = career?.coach;
  const nivel = coach ? nivelDoTreinador(coach.sov) : null;
  const moral = career?.moralTime ?? 50;
  const moralColor = moral >= 70 ? "text-emerald-300" : moral >= 40 ? "text-amber-300" : "text-rose-300";
  const torcidaPercent = Math.min(100, Math.round((moral / 100) * 100));
  const caixa = career?.clubeCaixa ?? 0;

  // Season progress (rodadas jogadas / total estimado)
  const rodadaAtual = career?.rodadaAtual ?? 0;
  const totalRodadas = 20; // ~20 rodadas por divisão
  const seasonProgress = Math.min(100, Math.round((rodadaAtual / totalRodadas) * 100));

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 pb-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-5">
        {/* ═══════ HEADER: Coach + Widgets ═══════ */}
        {coach && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950/80 to-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              {/* Coach identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                  <span className="text-lg">{nivel?.atual.icon ?? "⭐"}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-500/60">
                    Treinador
                  </p>
                  <h2 className="font-display text-lg font-black text-white truncate">
                    {coach.apelido || coach.nome}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{nivel?.atual.nome ?? "Desconhecido"}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-emerald-400/70">T{temporada}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-cyan-400/70">{DIVISAO_SHORT[divisao]}</span>
                  </div>
                </div>
              </div>

              {/* Widget tiles */}
              <div className="hidden sm:flex items-center gap-3">
                <WidgetTile
                  icon={<Crown className="size-3.5" />}
                  label="SOV"
                  value={String(coach.sov)}
                  accent="amber"
                />
                <WidgetTile
                  icon={<Heart className="size-3.5" />}
                  label="Moral"
                  value={`${moral}%`}
                  accent={moral >= 70 ? "emerald" : moral >= 40 ? "amber" : "rose"}
                />
                <WidgetTile
                  icon={<TrendingUp className="size-3.5" />}
                  label="Caixa"
                  value={String(caixa)}
                  accent={caixa >= 0 ? "emerald" : "rose"}
                />
              </div>
            </div>

            {/* Season progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-widest text-slate-600 shrink-0">
                Temporada
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                  style={{ width: `${seasonProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 shrink-0">
                {rodadaAtual}/{totalRodadas}
              </span>
            </div>
          </div>
        )}

        {/* ═══════ NEXT MATCH: Central high-impact card ═══════ */}
        <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-slate-950/60 to-cyan-950/30 p-5">
          {/* Subtle pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)`,
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-bold">
                  {tour.phase === "fim" ? "Campanha Encerrada" : (proximoJogo?.tipo ?? "Aguardando")}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-600">
                {DIVISAO_SHORT[divisao]}
              </span>
            </div>

            {tour.phase === "fim" ? (
              <div className="text-center py-4">
                <p className="font-display text-3xl font-black text-amber-300">
                  🏆 Campeão!
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  <TeamBadge team={resolveTeam(tour.champion!, userTeam)} />
                </p>
              </div>
            ) : userFixture ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Teams */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <TeamBadge team={resolveTeam(userFixture.homeId, userTeam)} size="md" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-display text-2xl font-black text-white/30">×</span>
                    {userPos > 0 && (
                      <span className="text-[10px] font-bold text-cyan-400/70 mt-1">
                        {userPos}º
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <TeamBadge team={resolveTeam(userFixture.awayId, userTeam)} size="md" />
                  </div>
                </div>

                {/* Play button */}
                <button
                  data-testid="entrar-em-campo"
                  onClick={() => setMostrarModalModo(true)}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.97]"
                >
                  <Zap className="size-4" />
                  Entrar em Campo
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-3">
                Aguardando fechamento da temporada...
              </p>
            )}

            {userFixture && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
                <span>{userFixture.stage}</span>
                <span className="text-slate-700">·</span>
                <span>Custo: {custoManutencao} SOV</span>
              </div>
            )}
          </div>
        </section>

        {/* ═══════ MODULE GRID: 3 large clickable cards ═══════ */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Calendário & Jogos */}
          <ModuleCard
            icon={<Calendar className="size-5" />}
            title="Calendário"
            subtitle={`${rodadaAtual} jogos disputados`}
            accent="sky"
            onClick={onOpenCalendario}
          />

          {/* Tabela de Classificação */}
          <ModuleCard
            icon={<Trophy className="size-5" />}
            title="Classificação"
            subtitle={userPos > 0 ? `${userPos}º lugar` : "Ver tabela completa"}
            accent="amber"
            onClick={onOpenClassificacao}
            badge={userPos > 0 ? `${userPos}º` : undefined}
          />

          {/* Bolsa + Mercado */}
          <ModuleCard
            icon={<Coins className="size-5" />}
            title="Economia"
            subtitle="Bolsa de Valores e Mercado"
            accent="emerald"
            onClick={onOpenEconomia}
          />
        </div>

        {/* ═══════ BOTTOM ROW: Transferências + News ═══════ */}
        <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
          {/* Transferências */}
          <button
            onClick={onOpenTransferencias}
            className="group relative overflow-hidden rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-fuchsia-950/30 to-slate-950/60 p-4 text-left transition-all duration-300 hover:border-fuchsia-500/30 hover:shadow-[0_0_20px_rgba(217,70,239,0.06)] active:scale-[0.99]"
            data-testid="abrir-transferencias"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/15 transition group-hover:bg-fuchsia-500/20">
                <ArrowLeftRight className="size-5 text-fuchsia-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-white">Transferências</h3>
                <p className="text-[10px] text-slate-500">
                  {ofertasPendentes > 0 ? `${ofertasPendentes} ofertas pendentes` : "Negociações e ofertas"}
                </p>
              </div>
              {ofertasPendentes > 0 && (
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-slate-950">
                  {ofertasPendentes}
                </span>
              )}
              <ArrowRight className="size-4 text-slate-600 transition group-hover:text-fuchsia-400 group-hover:translate-x-1" />
            </div>
          </button>

          {/* News Portal */}
          {career && (
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="size-3.5 text-slate-500" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Notícias
                </span>
              </div>
              <NewsPortal
                headlines={career.headlines}
                userTeam={userTeam}
                coachNome={career.coach.apelido || career.coach.nome}
              />
            </div>
          )}
        </div>

        {/* Exit button */}
        <button
          onClick={onExit}
          className="w-full rounded-xl border border-white/5 bg-slate-950/40 py-2.5 text-xs font-bold text-slate-600 transition hover:border-white/10 hover:text-slate-400"
        >
          Voltar ao Estádio
        </button>
      </div>

      {/* Modo Jogo Modal */}
      {mostrarModalModo && (
        <ModoJogoModal
          onTecnico={() => {
            setMostrarModalModo(false);
            onPlay();
          }}
          onJogador={() => {
            setMostrarModalModo(false);
            if (proximoJogo?.fixture && onPlay3D) {
              onPlay3D(proximoJogo.fixture);
            }
          }}
          onClose={() => setMostrarModalModo(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function WidgetTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "amber" | "cyan" | "rose";
}) {
  const accents = {
    emerald: "border-emerald-500/15 text-emerald-400",
    amber: "border-amber-500/15 text-amber-400",
    cyan: "border-cyan-500/15 text-cyan-400",
    rose: "border-rose-500/15 text-rose-400",
  };

  return (
    <div className={`flex flex-col items-center rounded-xl border bg-slate-900/40 px-3 py-2 ${accents[accent]}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[8px] uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <span className="font-display text-base font-black">{value}</span>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  subtitle,
  accent,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: "sky" | "amber" | "emerald";
  onClick: () => void;
  badge?: string | undefined;
}) {
  const accents = {
    sky: {
      border: "border-sky-500/15 hover:border-sky-500/30",
      glow: "hover:shadow-[0_0_25px_rgba(14,165,233,0.06)]",
      bg: "from-sky-950/30 to-slate-950/60",
      icon: "bg-sky-500/10 text-sky-400",
      badge: "bg-sky-500/15 text-sky-300",
    },
    amber: {
      border: "border-amber-500/15 hover:border-amber-500/30",
      glow: "hover:shadow-[0_0_25px_rgba(245,158,11,0.06)]",
      bg: "from-amber-950/30 to-slate-950/60",
      icon: "bg-amber-500/10 text-amber-400",
      badge: "bg-amber-500/15 text-amber-300",
    },
    emerald: {
      border: "border-emerald-500/15 hover:border-emerald-500/30",
      glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.06)]",
      bg: "from-emerald-950/30 to-slate-950/60",
      icon: "bg-emerald-500/10 text-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-300",
    },
  };
  const a = accents[accent];

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left transition-all duration-300 active:scale-[0.98] ${a.border} ${a.glow} ${a.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex size-11 items-center justify-center rounded-xl transition group-hover:scale-110 ${a.icon}`}>
          {icon}
        </div>
        {badge && (
          <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${a.badge}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-base font-bold text-white">{title}</h3>
      <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition group-hover:text-white/40">
        <span>Abrir</span>
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}
