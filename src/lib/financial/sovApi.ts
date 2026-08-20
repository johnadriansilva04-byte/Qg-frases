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

export type SovModule = "career" | "rpg" | "online" | "market" | "campus";
export type SovTipo = "reward" | "penalty" | "bet_win" | "bet_loss" | "fee" | "transfer";

/**
 * Registra uma transação de soberania no bank_ledger (e ajusta o saldo).
 * Retorna o saldo resultante — usado para sincronizar o cache
 * `pontos_soberania`. Falha silenciosa: retorna null em erro.
 */
export async function registrarTransacaoSov(
  userId: string,
  amount: number,
  tipo: SovTipo,
  descricao: string,
  modulo: SovModule,
  metadata?: Record<string, unknown>,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("registrar_transacao_soberania", {
      p_user_id: userId,
      p_amount: amount,
      p_type: tipo,
      p_description: descricao,
      p_source_module: modulo,
      p_metadata: (metadata ?? {}) as Json,
    });
    if (error) throw error;
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.warn("[SovAPI] transação de soberania falhou:", e);
    return null;
  }
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
    console.warn("[SovAPI] saldo indisponível:", e);
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
  try {
    await supabase.rpc("create_or_update_wallet", { p_user_id: userId });
  } catch (e) {
    console.warn("[SovAPI] create_or_update_wallet falhou:", e);
  }
}
