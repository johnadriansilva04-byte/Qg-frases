import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { BolsaState } from "@/components/botao/career/types";
import {
  ATIVOS,
  ativoInfo,
  garantirBolsa,
  valorCarteira,
} from "@/components/botao/career/bolsaEngine";

/**
 * Resumo SOMENTE LEITURA da Bolsa de Valores da Cidadela onde o estado vive
 * UMA vez (carreira. JSONB). Renderizado dentro do "Banco" do celular e no
 * hub de Gestão Comercial (Empresário) — sem escrever estado paralelo.
 * Operações (compra/venda) acontecem SÓ na tela Economia da Carreira.
 */
export function BolsaResumoCard({
  bolsa: bruta,
}: {
  bolsa: BolsaState | undefined;
}) {
  const bolsa = garantirBolsa(bruta);
  const investido = valorCarteira(bolsa);
  const carteira = bolsa.carteira.filter((p) => p.quantidade > 0);

  return (
    <section className="rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/10 to-transparent p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-300">
          <Wallet className="size-3.5" />
          Bolsa da Cidadela
        </h3>
        <span className="text-[10px] font-bold text-emerald-200/80">
          índice {Math.round(bolsa.patrimonioCidadela).toLocaleString("pt-BR")}
        </span>
      </header>

      <p className="text-[11px] text-emerald-100/90">
        Investido: <strong>{investido.toFixed(1)} SOV</strong>
      </p>

      {carteira.length === 0 ? (
        <p className="mt-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2 text-[11px] text-emerald-200/70">
          Sem posições ainda — compras e vendas acontecem na tela Economia da
          Carreira (ao final da rodada a cotação reage aos resultados reais).
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {carteira.map((p) => {
            const info = ativoInfo(p.ativoId) ?? ATIVOS[0]!;
            const preco = bolsa.precos[p.ativoId] ?? info.precoBase;
            const anterior = bolsa.precosAnteriores[p.ativoId] ?? preco;
            const delta = preco - anterior;
            return (
              <li
                key={p.ativoId}
                className="flex items-center justify-between rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2 py-1.5 text-[11px]"
              >
                <span className="font-bold text-emerald-100">
                  {info.nome}
                  <span className="ml-1.5 font-normal text-emerald-200/60">
                    ×{p.quantidade}
                  </span>
                </span>
                <span className="flex items-center gap-1 font-mono tabular-nums text-emerald-200">
                  {(preco * p.quantidade).toFixed(1)}
                  {delta > 0.005 ? (
                    <TrendingUp className="size-3 text-emerald-400" />
                  ) : delta < -0.005 ? (
                    <TrendingDown className="size-3 text-rose-400" />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
