/**
 * Gamificação (Soberania) — recompensas em SOV.
 *
 * O módulo não emite nota de QI: o desempenho vira incentivo ao estudo.
 * A integração com a carteira do jogo é feita via a interface SovWallet,
 * implementada pelo app host.
 */

/** Identidade da moeda oficial do jogo. */
export const SOV_CURRENCY = {
  symbol: 'SOV',
  name: 'Soberania',
} as const;

/** Tabela de recompensas (valores em SOV). */
export const SOV_REWARDS = {
  /** Acerto de um desafio. */
  CORRECT_ANSWER: 10,
  /** Bônus por acertar na primeira tentativa (sem dicas nem erros). */
  FIRST_TRY_BONUS: 5,
  /** Bônus por sequência de acertos (a partir de STREAK_THRESHOLD). */
  STREAK_BONUS: 5,
  STREAK_THRESHOLD: 3,
  /** Bônus por concluir uma sessão completa de desafios. */
  SESSION_COMPLETION: 25,
} as const;

export interface ChallengeResult {
  /** Se a opção escolhida era a correta. */
  correct: boolean;
  /** Se acertou na primeira tentativa. */
  firstTry: boolean;
  /** Quantidade de dicas pedagógicas usadas antes de responder. */
  hintsUsed: number;
  /** Sequência atual de acertos consecutivos (incluindo este, se correto). */
  streak: number;
}

export interface SovReward {
  amount: number;
  reason: string;
}

/**
 * Calcula as recompensas de um desafio. Erros não punem: rendem 0 SOV
 * e liberam a explicação pedagógica (ver pedagogy.ts).
 */
export function computeSovReward(result: ChallengeResult): SovReward[] {
  if (!result.correct) return [];
  const rewards: SovReward[] = [
    { amount: SOV_REWARDS.CORRECT_ANSWER, reason: 'Desafio de raciocínio lógico concluído' },
  ];
  if (result.firstTry && result.hintsUsed === 0) {
    rewards.push({ amount: SOV_REWARDS.FIRST_TRY_BONUS, reason: 'Acerto de primeira, sem dicas' });
  }
  if (result.streak >= SOV_REWARDS.STREAK_THRESHOLD) {
    rewards.push({ amount: SOV_REWARDS.STREAK_BONUS, reason: `Sequência de ${result.streak} acertos` });
  }
  return rewards;
}

/** Recompensa de conclusão de sessão (todos os desafios respondidos). */
export function sessionCompletionReward(): SovReward {
  return { amount: SOV_REWARDS.SESSION_COMPLETION, reason: 'Sessão de treino cognitivo concluída' };
}

/** Contrato de integração com a carteira SOV do jogo. */
export interface SovWallet {
  credit(amount: number, reason: string): void | Promise<void>;
}

/** Credita uma lista de recompensas na carteira e retorna o total. */
export async function settleRewards(wallet: SovWallet, rewards: SovReward[]): Promise<number> {
  let total = 0;
  for (const r of rewards) {
    await wallet.credit(r.amount, r.reason);
    total += r.amount;
  }
  return total;
}
