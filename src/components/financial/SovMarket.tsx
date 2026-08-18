/**
 * Módulo SOV Market / Marketplace
 * Interface para troca de SOV por itens, recompensas e vantagens
 */

import { useState, useEffect } from "react";
import { ShoppingCart, Coins, Sparkles, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSovereignBank } from "@/lib/financial/sovereignBank";
import type { SovMarketProduct, SovMarketTransaction, MarketCategory } from "@/lib/financial/types";

export function SovMarket() {
  const [products, setProducts] = useState<SovMarketProduct[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  const bank = getSovereignBank();

  useEffect(() => {
    loadProducts();
    loadUserBalance();
    loadPurchasedItems();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("sov_market_products")
      .select("*")
      .eq("is_active", true)
      .order("price_sov", { ascending: true });

    if (error) {
      console.error("[SovMarket] Erro ao carregar produtos:", error);
    } else {
      setProducts((data || []) as SovMarketProduct[]);
    }
    setLoading(false);
  };

  const loadUserBalance = async () => {
    // Aqui precisaria do userId real do contexto de autenticação
    // Por enquanto, usando um placeholder
    const balance = await bank.getUserBalance("placeholder-user-id");
    setUserBalance(balance);
  };

  const loadPurchasedItems = async () => {
    // Aqui precisaria do userId real do contexto de autenticação
    const { data, error } = await supabase
      .from("sov_market_transactions")
      .select("product_id")
      .eq("user_id", "placeholder-user-id")
      .eq("status", "completed");

    if (!error && data) {
      setPurchasedItems(new Set(data.map((t) => t.product_id)));
    }
  };

  const handlePurchase = async (product: SovMarketProduct) => {
    if (userBalance < product.price_sov) {
      alert("Saldo insuficiente!");
      return;
    }

    setPurchaseLoading(product.id);

    try {
      // Processar transação de compra
      const result = await bank.processTransaction({
        user_id: "placeholder-user-id",
        amount: -product.price_sov,
        transaction_type: "market_purchase",
        source_module: "market",
        description: `Compra: ${product.name}`,
        metadata: {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
        },
      });

      if (result.success) {
        // Registrar transação no marketplace
        await supabase.from("sov_market_transactions").insert({
          user_id: "placeholder-user-id",
          product_id: product.id,
          amount_sov: product.price_sov,
          status: "completed",
          metadata: {
            transaction_id: result.transaction_id,
          },
        });

        // Atualizar estado
        setUserBalance(result.new_balance || 0);
        setPurchasedItems((prev) => new Set(prev).add(product.id));

        alert(`Compra realizada: ${product.name}`);
      } else {
        alert(`Erro na compra: ${result.error}`);
      }
    } catch (error) {
      console.error("[SovMarket] Erro na compra:", error);
      alert("Erro ao processar compra");
    } finally {
      setPurchaseLoading(null);
    }
  };

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const categories: Array<MarketCategory | "all"> = ["all", "item", "reward", "advantage", "cosmetic"];

  const getCategoryLabel = (category: MarketCategory | "all"): string => {
    const labels: Record<MarketCategory | "all", string> = {
      all: "Todos",
      item: "Itens",
      reward: "Recompensas",
      advantage: "Vantagens",
      cosmetic: "Cosméticos",
    };
    return labels[category];
  };

  const getCategoryColor = (category: MarketCategory): string => {
    const colors: Record<MarketCategory, string> = {
      item: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      reward: "bg-green-500/10 text-green-500 border-green-500/30",
      advantage: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      cosmetic: "bg-pink-500/10 text-pink-500 border-pink-500/30",
    };
    return colors[category];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SOV Market</h1>
              <p className="text-sm text-muted-foreground">Central de Trocas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <Coins className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">{userBalance.toFixed(2)} SOV</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Filtros de categoria */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-foreground hover:bg-secondary"
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        {/* Grid de produtos */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const isPurchased = purchasedItems.has(product.id);
            const canAfford = userBalance >= product.price_sov;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-xl border transition-all ${
                  isPurchased
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-surface/50 border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
                    {getCategoryLabel(product.category)}
                  </div>
                  {isPurchased ? (
                    <div className="flex items-center gap-1 text-green-500 text-sm">
                      <Unlock className="w-4 h-4" />
                      <span>Adquirido</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Bloqueado</span>
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary">{product.price_sov.toFixed(2)} SOV</span>
                  </div>

                  {!isPurchased && (
                    <button
                      onClick={() => handlePurchase(product)}
                      disabled={!canAfford || purchaseLoading === product.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        canAfford
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      } ${purchaseLoading === product.id ? "opacity-50" : ""}`}
                    >
                      {purchaseLoading === product.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      ) : (
                        "Comprar"
                      )}
                    </button>
                  )}
                </div>

                {product.stock > 0 && product.stock < 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Apenas {product.stock} disponíveis!
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum produto encontrado nesta categoria</p>
          </div>
        )}
      </main>
    </div>
  );
}
