import { ArrowLeft, ArrowLeftRight, Building2, Check, Coins, X, TrendingUp, Zap } from "lucide-react";
import type { OfertaTransferencia } from "./transferenciaEngine";

type Props = {
  ofertas: OfertaTransferencia[];
  onAceitar: (ofertaId: string) => void;
  onRecusar: (ofertaId: string) => void;
  onVoltar: () => void;
  processando?: string | null | undefined;
};

export function TransferenciasScreen({ ofertas, onAceitar, onRecusar, onVoltar, processando }: Props) {
  const pendentes = ofertas.filter((o) => o.respondida === "pendente");
  const historico = ofertas.filter((o) => o.respondida !== "pendente");

  return (
    <div className="relative w-full max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/3 h-[300px] w-[300px] rounded-full bg-fuchsia-500/4 blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-fuchsia-400" />
            <h2 className="font-display text-lg sm:text-xl font-black text-white">Transferências</h2>
          </div>
        </div>

        {/* Pending offers */}
        {pendentes.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Zap className="size-4 text-emerald-400" />
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold">Aguardando Decisão</span>
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {pendentes.map((o) => (
                <div
                  key={o.id}
                  data-testid={`oferta-card-${o.id}`}
                  className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-950/60 p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-lg sm:text-xl">
                      {o.escudo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm sm:text-base font-bold text-white">{o.clubeNome}</h3>
                        <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400">
                          {o.divisaoOfertante.replace("serie-", "Série ")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] sm:text-xs text-slate-400 leading-relaxed">{o.proposta}</p>

                      <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
                        {[
                          { label: "Força", value: String(o.power), icon: <Zap className="size-3" />, color: "emerald" },
                          { label: "Salário/10r", value: String(o.salarioPor10), icon: <TrendingUp className="size-3" />, color: "amber" },
                          { label: "Assinatura", value: `+${o.bonusAssinatura}`, icon: <Coins className="size-3" />, color: "emerald" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg border border-white/5 bg-slate-900/40 p-1.5 sm:p-2 text-center">
                            <p className="flex items-center justify-center gap-0.5 text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-600">
                              {s.icon} {s.label}
                            </p>
                            <p className={`font-display text-xs sm:text-sm font-black text-${s.color}-300`}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <button
                          data-testid={`aceitar-${o.id}`}
                          onClick={() => onAceitar(o.id)}
                          disabled={processando === o.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-black text-white transition hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          {processando === o.id ? "Assinando..." : "Aceitar"}
                        </button>
                        <button
                          data-testid={`recusar-${o.id}`}
                          onClick={() => onRecusar(o.id)}
                          disabled={processando === o.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-slate-400 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                        >
                          <X className="size-3.5" /> Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {ofertas.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-6 sm:p-8 text-center">
            <Building2 className="mx-auto mb-3 size-8 sm:size-10 text-slate-700" />
            <p className="text-xs sm:text-sm text-slate-400 font-bold">Nenhuma proposta ainda</p>
            <p className="mt-1 text-[10px] sm:text-xs text-slate-600">Jogue bem e os clubes vão bater na sua porta.</p>
          </div>
        )}

        {/* History */}
        {historico.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-slate-600 font-bold">Histórico</span>
            </div>
            <div className="space-y-1.5">
              {historico.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-2.5 sm:px-3 py-2 sm:py-2.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <span className="text-base sm:text-lg">{o.escudo}</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">{o.clubeNome}</p>
                      <p className="text-[8px] sm:text-[9px] text-slate-600">
                        T{o.temporada} · salário {o.salarioPor10}/10r
                        {o.bonusAssinatura > 0 ? ` · +${o.bonusAssinatura} SOV` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase ${
                    o.respondida === "aceita" ? "text-emerald-400" : "text-slate-600"
                  }`}>
                    {o.respondida === "aceita" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    {o.respondida === "aceita" ? "Aceita" : o.respondida === "expirada" ? "Expirada" : "Recusada"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 sm:px-3 py-2 sm:py-2.5">
          <Coins className="size-3.5 text-slate-600 shrink-0" />
          <p className="text-[8px] sm:text-[9px] text-slate-600">O bônus de assinatura cai na sua conta pessoal. A receita das partidas vai para o caixa do clube.</p>
        </div>
      </div>
    </div>
  );
}
