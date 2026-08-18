/**
 * Gerenciador Financeiro do Modo Carreira
 * Controla taxas, custos e bloqueios baseados em saldo SOV
 */

import { getSovereignBank } from "./sovereignBank";
import { getAntiCheatSystem } from "./antiCheat";
import type {
  CareerCosts,
  TransactionContext,
  TransactionResult,
  SourceModule,
} from "./types";
import { DEFAULT_CAREER_COSTS } from "./types";

export class CareerFinanceManager {
  private costs: CareerCosts;
  private bank = getSovereignBank();
  private antiCheat = getAntiCheatSystem();

  constructor(costs: Partial<CareerCosts> = {}) {
    this.costs = { ...DEFAULT_CAREER_COSTS, ...costs };
  }

  /**
   * Calcula o custo de manutenção baseado na divisão
   */
  calculateMaintenanceCost(division: string): number {
    const multiplier = this.costs.division_multiplier[division] || 1;
    return this.costs.maintenance_fee * multiplier;
  }

  /**
   * Calcula o custo total de uma temporada
   */
  calculateSeasonCost(division: string): number {
    const multiplier = this.costs.division_multiplier[division] || 1;
    return this.costs.season_fee * multiplier;
  }

  /**
   * Verifica se o usuário pode pagar uma taxa
   */
  async canUserPay(userId: string, amount: number): Promise<boolean> {
    const balance = await this.bank.getUserBalance(userId);
    return balance >= amount;
  }

  /**
   * Cobra taxa de temporada
   */
  async chargeSeasonFee(
    userId: string,
    division: string,
    sessionId: string
  ): Promise<TransactionResult> {
    const cost = this.calculateSeasonCost(division);

    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      sessionId,
      "career"
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Verificar saldo
    const canPay = await this.canUserPay(userId, cost);
    if (!canPay) {
      return {
        success: false,
        error: "Saldo insuficiente para pagar taxa de temporada",
      };
    }

    // Processar transação
    const context: TransactionContext = {
      user_id: userId,
      amount: -cost,
      transaction_type: "career_cost",
      source_module: "career",
      description: `Taxa de temporada - Divisão ${division}`,
      metadata: {
        division,
        cost_type: "season_fee",
        session_id: sessionId,
      },
    };

    return await this.bank.processTransaction(context);
  }

  /**
   * Cobra taxa de manutenção
   */
  async chargeMaintenanceFee(
    userId: string,
    division: string,
    sessionId: string
  ): Promise<TransactionResult> {
    const cost = this.calculateMaintenanceCost(division);

    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      sessionId,
      "career"
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Verificar saldo
    const canPay = await this.canUserPay(userId, cost);
    if (!canPay) {
      return {
        success: false,
        error: "Saldo insuficiente para pagar manutenção",
      };
    }

    // Processar transação
    const context: TransactionContext = {
      user_id: userId,
      amount: -cost,
      transaction_type: "career_cost",
      source_module: "career",
      description: `Taxa de manutenção - Divisão ${division}`,
      metadata: {
        division,
        cost_type: "maintenance_fee",
        session_id: sessionId,
      },
    };

    return await this.bank.processTransaction(context);
  }

  /**
   * Processa recompensa de vitória no modo carreira
   */
  async rewardVictory(
    userId: string,
    amount: number,
    division: string,
    sessionId: string
  ): Promise<TransactionResult> {
    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      sessionId,
      "career"
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Calcular recompensa com yield rate atual
    const yieldRate = this.bank.getYieldRate("offline_ia");
    const adjustedAmount = amount * (1 + yieldRate);

    // Processar transação
    const context: TransactionContext = {
      user_id: userId,
      amount: adjustedAmount,
      transaction_type: "career_reward",
      source_module: "career",
      description: `Recompensa de vitória - Divisão ${division}`,
      metadata: {
        division,
        base_amount: amount,
        yield_rate: yieldRate,
        session_id: sessionId,
      },
    };

    return await this.bank.processTransaction(context);
  }

  /**
   * Processa penalidade de derrota no modo carreira
   */
  async penalizeDefeat(
    userId: string,
    amount: number,
    division: string,
    sessionId: string
  ): Promise<TransactionResult> {
    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      sessionId,
      "career"
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Processar transação
    const context: TransactionContext = {
      user_id: userId,
      amount: -amount,
      transaction_type: "penalty",
      source_module: "career",
      description: `Penalidade de derrota - Divisão ${division}`,
      metadata: {
        division,
        session_id: sessionId,
      },
    };

    return await this.bank.processTransaction(context);
  }

  /**
   * Verifica se o usuário está em falência
   */
  async checkBankruptcy(userId: string): Promise<boolean> {
    const balance = await this.bank.getUserBalance(userId);
    return balance < this.calculateMaintenanceCost("serie-c"); // Menor custo
  }

  /**
   * Bloqueia usuário no modo carreira se estiver em falência
   */
  async blockCareerMode(userId: string): Promise<boolean> {
    const isBankrupt = await this.checkBankruptcy(userId);

    if (isBankrupt) {
      // Congelar carteira temporariamente para modo carreira
      const frozen = await this.bank.freezeWallet(
        userId,
        "Falência no modo carreira - Jogue amistosos para recuperar"
      );
      return frozen;
    }

    return false;
  }

  /**
   * Desbloqueia usuário no modo carreira
   */
  async unblockCareerMode(userId: string): Promise<boolean> {
    const isBankrupt = await this.checkBankruptcy(userId);

    if (!isBankrupt) {
      return await this.bank.unfreezeWallet(userId);
    }

    return false;
  }

  /**
   * Obtém o status financeiro do usuário no modo carreira
   */
  async getCareerFinancialStatus(userId: string, division: string) {
    const balance = await this.bank.getUserBalance(userId);
    const seasonCost = this.calculateSeasonCost(division);
    const maintenanceCost = this.calculateMaintenanceCost(division);
    const isBankrupt = await this.checkBankruptcy(userId);
    const canPaySeason = await this.canUserPay(userId, seasonCost);
    const canPayMaintenance = await this.canUserPay(userId, maintenanceCost);

    return {
      balance,
      season_cost: seasonCost,
      maintenance_cost: maintenanceCost,
      is_bankrupt: isBankrupt,
      can_pay_season: canPaySeason,
      can_pay_maintenance: canPayMaintenance,
      yield_rate: this.bank.getYieldRate("offline_ia"),
    };
  }
}

// Instância singleton do gerenciador financeiro de carreira
let careerFinanceInstance: CareerFinanceManager | null = null;

/**
 * Obtém a instância singleton do gerenciador financeiro de carreira
 */
export function getCareerFinanceManager(): CareerFinanceManager {
  if (!careerFinanceInstance) {
    careerFinanceInstance = new CareerFinanceManager();
  }
  return careerFinanceInstance;
}
