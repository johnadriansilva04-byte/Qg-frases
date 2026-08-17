import { Crown, TrendingUp, Heart } from "lucide-react";
import { nivelDoTreinador, type Coach } from "./types";

export function SovereigntyPanel({ coach, moral }: { coach: Coach; moral: number }) {
  const { atual, proximo } = nivelDoTreinador(coach.soberania);
  const progresso = proximo
    ? Math.min(100, Math.round(((coach.soberania - atual.min) / (proximo.min - atual.min)) * 100))
    : 100;

  return (
    <div className="panel" data-testid="soberania-panel">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{atual.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Treinador</p>
          <p className="truncate font-display text-lg">
            {coach.apelido || coach.nome} <span className="text-muted-foreground">·</span>{" "}
            <span className="text-primary">{atual.nome}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={<Crown className="size-4" />} label="Soberania" value={coach.soberania} accent />
        <Stat icon={<TrendingUp className="size-4" />} label="Títulos" value={coach.titulos} />
        <Stat icon={<Heart className="size-4" />} label="Moral" value={`${moral}%`} />
      </div>

      {proximo && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Rumo a {proximo.nome}</span>
            <span>
              {coach.soberania}/{proximo.min}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent-foreground transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border border-white/5 p-2 ${accent ? "bg-primary/10" : "bg-slate-900/40"}`}>
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-widest ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl">{value}</div>
    </div>
  );
}
