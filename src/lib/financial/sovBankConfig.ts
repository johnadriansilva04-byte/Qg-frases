/**
 * Configuração central da primeira remessa da economia SOV.
 *
 * Espelho das chaves da tabela `sov_bank_config` (fonte de verdade no banco).
 * Estas constantes existem para a UI exibir os limites sem consultar o banco;
 * a aplicação efetiva das regras (teto de emissão, vagas, bônus) é feita
 * pelas RPCs `sov_bank_*` lendo `sov_bank_config`.
 */

export const SOV_BANK = {
  MOEDA: "SOV",
  MOEDA_NOME: "SOVEREIGN",
  NOME_BANCO: "SOV BANK",
  /** Limite de usuários da primeira remessa. */
  MAX_USERS_INITIAL: 100,
  /** Teto de emissão da primeira remessa. */
  MAX_SOVEREIGN_INITIAL: 200_000,
  /** Bônus de cadastro (alinhado ao cache pontos_soberania = 50). */
  SIGNUP_BONUS: 50,
} as const;
