/**
 * Sistema de Recuperação via Amistosos Offline
 * Permite que usuários em falência recuperem SOV jogando amistosos
 */

import { supabase } from "@/integrations/supabase/client";
import { getSovereignBank } from "./sovereignBank";
import { getAntiCheatSystem } from "./antiCheat";
import type {
  TransactionContext,
  TransactionResult,
  SourceModule,
} from "./types";

export class RecoverySystem {
  private bank = getSovereignBank();
  private antiCheat = getAntiCheatSystem();

  // Taxas de ganho por amistoso (baseadas em dificuldade)
  private readonly RECOVERY_RATES = {
    easy: 5,      // 5 SOV por vitória fácil
    medium: 10,   // 10 SOV por vitória média
    hard: 20,     // 20 SOV por vitória difícil
  };

  // Limite diário de recuperação
  private readonly DAILY_RECOVERY_LIMIT = 100;

  /**
   * Calcula o ganho de SOV por amistoso
   */
  calculateRecoveryAmount(difficulty: "easy" | "medium" | "hard"): number {
    return this.RECOVERY_RATES[difficulty];
  }

  /**
   * Verifica se o usuário pode jogar amistosos para recuperação
   */
  async canPlayRecoveryMatch(userId: string): Promise<boolean> {
    const balance = await this.bank.getUserBalance(userId);
    const wallet = await this.getWalletStatus(userId);

    // Só pode jogar recuperação se estiver bloqueado ou com saldo muito baixo
    return wallet.frozen || balance < 20;
  }

  /**
   * Obtém status da carteira
   */
  private async getWalletStatus(userId: string) {
    const balance = await this.bank.getUserBalance(userId);
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("frozen, frozen_reason")
      .eq("user_id", userId)
      .single();

    return {
      balance: balance || 0,
      frozen: wallet?.frozen || false,
      frozen_reason: wallet?.frozen_reason || null,
    };
  }

  /**
   * Processa ganho de amistoso de recuperação
   */
  async processRecoveryMatch(
    userId: string,
    difficulty: "easy" | "medium" | "hard",
    sessionId: string,
    won: boolean
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

    // Verificar limite diário
    const dailyLimitReached = await this.checkDailyLimit(userId);
    if (dailyLimitReached) {
      return {
        success: false,
        error: "Limite diário de recuperação atingido",
      };
    }

    // Se não ganhou, não dá recompensa
    if (!won) {
      return {
        success: true,
        new_balance: await this.bank.getUserBalance(userId),
      };
    }

    // Calcular ganho
    const amount = this.calculateRecoveryAmount(difficulty);

    // Processar transação
    const context: TransactionContext = {
      user_id: userId,
      amount: amount,
      transaction_type: "recovery_earnings",
      source_module: "career",
      description: `Ganho de amistoso de recuperação - Dificuldade ${difficulty}`,
      metadata: {
        difficulty,
        session_id: sessionId,
        recovery_mode: true,
      },
    };

    const result = await this.bank.processTransaction(context);

    // Se recuperou o suficiente, desbloquear carteira
    if (result.success && result.new_balance) {
      await this.checkForUnlock(userId, result.new_balance);
    }

    return result;
  }

  /**
   * Verifica limite diário de recuperação
   */
  private async checkDailyLimit(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bank_ledger")
      .select("amount")
      .eq("user_id", userId)
      .eq("transaction_type", "recovery_earnings")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    if (error) {
      console.error("[RecoverySystem] Erro ao verificar limite diário:", error);
      return false;
    }

    const totalEarned = (data || []).reduce((sum, entry) => sum + entry.amount, 0);
    return totalEarned >= this.DAILY_RECOVERY_LIMIT;
  }

  /**
   * Verifica se o usuário pode ser desbloqueado
   */
  private async checkForUnlock(userId: string, balance: number): Promise<void> {
    const wallet = await this.getWalletStatus(userId);

    if (wallet.frozen && balance >= 50) {
      // Desbloquear se tiver pelo menos 50 SOV
      await this.bank.unfreezeWallet(userId);
    }
  }

  /**
   * Obtém estatísticas de recuperação do usuário
   */
  async getRecoveryStats(userId: string) {
    const today = new Date().toISOString().split("T")[0];

    const { data: todayData } = await supabase
      .from("bank_ledger")
      .select("amount, created_at")
      .eq("user_id", userId)
      .eq("transaction_type", "recovery_earnings")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    const { data: allData } = await supabase
      .from("bank_ledger")
      .select("amount, created_at")
      .eq("user_id", userId)
      .eq("transaction_type", "recovery_earnings")
      .order("created_at", { ascending: false })
      .limit(10);

    const todayEarned = (todayData || []).reduce((sum, entry) => sum + entry.amount, 0);
    const totalEarned = (allData || []).reduce((sum, entry) => sum + entry.amount, 0);
    const matchesPlayed = (todayData || []).length;

    return {
      today_earned: todayEarned,
      daily_limit: this.DAILY_RECOVERY_LIMIT,
      daily_remaining: Math.max(0, this.DAILY_RECOVERY_LIMIT - todayEarned),
      matches_played_today: matchesPlayed,
      total_earned: totalEarned,
      recent_matches: allData || [],
    };
  }

  /**
   * Obtém o progresso de recuperação necessário
   */
  async getRecoveryProgress(userId: string) {
    const balance = await this.bank.getUserBalance(userId);
    const wallet = await this.getWalletStatus(userId);

    if (!wallet.frozen) {
      return {
        needs_recovery: false,
        current_balance: balance,
        target_balance: 0,
        progress: 100,
      };
    }

    const targetBalance = 50; // Meta para desbloqueio
    const progress = Math.min(100, (balance / targetBalance) * 100);

    return {
      needs_recovery: true,
      current_balance: balance,
      target_balance: targetBalance,
      progress,
      remaining: Math.max(0, targetBalance - balance),
    };
  }
}

// Instância singleton do sistema de recuperação
let recoveryInstance: RecoverySystem | null = null;

/**
 * Obtém a instância singleton do sistema de recuperação
 */
export function getRecoverySystem(): RecoverySystem {
  if (!recoveryInstance) {
    recoveryInstance = new RecoverySystem();
  }
  return recoveryInstance;
}
