import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Building2,
  PiggyBank,
  Activity,
  Zap,
} from "lucide-react";
import type { BolsaState, CareerState, PosicaoBolsa } from "./types";
import { ATIVOS, custoCompra, patrimonioJogador, ativoInfo } from "./bolsaEngine";
import type { AtivoId } from "./types";
import {
  obterSaldosInvest,
  transferirBankParaInvest,
  transferirInvestParaBank,
} from "@/lib/financial/sovInvestApi";

type Props = {
  career: CareerState;
  userId: string | null;
  onComprar: (ativoId: AtivoId, quantidade: number) => void;
  onVender: (ativoId: AtivoId, quantidade: number) => void;
  onAbrirMercadoClubes?: (() => void) | undefined;
  onBack: () => void;
};

const IOF_RETIRADA = 0.10;

export function EconomiaScreen({ career, userId, onComprar, onVender, onAbrirMercadoClubes, onBack }: Props) {
  const bolsa = useMemo(() => (career.bolsa ? career.bolsa : null), [career.bolsa]);
  const patrimonio = useMemo(() => patrimonioJogador(career), [career]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saldos, setSaldos] = useState<{ bank: number; invest: number } | null>(null);
  const [valorTransfer, setValorTransfer] = useState("");
  const [transferindo, setTransferindo] = useState(false);

  const patrimonioCidadela = bolsa?.patrimonioCidadela ?? 10_000_000;

  const recarregarSaldos = () => {
    if (!userId) return;
    void obterSaldosInvest(userId).then((s) => {
      if (s) setSaldos({ bank: s.bank, invest: s.invest });
    });
  };
  useEffect(recarregarSaldos, [userId]);

  const transferir = async (direcao: "bank_para_invest" | "invest_para_bank") => {
    if (!userId || transferindo) return;
    const valor = Math.floor(Number(valorTransfer));
    if (!Number.isFinite(valor) || valor <= 0) {
      setFeedback("Informe um valor válido para transferir.");
      return;
    }
    setTransferindo(true);
    try {
      const chave = `transfer:${userId}:${Date.now()}`;
      const res =
        direcao === "bank_para_invest"
          ? await transferirBankParaInvest(userId, valor, chave)
          : await transferirInvestParaBank(userId, valor, chave);
      if (!res) {
        setFeedback("Transferência não concluída — saldo insuficiente.");
        return;
      }
      setSaldos({ bank: res.bank, invest: res.invest });
      setValorTransfer("");
      if (direcao === "bank_para_invest") {
        setFeedback(`${fmtSOV(valor)} SOV: SOV Bank → SOV Invest (taxa 0%).`);
      } else {
        setFeedback(`${fmtSOV(valor)} SOV solicitado · IOF 10% = ${fmtSOV(res.taxa)} · líquido ${fmtSOV(res.liquido)} no SOV Bank.`);
      }
    } finally {
      setTransferindo(false);
    }
  };

  const acao = (tipo: "compra" | "venda", pos: PosicaoBolsa | undefined, info: (typeof ATIVOS)[number], qtd: number) => {
    const bolsaAtual = career.bolsa;
    if (!bolsaAtual) return;
    if (tipo === "compra") {
      const custo = custoCompra(bolsaAtual, info.ativoId, qtd);
      if (saldos && saldos.invest < custo) {
        setFeedback("Saldo insuficiente no SOV Invest — transfira do SOV Bank.");
        return;
      }
      onComprar(info.ativoId, qtd);
      setFeedback(`${qtd} cota${qtd > 1 ? "s" : ""} de ${info.nome} comprada${qtd > 1 ? "s" : ""}.`);
      return;
    }
    onVender(info.ativoId, qtd);
    setFeedback(`${qtd} cota${qtd > 1 ? "s" : ""} de ${info.nome} vendida${qtd > 1 ? "s" : ""}.`);
  };

  const bankSaldo = saldos?.bank ?? patrimonio.sobCarteira;
  const investSaldo = saldos?.invest ?? null;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/3 h-[300px] w-[300px] rounded-full bg-emerald-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[250px] w-[250px] rounded-full bg-amber-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
              <ArrowLeft className="size-4 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-emerald-400" />
              <h2 className="font-display text-xl font-black text-white">Bolsa de Valores</h2>
            </div>
          </div>
        </div>

        {/* Wallets */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="size-4 text-emerald-400" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold">SOV Bank</span>
            </div>
            <p className="font-display text-2xl font-black text-white">{fmtSOV(bankSaldo)} SOV</p>
            <p className="text-[10px] text-slate-500 mt-1">Saldo líquido total</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="rounded-lg bg-slate-900/40 px-2 py-1">
                <span className="text-slate-600">Pessoal: </span>
                <span className="font-bold text-white">{fmtSOV(bankSaldo - (career.clubeCaixa ?? 0))}</span>
              </div>
              <div className="rounded-lg bg-slate-900/40 px-2 py-1">
                <span className="text-slate-600">Clube: </span>
                <span className="font-bold text-white">{fmtSOV(career.clubeCaixa ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/30 to-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="size-4 text-sky-400" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-sky-400/70 font-bold">SOV Invest</span>
            </div>
            <p className="font-display text-2xl font-black text-white">
              {investSaldo === null ? "—" : `${fmtSOV(investSaldo)} SOV`}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Disponível para investir</p>
            <p className="text-[9px] text-slate-600 mt-1">Patrimônio em ativos: {fmtSOV(patrimonio.investido)} SOV</p>
          </div>
        </div>

        {/* Transfer panel */}
        {userId && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="size-4 text-slate-400" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Transferir entre carteiras</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={valorTransfer}
                onChange={(e) => setValorTransfer(e.target.value)}
                placeholder="Valor SOV"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-400/50 focus:outline-none"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => transferir("bank_para_invest")}
                disabled={transferindo}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
              >
                <PiggyBank className="size-3.5" /> Bank → Invest · 0%
              </button>
              <button
                onClick={() => transferir("invest_para_bank")}
                disabled={transferindo}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/15 border border-sky-500/20 px-3 py-2.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-40"
              >
                <Wallet className="size-3.5" /> Invest → Bank · IOF 10%
              </button>
            </div>
          </div>
        )}

        {/* Assets grid */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="size-4 text-amber-400" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-amber-400/70 font-bold">Ativos de Renda</span>
            <span className="text-[9px] text-slate-600">· dividendos a cada 3 rodadas</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ATIVOS.map((info) => {
              if (!bolsa) return null;
              const preco = bolsa.precos[info.ativoId];
              const anterior = bolsa.precosAnteriores[info.ativoId] ?? preco;
              const variacao = anterior === 0 ? 0 : ((preco - anterior) / anterior) * 100;
              const pos = bolsa.carteira.find((p) => p.ativoId === info.ativoId);
              const historico = bolsa.historicoPrecos[info.ativoId] ?? [];

              return (
                <div key={info.ativoId} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{info.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{info.nome}</p>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">{info.setor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-black text-white">{fmtSOV(preco)}</p>
                      <VariacaoBadge valor={variacao} />
                    </div>
                  </div>

                  {/* Sparkline */}
                  {historico.length > 0 && (
                    <div className="mt-2 flex items-end gap-[2px]">
                      {historico.map((p, i) => {
                        const min = Math.min(...historico);
                        const max = Math.max(...historico);
                        const h = max === min ? 2 : 4 + Math.round(((p - min) / (max - min)) * 16);
                        return (
                          <span key={i} className="w-[5px] rounded-sm bg-emerald-500/60" style={{ height: `${h}px` }} />
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{pos ? `${pos.quantidade} cota${pos.quantidade !== 1 ? "s" : ""}` : "Sem posição"}</span>
                    <span>Dividendo: {(info.dividendYield * 100).toFixed(1)}%/rod</span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <button onClick={() => acao("compra", pos, info, 1)} className="rounded-lg bg-emerald-500/15 border border-emerald-500/20 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25">
                      Comprar
                    </button>
                    <button onClick={() => acao("compra", pos, info, 5)} className="rounded-lg bg-emerald-500/10 border border-emerald-500/15 py-1.5 text-[10px] font-bold text-emerald-300/70 transition hover:bg-emerald-500/20">
                      +5
                    </button>
                    <button
                      onClick={() => pos && pos.quantidade > 0 && acao("venda", pos, info, pos.quantidade)}
                      disabled={!pos || pos.quantidade === 0}
                      className="rounded-lg bg-rose-500/10 border border-rose-500/15 py-1.5 text-[10px] font-bold text-rose-300/70 transition hover:bg-rose-500/15 disabled:opacity-30"
                    >
                      Vender
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mercado de Clubes link */}
        {onAbrirMercadoClubes && (
          <button onClick={onAbrirMercadoClubes} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-950/30 to-slate-950/60 px-4 py-3.5 text-sm font-bold text-amber-300 transition hover:border-amber-500/30">
            <Building2 className="size-4" /> Abrir Mercado de Clubes
          </button>
        )}

        {/* Recent operations */}
        {bolsa && bolsa.transacoes.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-bold mb-3">Últimas operações</p>
            <div className="space-y-1.5">
              {bolsa.transacoes.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{ativoInfo(t.ativoId).emoji}</span>
                    <span className="text-slate-400 capitalize">{t.tipo}</span>
                    <span className="text-slate-600">· {t.quantidade} cota{t.quantidade !== 1 ? "s" : ""}</span>
                  </span>
                  <span className={`font-bold ${t.tipo === "compra" ? "text-rose-300" : "text-emerald-300"}`}>
                    {t.tipo === "compra" ? "-" : "+"}{fmtSOV(t.valor)} SOV
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cidadela index */}
        <div className="rounded-2xl border border-amber-500/10 bg-slate-950/40 p-4 text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Patrimônio da Cidadela</p>
          <p className="font-display text-xl font-black text-amber-300">{fmtSOV(patrimonioCidadela)} SOV</p>
          <p className="text-[9px] text-slate-600">Índice econômico do ecossistema</p>
        </div>

        {feedback && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-xs text-cyan-300">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}

function VariacaoBadge({ valor }: { valor: number }) {
  if (Math.abs(valor) < 0.01) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
        <Minus className="size-2.5" /> 0%
      </span>
    );
  }
  return valor > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
      <ArrowUpRight className="size-2.5" /> +{valor.toFixed(1)}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
      <ArrowDownRight className="size-2.5" /> {valor.toFixed(1)}%
    </span>
  );
}

function fmtSOV(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
