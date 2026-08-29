import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Wallet, ArrowRightLeft, Building2 } from "lucide-react";
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
  /** Usuário autenticado (necessário para transferências Bank↔Invest). */
  userId: string | null;
  onComprar: (ativoId: AtivoId, quantidade: number) => void;
  onVender: (ativoId: AtivoId, quantidade: number) => void;
  /** Abre o Mercado de Clubes (AÇÕES) — subseção da Bolsa. */
  onAbrirMercadoClubes?: (() => void) | undefined;
  onBack: () => void;
};

/** IOF de 10% sobre retirada Invest→Bank (e sobre dividendos/vendas). */
const IOF_RETIRADA = 0.10;

/**
 * BOLSA DE VALORES da Cidadela (tela própria, §17). Duas carteiras do MESMO
 * jogador — SOV Bank (líquido) e SOV Invest (alocado em investimento) — com
 * transferências contabilizadas (0% Bank→Invest, IOF 10% Invest→Bank).
 * Estrutura: AÇÕES (Mercado de Clubes) + ATIVOS DE RENDA (renda recorrente).
 */
export function EconomiaScreen({ career, userId, onComprar, onVender, onAbrirMercadoClubes, onBack }: Props) {
  const bolsa = useMemo(() => (career.bolsa ? career.bolsa : null), [career.bolsa]);
  const patrimonio = useMemo(() => patrimonioJogador(career), [career]);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Saldos reais das duas carteiras (fonte autoritativa = user_wallets).
  const [saldos, setSaldos] = useState<{ bank: number; invest: number } | null>(null);
  const [valorTransfer, setValorTransfer] = useState("");
  const [transferindo, setTransferindo] = useState(false);

  const patrimonioCidadela = bolsa?.patrimonioCidadela ?? 10_000_000;

  // Carrega os saldos reais das carteiras (autoritativo). null = indisponível.
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
        setFeedback(
          `${fmtSOV(valor)} SOV solicitado · IOF 10% = ${fmtSOV(res.taxa)} · líquido ${fmtSOV(res.liquido)} no SOV Bank.`,
        );
      }
    } finally {
      setTransferindo(false);
    }
  };

  const acao = (
    tipo: "compra" | "venda",
    pos: PosicaoBolsa | undefined,
    info: (typeof ATIVOS)[number],
    qtd: number,
  ) => {
    const bolsaAtual = career.bolsa;
    if (!bolsaAtual) return;
    if (tipo === "compra") {
      const custo = custoCompra(bolsaAtual, info.ativoId, qtd);
      // A compra é paga com o SOV INVEST (carteira de investimento).
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
    <div className="space-y-5">
      {/* Cabeçalho da tela própria: título + voltar (§17). */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft className="size-4" /> Voltar ao Hub
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Bolsa de Valores da Cidadela
        </span>
      </div>

      {/* As DUAS carteiras do jogador (SOV Bank líquido + SOV Invest). */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sovereignty-panel p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <Wallet className="size-4" /> SOV Bank
          </p>
          <p className="mt-2 font-display text-2xl">{fmtSOV(bankSaldo)} SOV</p>
          <p className="text-xs text-muted-foreground">
            Saldo líquido total (pessoal + caixa do clube)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            Pessoal: {fmtSOV(bankSaldo - (career.clubeCaixa ?? 0))} SOV · Caixa do clube:{" "}
            {fmtSOV(career.clubeCaixa ?? 0)} SOV
          </p>
        </div>
        <div className="sovereignty-panel p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-300">
            <TrendingUp className="size-4" /> SOV Invest
          </p>
          <p className="mt-2 font-display text-2xl">
            {investSaldo === null ? "—" : `${fmtSOV(investSaldo)} SOV`}
          </p>
          <p className="text-xs text-muted-foreground">Disponível para investir</p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            Patrimônio em ativos (valor de mercado): {fmtSOV(patrimonio.investido)} SOV — não é saldo.
          </p>
        </div>
      </div>

      {/* Transferências entre as carteiras do MESMO jogador (nada nasce/some). */}
      {userId && (
        <div className="panel !p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <ArrowRightLeft className="size-4" /> Transferir entre carteiras
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={valorTransfer}
              onChange={(e) => setValorTransfer(e.target.value)}
              placeholder="Valor em SOV"
              className="phone-input flex-1"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => transferir("bank_para_invest")}
              disabled={transferindo}
              className="btn-primary rounded-lg py-2 text-xs disabled:opacity-40"
            >
              Bank → Invest · 0%
            </button>
            <button
              onClick={() => transferir("invest_para_bank")}
              disabled={transferindo}
              className="rounded-lg border border-sky-900/50 bg-sky-950/30 py-2 text-xs font-bold text-sky-300 disabled:opacity-40"
            >
              Invest → Bank · IOF 10%
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Transferência interna: o dinheiro não nasce nem some. Só a retirada
            Invest → Bank cobra IOF de 10% (registrado no ledger).
          </p>
        </div>
      )}

      {/* AÇÕES — Mercado de Clubes (subseção da Bolsa). */}
      <div className="panel !p-4">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Building2 className="size-4" /> Ações
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Participações em clubes: preço, quantidade, valorização e dividendos
          por período. Compra e venda de cotas de clubes da Cidadela.
        </p>
        {onAbrirMercadoClubes && (
          <button onClick={onAbrirMercadoClubes} className="btn-primary mt-3 w-full rounded-lg py-2 text-xs">
            Abrir Mercado de Clubes
          </button>
        )}
      </div>

      {/* ATIVOS DE RENDA (renda recorrente por rodada). */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Ativos de Renda
        </p>
        <p className="mb-3 text-[11px] text-muted-foreground/80">
          Geram renda recorrente (dividendos) a cada {3} rodadas, pagos no SOV
          Invest (líquido de IOF 10%).
        </p>
      </div>

      {/* Patrimônio da Cidadela (índice do ecossistema). */}
      <div className="sovereignty-panel p-4">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          <TrendingUp className="size-4" /> Patrimônio da Cidadela
        </p>
        <p className="mt-2 font-display text-2xl">{fmtSOV(patrimonioCidadela)} SOV</p>
        <p className="text-xs text-muted-foreground">
          Índice econômico do ecossistema — valor de mercado, não saldo de ninguém
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
          {feedback}
        </div>
      )}

      {/* Ativos (§23-25). */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ATIVOS.map((info) => {
          if (!bolsa) return null;
          const preco = bolsa.precos[info.ativoId];
          const anterior = bolsa.precosAnteriores[info.ativoId] ?? preco;
          const variacao = anterior === 0 ? 0 : ((preco - anterior) / anterior) * 100;
          const pos = bolsa.carteira.find((p) => p.ativoId === info.ativoId);
          const historico = bolsa.historicoPrecos[info.ativoId] ?? [];
          return (
            <div key={info.ativoId} className="panel !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{info.nome}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {info.setor}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg">{fmtSOV(preco)}</p>
                  <VariacaoBadge valor={variacao} />
                </div>
              </div>

              {/* Sparkline simples (histórico real persistido). */}
              <div className="mt-2 flex items-end gap-[2px]" title="Histórico de preços (últimas rodadas)">
                {historico.map((p, i) => {
                  const min = Math.min(...historico);
                  const max = Math.max(...historico);
                  const h = max === min ? 2 : 4 + Math.round(((p - min) / (max - min)) * 16);
                  return (
                    <span
                      key={i}
                      className="w-[5px] rounded-sm bg-emerald-500/70"
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {pos ? `Você tem ${pos.quantidade} cota${pos.quantidade !== 1 ? "s" : ""}` : "Sem posição"}
                </span>
                <span>Dividendo: {(info.dividendYield * 100).toFixed(1)}%/rodada</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => acao("compra", pos, info, 1)}
                  className="btn-primary rounded-lg py-1.5 text-xs"
                >
                  Comprar
                </button>
                <button
                  onClick={() => acao("compra", pos, info, 5)}
                  className="btn-primary rounded-lg py-1.5 text-xs"
                >
                  +5
                </button>
                <button
                  onClick={() => pos && pos.quantidade > 0 && acao("venda", pos, info, pos.quantidade)}
                  disabled={!pos || pos.quantidade === 0}
                  className="rounded-lg border border-rose-900/50 bg-rose-950/30 py-1.5 text-xs font-bold text-rose-300 disabled:opacity-30"
                >
                  Vender tudo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico de dividendos/compras (§25). */}
      {bolsa && bolsa.transacoes.length > 0 && (
        <div className="panel !p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Últimas operações
          </p>
          <div className="mt-2 space-y-1.5">
            {bolsa.transacoes.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span>{ativoInfo(t.ativoId).emoji}</span>
                  <span className="capitalize">{t.tipo}</span> ·{" "}
                  {t.quantidade} cota{t.quantidade !== 1 ? "s" : ""}
                </span>
                <span className={t.tipo === "compra" ? "text-rose-300" : "text-emerald-300"}>
                  {t.tipo === "compra" ? "-" : "+"}{fmtSOV(t.valor)} SOV
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VariacaoBadge({ valor }: { valor: number }) {
  if (Math.abs(valor) < 0.01) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  return valor > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400">
      <ArrowUpRight className="size-3" /> +{valor.toFixed(1)}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-400">
      <ArrowDownRight className="size-3" /> {valor.toFixed(1)}%
    </span>
  );
}

function fmtSOV(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
