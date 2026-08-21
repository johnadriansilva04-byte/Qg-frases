/**
 * API do Banco Central SOV (user_wallets/bank_ledger).
 *
 * A soberania do jogo vive em `user_wallets.balance` (fonte de verdade) e
 * todo movimento é rastreado em `bank_ledger`. A coluna legada
 * `botao_usuarios.pontos_soberania` continua existindo como cache para o
 * leaderboard, mas nunca é a fonte de leitura.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SovModule = "career" | "rpg" | "online" | "market" | "campus" | "mission" | "system";
export type SovTipo = "reward" | "penalty" | "bet_win" | "bet_loss" | "fee" | "transfer";

export type SovOpcoes = {
  /** Evento de origem (ex.: "missao_diaria", "coletiva", "dividendo"). */
  sourceEvent?: string;
  /** Chave idempotente — o mesmo evento nunca credita duas vezes. */
  idempotencyKey?: string;
};

/** Linha retornada por sov_bank_registrar (TABLE transaction_id/balance/duplicated). */
type LinhaRegistrar = { transaction_id?: string | null; balance?: number; duplicated?: boolean };

/**
 * Log completo do erro PostgREST (código/mensagem/detalhes/hint) + payload.
 * "Failed to load resource: 400" no console do navegador é só o sintoma de
 * rede; o corpo da resposta explica a causa real (uuid inválido, RAISE
 * EXCEPTION, RLS, função ausente). Nunca engolir sem logar.
 */
function logErroRpc(nome: string, payload: Record<string, unknown>, erro: unknown) {
  const e = erro as { code?: string; message?: string; details?: string; hint?: string };
  console.warn(`[SovAPI] RPC ${nome} falhou`, {
    code: e?.code ?? null,
    message: e?.message ?? String(erro),
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    payload,
  });
}

/**
 * Registra uma transação de soberania no bank_ledger (e ajusta o saldo).
 * Porta de entrada central: `sov_bank_registrar` (idempotência + teto de
 * emissão + origem rastreável). Retorna o saldo resultante — usado para
 * sincronizar o cache `pontos_soberania`. Falha silenciosa: null em erro.
 *
 * Fallback para `registrar_transacao_soberania` SOMENTE quando a RPC nova
 * não existe no banco (migração sov_bank.sql ainda não aplicada) — nunca
 * em erro de duplicidade/teto, para não burlar a idempotência.
 */
export async function registrarTransacaoSov(
  userId: string,
  amount: number,
  tipo: SovTipo,
  descricao: string,
  modulo: SovModule,
  metadata?: Record<string, unknown>,
  opcoes?: SovOpcoes,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_registrar", {
      p_user_id: userId,
      p_amount: amount,
      p_type: tipo,
      p_description: descricao,
      p_source_module: modulo,
      p_source_event: opcoes?.sourceEvent ?? null,
      p_idempotency_key: opcoes?.idempotencyKey ?? null,
      p_metadata: (metadata ?? {}) as Json,
    });
    if (error) {
      // PGRST202/42883 = função inexistente no PostgREST/Postgres.
      const codigo = (error as { code?: string }).code;
      if (codigo !== "PGRST202" && codigo !== "42883") throw error;
      return await registrarLegado(userId, amount, tipo, descricao, modulo, metadata);
    }
    const linha = (data as LinhaRegistrar[] | null)?.[0];
    /* A versão antiga de sov_bank_registrar ENGOLIA qualquer EXCEPTION
       ("WHEN OTHERS ... RETURN NULL, 0, FALSE") — inclusive "saldo
       insuficiente", teto de emissão e violação de auth — devolvendo uma
       linha com transaction_id NULL. Tratar como falha: o chamador cai no
       fallback local em vez de gravar saldo 0 no cache (estado falso).
       A migração sov_bank.sql foi corrigida para propagar o erro; depois
       de re-aplicada no banco, este guarda vira redundante e permanece
       como defesa em profundidade. */
    if (!linha || linha.transaction_id == null) {
      logErroRpc("sov_bank_registrar (transação não gravada)", { p_user_id: userId, p_amount: amount, p_type: tipo, retorno: linha ?? null }, {});
      return null;
    }
    return typeof linha.balance === "number" ? linha.balance : null;
  } catch (e) {
    logErroRpc(
      "sov_bank_registrar",
      { p_user_id: userId, p_amount: amount, p_type: tipo, p_source_module: modulo },
      e,
    );
    return null;
  }
}

/** Caminho legado (pré-sov_bank.sql): registrar_transacao_soberania. */
async function registrarLegado(
  userId: string,
  amount: number,
  tipo: SovTipo,
  descricao: string,
  modulo: SovModule,
  metadata?: Record<string, unknown>,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("registrar_transacao_soberania", {
    p_user_id: userId,
    p_amount: amount,
    p_type: tipo,
    p_description: descricao,
    p_source_module: modulo,
    p_metadata: (metadata ?? {}) as Json,
  });
  if (error) throw error;
  // A RPC retorna TABLE(balance) — o PostgREST entrega um array de linhas,
  // não um número plano. Aceita ambos os formatos (defesa contra futuras
  // migrações que troquem para RETURNS DECIMAL).
  const resultado = data as unknown;
  if (typeof resultado === "number") return resultado;
  if (Array.isArray(resultado) && resultado.length > 0) {
    const linha = resultado[0] as { balance?: number } | undefined;
    if (typeof linha?.balance === "number") return linha.balance;
  }
  return null;
}

/** Saldo atual em user_wallets (fonte de verdade). Falha silenciosa → null. */
export async function obterSaldoSov(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("obter_saldo_soberania", {
      p_user_id: userId,
    });
    if (error) throw error;
    return typeof data === "number" ? data : null;
  } catch (e) {
    logErroRpc("obter_saldo_soberania", { p_user_id: userId }, e);
    return null;
  }
}

export type TransacaoSov = {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  source_module: string;
  metadata: Json;
  created_at: string;
};

/** Histórico do bank_ledger (mais recentes primeiro). */
export async function historicoTransacoes(
  userId: string,
  limite: number = 50,
): Promise<TransacaoSov[]> {
  try {
    const { data, error } = await supabase.rpc("historico_transacoes", {
      p_user_id: userId,
      p_limite: limite,
    });
    if (error) throw error;
    return (data ?? []) as TransacaoSov[];
  } catch (e) {
    console.warn("[SovAPI] histórico indisponível:", e);
    return [];
  }
}

/** Garante que a carteira exista (criada com saldo 0). Fire-and-forget. */
export async function garantirCarteira(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.rpc("create_or_update_wallet", { p_user_id: userId });
  if (error) logErroRpc("create_or_update_wallet", { p_user_id: userId }, error);
}
