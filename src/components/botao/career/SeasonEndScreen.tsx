import { useEffect, useState } from "react";
import { Crown, ArrowUp, ArrowDown, Check, X, Coins, AlertTriangle, Trophy } from "lucide-react";
import type { VereditoTemporada } from "./competitionApi";
import { DIVISAO_LABEL } from "./competitionApi";
import type { ResumoTemporada } from "./seasonEngine";
import { resolveTeam } from "./competitionApi";
import type { Team } from "../data/teams";
import { TeamBadge } from "../components/TeamPicker";

type Props = {
  resumo: ResumoTemporada;
  veredito: VereditoTemporada;
  temporada: number;
  userTeam: Team;
  onContinuar: () => void;
  onReiniciar: () => void;
};

/**
 * Tela ÚNICA de encerramento da temporada (§2): campeão → promovidos sobem →
 * rebaixados caem, em sequência curta de animações CSS, tudo numa composição
 * sem scroll. Os dados são REAIS — derivados das tabelas finais persistidas
 * (`resumoTemporada`), nunca inventados. Só é montada depois que o resultado
 * da temporada está confirmado (ligas concluídas + veredito calculado).
 */
export function SeasonEndScreen({
  resumo,
  veredito,
  temporada,
  userTeam,
  onContinuar,
  onReiniciar,
}: Props) {
  const [decidido, setDecidido] = useState(false);
  // Fases da coreografia: 0 campeão → 1 promovidos → 2 rebaixados → 3 veredito.
  const [fase, setFase] = useState(0);
  useEffect(() => {
    const timers = [0, 1, 2, 3].map((i) => window.setTimeout(() => setFase(i), 350 + i * 700));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const continua = veredito.continua;
  const divisaoUser = resumo.divisoes.find((d) => d.divisao === resumo.divisaoUsuario)!;
  const time = (id: string) => resolveTeam(id, userTeam);
  const campeao = divisaoUser.campeaoId ? time(divisaoUser.campeaoId) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 p-3 backdrop-blur-sm"
      data-testid="season-end-screen"
    >
      <div className="flex max-h-full w-full max-w-lg flex-col items-center overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-4 shadow-2xl sm:px-6">
        {/* Cabeçalho */}
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">
          <Trophy className="size-3.5" />
          Temporada {temporada} encerrada · {DIVISAO_LABEL[resumo.divisaoUsuario]}
          <Trophy className="size-3.5" />
        </p>

        {/* CAMPEÃO (fase 0 — pop com brilho) */}
        <div
          className={`mt-2 flex flex-col items-center transition-all duration-700 ${
            fase >= 0 ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Campeão</p>
          <div className="relative mt-1">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
            <Crown
              className={`relative size-12 text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.55)] ${
                fase === 0 ? "animate-bounce" : ""
              }`}
              strokeWidth={1.5}
            />
          </div>
          {campeao && (
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-1.5">
              <TeamBadge team={campeao} size="sm" />
              {resumo.usuarioCampeao && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">
                  Você!
                </span>
              )}
            </div>
          )}
        </div>

        {/* PROMOVIDOS sobem / REBAIXADOS caem (fases 1 e 2) */}
        <div className="mt-3 grid w-full grid-cols-2 gap-3">
          <div
            className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2 transition-all duration-700 ${
              fase >= 1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <p className="mb-1.5 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <ArrowUp className="size-3.5" />
              {resumo.divisaoUsuario === "serie-a" ? "Promovidos à A" : "Sobem"}
            </p>
            <div className="space-y-1">
              {divisaoUser.promovidosIds.length === 0 && (
                <p className="text-center text-[10px] text-slate-500">— topo da pirâmide —</p>
              )}
              {divisaoUser.promovidosIds.map((id, i) => (
                <div
                  key={id}
                  className="season-end-rise flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1"
                  style={{ animationDelay: `${i * 180}ms` }}
                >
                  <TeamBadge team={time(id)} size="sm" />
                  {id === userTeam.id && (
                    <span className="rounded-full bg-emerald-400 px-1.5 text-[8px] font-black text-slate-950">
                      VOCÊ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`rounded-xl border border-rose-500/30 bg-rose-500/5 p-2 transition-all duration-700 ${
              fase >= 2 ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
            }`}
          >
            <p className="mb-1.5 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-300">
              <ArrowDown className="size-3.5" />
              Caem
            </p>
            <div className="space-y-1">
              {divisaoUser.rebaixadosIds.length === 0 && (
                <p className="text-center text-[10px] text-slate-500">— base da pirâmide —</p>
              )}
              {divisaoUser.rebaixadosIds.map((id, i) => (
                <div
                  key={id}
                  className="season-end-fall flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 px-2 py-1"
                  style={{ animationDelay: `${i * 180}ms` }}
                >
                  <TeamBadge team={time(id)} size="sm" />
                  {id === userTeam.id && (
                    <span className="rounded-full bg-rose-400 px-1.5 text-[8px] font-black text-slate-950">
                      VOCÊ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Posição do usuário */}
        <p className="mt-2 text-center text-xs text-slate-300">
          Seu time terminou em{" "}
          <strong className="text-white">{resumo.posicaoUsuario}º</strong>
          {resumo.usuarioPromovido && " — PROMOVIDO! 🎉"}
          {resumo.usuarioRebaixado && " — rebaixado."}
          {!resumo.usuarioPromovido && !resumo.usuarioRebaixado && !resumo.usuarioCampeao && "."}
        </p>

        {/* VEREDITO (fase 3 — economia da temporada) */}
        <div
          className={`mt-2 w-full transition-all duration-700 ${
            fase >= 3 ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="grid grid-cols-3 gap-2 border-y border-white/10 py-2">
            <Tile
              icon={<Coins className="size-3.5" />}
              label="Soberania"
              value={String(veredito.soberaniaFinal)}
              accent={continua ? "emerald" : "rose"}
            />
            <Tile
              icon={<AlertTriangle className="size-3.5" />}
              label="Manutenção"
              value={`-${veredito.custoManutencao}`}
            />
            <Tile
              icon={continua ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              label="Saldo"
              value={veredito.sobrou >= 0 ? `+${veredito.sobrou}` : String(veredito.sobrou)}
              accent={veredito.sobrou >= 0 ? "emerald" : "rose"}
            />
          </div>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">{veredito.motivo}</p>

          {continua ? (
            <button
              data-testid="season-continue"
              onClick={() => {
                setDecidido(true);
                onContinuar();
              }}
              disabled={decidido}
              className="btn-primary mt-3 w-full"
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
              className="btn-primary mt-3 w-full"
            >
              Reiniciar carreira do zero
            </button>
          )}
        </div>
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
      <div
        className={`flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest ${
          color || "text-muted-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
