/**
 * Sistema de Apostas Online
 * Permite apostas SOV em partidas de Trilha e Futebol
 */

import { supabase } from "@/integrations/supabase/client";
import { getSovereignBank } from "./sovereignBank";
import { getAntiCheatSystem } from "./antiCheat";
import type {
  BetConfig,
  BetResult,
  TransactionContext,
  TransactionResult,
} from "./types";

export class BettingSystem {
  private bank = getSovereignBank();
  private antiCheat = getAntiCheatSystem();

  // Limites de aposta
  private readonly MIN_BET = 5;
  private readonly MAX_BET = 1000;
  private readonly MAX_DAILY_BETS = 10;

  /**
   * Valida configuração de aposta
   */
  validateBetConfig(config: BetConfig): { valid: boolean; error?: string } {
    if (config.amount < this.MIN_BET) {
      return { valid: false, error: `Aposta mínima: ${this.MIN_BET} SOV` };
    }

    if (config.amount > this.MAX_BET) {
      return { valid: false, error: `Aposta máxima: ${this.MAX_BET} SOV` };
    }

    if (config.amount <= 0) {
      return { valid: false, error: "Valor da aposta deve ser positivo" };
    }

    return { valid: true };
  }

  /**
   * Verifica se o usuário pode fazer a aposta
   */
  async canPlaceBet(userId: string, amount: number): Promise<boolean> {
    const balance = await this.bank.getUserBalance(userId);
    return balance >= amount;
  }

  /**
   * Verifica limite diário de apostas
   */
  async checkDailyLimit(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bank_ledger")
      .select("id")
      .eq("user_id", userId)
      .eq("transaction_type", "bet_loss")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    if (error) {
      console.error("[BettingSystem] Erro ao verificar limite diário:", error);
      return false;
    }

    const betsToday = (data || []).length;
    return betsToday < this.MAX_DAILY_BETS;
  }

  /**
   * Coloca aposta (debita valor da carteira)
   */
  async placeBet(config: BetConfig): Promise<BetResult> {
    // Validar configuração
    const validation = this.validateBetConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Verificar saldo
    const canBet = await this.canPlaceBet(config.user_id, config.amount);
    if (!canBet) {
      return {
        success: false,
        error: "Saldo insuficiente para aposta",
      };
    }

    // Verificar limite diário
    const dailyLimitOk = await this.checkDailyLimit(config.user_id);
    if (!dailyLimitOk) {
      return {
        success: false,
        error: "Limite diário de apostas atingido",
      };
    }

    // Verificar liquidez na reserva online
    const hasLiquidity = await this.bank.checkLiquidity(
      config.amount,
      "online_pvp"
    );
    if (!hasLiquidity) {
      return {
        success: false,
        error: "Liquidez insuficiente para apostas online",
      };
    }

    // Processar transação de débito
    const context: TransactionContext = {
      user_id: config.user_id,
      amount: -config.amount,
      transaction_type: "bet_loss", // Usamos bet_loss como placeholder para o débito
      source_module: config.game_type,
      description: `Aposta em ${config.game_type} - Sessão ${config.game_session_id}`,
      metadata: {
        game_type: config.game_type,
        is_online: config.is_online,
        opponent_id: config.opponent_id,
        game_session_id: config.game_session_id,
        bet_phase: "placement",
      },
    };

    const result = await this.bank.processTransaction(context);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      bet_id: result.transaction_id,
    };
  }

  /**
   * Processa vitória na aposta (credita ganho)
   */
  async processWin(
    userId: string,
    betAmount: number,
    gameType: "trilha" | "futebol",
    gameSessionId: string,
    opponentId?: string
  ): Promise<BetResult> {
    // Calcular ganho (aposta x 2 para vitória)
    const winnings = betAmount * 2;

    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      gameSessionId,
      gameType
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Verificar liquidez para pagamento
    const hasLiquidity = await this.bank.checkLiquidity(
      winnings,
      "online_pvp"
    );
    if (!hasLiquidity) {
      return {
        success: false,
        error: "Liquidez insuficiente para pagamento de vitória",
      };
    }

    // Processar transação de crédito
    const context: TransactionContext = {
      user_id: userId,
      amount: winnings,
      transaction_type: "bet_win",
      source_module: gameType,
      description: `Vitória em aposta de ${gameType} - Sessão ${gameSessionId}`,
      metadata: {
        game_type: gameType,
        opponent_id: opponentId,
        game_session_id: gameSessionId,
        bet_amount: betAmount,
        winnings: winnings,
        bet_phase: "settlement",
      },
    };

    const result = await this.bank.processTransaction(context);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      winnings,
    };
  }

  /**
   * Processa derrota na aposta (já foi debitada no placeBet)
   */
  async processLoss(
    userId: string,
    betAmount: number,
    gameType: "trilha" | "futebol",
    gameSessionId: string
  ): Promise<BetResult> {
    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      gameSessionId,
      gameType
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // A aposta já foi debitada, apenas liberar liquidez de volta para o sistema
    await this.bank.releaseLiquidity(betAmount, "online_pvp");

    return {
      success: true,
      loss: betAmount,
    };
  }

  /**
   * Processa empate (devolve aposta)
   */
  async processDraw(
    userId: string,
    betAmount: number,
    gameType: "trilha" | "futebol",
    gameSessionId: string
  ): Promise<BetResult> {
    // Validar sessão anti-cheat
    const validation = await this.antiCheat.validateSession(
      userId,
      gameSessionId,
      gameType
    );

    if (!validation.is_valid) {
      return {
        success: false,
        error: validation.suspicion_reason || "Atividade suspeita detectada",
      };
    }

    // Devolver aposta ao usuário
    const context: TransactionContext = {
      user_id: userId,
      amount: betAmount,
      transaction_type: "reward", // Usamos reward para devolução
      source_module: gameType,
      description: `Devolução de aposta em empate - ${gameType}`,
      metadata: {
        game_type: gameType,
        game_session_id: gameSessionId,
        bet_amount: betAmount,
        bet_phase: "draw_settlement",
      },
    };

    const result = await this.bank.processTransaction(context);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      winnings: betAmount, // No empate, "ganha" de volta a aposta
    };
  }

  /**
   * Obtém estatísticas de apostas do usuário
   */
  async getBettingStats(userId: string) {
    const today = new Date().toISOString().split("T")[0];

    const { data: todayData } = await supabase
      .from("bank_ledger")
      .select("transaction_type, amount, created_at")
      .eq("user_id", userId)
      .or("transaction_type.eq.bet_win,transaction_type.eq.bet_loss")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    const { data: allData } = await supabase
      .from("bank_ledger")
      .select("transaction_type, amount, created_at")
      .eq("user_id", userId)
      .or("transaction_type.eq.bet_win,transaction_type.eq.bet_loss")
      .order("created_at", { ascending: false })
      .limit(20);

    const todayWins = (todayData || []).filter((d) => d.transaction_type === "bet_win");
    const todayLosses = (todayData || []).filter((d) => d.transaction_type === "bet_loss");

    const todayWon = todayWins.reduce((sum, d) => sum + d.amount, 0);
    const todayLost = todayLosses.reduce((sum, d) => sum + Math.abs(d.amount), 0);
    const todayProfit = todayWon - todayLost;

    const totalWins = (allData || []).filter((d) => d.transaction_type === "bet_win");
    const totalLosses = (allData || []).filter((d) => d.transaction_type === "bet_loss");

    const totalWon = totalWins.reduce((sum, d) => sum + d.amount, 0);
    const totalLost = totalLosses.reduce((sum, d) => sum + Math.abs(d.amount), 0);
    const totalProfit = totalWon - totalLost;

    return {
      today: {
        bets: todayData?.length || 0,
        won: todayWon,
        lost: todayLost,
        profit: todayProfit,
        win_rate: todayData?.length > 0 ? (todayWins.length / todayData.length) * 100 : 0,
      },
      total: {
        bets: allData?.length || 0,
        won: totalWon,
        lost: totalLost,
        profit: totalProfit,
        win_rate: allData?.length > 0 ? (totalWins.length / allData.length) * 100 : 0,
      },
      limits: {
        min_bet: this.MIN_BET,
        max_bet: this.MAX_BET,
        max_daily_bets: this.MAX_DAILY_BETS,
        remaining_daily_bets: this.MAX_DAILY_BETS - (todayData?.length || 0),
      },
      recent_bets: allData || [],
    };
  }
}

// Instância singleton do sistema de apostas
let bettingInstance: BettingSystem | null = null;

/**
 * Obtém a instância singleton do sistema de apostas
 */
export function getBettingSystem(): BettingSystem {
  if (!bettingInstance) {
    bettingInstance = new BettingSystem();
  }
  return bettingInstance;
}
