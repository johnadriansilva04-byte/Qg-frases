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
  ChevronRight,
  BarChart3,
  Store,
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

type SubScreen = "hub" | "acoes";

export function EconomiaScreen({ career, userId, onComprar, onVender, onAbrirMercadoClubes, onBack }: Props) {
  const [subScreen, setSubScreen] = useState<SubScreen>("hub");
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

  const handleBack = () => {
    if (subScreen === "hub") {
      onBack();
    } else {
      setSubScreen("hub");
      setFeedback(null);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/3 h-[300px] w-[300px] rounded-full bg-emerald-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[250px] w-[250px] rounded-full bg-amber-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-emerald-400" />
            <h2 className="font-display text-xl font-black text-white">Economia</h2>
          </div>
        </div>

        {/* Compact Wallet Summary — always visible */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-950/60 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Wallet className="size-3.5 text-emerald-400" />
              <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold">SOV Bank</span>
            </div>
            <p className="font-display text-lg font-black text-white">{fmtSOV(bankSaldo)} SOV</p>
            <div className="mt-1 flex items-center gap-2 text-[8px] text-slate-600">
              <span>Pessoal: <span className="font-bold text-white/60">{fmtSOV(bankSaldo - (career.clubeCaixa ?? 0))}</span></span>
              <span>·</span>
              <span>Clube: <span className="font-bold text-white/60">{fmtSOV(career.clubeCaixa ?? 0)}</span></span>
            </div>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/30 to-slate-950/60 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="size-3.5 text-sky-400" />
              <span className="text-[8px] uppercase tracking-[0.2em] text-sky-400/70 font-bold">SOV Invest</span>
            </div>
            <p className="font-display text-lg font-black text-white">
              {investSaldo === null ? "—" : `${fmtSOV(investSaldo)} SOV`}
            </p>
            <p className="text-[8px] text-slate-600 mt-1">Ativos: {fmtSOV(patrimonio.investido)} SOV</p>
          </div>
        </div>

        {subScreen === "hub" ? (
          /* ═══ HUB VIEW: Two clear action cards ═══ */
          <div className="space-y-3">
            {/* Action Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setSubScreen("acoes")}
                className="group relative overflow-hidden rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/20 to-slate-950/40 p-4 text-left transition-all duration-200 hover:border-emerald-500/30 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 transition group-hover:scale-110">
                    <BarChart3 className="size-5 text-emerald-400" />
                  </div>
                  <ChevronRight className="size-4 text-slate-600 transition group-hover:text-emerald-400 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-black text-white">Ações</h3>
                <p className="text-[10px] text-slate-500 mt-1">Bolsa de valores · Comprar e vender cotas · Dividendos</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-500/50">
                  <span>Abrir</span>
                  <ChevronRight className="size-2.5" />
                </div>
              </button>

              <button
                onClick={onAbrirMercadoClubes}
                className="group relative overflow-hidden rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-950/20 to-slate-950/40 p-4 text-left transition-all duration-200 hover:border-amber-500/30 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 transition group-hover:scale-110">
                    <Store className="size-5 text-amber-400" />
                  </div>
                  <ChevronRight className="size-4 text-slate-600 transition group-hover:text-amber-400 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-black text-white">Mercado de Clubes</h3>
                <p className="text-[10px] text-slate-500 mt-1">Comprar · Vender · Negociar clubes do campus</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-amber-500/50">
                  <span>Abrir</span>
                  <ChevronRight className="size-2.5" />
                </div>
              </button>
            </div>

            {/* Transfer Panel */}
            {userId && (
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="size-3.5 text-slate-400" />
                  <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500 font-bold">Transferir entre carteiras</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={valorTransfer}
                    onChange={(e) => setValorTransfer(e.target.value)}
                    placeholder="Valor SOV"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-400/50 focus:outline-none"
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => transferir("bank_para_invest")}
                    disabled={transferindo}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  >
                    <PiggyBank className="size-3" /> Bank → Invest · 0%
                  </button>
                  <button
                    onClick={() => transferir("invest_para_bank")}
                    disabled={transferindo}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/20 px-3 py-2 text-[11px] font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-40"
                  >
                    <Wallet className="size-3" /> Invest → Bank · IOF 10%
                  </button>
                </div>
              </div>
            )}

            {/* Recent operations */}
            {bolsa && bolsa.transacoes.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                <p className="text-[8px] uppercase tracking-[0.2em] text-slate-600 font-bold mb-2">Últimas operações</p>
                <div className="space-y-1">
                  {bolsa.transacoes.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg px-2 py-1 text-[11px]">
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
            <div className="rounded-xl border border-amber-500/10 bg-slate-950/40 p-3 text-center">
              <p className="text-[8px] uppercase tracking-[0.2em] text-slate-600">Patrimônio da Cidadela</p>
              <p className="font-display text-lg font-black text-amber-300">{fmtSOV(patrimonioCidadela)} SOV</p>
            </div>
          </div>
        ) : (
          /* ═══ AÇÕES SUB-SCREEN: Full stock market ═══ */
          <div className="space-y-4">
            {/* Transfer panel (compact) */}
            {userId && (
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="size-3.5 text-slate-400" />
                  <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500 font-bold">Transferir entre carteiras</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={valorTransfer}
                    onChange={(e) => setValorTransfer(e.target.value)}
                    placeholder="Valor SOV"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-400/50 focus:outline-none"
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => transferir("bank_para_invest")}
                    disabled={transferindo}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  >
                    <PiggyBank className="size-3" /> Bank → Invest · 0%
                  </button>
                  <button
                    onClick={() => transferir("invest_para_bank")}
                    disabled={transferindo}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/20 px-3 py-2 text-[11px] font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-40"
                  >
                    <Wallet className="size-3" /> Invest → Bank · IOF 10%
                  </button>
                </div>
              </div>
            )}

            {/* Assets grid */}
            <div>
              <div className="mb-2.5 flex items-center gap-2">
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

            {/* Recent operations */}
            {bolsa && bolsa.transacoes.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                <p className="text-[8px] uppercase tracking-[0.2em] text-slate-600 font-bold mb-2">Últimas operações</p>
                <div className="space-y-1">
                  {bolsa.transacoes.slice(0, 6).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg px-2 py-1 text-[11px]">
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
          </div>
        )}

        {feedback && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-300">
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
