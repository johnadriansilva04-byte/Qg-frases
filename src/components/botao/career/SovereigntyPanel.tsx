import { Crown, TrendingUp, Heart, Coins } from "lucide-react";
import { nivelDoTreinador, type Coach, type Divisao } from "./types";
import { CUSTO_MANUTENCAO } from "./competitionApi";

export function SovereigntyPanel({
  coach,
  moral,
  temporada,
  divisao,
}: {
  coach: Coach;
  moral: number;
  temporada?: number;
  divisao?: Divisao;
}) {
  const { atual, proximo } = nivelDoTreinador(coach.sov);
  const progresso = proximo
    ? Math.min(100, Math.round(((coach.sov - atual.min) / (proximo.min - atual.min)) * 100))
    : 100;
  const moralColor =
    moral >= 70 ? "text-emerald-300" : moral >= 40 ? "text-amber-300" : "text-rose-300";

  const custo = divisao ? CUSTO_MANUTENCAO[divisao] : 0;
  const saldoManutencao = coach.sov - custo;
  const manutencaoOk = saldoManutencao >= 0;

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
        <Stat
          icon={<Crown className="size-4" />}
          label="SOV"
          value={coach.sov}
          accent
        />
        <Stat icon={<TrendingUp className="size-4" />} label="Títulos" value={coach.titulos} />
        <Stat
          icon={<Heart className="size-4" />}
          label="Moral"
          value={`${moral}%`}
          valueClass={moralColor}
        />
      </div>

      {proximo && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Rumo a {proximo.nome}</span>
            <span>
              {coach.sov}/{proximo.min}
            </span>
          </div>
          <div className="sovereignty-bar">
            <div className="sovereignty-bar-fill" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {progresso >= 100
              ? `A consagração está à vista — ${proximo.nome} é questão de tempo.`
              : progresso >= 60
                ? `A torcida já canta o seu nome. Faltam ${proximo.min - coach.sov} SOV para ${proximo.nome}.`
                : progresso >= 25
                  ? `A caminhada é longa, mas todo ídolo começou assim. ${proximo.min - coach.sov} SOV até ${proximo.nome}.`
                  : `O vestiário acredita em você. Construa sua lenda, jogo a jogo.`}
          </p>
        </div>
      )}

      {divisao && (
        <div className="sovereignty-maintenance">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Coins className="size-3.5" />
              Conta do clube — Temporada {temporada ?? 1}
            </span>
            <span className={manutencaoOk ? "text-emerald-300" : "text-rose-300"}>
              {manutencaoOk ? "Caixa positivo" : "Alerta da diretoria"}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Estrutura custa {custo} SOV · caixa atual {coach.sov} SOV
            </span>
            <span
              className={`text-[11px] font-medium ${manutencaoOk ? "text-emerald-300" : "text-rose-300"}`}
            >
              {manutencaoOk
                ? `O clube respira: sobram ${saldoManutencao} SOV após a manutenção.`
                : `Faltam ${Math.abs(saldoManutencao)} SOV — a diretoria cobra resultados.`}
            </span>
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
      <div
        className={`flex items-center gap-1 text-[10px] uppercase tracking-widest ${accent ? "text-amber-300" : "text-muted-foreground"}`}
      >
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-xl ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}
