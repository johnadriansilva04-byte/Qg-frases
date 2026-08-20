import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Wallet } from "lucide-react";
import type { BolsaState, CareerState, PosicaoBolsa } from "./types";
import { ATIVOS, custoCompra, patrimonioJogador, ativoInfo } from "./bolsaEngine";
import type { AtivoId } from "./types";

type Props = {
  career: CareerState;
  onComprar: (ativoId: AtivoId, quantidade: number) => void;
  onVender: (ativoId: AtivoId, quantidade: number) => void;
  onBack: () => void;
};

/**
 * Bolsa de Valores da Cidadela (tela própria, §17): patrimônio do jogador,
 * patrimônio total da Cidadela, ativos reais do universo (Clube, Ciência,
 * Biblioteca, Trilha), compra/venda e histórico de dividendos.
 */
export function EconomiaScreen({ career, onComprar, onVender, onBack }: Props) {
  const bolsa = useMemo(() => (career.bolsa ? career.bolsa : null), [career.bolsa]);
  const patrimonio = useMemo(() => patrimonioJogador(career), [career]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const patrimonioCidadela = bolsa?.patrimonioCidadela ?? 10_000_000;

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
      if (career.coach.soberania < custo) {
        setFeedback("Saldo SOV insuficiente para esta compra.");
        return;
      }
      onComprar(info.ativoId, qtd);
      setFeedback(`${qtd} cota${qtd > 1 ? "s" : ""} de ${info.nome} comprada${qtd > 1 ? "s" : ""}.`);
      return;
    }
    onVender(info.ativoId, qtd);
    setFeedback(`${qtd} cota${qtd > 1 ? "s" : ""} de ${info.nome} vendida${qtd > 1 ? "s" : ""}.`);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho da tela própria: título + voltar (§17). */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft className="size-4" /> Voltar ao Hub
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Economicidade · Bolsa de Valores
        </span>
      </div>

      {/* Patrimônios (§22). */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sovereignty-panel p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <Wallet className="size-4" /> Patrimônio do Jogador
          </p>
          <p className="mt-2 font-display text-2xl">{fmtSOV(patrimonio.total)} SOV</p>
          <p className="text-xs text-muted-foreground">
            {fmtSOV(patrimonio.sobCarteira)} em carteira · {fmtSOV(patrimonio.investido)} investido
          </p>
        </div>
        <div className="sovereignty-panel p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            <TrendingUp className="size-4" /> Patrimônio da Cidadela
          </p>
          <p className="mt-2 font-display text-2xl">{fmtSOV(patrimonioCidadela)} SOV</p>
          <p className="text-xs text-muted-foreground">Índice econômico total do ecossistema</p>
        </div>
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
