import { useMemo, useState } from "react";
import {
  Calendar,
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
  Shield,
  ChevronRight,
  Users,
  Star,
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
  const sortedTable = sortTable(nextLiga.phase === "grupos" && nextLiga.groups.length > 0 ? nextLiga.groups[0]!.table : []);
  const userPos = sortedTable.findIndex((row) => row.teamId === userTeam.id) + 1;

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

  const coach = career?.coach;
  const nivel = coach ? nivelDoTreinador(coach.sov) : null;
  const moral = career?.moralTime ?? 50;
  const moralColor = moral >= 70 ? "text-emerald-300" : moral >= 40 ? "text-amber-300" : "text-rose-300";
  const caixa = career?.clubeCaixa ?? 0;
  const rodadaAtual = career?.rodadaAtual ?? 0;
  const totalRodadas = 20;
  const seasonProgress = Math.min(100, Math.round((rodadaAtual / totalRodadas) * 100));

  // Top 5 standings
  const top5 = sortedTable.slice(0, 5);

  return (
    <div className="relative w-full max-w-6xl mx-auto px-3 pb-6 min-h-screen">
      {/* ═══ STADIUM ATMOSPHERE ═══ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Pitch green glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-emerald-600/[0.03] blur-[120px]" />
        {/* Floodlight top-left */}
        <div className="absolute -top-32 -left-20 w-[300px] h-[300px] rounded-full bg-amber-400/[0.02] blur-[100px]" />
        {/* Floodlight top-right */}
        <div className="absolute -top-32 -right-20 w-[300px] h-[300px] rounded-full bg-amber-400/[0.02] blur-[100px]" />
        {/* Pitch lines */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Center circle hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[300px] h-[150px] rounded-full border border-white/[0.02]" />
      </div>

      <div className="relative z-10 space-y-3">
        {/* ═══════ TOP ROW: Profile + News ═══════ */}
        <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
          {/* Coach Profile Card */}
          {coach && (
            <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-slate-900/80 to-slate-950/60 backdrop-blur-sm overflow-hidden">
              {/* Team color strip */}
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${userTeam.primary}, ${userTeam.secondary})` }} />

              <div className="p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-white/10"
                      style={{ background: userTeam.primary }}>
                      <span className="flex size-9 items-center justify-center rounded-lg"
                        style={{ background: userTeam.secondary }}>
                        <span className="text-lg">{nivel?.atual.icon ?? "⭐"}</span>
                      </span>
                    </div>
                    {/* Season badge */}
                    <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-slate-950 border border-slate-900">
                      T{temporada}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] uppercase tracking-[0.3em] text-emerald-500/50 font-bold">Treinador</p>
                    <h2 className="font-display text-sm font-black text-white truncate">
                      {coach.apelido || coach.nome}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                      <span className="font-bold text-white/60">{userTeam.name}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-cyan-400/70">{DIVISAO_SHORT[divisao]}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-amber-400/70">{nivel?.atual.nome ?? "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  <StatPill icon={<Heart className="size-3" />} label="Moral" value={`${moral}%`} color={moralColor} />
                  <StatPill icon={<Crown className="size-3" />} label="SOV" value={String(coach.sov)} color="text-amber-300" />
                  <StatPill icon={<Coins className="size-3" />} label="Caixa" value={String(caixa)} color={caixa >= 0 ? "text-emerald-300" : "text-rose-300"} />
                  <StatPill icon={<TrendingUp className="size-3" />} label="Pos." value={userPos > 0 ? `${userPos}º` : "—"} color="text-cyan-300" />
                </div>

                {/* Season progress */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[8px] uppercase tracking-widest text-slate-600 shrink-0">Rodada</span>
                  <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${seasonProgress}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 shrink-0">{rodadaAtual}/{totalRodadas}</span>
                </div>
              </div>
            </div>
          )}

          {/* News Portal */}
          {career && (
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="size-3 text-slate-500" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Portal de Notícias</span>
              </div>
              <NewsPortal
                headlines={career.headlines}
                userTeam={userTeam}
                coachNome={career.coach.apelido || career.coach.nome}
              />
            </div>
          )}
        </div>

        {/* ═══════ CENTER ROW: Modules + Play ═══════ */}
        <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr] items-start">
          {/* Left: 2x2 Module Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <MiniModule
              icon={<Calendar className="size-4" />}
              title="Calendário"
              sub={`${rodadaAtual} jogos`}
              accent="sky"
              onClick={onOpenCalendario}
            />
            <MiniModule
              icon={<Trophy className="size-4" />}
              title="Classificação"
              sub={userPos > 0 ? `${userPos}º lugar` : "Ver tabela"}
              accent="amber"
              badge={userPos > 0 ? `${userPos}º` : undefined}
              onClick={onOpenClassificacao}
            />
            <MiniModule
              icon={<Coins className="size-4" />}
              title="Economia"
              sub="Bolsa & Mercado"
              accent="emerald"
              onClick={onOpenEconomia}
            />
            <MiniModule
              icon={<ArrowLeftRight className="size-4" />}
              title="Transferências"
              sub={ofertasPendentes > 0 ? `${ofertasPendentes} ofertas` : "Negociações"}
              accent="fuchsia"
              badge={ofertasPendentes > 0 ? String(ofertasPendentes) : undefined}
              onClick={onOpenTransferencias}
            />
          </div>

          {/* Right: Play CTA + Top 5 */}
          <div className="space-y-3">
            {/* ENTRAR EM CAMPO — Dominant CTA */}
            <button
              data-testid="entrar-em-campo"
              onClick={() => setMostrarModalModo(true)}
              className="group relative w-full overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-500 p-4 text-left transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] active:scale-[0.98]"
            >
              {/* Diagonal lines pattern */}
              <div className="pointer-events-none absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 9px)`,
                }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-100/60 font-bold mb-1">
                    {tour.phase === "fim" ? "Campanha Encerrada" : (proximoJogo?.tipo ?? "Aguardando")}
                  </p>
                  {tour.phase === "fim" ? (
                    <p className="font-display text-xl font-black text-white">🏆 Campeão!</p>
                  ) : userFixture ? (
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <TeamBadge team={resolveTeam(userFixture.homeId, userTeam)} size="sm" />
                      </div>
                      <span className="font-display text-lg font-black text-white/40">×</span>
                      <div className="text-center">
                        <TeamBadge team={resolveTeam(userFixture.awayId, userTeam)} size="sm" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-100/50">Aguardando fechamento...</p>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2.5 transition group-hover:bg-white/20">
                  <Zap className="size-5 text-white" />
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-wider">JOGAR</p>
                    <p className="text-[8px] text-emerald-100/50 uppercase tracking-widest">
                      {userPos > 0 ? `${userPos}º na tabela` : ""}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-white transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {userFixture && (
                <div className="relative z-10 mt-2 flex items-center gap-3 text-[9px] text-emerald-100/40">
                  <span>{userFixture.stage}</span>
                  <span>·</span>
                  <span>{custoManutencao} SOV manutenção</span>
                </div>
              )}
            </button>

            {/* Quick Standings — Top 5 */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-3 text-amber-400/60" />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Classificação</span>
                </div>
                <button onClick={onOpenClassificacao} className="text-[9px] text-slate-600 hover:text-white/40 transition">
                  Ver tabela <ChevronRight className="inline size-2.5" />
                </button>
              </div>

              <div className="space-y-0.5">
                {top5.length > 0 ? top5.map((row, i) => (
                  <div key={row.teamId} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] transition ${
                    row.teamId === userTeam.id ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-white/[0.02]"
                  }`}>
                    <span className={`w-4 text-center font-black ${
                      i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-slate-600"
                    }`}>
                      {i + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <TeamBadge team={getTeam(row.teamId)} size="sm" />
                    </div>
                    <span className="font-black text-white/70 tabular-nums">{row.p}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-600 text-center py-2">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Exit */}
        <button
          onClick={onExit}
          className="w-full rounded-lg border border-white/[0.04] bg-white/[0.01] py-2 text-[10px] font-bold text-slate-600 transition hover:border-white/10 hover:text-slate-400"
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

// ─── Compact Sub-components ───────────────────────────────────────

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-white/[0.04] bg-white/[0.02] px-1.5 py-1.5">
      <div className={`flex items-center gap-0.5 ${color}`}>
        {icon}
        <span className="text-[7px] uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <span className={`font-display text-xs font-black ${color}`}>{value}</span>
    </div>
  );
}

function MiniModule({ icon, title, sub, accent, onClick, badge }: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent: "sky" | "amber" | "emerald" | "fuchsia";
  onClick: () => void;
  badge?: string | undefined;
}) {
  const styles = {
    sky: "border-sky-500/15 hover:border-sky-500/30 bg-sky-950/30 text-sky-400",
    amber: "border-amber-500/15 hover:border-amber-500/30 bg-amber-950/30 text-amber-400",
    emerald: "border-emerald-500/15 hover:border-emerald-500/30 bg-emerald-950/30 text-emerald-400",
    fuchsia: "border-fuchsia-500/15 hover:border-fuchsia-500/30 bg-fuchsia-950/30 text-fuchsia-400",
  };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.97] ${styles[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex size-8 items-center justify-center rounded-lg bg-white/5 transition group-hover:scale-110 ${styles[accent].split(" ").pop()}`}>
          {icon}
        </div>
        {badge && (
          <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black ${styles[accent].split(" ").pop()} bg-white/5`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-xs font-black text-white">{title}</h3>
      <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>
      <div className="mt-2 flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-600 transition group-hover:text-white/30">
        <span>Abrir</span>
        <ChevronRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
