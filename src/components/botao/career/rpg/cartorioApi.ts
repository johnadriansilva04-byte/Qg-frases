/**
 * API do Cartório da Cidadela: pedidos pendentes e documentos lavrados.
 * O RPG dispara o pedido; a Biblioteca (Cartório) lavra o documento.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type CartorioTipo = "contrato" | "peticao" | "multa";

export interface PedidoCartorio {
  id: string;
  user_id: string;
  tipo: CartorioTipo;
  status: "pendente" | "concluido";
  titulo: string;
  dados: Json;
  created_at: string;
  concluido_em: string | null;
}

export interface DocumentoCartorio {
  id: string;
  pedido_id: string | null;
  tipo: CartorioTipo;
  titulo: string;
  conteudo: string;
  dados: Json;
  created_at: string;
}

/** Cria um pedido pendente no Cartório. Retorna o id do pedido (ou null). */
export async function criarPedidoCartorio(
  userId: string,
  tipo: CartorioTipo,
  titulo: string,
  dados?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("criar_pedido_cartorio", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_dados: (dados ?? {}) as Json,
    });
    if (error) throw error;
    return typeof data === "string" ? data : null;
  } catch (e) {
    console.warn("[cartorio] falha ao criar pedido:", e);
    return null;
  }
}

/** Lista pedidos do usuário (pendentes primeiro). */
export async function listarPedidosCartorio(
  userId: string,
  somentePendentes: boolean = false,
): Promise<PedidoCartorio[]> {
  try {
    let q = supabase
      .from("cartorio_pedidos")
      .select("id, user_id, tipo, status, titulo, dados, created_at, concluido_em")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (somentePendentes) q = q.eq("status", "pendente");
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PedidoCartorio[];
  } catch (e) {
    console.warn("[cartorio] falha ao listar pedidos:", e);
    return [];
  }
}

/** Busca um pedido específico por id. */
export async function buscarPedidoCartorio(
  pedidoId: string,
): Promise<PedidoCartorio | null> {
  try {
    const { data, error } = await supabase
      .from("cartorio_pedidos")
      .select("id, user_id, tipo, status, titulo, dados, created_at, concluido_em")
      .eq("id", pedidoId)
      .maybeSingle();
    if (error) throw error;
    return (data as PedidoCartorio | null) ?? null;
  } catch (e) {
    console.warn("[cartorio] falha ao buscar pedido:", e);
    return null;
  }
}

/** Marca o pedido como concluído (sem lavrar documento). */
export async function concluirPedidoCartorio(pedidoId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("concluir_pedido_cartorio", {
      p_pedido_id: pedidoId,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[cartorio] falha ao concluir pedido:", e);
    return false;
  }
}

/** Lava um documento e (se informado) conclui o pedido pendente. */
export async function salvarDocumentoCartorio(
  userId: string,
  pedidoId: string | null,
  tipo: CartorioTipo,
  titulo: string,
  conteudo: string,
  dados?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("salvar_documento_cartorio", {
      p_user_id: userId,
      p_pedido_id: pedidoId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_conteudo: conteudo,
      p_dados: (dados ?? {}) as Json,
    });
    if (error) throw error;
    return typeof data === "string" ? data : null;
  } catch (e) {
    console.warn("[cartorio] falha ao lavrar documento:", e);
    return null;
  }
}

/** Lista os documentos lavrados do usuário. */
export async function listarDocumentosCartorio(
  userId: string,
  limite: number = 30,
): Promise<DocumentoCartorio[]> {
  try {
    const { data, error } = await supabase
      .from("cartorio_documentos")
      .select("id, pedido_id, tipo, titulo, conteudo, dados, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as DocumentoCartorio[];
  } catch (e) {
    console.warn("[cartorio] falha ao listar documentos:", e);
    return [];
  }
}

/** Link da Biblioteca com contexto do pedido (usado nas mensagens do celular). */
export function linkBiblioteca(pedido: PedidoCartorio | { id: string; tipo: CartorioTipo }): string {
  return `/biblioteca?acao=${pedido.tipo}&pedidoId=${pedido.id}`;
}
