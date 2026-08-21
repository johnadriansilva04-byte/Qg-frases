import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, ScrollText, ShoppingCart, Store } from "lucide-react";
import {
  carregarInventario,
  carregarOfertasMarketplace,
  comprarOfertaMarketplace,
  criarOfertaMarketplace,
  obterSaldoSov,
  type InventarioCidadela,
  type OfertaCidadela,
} from "@/lib/cidadela/pracinhaCore";

interface SovMarketProps {
  userId: string | null;
  compact?: boolean | undefined;
}

export function SovMarket({ userId, compact = false }: SovMarketProps) {
  const [inventario, setInventario] = useState<InventarioCidadela[]>([]);
  const [ofertas, setOfertas] = useState<OfertaCidadela[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [itemSelecionado, setItemSelecionado] = useState("");
  const [preco, setPreco] = useState("5");
  const [carregando, setCarregando] = useState(true);
  const [aguardando, setAguardando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const carregarTudo = useCallback(async () => {
    if (!userId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const [inv, ofs, saldoAtual] = await Promise.all([
      carregarInventario(userId),
      carregarOfertasMarketplace(),
      obterSaldoSov(userId),
    ]);
    setInventario(inv);
    setOfertas(ofs);
    setSaldo(saldoAtual);
    setItemSelecionado((prev) => prev || inv[0]?.item_slug || "");
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  const criarOferta = async () => {
    if (!itemSelecionado) return;
    const valor = Number(preco.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      setFeedback("Defina um preço em SOV maior que zero.");
      return;
    }
    setAguardando("criar");
    setFeedback(null);
    const ok = await criarOfertaMarketplace(itemSelecionado, 1, valor);
    if (ok) {
      setFeedback("Oferta publicada no Marketplace.");
      await carregarTudo();
    } else {
      setFeedback("Não foi possível publicar a oferta.");
    }
    setAguardando(null);
  };

  const comprar = async (oferta: OfertaCidadela) => {
    if (saldo < oferta.preco_sov) {
      setFeedback("Saldo SOV insuficiente para esta compra.");
      return;
    }
    setAguardando(oferta.id);
    setFeedback(null);
    const novoSaldo = await comprarOfertaMarketplace(oferta.id);
    if (novoSaldo !== null) {
      setSaldo(novoSaldo);
      setFeedback(`Compra concluída: ${oferta.item?.nome ?? oferta.item_slug}.`);
      await carregarTudo();
    } else {
      setFeedback("Compra não concluída.");
    }
    setAguardando(null);
  };

  const pergaminhos = useMemo(
    () => inventario.filter((item) => item.item?.tipo === "pergaminho"),
    [inventario],
  );

  if (!userId) {
    return (
      <div className="p-4 text-center">
        <Store className="mx-auto mb-3 size-10 text-slate-500" />
        <p className="text-sm font-bold text-white">Marketplace bloqueado</p>
        <p className="mt-1 text-xs text-slate-400">
          Entre com sua conta para negociar Pergaminhos e itens com outros jogadores.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "p-3" : "mx-auto max-w-6xl p-4 sm:p-6"}>
      <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Marketplace da Cidadela</p>
            <p className="mt-1 text-sm text-slate-200">
              Compre e venda Pergaminhos diretamente com jogadores.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/70 px-3 py-2 text-right">
            <p className="text-[10px] uppercase text-slate-400">Saldo</p>
            <p className="flex items-center gap-1 text-sm font-black text-amber-200">
              <Coins className="size-4" />
              {saldo.toFixed(2)} SOV
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
          {feedback}
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Meu inventário ({pergaminhos.length} pergaminho{pergaminhos.length === 1 ? "" : "s"})
        </p>
        {inventario.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            Seu inventário está vazio. Novos Pergaminhos chegam pela comunidade e por eventos.
          </p>
        ) : (
          <div className="grid gap-2">
            {inventario.slice(0, 4).map((item) => (
              <div key={item.item_slug} className="rounded-xl bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {item.item?.nome ?? item.item_slug}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                      {item.item?.descricao ?? "Item negociável da Cidadela."}
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-400/20 px-2 py-1 text-[10px] font-bold text-purple-200">
                    x{item.quantidade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_7rem]">
          <select
            value={itemSelecionado}
            onChange={(event) => setItemSelecionado(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
          >
            {inventario.map((item) => (
              <option key={item.item_slug} value={item.item_slug}>
                {item.item?.nome ?? item.item_slug} (x{item.quantidade})
              </option>
            ))}
          </select>
          <input
            value={preco}
            onChange={(event) => setPreco(event.target.value)}
            inputMode="decimal"
            placeholder="Preço"
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
          />
          <button
            onClick={criarOferta}
            disabled={!itemSelecionado || aguardando !== null}
            className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"
          >
            {aguardando === "criar" ? "Publicando..." : "Anunciar"}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShoppingCart className="size-4 text-emerald-300" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Ofertas da comunidade
          </p>
        </div>

        {carregando ? (
          <div className="py-6 text-center text-xs text-slate-500">Carregando Marketplace...</div>
        ) : ofertas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <ScrollText className="mx-auto mb-2 size-8 text-slate-500" />
            <p className="text-xs text-slate-400">
              Nenhuma oferta ativa agora. Publique seu Pergaminho para movimentar o mercado.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ofertas.map((oferta) => {
              const propria = oferta.seller_id === userId;
              return (
                <div key={oferta.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {oferta.item?.nome ?? oferta.item_slug}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Vendedor: {propria ? "você" : oferta.seller_nome} • Quantidade {oferta.quantidade}
                      </p>
                    </div>
                    <button
                      onClick={() => comprar(oferta)}
                      disabled={propria || aguardando !== null}
                      className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"
                    >
                      {aguardando === oferta.id
                        ? "Comprando..."
                        : propria
                          ? "Sua oferta"
                          : `${oferta.preco_sov.toFixed(2)} SOV`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
