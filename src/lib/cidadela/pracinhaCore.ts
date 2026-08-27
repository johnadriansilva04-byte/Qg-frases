import { supabase } from "@/integrations/supabase/client";
import { AIService } from "@/components/botao/ai/AIService";
import { initializeSovereignBank } from "@/lib/financial/sovereignBank";

export type MissaoStatus = "ativa" | "completa" | "resgatada";

export type ItemCidadela = {
  slug: string;
  nome: string;
  tipo: string;
  descricao?: string | undefined;
};

export type InventarioCidadela = {
  item_slug: string;
  quantidade: number;
  item?: ItemCidadela | undefined;
};

export type OfertaCidadela = {
  id: string;
  item_slug: string;
  quantidade: number;
  preco_sov: number;
  seller_id?: string | undefined;
  seller_nome?: string | undefined;
  item?: ItemCidadela | undefined;
};

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

// Definições de missões locais (fallback quando Supabase não tem tabelas)
const MISSOES_LOCAIS: Omit<MissaoDiaria, "id" | "progresso" | "status">[] = [
  {
    missao_key: "botao_vitoria",
    titulo: "Ganhe um jogo",
    descricao: "Vença uma partida no modo carreira",
    alvo: 1,
    recompensa_sov: 5,
  },
  {
    missao_key: "botao_partida",
    titulo: "Jogue 3 partidas",
    descricao: "Dispute 3 partidas no modo carreira",
    alvo: 3,
    recompensa_sov: 8,
  },
  {
    missao_key: "trilha_jogo",
    titulo: "Jogue Trilha",
    descricao: "Entre na Cidadela e jogue uma partida de Trilha",
    alvo: 1,
    recompensa_sov: 5,
  },
  {
    missao_key: "chat_convite",
    titulo: "Convide alguém",
    descricao: "Envie uma mensagem no grupo da Cidadela",
    alvo: 1,
    recompensa_sov: 3,
  },
  {
    missao_key: "explorar_mercado",
    titulo: "Explore o mercado",
    descricao: "Acesse o Marketplace do celular",
    alvo: 1,
    recompensa_sov: 2,
  },
];

const STORAGE_KEY = "pracinha_missoes";
const CHAT_STORAGE_KEY = "pracinha_chat";

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

export async function carregarMissoesDiarias(userId: string): Promise<MissaoDiaria[]> {
  // Tenta usar Supabase primeiro
  const { data, error } = await supabase.rpc("cidadela_gerar_missoes_diarias");
  if (!error && data) {
    return data as MissaoDiaria[];
  }

  // Fallback para localStorage se Supabase não tiver as tabelas
  console.warn("[Pracinha] Usando sistema de missões local (Supabase indisponível)");
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Inicializa missões do dia
    const hoje = new Date().toISOString().split('T')[0];
    const novas: MissaoDiaria[] = MISSOES_LOCAIS.map((m) => ({
      ...m,
      id: `${userId}-${m.missao_key}-${hoje}`,
      progresso: 0,
      status: "ativa" as MissaoStatus,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: hoje, missoes: novas }));
    return novas;
  }

  const parsed = JSON.parse(stored);
  const dataArmazenada = parsed.data;
  const hoje = new Date().toISOString().split('T')[0];

  // Se for dia diferente, reseta missões
  if (dataArmazenada !== hoje) {
    const novas: MissaoDiaria[] = MISSOES_LOCAIS.map((m) => ({
      ...m,
      id: `${userId}-${m.missao_key}-${hoje}`,
      progresso: 0,
      status: "ativa" as MissaoStatus,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: hoje, missoes: novas }));
    return novas;
  }

  return parsed.missoes;
}

export async function registrarEventoMissao(
  chave: EventoMissao,
  delta = 1,
): Promise<MissaoStatus | null> {
  // Tenta Supabase primeiro
  const { data, error } = await supabase.rpc("cidadela_progresso_missao", {
    p_chave: chave,
    p_delta: delta,
  });
  if (!error && data) {
    return data as MissaoStatus;
  }

  // Fallback local
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const parsed = JSON.parse(stored);
  const missoes = parsed.missoes as MissaoDiaria[];

  // Mapeia evento para chave de missão
  const chaveMissao: Record<EventoMissao, string> = {
    trilha_online: "trilha_jogo",
    botao_vitoria_carreira: "botao_vitoria",
    botao_partida_carreira: "botao_partida",
    chat_convite: "chat_convite",
    market_trade: "explorar_mercado",
    celular_decisao: "botao_partida",
    explorar_pergaminhos: "explorar_mercado",
  };

  const missaoKey = chaveMissao[chave];
  const missao = missoes.find((m) => m.missao_key === missaoKey);

  if (missao && missao.status === "ativa") {
    missao.progresso = Math.min(missao.alvo, missao.progresso + delta);
    if (missao.progresso >= missao.alvo) {
      missao.status = "completa";
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return missao.status;
  }

  return null;
}

export async function resgatarMissao(missaoId: string): Promise<number | null> {
  // Tenta Supabase primeiro
  const { data, error } = await supabase.rpc("cidadela_resgatar_missao", {
    p_missao_id: missaoId,
  });
  if (!error && typeof data === "number") {
    return data;
  }

  // Fallback local
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const parsed = JSON.parse(stored);
  const missoes = parsed.missoes as MissaoDiaria[];
  const missao = missoes.find((m) => m.id === missaoId);

  if (missao && missao.status === "completa") {
    missao.status = "resgatada";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return missao.recompensa_sov;
  }

  return null;
}

export async function carregarChatCidadela(limit = 60): Promise<MensagemChatCidadela[]> {
  try {
    // Tenta Supabase primeiro
    const { data, error } = await supabase
      .from("cidadela_chat_messages")
      .select("id,sender_id,sender_nome,tipo,texto,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return ((data ?? []) as MensagemChatCidadela[]).reverse();
    }

    // Fallback local
    console.warn("[Pracinha] Usando chat local (Supabase indisponível):", error);
  } catch (error) {
    console.warn("[Pracinha] Erro ao carregar chat do Supabase:", error);
  }

  // Fallback local
  const stored = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!stored) return [];

  const parsed = JSON.parse(stored);
  return (parsed.messages || []).slice(-limit);
}

export async function enviarMensagemCidadela(
  userId: string,
  nomeJogador: string,
  texto: string,
): Promise<boolean> {
  const limpo = texto.trim();
  if (!limpo) return false;

  // Tenta Supabase primeiro
  const { error } = await supabase.from("cidadela_chat_messages").insert({
    sender_id: userId,
    sender_nome: nomeJogador || "Recruta",
    tipo: "jogador",
    texto: limpo.slice(0, 500),
  });

  if (!error) {
    if (/\b(jogar|joga|partida|partidinha|desafio|convite|bora)\b/i.test(limpo)) {
      void registrarEventoMissao("chat_convite");
    }
    return true;
  }

  // Fallback local
  console.warn("[Pracinha] Usando chat local (Supabase indisponível)");
  const stored = localStorage.getItem(CHAT_STORAGE_KEY);
  const parsed = stored ? JSON.parse(stored) : { messages: [] };

  const novaMsg: MensagemChatCidadela = {
    id: `local-${Date.now()}`,
    sender_id: userId,
    sender_nome: nomeJogador || "Recruta",
    tipo: "jogador",
    texto: limpo.slice(0, 500),
    created_at: new Date().toISOString(),
  };

  parsed.messages.push(novaMsg);
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(parsed));

  if (/\b(jogar|joga|partida|partidinha|desafio|convite|bora)\b/i.test(limpo)) {
    void registrarEventoMissao("chat_convite");
  }
  return true;
}

// Funções de marketplace e inventário (Feira da Cidadela — migração feira.sql).
// Catálogo de itens (cacheado por sessão) para enriquecer inventário/ofertas.
let catalogoCache: Map<string, ItemCidadela> | null = null;

async function carregarCatalogo(): Promise<Map<string, ItemCidadela>> {
  if (catalogoCache) return catalogoCache;
  const { data, error } = await supabase.from("cidadela_itens").select("slug,nome,tipo,descricao");
  if (error) {
    console.warn("[Pracinha] Catálogo indisponível:", error.message);
    return new Map();
  }
  catalogoCache = new Map(
    ((data ?? []) as ItemCidadela[]).map((i) => [i.slug, i]),
  );
  return catalogoCache;
}

export async function carregarInventario(_userId: string): Promise<InventarioCidadela[]> {
  const { data, error } = await supabase.from("cidadela_inventory").select("item_slug,quantidade");
  if (error) {
    console.warn("[Pracinha] Inventário indisponível:", error.message);
    return [];
  }
  const catalogo = await carregarCatalogo();
  return ((data ?? []) as InventarioCidadela[]).map((inv) => ({
    ...inv,
    item: catalogo.get(inv.item_slug),
  }));
}

export async function carregarOfertasMarketplace(): Promise<OfertaCidadela[]> {
  const { data, error } = await supabase
    .from("cidadela_market_listings")
    .select("id,seller_id,seller_nome,item_slug,quantidade,preco_sov")
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    console.warn("[Pracinha] Marketplace indisponível:", error.message);
    return [];
  }
  const catalogo = await carregarCatalogo();
  return ((data ?? []) as OfertaCidadela[]).map((o) => ({
    ...o,
    item: catalogo.get(o.item_slug),
  }));
}

export async function criarOfertaMarketplace(
  itemSlug: string,
  quantidade: number,
  precoSov: number,
): Promise<boolean> {
  const { error } = await supabase.rpc("feira_publicar_oferta", {
    p_item_slug: itemSlug,
    p_quantidade: quantidade,
    p_preco: precoSov,
  });
  if (error) {
    console.warn("[Pracinha] publicar oferta falhou:", error.message);
    return false;
  }
  void registrarEventoMissao("market_trade");
  return true;
}

/** Compra uma oferta: débito/crédito passam pelo SOV Bank (RPC autoritativa). */
export async function comprarOfertaMarketplace(ofertaId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("feira_comprar", { p_oferta_id: ofertaId });
  if (error) {
    console.warn("[Pracinha] compra falhou:", error.message);
    return null;
  }
  const linha = (data as { balance?: number }[] | null)?.[0];
  return typeof linha?.balance === "number" ? linha.balance : null;
}

/** Concede um item por evento real do jogo (idempotente por usuário+evento). */
export async function concederItemFeira(
  itemSlug: string,
  evento: string,
  quantidade = 1,
): Promise<boolean> {
  const { error } = await supabase.rpc("feira_conceder_item", {
    p_item_slug: itemSlug,
    p_evento: evento,
    p_quantidade: quantidade,
  });
  if (error) {
    console.warn("[Pracinha] concessão de item falhou:", error.message);
    return false;
  }
  return true;
}

// Saldo SOV: leitura canônica em src/lib/financial/sovApi.ts (RPC
// obter_saldo_soberania). A leitura NUNCA cria carteira (create_or_update_wallet
// era chamado aqui a cada leitura — escrita redundante no caminho de leitura).
