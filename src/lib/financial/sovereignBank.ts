/**
 * IA Banco Central (Sovereign Bank)
 * Sistema inteligente de gestão de liquidez e controle de emissão SOV
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  SovereignBankConfig,
  SovereignBankState,
  BankReserve,
  ReserveType,
  TransactionContext,
  TransactionResult,
} from "./types";
import {
  DEFAULT_SOVEREIGN_BANK_CONFIG,
} from "./types";

export class SovereignBank {
  private config: SovereignBankConfig;
  private state: SovereignBankState | null = null;
  private adjustmentInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SovereignBankConfig> = {}) {
    this.config = { ...DEFAULT_SOVEREIGN_BANK_CONFIG, ...config };
  }

  /**
   * Inicializa o Banco Central e carrega o estado atual
   */
  async initialize(): Promise<void> {
    await this.loadReserves();
    await this.calculateYieldRates();
    this.startAutoAdjustment();
  }

  /**
   * Carrega as reservas do banco do Supabase
   */
  private async loadReserves(): Promise<void> {
    const { data, error } = await supabase
      .from("bank_reserves")
      .select("*")
      .order("reserve_type");

    if (error) {
      console.error("[SovereignBank] Erro ao carregar reservas:", error);
      throw error;
    }

    this.state = {
      reserves: data || [],
      current_yield_rates: {},
      utilization_ratios: {},
      is_inflation_control_mode: false,
      last_adjustment: new Date().toISOString(),
    };

    // Calcular taxas de utilização iniciais
    this.calculateUtilizationRatios();
  }

  /**
   * Calcula as taxas de utilização das reservas
   */
  private calculateUtilizationRatios(): void {
    if (!this.state) return;

    this.state.reserves.forEach((reserve) => {
      if (reserve.reserve_type !== "total_supply") {
        const ratio = reserve.allocated_amount / reserve.max_cap;
        this.state!.utilization_ratios[reserve.reserve_type as ReserveType] = ratio;
      }
    });
  }

  /**
   * Calcula e ajusta as taxas de yield baseado nas reservas
   * Lógica da IA: yield aumenta quando reservas estão baixas, diminui quando estão altas
   */
  async calculateYieldRates(): Promise<void> {
    if (!this.state) return;

    const { data, error } = await supabase.rpc("adjust_yield_rate");

    if (error) {
      console.error("[SovereignBank] Erro ao ajustar yield rates:", error);
      return;
    }

    // Atualizar estado com novos yield rates
    if (data) {
      data.forEach((item: { reserve_type: string; new_yield_rate: number }) => {
        this.state!.current_yield_rates[item.reserve_type as ReserveType] = item.new_yield_rate;
      });

      this.state.last_adjustment = new Date().toISOString();

      // Verificar se precisa entrar em modo de controle de inflação
      this.checkInflationControlMode();
    }
  }

  /**
   * Verifica se deve entrar em modo de controle de inflação
   */
  private checkInflationControlMode(): void {
    if (!this.state) return;

    const totalUtilization = Object.values(this.state.utilization_ratios).reduce(
      (sum, ratio) => sum + ratio,
      0
    );

    // Se utilização total > 80%, ativar modo de controle de inflação
    this.state.is_inflation_control_mode = totalUtilization > 0.8;

    if (this.state.is_inflation_control_mode) {
      console.warn("[SovereignBank] Modo de controle de inflação ativado");
    }
  }

  /**
   * Inicia ajuste automático de yield rates (a cada 5 minutos)
   */
  private startAutoAdjustment(): void {
    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
    }

    this.adjustmentInterval = setInterval(() => {
      this.calculateYieldRates();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Para o ajuste automático
   */
  stopAutoAdjustment(): void {
    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
      this.adjustmentInterval = null;
    }
  }

  /**
   * Obtém o estado atual do Banco Central
   */
  getState(): SovereignBankState | null {
    return this.state;
  }

  /**
   * Obtém o yield rate atual para um tipo de reserva
   */
  getYieldRate(reserveType: ReserveType): number {
    if (!this.state) return this.config.base_yield_rate;
    return this.state.current_yield_rates[reserveType] || this.config.base_yield_rate;
  }

  /**
   * Verifica se há liquidez disponível para uma transação
   */
  async checkLiquidity(amount: number, reserveType: ReserveType): Promise<boolean> {
    if (!this.state) return false;

    const reserve = this.state.reserves.find(
      (r) => r.reserve_type === reserveType
    );

    if (!reserve) return false;

    // Verificar se há liquidez suficiente
    const availableLiquidity = reserve.max_cap - reserve.allocated_amount;
    return availableLiquidity >= amount;
  }

  /**
   * Aloca liquidez para uma transação
   */
  async allocateLiquidity(
    amount: number,
    reserveType: ReserveType
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("update_reserve_allocation", {
      p_reserve_type: reserveType,
      p_amount: amount,
      p_operation: "subtract",
    });

    if (error) {
      console.error("[SovereignBank] Erro ao alocar liquidez:", error);
      return false;
    }

    // Recarregar reservas após alocação
    await this.loadReserves();
    return data === true;
  }

  /**
   * Libera liquidez de volta para a reserva
   */
  async releaseLiquidity(
    amount: number,
    reserveType: ReserveType
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("update_reserve_allocation", {
      p_reserve_type: reserveType,
      p_amount: amount,
      p_operation: "add",
    });

    if (error) {
      console.error("[SovereignBank] Erro ao liberar liquidez:", error);
      return false;
    }

    // Recarregar reservas após liberação
    await this.loadReserves();
    return data === true;
  }

  /**
   * Processa uma transação financeira
   */
  async processTransaction(
    context: TransactionContext
  ): Promise<TransactionResult> {
    try {
      // Verificar se a carteira está congelada
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("frozen, frozen_reason")
        .eq("user_id", context.user_id)
        .single();

      if (wallet?.frozen) {
        return {
          success: false,
          error: `Carteira congelada: ${wallet.frozen_reason}`,
        };
      }

      // Determinar qual reserva usar baseado no módulo
      const reserveType = this.determineReserveType(context.source_module, context.transaction_type);

      // Para débitos, verificar liquidez
      if (context.amount < 0) {
        const hasLiquidity = await this.checkLiquidity(Math.abs(context.amount), reserveType);
        if (!hasLiquidity) {
          return {
            success: false,
            error: "Liquidez insuficiente no sistema",
          };
        }
      }

      // Registrar transação no Supabase
      const { data: transactionId, error } = await supabase.rpc("record_transaction", {
        p_user_id: context.user_id,
        p_transaction_type: context.transaction_type,
        p_amount: context.amount,
        p_description: context.description || null,
        p_source_module: context.source_module,
        p_metadata: context.metadata || {},
      });

      if (error) {
        console.error("[SovereignBank] Erro ao registrar transação:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Atualizar alocação de liquidez
      if (context.amount < 0) {
        await this.allocateLiquidity(Math.abs(context.amount), reserveType);
      } else {
        await this.releaseLiquidity(context.amount, reserveType);
      }

      // Obter novo saldo
      const { data: newWallet } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", context.user_id)
        .single();

      return {
        success: true,
        transaction_id: transactionId,
        new_balance: newWallet?.balance || 0,
      };
    } catch (error) {
      console.error("[SovereignBank] Erro ao processar transação:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Determina qual reserva usar baseado no módulo e tipo de transação
   */
  private determineReserveType(
    module: string,
    transactionType: string
  ): ReserveType {
    // Online/PvP usa reserva online
    if (module === "trilha" || module === "futebol") {
      if (transactionType === "bet_win" || transactionType === "bet_loss") {
        return "online_pvp";
      }
    }

    // Offline/IA usa reserva offline
    return "offline_ia";
  }

  /**
   * Congela a carteira de um usuário
   */
  async freezeWallet(
    userId: string,
    reason: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from("user_wallets")
      .update({ frozen: true, frozen_reason: reason })
      .eq("user_id", userId);

    if (error) {
      console.error("[SovereignBank] Erro ao congelar carteira:", error);
      return false;
    }

    return true;
  }

  /**
   * Descongela a carteira de um usuário
   */
  async unfreezeWallet(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("user_wallets")
      .update({ frozen: false, frozen_reason: null })
      .eq("user_id", userId);

    if (error) {
      console.error("[SovereignBank] Erro ao descongelar carteira:", error);
      return false;
    }

    return true;
  }

  /**
   * Obtém o saldo de um usuário
   */
  async getUserBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[SovereignBank] Erro ao obter saldo:", error);
      return 0;
    }

    return data?.balance || 0;
  }

  /**
   * Obtém o histórico de transações de um usuário
   */
  async getUserTransactions(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from("bank_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SovereignBank] Erro ao obter transações:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Limpa recursos ao destruir a instância
   */
  destroy(): void {
    this.stopAutoAdjustment();
    this.state = null;
  }
}

// Instância singleton do Banco Central
let sovereignBankInstance: SovereignBank | null = null;

/**
 * Obtém a instância singleton do Banco Central
 */
export function getSovereignBank(): SovereignBank {
  if (!sovereignBankInstance) {
    sovereignBankInstance = new SovereignBank();
  }
  return sovereignBankInstance;
}

/**
 * Inicializa o Banco Central (deve ser chamado no startup da aplicação)
 */
export async function initializeSovereignBank(): Promise<void> {
  const bank = getSovereignBank();
  await bank.initialize();
}
