import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  Flame,
  Goal,
  ListOrdered,
  Shield,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import { sortTable } from "../tournament";
import type { Tournament } from "../types";
import {
  DIVISAO_LABEL,
  DIVISAO_SHORT,
  resolveTeam,
  type CopaBrasilState,
} from "./competitionApi";
import type { LigasTemporada } from "./seasonEngine";
import type { Divisao } from "./types";

type Categoria = "classificacao" | "artilharia" | "defesa" | "goleada" | "copa";

const CATEGORIAS: { id: Categoria; rotulo: string; icon: React.ReactNode; color: string }[] = [
  { id: "classificacao", rotulo: "Classificação", icon: <ListOrdered className="size-4" />, color: "amber" },
  { id: "artilharia", rotulo: "Artilheiros", icon: <Goal className="size-4" />, color: "emerald" },
  { id: "defesa", rotulo: "Menos gols sofridos", icon: <Shield className="size-4" />, color: "sky" },
  { id: "goleada", rotulo: "Maiores goleadas", icon: <Flame className="size-4" />, color: "orange" },
  { id: "copa", rotulo: "Copa do Brasil", icon: <Crown className="size-4" />, color: "amber" },
];

interface ClassificacaoScreenProps {
  tour: Tournament;
  userTeam: Team;
  currentDivisao: Divisao;
  ligas?: LigasTemporada | undefined;
  copaBrasil?: CopaBrasilState | null | undefined;
  onBack: () => void;
}

export function ClassificacaoScreen({
  tour,
  userTeam,
  currentDivisao,
  ligas,
  copaBrasil,
  onBack,
}: ClassificacaoScreenProps) {
  const [categoria, setCategoria] = useState<Categoria>("classificacao");
  const [divisao, setDivisao] = useState<Divisao>(currentDivisao);

  const liga = ligas?.[divisao] ?? (divisao === currentDivisao ? tour : null);
  const tabela =
    liga && liga.phase === "grupos" && liga.groups.length > 0
      ? sortTable(liga.groups[0]!.table).filter(
          (r, i, arr) => arr.findIndex((x) => x.teamId === r.teamId) === i,
        )
      : [];

  const goleadas = (liga?.groupFixtures ?? [])
    .filter((f) => f.played && f.result && f.homeId !== f.awayId)
    .map((f) => ({
      homeId: f.homeId,
      awayId: f.awayId,
      homeGoals: f.result!.homeGoals,
      awayGoals: f.result!.awayGoals,
      diff: Math.abs(f.result!.homeGoals - f.result!.awayGoals),
      stage: f.stage,
    }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 5);

  const semTabela = tabela.length === 0;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/4 h-[300px] w-[300px] rounded-full bg-amber-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 h-[250px] w-[250px] rounded-full bg-emerald-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 sm:mb-5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-400" />
            <h2 className="font-display text-xl font-black text-white">Classificação</h2>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          {/* Menu de categorias */}
          <nav className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {CATEGORIAS.map((c) => {
              const isActive = categoria === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoria(c.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-[11px] sm:text-xs font-bold transition-all duration-200 md:w-full md:whitespace-normal ${
                    isActive
                      ? `bg-${c.color}-500/15 text-${c.color}-400 border border-${c.color}-500/20`
                      : "text-slate-500 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                  style={isActive ? { backgroundColor: `color-mix(in srgb, var(--color-${c.color}-500) 12%, transparent)`, color: `var(--color-${c.color}-400)`, borderColor: `color-mix(in srgb, var(--color-${c.color}-500) 20%, transparent)` } : undefined}
                >
                  {c.icon}
                  <span className="flex-1">{c.rotulo}</span>
                  {isActive && <ChevronRight className="size-3.5 opacity-50" />}
                </button>
              );
            })}
          </nav>

          {/* Conteúdo */}
          <section className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 min-h-[300px]">
            {/* Division tabs */}
            {categoria !== "copa" && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {(["serie-a", "serie-b", "serie-c"] as Divisao[]).map((div) => (
                  <button
                    key={div}
                    onClick={() => setDivisao(div)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                      divisao === div
                        ? div === currentDivisao
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/10 text-white border border-white/15"
                        : "text-slate-500 border border-transparent hover:bg-white/5"
                    }`}
                  >
                    {DIVISAO_SHORT[div]}
                    {div === currentDivisao && <span className="ml-1 text-emerald-400/70">·</span>}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-slate-600">{DIVISAO_LABEL[divisao]}</span>
              </div>
            )}

            {/* Classificação */}
            {categoria === "classificacao" &&
              (semTabela ? (
                <p className="py-8 text-center text-xs text-slate-500">Classificação indisponível.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="w-8 pb-2 font-normal text-slate-600">#</th>
                          <th className="pb-2 font-normal text-slate-600">TIME</th>
                          <th className="w-8 pb-2 text-center font-normal text-slate-600">P</th>
                          <th className="w-8 pb-2 text-center font-normal text-slate-600">J</th>
                          <th className="w-6 pb-2 text-center font-normal text-slate-600">V</th>
                          <th className="w-6 pb-2 text-center font-normal text-slate-600">E</th>
                          <th className="w-6 pb-2 text-center font-normal text-slate-600">D</th>
                          <th className="w-8 pb-2 text-center font-normal text-slate-600">GP</th>
                          <th className="w-8 pb-2 text-center font-normal text-slate-600">GC</th>
                          <th className="w-8 pb-2 text-center font-normal text-slate-600">SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabela.map((r, i) => {
                          const position = i + 1;
                          const isUser = r.teamId === userTeam.id;
                          const zone =
                            position <= 4
                              ? "libertadores"
                              : position <= 6
                                ? "copa-brasil"
                                : position >= tabela.length - 2
                                  ? "rebaixamento"
                                  : "";
                          const zoneBorder =
                            zone === "libertadores"
                              ? "border-l-2 border-l-sky-500"
                              : zone === "copa-brasil"
                                ? "border-l-2 border-l-emerald-500"
                                : zone === "rebaixamento"
                                  ? "border-l-2 border-l-rose-500"
                                  : "";
                          const trend = r.gp - r.gc;

                          return (
                            <tr
                              key={r.teamId}
                              className={`border-b border-white/5 last:border-0 transition ${
                                isUser ? "bg-amber-500/5" : ""
                              } ${zoneBorder}`}
                            >
                              <td className="py-2 text-center font-black text-slate-400">{position}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
                                  {isUser && <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold">Você</span>}
                                </div>
                              </td>
                              <td className="py-2 text-center font-black text-white">{r.p}</td>
                              <td className="py-2 text-center text-slate-400">{r.j}</td>
                              <td className="py-2 text-center text-emerald-400 font-bold">{r.v}</td>
                              <td className="py-2 text-center text-slate-500">{r.e}</td>
                              <td className="py-2 text-center text-rose-400 font-bold">{r.d}</td>
                              <td className="py-2 text-center text-slate-400">{r.gp}</td>
                              <td className="py-2 text-center text-slate-400">{r.gc}</td>
                              <td className="py-2 text-center">
                                <span className={`inline-flex items-center gap-0.5 font-bold ${trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-slate-500"}`}>
                                  {trend > 0 ? <TrendingUp className="size-3" /> : trend < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                                  {trend > 0 ? "+" : ""}{trend}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ZoneLegend />
                  <div className="mt-3">
                    <ControlledMonetagButton
                      className="w-full text-xs"
                      message="Uma página de patrocinador pode abrir. Deseja continuar?"
                    >
                      Cansou de jogar? Descubra algo novo.
                    </ControlledMonetagButton>
                  </div>
                </>
              ))}

            {/* Artilharia */}
            {categoria === "artilharia" &&
              (semTabela ? (
                <p className="py-8 text-center text-xs text-slate-500">Sem dados de artilharia.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...tabela]
                    .sort((a, b) => b.gp - a.gp)
                    .map((r, i) => {
                      const isUser = r.teamId === userTeam.id;
                      return (
                        <div
                          key={r.teamId}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                            isUser ? "border-amber-500/30 bg-amber-500/5" : "border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <span className="w-6 text-center font-black text-slate-500">{i + 1}º</span>
                          <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="font-display text-lg font-black text-amber-300">{r.gp}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">gols</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}

            {/* Defesa */}
            {categoria === "defesa" &&
              (semTabela ? (
                <p className="py-8 text-center text-xs text-slate-500">Sem dados defensivos.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...tabela]
                    .sort((a, b) => a.gc - b.gc)
                    .map((r, i) => {
                      const isUser = r.teamId === userTeam.id;
                      return (
                        <div
                          key={r.teamId}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                            isUser ? "border-sky-500/30 bg-sky-500/5" : "border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <span className="w-6 text-center font-black text-slate-500">{i + 1}º</span>
                          <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="font-display text-lg font-black text-sky-300">{r.gc}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">sofridos</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}

            {/* Goleadas */}
            {categoria === "goleada" &&
              (goleadas.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Nenhuma partida disputada.</p>
              ) : (
                <div className="space-y-1.5">
                  {goleadas.map((g, i) => {
                    const vencedorId = g.homeGoals > g.awayGoals ? g.homeId : g.awayId;
                    const perdedorId = g.homeGoals > g.awayGoals ? g.awayId : g.homeId;
                    return (
                      <div
                        key={`${g.homeId}-${g.awayId}-${i}`}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                      >
                        <span className="w-6 text-center font-black text-slate-500">{i + 1}º</span>
                        <TeamBadge team={resolveTeam(vencedorId, userTeam)} size="sm" />
                        <span className="font-display text-sm font-black text-orange-300">
                          {Math.max(g.homeGoals, g.awayGoals)}×{Math.min(g.homeGoals, g.awayGoals)}
                        </span>
                        <TeamBadge team={resolveTeam(perdedorId, userTeam)} size="sm" />
                        <span className="ml-auto text-[9px] uppercase tracking-wider text-slate-600">{g.stage}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* Copa do Brasil */}
            {categoria === "copa" && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="size-4 text-amber-300" />
                  <h3 className="font-display text-sm font-bold text-white">Copa do Brasil</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  {copaBrasil?.finished
                    ? copaBrasil.champion === userTeam.id
                      ? "🏆 Campeão! A taça foi conquistada pelo seu clube."
                      : "Chaveamento encerrado nesta temporada."
                    : "16 clubes classificados. Cada fase é jogável e intercala com a liga."}
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {(copaBrasil?.rounds ?? []).map((round, index) => (
                    <div
                      key={round.stage}
                      className={`rounded-xl border p-3 text-center ${
                        round.fixtures.every((f) => f.played)
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <span className={`block text-lg font-black ${round.fixtures.every((f) => f.played) ? "text-emerald-400" : "text-slate-500"}`}>
                        {index + 1}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">
                        {round.stage.replace("Copa do Brasil · ", "")}
                      </span>
                    </div>
                  ))}
                  {(copaBrasil?.rounds ?? []).length === 0 &&
                    ["Oitavas", "Quartas", "Semi", "Final"].map((f, i) => (
                      <div key={f} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                        <span className="block text-lg font-black text-slate-600">{i + 1}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-600">{f}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function ZoneLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-[10px]">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-sky-500" />
        <span className="text-sky-400">Libertadores (1º-4º)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500" />
        <span className="text-emerald-400">Copa do Brasil (5º-6º)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose-500" />
        <span className="text-rose-400">Rebaixamento (últimos 3)</span>
      </div>
    </div>
  );
}
