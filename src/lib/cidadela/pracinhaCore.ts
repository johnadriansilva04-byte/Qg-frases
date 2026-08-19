import { supabase } from "@/integrations/supabase/client";
import { AIService } from "@/components/botao/ai/AIService";
import { initializeSovereignBank } from "@/lib/financial/sovereignBank";

export type MissaoStatus = "ativa" | "completa" | "resgatada";

export type MissaoDiaria = {
  id: string;
  missao_key: string;
  titulo: string;
  descricao: string;
  alvo: number;
  progresso: number;
  recompensa_sov: number;
  status: MissaoStatus;
};

export type EventoMissao =
  | "trilha_online"
  | "botao_vitoria_carreira"
  | "botao_partida_carreira"
  | "chat_convite"
  | "market_trade"
  | "celular_decisao"
  | "explorar_pergaminhos";

export type MensagemChatCidadela = {
  id: string;
  sender_id: string | null;
  sender_nome: string;
  tipo: "jogador" | "sistema";
  texto: string;
  created_at: string;
};

export type ItemCidadela = {
  slug: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  raridade: string;
};

export type InventarioCidadela = {
  item_slug: string;
  quantidade: number;
  item: ItemCidadela | null;
};

export type OfertaCidadela = {
  id: string;
  seller_id: string;
  seller_nome: string;
  item_slug: string;
  quantidade: number;
  preco_sov: number;
  status: string;
  created_at: string;
  item: ItemCidadela | null;
};

let bancoIniciado = false;

export async function inicializarPracinha(userId: string) {
  if (!bancoIniciado) {
    try {
      await initializeSovereignBank();
      bancoIniciado = true;
    } catch (error) {
      console.warn("[Pracinha] Banco Central indisponível neste ambiente:", error);
    }
  }

  const missoes = await carregarMissoesDiarias(userId);
  return {
    motorIA: AIService.status(),
    bancoCentral: bancoIniciado ? "ativo" : "pendente_sql",
    missoes,
  };
}

export async function carregarMissoesDiarias(_userId: string): Promise<MissaoDiaria[]> {
  const { data, error } = await supabase.rpc("cidadela_gerar_missoes_diarias");
  if (error) {
    console.warn("[Pracinha] Missões diárias indisponíveis:", error.message);
    return [];
  }
  return (data ?? []) as MissaoDiaria[];
}

export async function registrarEventoMissao(
  chave: EventoMissao,
  delta = 1,
): Promise<MissaoStatus | null> {
  const { data, error } = await supabase.rpc("cidadela_progresso_missao", {
    p_chave: chave,
    p_delta: delta,
  });
  if (error) {
    console.warn(`[Pracinha] Falha ao registrar evento ${chave}:`, error.message);
    return null;
  }
  return (data ?? null) as MissaoStatus | null;
}

export async function resgatarMissao(missaoId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("cidadela_resgatar_missao", {
    p_missao_id: missaoId,
  });
  if (error) {
    console.warn("[Pracinha] Falha ao resgatar missão:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

export async function carregarChatCidadela(limit = 60): Promise<MensagemChatCidadela[]> {
  const { data, error } = await supabase
    .from("cidadela_chat_messages")
    .select("id,sender_id,sender_nome,tipo,texto,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[Pracinha] Chat global indisponível:", error.message);
    return [];
  }
  return ((data ?? []) as MensagemChatCidadela[]).reverse();
}

export async function enviarMensagemCidadela(
  userId: string,
  nomeJogador: string,
  texto: string,
): Promise<boolean> {
  const limpo = texto.trim();
  if (!limpo) return false;

  const { error } = await supabase.from("cidadela_chat_messages").insert({
    sender_id: userId,
    sender_nome: nomeJogador || "Recruta",
    tipo: "jogador",
    texto: limpo.slice(0, 500),
  });

  if (error) {
    console.warn("[Pracinha] Falha ao enviar no Grupo da Cidadela:", error.message);
    return false;
  }

  if (/\b(jogar|joga|partida|partidinha|desafio|convite|bora)\b/i.test(limpo)) {
    void registrarEventoMissao("chat_convite");
  }
  return true;
}

async function itensPorSlug(slugs: string[]): Promise<Map<string, ItemCidadela>> {
  if (slugs.length === 0) return new Map();
  const { data } = await supabase
    .from("cidadela_itens")
    .select("slug,nome,descricao,tipo,raridade")
    .in("slug", slugs);
  return new Map(((data ?? []) as ItemCidadela[]).map((item) => [item.slug, item]));
}

export async function carregarInventario(userId: string): Promise<InventarioCidadela[]> {
  const { data, error } = await supabase
    .from("cidadela_inventory")
    .select("item_slug,quantidade")
    .eq("user_id", userId)
    .gt("quantidade", 0)
    .order("item_slug");

  if (error) {
    console.warn("[Pracinha] Inventário indisponível:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{ item_slug: string; quantidade: number }>;
  const itens = await itensPorSlug(rows.map((row) => row.item_slug));
  return rows.map((row) => ({ ...row, item: itens.get(row.item_slug) ?? null }));
}

export async function carregarOfertasMarketplace(): Promise<OfertaCidadela[]> {
  const { data, error } = await supabase
    .from("cidadela_market_listings")
    .select("id,seller_id,seller_nome,item_slug,quantidade,preco_sov,status,created_at")
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.warn("[Pracinha] Marketplace indisponível:", error.message);
    return [];
  }

  const rows = (data ?? []) as Omit<OfertaCidadela, "item">[];
  const itens = await itensPorSlug(rows.map((row) => row.item_slug));
  return rows.map((row) => ({ ...row, item: itens.get(row.item_slug) ?? null }));
}

export async function criarOfertaMarketplace(
  itemSlug: string,
  quantidade: number,
  precoSov: number,
): Promise<boolean> {
  const { error } = await supabase.rpc("cidadela_criar_oferta", {
    p_item_slug: itemSlug,
    p_quantidade: quantidade,
    p_preco_sov: precoSov,
  });
  if (error) {
    console.warn("[Pracinha] Falha ao criar oferta:", error.message);
    return false;
  }
  return true;
}

export async function comprarOfertaMarketplace(listingId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("cidadela_comprar_oferta", {
    p_listing_id: listingId,
  });
  if (error) {
    console.warn("[Pracinha] Falha ao comprar oferta:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

export async function obterSaldoSov(userId: string): Promise<number> {
  try {
    await supabase.rpc("create_or_update_wallet", { p_user_id: userId });
  } catch {
    // O saldo cai para zero quando a migração financeira ainda não foi aplicada.
  }
  const { data, error } = await supabase
    .from("user_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return 0;
  return Number(data?.balance ?? 0);
}
