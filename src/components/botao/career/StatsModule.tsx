import { Trophy, Shield, TrendingUp } from "lucide-react";
import { TeamBadge } from "../components/TeamPicker";
import type { Team } from "../data/teams";

interface StatsModuleProps {
  title: string;
  artilheiro?: { team: Team; gols: number };
  goleiro?: { team: Team; gols: number };
  maiorGoleada?: { vencedor: Team; perdedor: Team; placar: string; diff: number } | null;
  color?: "emerald" | "blue" | "purple";
}

export function StatsModule({ title, artilheiro, goleiro, maiorGoleada, color = "emerald" }: StatsModuleProps) {
  const colorClasses = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
  };

  const iconColor = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`panel ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className={`size-4 ${iconColor[color]}`} />
        <h3 className="font-bold text-sm">{title}</h3>
      </div>

      <div className="space-y-2">
        {artilheiro && (
          <div className="bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="size-3 text-yellow-300" />
              <span className="text-[10px] text-muted-foreground">Artilheiro</span>
            </div>
            <div className="flex items-center justify-between">
              <TeamBadge team={artilheiro.team} size="sm" />
              <span className="font-bold text-yellow-300 text-sm">{artilheiro.gols} gols</span>
            </div>
          </div>
        )}

        {goleiro && (
          <div className="bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="size-3 text-green-300" />
              <span className="text-[10px] text-muted-foreground">Menos Gols Sofridos</span>
            </div>
            <div className="flex items-center justify-between">
              <TeamBadge team={goleiro.team} size="sm" />
              <span className="font-bold text-green-300 text-sm">{goleiro.gols} gols</span>
            </div>
          </div>
        )}

        {maiorGoleada && (
          <div className="bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-3 text-emerald-300" />
              <span className="text-[10px] text-muted-foreground">Maior Goleada</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamBadge team={maiorGoleada.vencedor} size="sm" />
              <span className="font-bold text-emerald-300 text-sm">{maiorGoleada.placar}</span>
              <TeamBadge team={maiorGoleada.perdedor} size="sm" />
            </div>
            <p className="text-[10px] text-emerald-300 mt-1">Diferença de {maiorGoleada.diff} gols</p>
          </div>
        )}
      </div>
    </div>
  );
}
