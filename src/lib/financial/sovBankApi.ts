/**
 * API do SOV BANK (livro-caixa central da Cidadela).
 *
 * Envolve as RPCs `sov_bank_*`: extrato rastreável, reconciliação,
 * estatísticas agregadas da economia, bônus de cadastro e notícias
 * econômicas derivadas do ledger. Falha silenciosa: funções de leitura
 * retornam valores vazios quando a migração ainda não foi aplicada.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ExtratoItem = {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  balance_before: number | null;
  balance_after: number;
  description: string | null;
  source_module: string;
  source_event: string | null;
  idempotency_key: string | null;
  metadata: Json;
  created_at: string;
};

/** Extrato do usuário com origem rastreável de cada movimentação. */
export async function obterExtrato(userId: string, limite = 50): Promise<ExtratoItem[]> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_extrato", {
      p_user_id: userId,
      p_limite: limite,
    });
    if (error) throw error;
    return (data ?? []) as ExtratoItem[];
  } catch (e) {
    console.warn("[SovBank] extrato indisponível:", e);
    return [];
  }
}

export type Reconciliacao = {
  saldo_carteira: number;
  saldo_ledger: number;
  consistente: boolean;
};

/** Compara o saldo materializado com a soma do ledger (nunca corrige). */
export async function reconciliarConta(userId: string): Promise<Reconciliacao | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_reconciliar", {
      p_user_id: userId,
    });
    if (error) throw error;
    const linha = (data as Reconciliacao[] | null)?.[0];
    return linha ?? null;
  } catch (e) {
    console.warn("[SovBank] reconciliação indisponível:", e);
    return null;
  }
}

export type EstatisticasEconomia = {
  moeda: string;
  limite_emissao: number;
  limite_usuarios: number;
  emitido_total: number;
  retirado_total: number;
  em_circulacao: number;
  disponivel_emissao: number;
  usuarios_com_carteira: number;
  vagas_restantes: number;
  transacoes_total: number;
  alertas_reconciliacao: number;
};

/** Estoque monetário agregado (calculado de dados reais do ledger). */
export async function obterEstatisticas(): Promise<EstatisticasEconomia | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_stats");
    if (error) throw error;
    return (data as unknown as EstatisticasEconomia) ?? null;
  } catch (e) {
    console.warn("[SovBank] stats indisponíveis:", e);
    return null;
  }
}

export type NoticiaEconomica = {
  titulo: string;
  corpo: string;
  fonte: string;
};

/** Notícias econômicas derivadas de dados reais (nunca inventadas). */
export async function obterNoticias(): Promise<NoticiaEconomica[]> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_noticias");
    if (error) throw error;
    return (data as unknown as NoticiaEconomica[]) ?? [];
  } catch (e) {
    console.warn("[SovBank] notícias indisponíveis:", e);
    return [];
  }
}

/**
 * Credita o bônus de cadastro de forma idempotente (chave `signup:{user}`).
 * Retorna o saldo resultante; `false` quando já creditado ou fora da remessa.
 */
export async function bonusCadastro(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("sov_bank_bonus_cadastro", {
      p_user_id: userId,
    });
    if (error) throw error;
    const linha = (data as { credited: boolean; balance: number }[] | null)?.[0];
    return typeof linha?.balance === "number" ? linha.balance : null;
  } catch (e) {
    console.warn("[SovBank] bônus de cadastro indisponível:", e);
    return null;
  }
}
