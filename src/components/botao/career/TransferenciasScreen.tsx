import { ArrowLeftRight, Building2, Check, Coins, X } from "lucide-react";
import type { OfertaTransferencia } from "./transferenciaEngine";

type Props = {
  ofertas: OfertaTransferencia[];
  onAceitar: (ofertaId: string) => void;
  onRecusar: (ofertaId: string) => void;
  onVoltar: () => void;
  processando?: string | null | undefined;
};

/**
 * Área de Transferência/Negociação (§6): todas as propostas de clube que o
 * treinador recebeu, com condições claras e ação de aceitar/recusar. Aceitar
 * muda o clube-alvo da próxima temporada.
 */
export function TransferenciasScreen({ ofertas, onAceitar, onRecusar, onVoltar, processando }: Props) {
  const pendentes = ofertas.filter((o) => o.respondida === "pendente");
  const historico = ofertas.filter((o) => o.respondida !== "pendente");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="transferencias-screen">
      <div className="panel">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <ArrowLeftRight className="size-4" />
          <span>Transferências · Negociação</span>
        </div>
        <h2 className="font-display text-2xl">Propostas de clubes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clubes interessados no seu trabalho enviam propostas no meio e no fim da temporada.
          Aceitar muda seu clube na próxima temporada — a carreira vai junto.
        </p>

        {ofertas.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center">
            <Building2 className="mx-auto mb-2 size-8 text-slate-600" />
            <p className="text-sm text-slate-400">Nenhuma proposta ainda.</p>
            <p className="mt-1 text-xs text-slate-500">
              Jogue bem e os clubes vão bater na sua porta na metade e no fim da temporada.
            </p>
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
              Aguardando sua decisão
            </p>
            {pendentes.map((o) => (
              <div
                key={o.id}
                data-testid={`oferta-card-${o.id}`}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-800 text-xl">
                    {o.escudo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-white">{o.clubeNome}</h3>
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-widest text-slate-300">
                        {o.divisaoOfertante.replace("serie-", "Série ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{o.proposta}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-900/60 p-2">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500">Força</p>
                        <p className="font-display text-base text-white">{o.power}</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/60 p-2">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500">Salário /10r</p>
                        <p className="font-display text-base text-amber-300">{o.salarioPor10}</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/60 p-2">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500">Assinatura</p>
                        <p className="font-display text-base text-emerald-300">+{o.bonusAssinatura}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        data-testid={`aceitar-${o.id}`}
                        onClick={() => onAceitar(o.id)}
                        disabled={processando === o.id}
                        className="btn-primary flex-1 gap-1.5 disabled:opacity-50"
                      >
                        <Check className="size-4" />
                        {processando === o.id ? "Assinando..." : "Aceitar proposta"}
                      </button>
                      <button
                        data-testid={`recusar-${o.id}`}
                        onClick={() => onRecusar(o.id)}
                        disabled={processando === o.id}
                        className="btn-ghost gap-1.5 disabled:opacity-50"
                      >
                        <X className="size-4" />
                        Recusar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {historico.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Histórico
            </p>
            {historico.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span>{o.escudo}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{o.clubeNome}</p>
                    <p className="text-[10px] text-slate-500">
                      T{o.temporada} · salário {o.salarioPor10}/10r
                      {o.bonusAssinatura > 0 ? ` · +${o.bonusAssinatura} SOV` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold uppercase ${
                    o.respondida === "aceita" ? "text-emerald-300" : "text-slate-500"
                  }`}
                >
                  {o.respondida === "aceita" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {o.respondida === "aceita" ? "Aceita" : "Recusada"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button onClick={onVoltar} className="btn-ghost">
            Voltar ao hub
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600">
          <Coins className="size-3" />
          O bônus de assinatura cai na sua conta pessoal. A receita das partidas segue indo para o
          caixa do clube que você comandar.
        </p>
      </div>
    </div>
  );
}
