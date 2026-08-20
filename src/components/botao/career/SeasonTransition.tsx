import { useState } from "react";
import { Check, X, Crown, AlertTriangle, Coins } from "lucide-react";
import type { VereditoTemporada } from "./competitionApi";
import type { Divisao } from "./types";
import { DIVISAO_LABEL } from "./competitionApi";

type Props = {
  veredito: VereditoTemporada;
  divisao: Divisao;
  temporada: number;
  /** Ação ao confirmar continuação (temporada infinita). */
  onContinuar: () => void;
  /** Ação ao confirmar game over (reiniciar carreira do zero). */
  onReiniciar: () => void;
};

/**
 * Tela de veredito de fim de temporada. Decide se o treinador segue no comando
 * (temporada infinita, mantendo progresso) ou se o clube entra em falência
 * (Game Over). Baseia-se na economia de Soberania.
 */
export function SeasonTransition({ veredito, divisao, temporada, onContinuar, onReiniciar }: Props) {
  const [decidido, setDecidido] = useState(false);
  const continua = veredito.continua;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" data-testid="season-transition">
      <div
        className={`mx-4 w-full max-w-lg overflow-hidden rounded-2xl border p-8 shadow-2xl ${
          continua
            ? "border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40"
            : "border-rose-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40"
        }`}
      >
        <div className="mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.35em] text-white/70">
          {continua ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
          <span>Balancete da Temporada {temporada}</span>
          {continua ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
        </div>

        <div className="my-6 flex flex-col items-center text-center">
          <div className="relative">
            <div className={`absolute inset-0 animate-ping rounded-full ${continua ? "bg-emerald-500/20" : "bg-rose-500/20"}`} />
            {continua ? (
              <Crown className="relative size-24 text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.6)]" strokeWidth={1.5} />
            ) : (
              <X className="relative size-24 text-rose-400 drop-shadow-[0_0_25px_rgba(251,113,133,0.6)]" strokeWidth={1.5} />
            )}
          </div>
          <p className="mt-4 font-display text-3xl">
            {continua ? "Você segue no comando" : "Falência decretada"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {veredito.motivo} · {DIVISAO_LABEL[divisao]}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Tile
            icon={<Coins className="size-4" />}
            label="Sovereign"
            value={String(veredito.soberaniaFinal)}
            accent={continua ? "emerald" : "rose"}
          />
          <Tile
            icon={<AlertTriangle className="size-4" />}
            label="Manutenção"
            value={`-${veredito.custoManutencao}`}
          />
          <Tile
            icon={continua ? <Check className="size-4" /> : <X className="size-4" />}
            label="Saldo"
            value={veredito.sobrou >= 0 ? `+${veredito.sobrou}` : String(veredito.sobrou)}
            accent={veredito.sobrou >= 0 ? "emerald" : "rose"}
          />
        </div>

        {continua ? (
          <button
            data-testid="season-continue"
            onClick={() => {
              setDecidido(true);
              onContinuar();
            }}
            disabled={decidido}
            className="btn-primary mt-6 w-full"
          >
            Iniciar Temporada {temporada + 1}
          </button>
        ) : (
          <button
            data-testid="season-gameover"
            onClick={() => {
              setDecidido(true);
              onReiniciar();
            }}
            disabled={decidido}
            className="btn-primary mt-6 w-full"
          >
            Reiniciar carreira do zero
          </button>
        )}
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "emerald" | "rose";
}) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "rose" ? "text-rose-300" : "";
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest ${color || "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl ${color}`}>{value}</div>
    </div>
  );
}
