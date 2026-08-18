/**
 * Sistema Anti-Cheat e Validação de Engajamento
 * Previne fraudes e garante que recompensas sejam baseadas em jogo real
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AntiCheatContext,
  AntiCheatValidation,
  AntiCheatAction,
  SourceModule,
} from "./types";
import { DEFAULT_SOVEREIGN_BANK_CONFIG } from "./types";

export class AntiCheatSystem {
  private config = DEFAULT_SOVEREIGN_BANK_CONFIG;
  private sessionData: Map<string, {
    startTime: number;
    screensViewed: Set<string>;
    actions: AntiCheatAction[];
    totalScreensViewed: number;
  }> = new Map();

  /**
   * Registra início de sessão de jogo
   */
  startGameSession(userId: string, sessionId: string, module: SourceModule): void {
    this.sessionData.set(sessionId, {
      startTime: Date.now(),
      screensViewed: new Set(),
      actions: [],
      totalScreensViewed: 0,
    });

    // Log no Supabase
    this.logAction({
      user_id: userId,
      session_id: sessionId,
      action: "game_start",
      module,
      time_spent_seconds: 0,
      screens_viewed: 0,
    });
  }

  /**
   * Registra visualização de tela
   */
  recordScreenView(
    userId: string,
    sessionId: string,
    screenName: string,
    module: SourceModule
  ): void {
    const session = this.sessionData.get(sessionId);
    if (!session) return;

    session.screensViewed.add(screenName);
    session.totalScreensViewed++;

    // Log no Supabase
    this.logAction({
      user_id: userId,
      session_id: sessionId,
      action: "screen_view",
      module,
      time_spent_seconds: Math.floor((Date.now() - session.startTime) / 1000),
      screens_viewed: session.totalScreensViewed,
    });
  }

  /**
   * Registra ação específica (fim de jogo, reivindicação de recompensa, etc)
   */
  recordAction(
    userId: string,
    sessionId: string,
    action: AntiCheatAction,
    module: SourceModule
  ): void {
    const session = this.sessionData.get(sessionId);
    if (!session) return;

    session.actions.push(action);

    // Log no Supabase
    this.logAction({
      user_id: userId,
      session_id: sessionId,
      action,
      module,
      time_spent_seconds: Math.floor((Date.now() - session.startTime) / 1000),
      screens_viewed: session.totalScreensViewed,
    });
  }

  /**
   * Valida se a sessão é legítima para recompensa
   */
  async validateSession(
    userId: string,
    sessionId: string,
    module: SourceModule
  ): Promise<AntiCheatValidation> {
    const session = this.sessionData.get(sessionId);
    if (!session) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: "Sessão não encontrada",
        should_block: true,
      };
    }

    const timeSpent = Math.floor((Date.now() - session.startTime) / 1000);
    const screensViewed = session.totalScreensViewed;

    // Validações
    const validations = [
      this.validateTimeSpent(timeSpent),
      this.validateScreensViewed(screensViewed),
      this.validateActionSequence(session.actions),
      await this.validateUserPattern(userId, module),
    ];

    const isSuspicious = validations.some((v) => v.is_suspicious);
    const shouldBlock = validations.some((v) => v.should_block);

    const suspicionReasons = validations
      .filter((v) => v.suspicion_reason)
      .map((v) => v.suspicion_reason)
      .join("; ");

    // Se for suspeito, registrar no Supabase
    if (isSuspicious) {
      await this.logSuspiciousActivity(userId, sessionId, module, suspicionReasons);
    }

    // Limpar sessão após validação
    this.sessionData.delete(sessionId);

    return {
      is_valid: !shouldBlock,
      is_suspicious,
      suspicion_reason: suspicionReasons || undefined,
      should_block,
      penalty_amount: shouldBlock ? this.config.penalty_for_bankruptcy : undefined,
    };
  }

  /**
   * Valida tempo mínimo de jogo
   */
  private validateTimeSpent(timeSpent: number): AntiCheatValidation {
    if (timeSpent < this.config.anti_cheat_threshold) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: `Tempo de jogo insuficiente: ${timeSpent}s (mínimo: ${this.config.anti_cheat_threshold}s)`,
        should_block: true,
      };
    }

    return {
      is_valid: true,
      is_suspicious: false,
      should_block: false,
    };
  }

  /**
   * Valida número mínimo de telas visualizadas
   */
  private validateScreensViewed(screensViewed: number): AntiCheatValidation {
    if (screensViewed < this.config.screens_required_per_game) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: `Telas insuficientes: ${screensViewed} (mínimo: ${this.config.screens_required_per_game})`,
        should_block: true,
      };
    }

    return {
      is_valid: true,
      is_suspicious: false,
      should_block: false,
    };
  }

  /**
   * Valida sequência de ações (deve ter início e fim)
   */
  private validateActionSequence(actions: AntiCheatAction[]): AntiCheatValidation {
    const hasStart = actions.includes("game_start");
    const hasEnd = actions.includes("game_end");

    if (!hasStart) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: "Sessão não iniciada corretamente",
        should_block: true,
      };
    }

    if (!hasEnd) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: "Sessão não finalizada corretamente",
        should_block: true,
      };
    }

    return {
      is_valid: true,
      is_suspicious: false,
      should_block: false,
    };
  }

  /**
   * Valida padrões de comportamento do usuário (detecção de bots)
   */
  private async validateUserPattern(
    userId: string,
    module: SourceModule
  ): Promise<AntiCheatValidation> {
    // Buscar logs recentes do usuário
    const { data: recentLogs } = await supabase
      .from("anti_cheat_log")
      .select("*")
      .eq("user_id", userId)
      .eq("module", module)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
      .order("created_at", { ascending: false })
      .limit(20);

    if (!recentLogs || recentLogs.length === 0) {
      return {
        is_valid: true,
        is_suspicious: false,
        should_block: false,
      };
    }

    // Detectar padrões suspeitos
    const suspiciousLogs = recentLogs.filter((log) => log.is_suspicious);
    const suspiciousRatio = suspiciousLogs.length / recentLogs.length;

    if (suspiciousRatio > 0.3) {
      return {
        is_valid: false,
        is_suspicious: true,
        suspicion_reason: `Alta taxa de atividade suspeita: ${(suspiciousRatio * 100).toFixed(1)}%`,
        should_block: suspiciousRatio > 0.5,
      };
    }

    // Detectar tempos de jogo muito consistentes (indicativo de bot)
    const gameTimes = recentLogs
      .filter((log) => log.action === "game_end")
      .map((log) => log.time_spent_seconds);

    if (gameTimes.length > 5) {
      const avgTime = gameTimes.reduce((sum, time) => sum + time, 0) / gameTimes.length;
      const variance = gameTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / gameTimes.length;
      const stdDev = Math.sqrt(variance);

      // Se desvio padrão for muito baixo, tempos são muito consistentes (suspeito)
      if (stdDev < 10 && avgTime > 60) {
        return {
          is_valid: false,
          is_suspicious: true,
          suspicion_reason: "Tempos de jogo muito consistentes (possível bot)",
          should_block: true,
        };
      }
    }

    return {
      is_valid: true,
      is_suspicious: false,
      should_block: false,
    };
  }

  /**
   * Registra atividade suspeita no Supabase
   */
  private async logSuspiciousActivity(
    userId: string,
    sessionId: string,
    module: SourceModule,
    reason: string
  ): Promise<void> {
    const { error } = await supabase.from("anti_cheat_log").insert({
      user_id: userId,
      session_id: sessionId,
      action_type: "reward_claim",
      module,
      time_spent_seconds: 0,
      screens_viewed: 0,
      is_suspicious: true,
      suspicion_reason: reason,
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("[AntiCheat] Erro ao logar atividade suspeita:", error);
    }
  }

  /**
   * Obtém IP do cliente (simplificado)
   */
  private getClientIP(): string | null {
    // Em produção, isso viria de headers do servidor
    return null;
  }

  /**
   * Log de ação no Supabase
   */
  private async logAction(context: {
    user_id: string;
    session_id: string;
    action: AntiCheatAction;
    module: SourceModule;
    time_spent_seconds: number;
    screens_viewed: number;
  }): Promise<void> {
    const { error } = await supabase.from("anti_cheat_log").insert({
      user_id: context.user_id,
      session_id: context.session_id,
      action_type: context.action,
      module: context.module,
      time_spent_seconds: context.time_spent_seconds,
      screens_viewed: context.screens_viewed,
      is_suspicious: false,
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("[AntiCheat] Erro ao logar ação:", error);
    }
  }

  /**
   * Limpa sessões antigas (mais de 1 hora)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [sessionId, session] of this.sessionData.entries()) {
      if (session.startTime < oneHourAgo) {
        this.sessionData.delete(sessionId);
      }
    }
  }
}

// Instância singleton do sistema anti-cheat
let antiCheatInstance: AntiCheatSystem | null = null;

/**
 * Obtém a instância singleton do sistema anti-cheat
 */
export function getAntiCheatSystem(): AntiCheatSystem {
  if (!antiCheatInstance) {
    antiCheatInstance = new AntiCheatSystem();
  }
  return antiCheatInstance;
}
