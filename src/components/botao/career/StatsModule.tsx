import { Crown, Shield, Flame, Goal } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";
import type { Divisao } from "./types";

export interface StatsData {
  artilheiro?: { team: Team; gols: number };
  goleiro?: { team: Team; gols: number };
  maiorGoleada?: { vencedor: Team; perdedor: Team; placar: string; diff: number } | null;
}

interface StatsModuleProps {
  title: string;
  stats: StatsData;
  divisao?: Divisao;
}

const DIVISAO_SHORT: Record<Divisao, string> = {
  "serie-a": "SÉRIE A",
  "serie-b": "SÉRIE B",
  "serie-c": "SÉRIE C",
};

const DIVISAO_ACCENT = {
  "serie-a": { text: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300" },
  "serie-b": { text: "text-sky-300", chip: "bg-sky-500/15 text-sky-300" },
  "serie-c": { text: "text-fuchsia-300", chip: "bg-fuchsia-500/15 text-fuchsia-300" },
} as const;

/** Painel central de estatísticas — módulos individuais no estilo dashboard esportivo. */
export function StatsModule({ title, stats, divisao = "serie-c" }: StatsModuleProps) {
  const accent = DIVISAO_ACCENT[divisao];

  return (
    <section className="stats-panel">
      <header className="stats-panel-head">
        <div className="flex items-center gap-2">
          <Flame className={`size-4 ${accent.text}`} />
          <h3 className="font-display text-sm font-bold tracking-wide">{title}</h3>
        </div>
        <span className={`stat-pill ${accent.chip}`}>{DIVISAO_SHORT[divisao]}</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Módulo 1 — Artilharia */}
        <article className="stat-card stat-card-gold">
          <div className="stat-card-head">
            <span className="stat-card-icon bg-amber-400/15 text-amber-300">
              <Goal className="size-4" />
            </span>
            <span className="stat-card-label">Artilharia</span>
          </div>
          {stats.artilheiro ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <TeamBadge team={stats.artilheiro.team} size="sm" />
                <span className="truncate font-display text-sm">{stats.artilheiro.team.short}</span>
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-3xl leading-none text-amber-300">{stats.artilheiro.gols}</span>
                <span className="mb-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">gols</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sem dados ainda.</p>
          )}
        </article>

        {/* Módulo 2 — Defesa menos vazada */}
        <article className="stat-card stat-card-green">
          <div className="stat-card-head">
            <span className="stat-card-icon bg-emerald-400/15 text-emerald-300">
              <Shield className="size-4" />
            </span>
            <span className="stat-card-label">Defesa menos vazada</span>
          </div>
          {stats.goleiro ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <TeamBadge team={stats.goleiro.team} size="sm" />
                <span className="truncate font-display text-sm">{stats.goleiro.team.short}</span>
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-3xl leading-none text-emerald-300">{stats.goleiro.gols}</span>
                <span className="mb-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">sofridos</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sem dados ainda.</p>
          )}
        </article>

        {/* Módulo 3 — Maior goleada */}
        <article className="stat-card stat-card-flame">
          <div className="stat-card-head">
            <span className="stat-card-icon bg-orange-400/15 text-orange-300">
              <Flame className="size-4" />
            </span>
            <span className="stat-card-label">Maior goleada</span>
          </div>
          {stats.maiorGoleada ? (
            <>
              <div className="mt-2 flex items-center justify-center gap-2">
                <TeamBadge team={stats.maiorGoleada.vencedor} size="sm" />
                <span className="font-display text-lg text-orange-300">{stats.maiorGoleada.placar}</span>
                <TeamBadge team={stats.maiorGoleada.perdedor} size="sm" />
              </div>
              <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-orange-300/80">
                {stats.maiorGoleada.diff} gols de diferença
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sem dados ainda.</p>
          )}
        </article>
      </div>

      <footer className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Crown className="size-3 text-amber-300/70" />
        <span>Lideranças da divisão · atualizado a cada rodada</span>
      </footer>
    </section>
  );
}

