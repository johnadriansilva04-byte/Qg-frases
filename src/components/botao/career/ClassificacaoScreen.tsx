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

/**
 * TELA DEDICADA DE CLASSIFICAÇÃO — área própria (não expande o hub).
 * Menu à esquerda com as categorias reais do sistema; painel à direita mostra
 * o conteúdo da categoria selecionada. Todos os dados derivam das tabelas e
 * partidas reais da temporada (nada inventado).
 */

type Categoria = "classificacao" | "artilharia" | "defesa" | "goleada" | "copa";

const CATEGORIAS: { id: Categoria; rotulo: string; icon: React.ReactNode }[] = [
  { id: "classificacao", rotulo: "Classificação", icon: <ListOrdered className="size-4" /> },
  { id: "artilharia", rotulo: "Artilheiros", icon: <Goal className="size-4" /> },
  { id: "defesa", rotulo: "Menos gols sofridos", icon: <Shield className="size-4" /> },
  { id: "goleada", rotulo: "Maiores goleadas", icon: <Flame className="size-4" /> },
  { id: "copa", rotulo: "Copa do Brasil", icon: <Crown className="size-4" /> },
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

  // Maiores goleadas reais da divisão (top 5 por diferença de gols).
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
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar à Carreira
      </button>

      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-5 text-amber-400" />
        <h2 className="font-display text-2xl font-bold tracking-wide">
          Classificação Completa
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        {/* Menu de categorias (esquerda) */}
        <nav className="panel h-fit space-y-1 p-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                categoria === c.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {c.icon}
              <span className="flex-1">{c.rotulo}</span>
              {categoria === c.id && <ChevronRight className="size-3.5" />}
            </button>
          ))}
        </nav>

        {/* Conteúdo da categoria (direita) */}
        <section className="panel min-h-[300px]">
          {categoria !== "copa" && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {(["serie-a", "serie-b", "serie-c"] as Divisao[]).map((div) => (
                <button
                  key={div}
                  onClick={() => setDivisao(div)}
                  className={`div-tab ${divisao === div ? "div-tab-active" : ""}`}
                  data-user-div={div === currentDivisao ? "1" : undefined}
                >
                  {DIVISAO_SHORT[div]}
                  {div === currentDivisao && <span className="div-tab-badge">você</span>}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {DIVISAO_LABEL[divisao]}
              </span>
            </div>
          )}

          {categoria === "classificacao" &&
            (semTabela ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Classificação indisponível nesta fase.
              </p>
            ) : (
              <>
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
                    {tabela.map((r, i) => {
                      const position = i + 1;
                      const zone =
                        position <= 4
                          ? "libertadores"
                          : position <= 6
                            ? "copa-brasil"
                            : position >= tabela.length - 2
                              ? "rebaixamento"
                              : "";
                      return (
                        <tr
                          key={r.teamId}
                          className={`zone-row zone-${zone} ${r.teamId === userTeam.id ? "is-user" : ""}`}
                        >
                          <td className="py-1 text-center font-bold">{position}º</td>
                          <td className="py-1">
                            <span className={i < 2 ? "font-medium" : "text-muted-foreground"}>
                              <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
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
                <div className="mt-3">
                  <ControlledMonetagButton
                    className="w-full text-xs"
                    message="Uma página de patrocinador pode abrir. Deseja continuar?"
                  >
                    Ver patrocinador
                  </ControlledMonetagButton>
                </div>
              </>
            ))}

          {categoria === "artilharia" &&
            (semTabela ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sem dados de artilharia nesta fase.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {[...tabela]
                  .sort((a, b) => b.gp - a.gp)
                  .map((r, i) => (
                    <li
                      key={r.teamId}
                      className={`flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs ${
                        r.teamId === userTeam.id ? "border-amber-400/40" : ""
                      }`}
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {i + 1}º
                      </span>
                      <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
                      <span className="ml-auto font-display text-base font-bold text-amber-300">
                        {r.gp}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">gols</span>
                    </li>
                  ))}
              </ol>
            ))}

          {categoria === "defesa" &&
            (semTabela ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sem dados defensivos nesta fase.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {[...tabela]
                  .sort((a, b) => a.gc - b.gc)
                  .map((r, i) => (
                    <li
                      key={r.teamId}
                      className={`flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs ${
                        r.teamId === userTeam.id ? "border-emerald-400/40" : ""
                      }`}
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {i + 1}º
                      </span>
                      <TeamBadge team={resolveTeam(r.teamId, userTeam)} size="sm" />
                      <span className="ml-auto font-display text-base font-bold text-emerald-300">
                        {r.gc}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        gols sofridos
                      </span>
                    </li>
                  ))}
              </ol>
            ))}

          {categoria === "goleada" &&
            (goleadas.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma partida disputada ainda nesta divisão.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {goleadas.map((g, i) => {
                  const vencedorId = g.homeGoals > g.awayGoals ? g.homeId : g.awayId;
                  const perdedorId = g.homeGoals > g.awayGoals ? g.awayId : g.homeId;
                  return (
                    <li
                      key={`${g.homeId}-${g.awayId}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {i + 1}º
                      </span>
                      <TeamBadge team={resolveTeam(vencedorId, userTeam)} size="sm" />
                      <span className="font-display text-sm font-bold text-orange-300">
                        {Math.max(g.homeGoals, g.awayGoals)}×{Math.min(g.homeGoals, g.awayGoals)}
                      </span>
                      <TeamBadge team={resolveTeam(perdedorId, userTeam)} size="sm" />
                      <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                        {g.stage}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ))}

          {categoria === "copa" && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Crown className="size-4 text-amber-300" />
                <h3 className="font-display text-sm font-bold tracking-wide">Copa do Brasil</h3>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copaBrasil?.finished
                  ? copaBrasil.champion === userTeam.id
                    ? "Campanha enterrada em título. A taça foi conquistada pelo seu clube."
                    : "Chaveamento encerrado nesta temporada. Os confrontos ficaram registrados no calendário."
                  : "16 clubes classificados entre as três divisões. Cada fase é jogável e intercala com a liga."}
              </p>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {(copaBrasil?.rounds ?? []).map((round, index) => (
                  <div key={round.stage} className="copa-phase-chip">
                    <span
                      className={`copa-phase-num ${round.fixtures.every((f) => f.played) ? "done" : ""}`}
                    >
                      {index + 1}
                    </span>
                    <span className="copa-phase-name">
                      {round.stage.replace("Copa do Brasil · ", "")}
                    </span>
                  </div>
                ))}
                {(copaBrasil?.rounds ?? []).length === 0 &&
                  ["Oitavas", "Quartas", "Semi", "Final"].map((f, i) => (
                    <div key={f} className="copa-phase-chip">
                      <span className="copa-phase-num">{i + 1}</span>
                      <span className="copa-phase-name">{f}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
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
        <span className="text-rose-300">Rebaixamento (últimos 3)</span>
      </div>
    </div>
  );
}
