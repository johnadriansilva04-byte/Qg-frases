/**
 * SOV INVEST — API da carteira de investimentos (auditoria §3–§10).
 *
 * Duas carteiras do MESMO jogador (nunca duas economias):
 *   SOV Bank   = user_wallets.balance         (dinheiro líquido)
 *   SOV Invest = user_wallets.invest_balance  (dinheiro alocado em investimento)
 *
 * Regras:
 *   Bank → Invest : taxa 0%  (transferência interna — nada nasce nem some)
 *   Invest → Bank : IOF 10%  (a taxa sai de circulação, registrada no ledger)
 *   Dividendos    : caem no SOV Invest (bruto → IOF 10% → líquido no Invest)
 *   Compra/venda  : pagas com / creditadas no SOV Invest, atômico no ledger
 *
 * NENHUM SOV é criado: transferir entre carteiras não muda o total do jogador
 * (a menos da taxa de retirada, que tem destino contábil próprio).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SaldosInvest = {
  /** SOV Bank — dinheiro líquido. */
  bank: number;
  /** SOV Invest — dinheiro alocado em investimento. */
  invest: number;
};

export type ResultadoTransferencia = {
  duplicated: boolean;
  bank: number;
  invest: number;
  valor_solicitado: number;
  taxa: number;
  liquido: number;
};

export type ResultadoDividendo = {
  duplicated: boolean;
  bruto: number;
  taxa: number;
  liquido: number;
  bank: number;
  invest: number;
};

export type ResultadoOperacaoBolsa = {
  duplicated: boolean;
  bank: number;
  invest: number;
  /** Presente na compra. */
  custo?: number;
  /** Presente na venda. */
  bruto?: number;
  taxa?: number;
  liquido?: number;
};

function parse<T>(data: unknown): T | null {
  if (!data || typeof data !== "object") return null;
  return data as T;
}

/** Lê os dois saldos. `null` = carteira inexistente/erro (NUNCA assumir 0). */
export async function obterSaldosInvest(userId: string): Promise<SaldosInvest | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_saldos", { p_user_id: userId });
    if (error) throw error;
    return parse<SaldosInvest>(data);
  } catch (e) {
    console.warn("[SovInvest] saldos indisponíveis:", e);
    return null;
  }
}

/**
 * Bank → Invest (taxa 0%). Interno: o total do jogador não muda.
 */
export async function transferirBankParaInvest(
  userId: string,
  valor: number,
  idempotencyKey: string,
): Promise<ResultadoTransferencia | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_transferir_carteiras", {
      p_user_id: userId,
      p_valor: valor,
      p_direcao: "bank_para_invest",
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    return parse<ResultadoTransferencia>(data);
  } catch (e) {
    console.error("[SovInvest] transferência Bank→Invest falhou:", e);
    return null;
  }
}

/**
 * Invest → Bank (retirada) com IOF de 10%. O bruto sai do Invest; o líquido
 * entra no Bank; a taxa sai de circulação (registrada como 'fee' no ledger).
 */
export async function transferirInvestParaBank(
  userId: string,
  valor: number,
  idempotencyKey: string,
): Promise<ResultadoTransferencia | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_transferir_carteiras", {
      p_user_id: userId,
      p_valor: valor,
      p_direcao: "invest_para_bank",
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    return parse<ResultadoTransferencia>(data);
  } catch (e) {
    console.error("[SovInvest] retirada Invest→Bank falhou:", e);
    return null;
  }
}

/**
 * Registra um dividendo no SOV Invest (bruto → IOF 10% → líquido).
 * Idempotente por `idempotencyKey` (período) — nunca duplica, nunca para
 * depois do primeiro (a chave muda a cada período).
 */
export async function pagarDividendoInvest(
  userId: string,
  bruto: number,
  descricao: string,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<ResultadoDividendo | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_pagar_dividendo", {
      p_user_id: userId,
      p_bruto: bruto,
      p_descricao: descricao,
      p_idempotency_key: idempotencyKey,
      p_metadata: metadata as Json,
    });
    if (error) throw error;
    return parse<ResultadoDividendo>(data);
  } catch (e) {
    console.error("[SovInvest] dividendo falhou:", e);
    return null;
  }
}

/**
 * Compra de ativo: debita o SOV Invest de forma atômica e confirmada ANTES
 * de gravar a posição. Se retornar null, a compra NÃO acontece (sem posição
 * criada). Regra §16: nunca "posição criada + débito falhou".
 */
export async function comprarAtivoInvest(
  userId: string,
  custo: number,
  descricao: string,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<ResultadoOperacaoBolsa | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_comprar_ativo", {
      p_user_id: userId,
      p_custo: custo,
      p_descricao: descricao,
      p_idempotency_key: idempotencyKey,
      p_metadata: metadata as Json,
    });
    if (error) throw error;
    return parse<ResultadoOperacaoBolsa>(data);
  } catch (e) {
    console.error("[SovInvest] compra de ativo falhou:", e);
    return null;
  }
}

/**
 * Venda de ativo: credita o SOV Invest (líquido de IOF 10%) de forma atômica.
 */
export async function venderAtivoInvest(
  userId: string,
  valor: number,
  descricao: string,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<ResultadoOperacaoBolsa | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_vender_ativo", {
      p_user_id: userId,
      p_valor: valor,
      p_descricao: descricao,
      p_idempotency_key: idempotencyKey,
      p_metadata: metadata as Json,
    });
    if (error) throw error;
    return parse<ResultadoOperacaoBolsa>(data);
  } catch (e) {
    console.error("[SovInvest] venda de ativo falhou:", e);
    return null;
  }
}
