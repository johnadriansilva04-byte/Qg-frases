import { Crown, TrendingUp, Heart } from "lucide-react";
import { nivelDoTreinador, type Coach } from "./types";

export function SovereigntyPanel({ coach, moral }: { coach: Coach; moral: number }) {
  const { atual, proximo } = nivelDoTreinador(coach.soberania);
  const progresso = proximo
    ? Math.min(100, Math.round(((coach.soberania - atual.min) / (proximo.min - atual.min)) * 100))
    : 100;
  const moralColor = moral >= 70 ? "text-emerald-300" : moral >= 40 ? "text-amber-300" : "text-rose-300";

  return (
    <div className="sovereignty-panel" data-testid="soberania-panel">
      <div className="sovereignty-head">
        <span className="sovereignty-icon">{atual.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="sovereignty-eyebrow">Treinador</p>
          <p className="sovereignty-name">
            {coach.apelido || coach.nome} <span className="text-muted-foreground">·</span>{" "}
            <span className="sovereignty-rank">{atual.nome}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat icon={<Crown className="size-4" />} label="Soberania" value={coach.soberania} accent />
        <Stat icon={<TrendingUp className="size-4" />} label="Títulos" value={coach.titulos} />
        <Stat icon={<Heart className="size-4" />} label="Moral" value={`${moral}%`} valueClass={moralColor} />
      </div>

      {proximo && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Rumo a {proximo.nome}</span>
            <span>
              {coach.soberania}/{proximo.min}
            </span>
          </div>
          <div className="sovereignty-bar">
            <div
              className="sovereignty-bar-fill"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`stat-tile ${accent ? "stat-tile-accent" : ""}`}>
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-widest ${accent ? "text-amber-300" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-xl ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}

