/**
 * Sistema Financeiro Sovereign (SOV)
 * Tipos TypeScript para a infraestrutura financeira centralizada
 */

// Tipos de transações
export type TransactionType =
  | "reward"
  | "penalty"
  | "bet_win"
  | "bet_loss"
  | "fee"
  | "transfer"
  | "market_purchase"
  | "career_cost"
  | "career_reward"
  | "recovery_earnings";

// Módulos do sistema
export type SourceModule = "trilha" | "futebol" | "career" | "market" | "system";

// Tipos de reservas do banco
export type ReserveType = "total_supply" | "online_pvp" | "offline_ia";

// Categorias do marketplace
export type MarketCategory = "item" | "reward" | "advantage" | "cosmetic";

// Ações anti-cheat
export type AntiCheatAction = "game_start" | "game_end" | "screen_view" | "reward_claim";

// Status de transação marketplace
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

// Status de reserva
export type ReserveStatus = "active" | "frozen" | "depleted";

// Carteira do usuário
export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  frozen: boolean;
  frozen_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Transação no livro razão
export interface BankLedgerEntry {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  source_module: SourceModule;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Reserva do banco
export interface BankReserve {
  id: string;
  reserve_type: ReserveType;
  allocated_amount: number;
  max_cap: number;
  yield_rate: number;
  status: ReserveStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Log anti-cheat
export interface AntiCheatLog {
  id: string;
  user_id: string;
  session_id: string;
  action_type: AntiCheatAction;
  module: SourceModule;
  time_spent_seconds: number;
  screens_viewed: number;
  is_suspicious: boolean;
  suspicion_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Produto do marketplace
export interface SovMarketProduct {
  id: string;
  name: string;
  description: string | null;
  price_sov: number;
  category: MarketCategory;
  stock: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Transação do marketplace
export interface SovMarketTransaction {
  id: string;
  user_id: string;
  product_id: string;
  amount_sov: number;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Configuração da IA Banco Central
export interface SovereignBankConfig {
  total_supply_cap: number;
  online_pvp_reserve: number;
  offline_ia_reserve: number;
  base_yield_rate: number;
  max_yield_rate: number;
  min_yield_rate: number;
  anti_cheat_threshold: number; // segundos mínimos por jogo
  screens_required_per_game: number;
}

// Estado da IA Banco Central
export interface SovereignBankState {
  reserves: BankReserve[];
  current_yield_rates: Record<ReserveType, number>;
  utilization_ratios: Record<ReserveType, number>;
  is_inflation_control_mode: boolean;
  last_adjustment: string;
}

// Contexto para transações
export interface TransactionContext {
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  source_module: SourceModule;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Resultado de transação
export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  new_balance?: number;
  error?: string;
  requires_validation?: boolean;
}

// Contexto anti-cheat
export interface AntiCheatContext {
  user_id: string;
  session_id: string;
  module: SourceModule;
  action: AntiCheatAction;
  time_spent_seconds: number;
  screens_viewed: number;
  ip_address?: string;
  user_agent?: string;
}

// Resultado validação anti-cheat
export interface AntiCheatValidation {
  is_valid: boolean;
  is_suspicious: boolean;
  suspicion_reason?: string | undefined;
  should_block: boolean;
  penalty_amount?: number | undefined;
}

// Configuração de aposta
export interface BetConfig {
  user_id: string;
  amount: number;
  game_type: "trilha" | "futebol";
  is_online: boolean;
  opponent_id?: string; // null se for contra a casa
  game_session_id: string;
}

// Resultado de aposta
export interface BetResult {
  success: boolean;
  bet_id?: string | undefined;
  winnings?: number | undefined;
  loss?: number | undefined;
  error?: string | undefined;
}

// Custos do modo carreira
export interface CareerCosts {
  season_fee: number;
  maintenance_fee: number;
  division_multiplier: Record<string, number>; // serie-a: 1.2, serie-b: 0.8, serie-c: 0.5
  penalty_for_bankruptcy: number;
}

// Configuração padrão da IA Banco Central
export const DEFAULT_SOVEREIGN_BANK_CONFIG: SovereignBankConfig = {
  total_supply_cap: 200000,
  online_pvp_reserve: 130000,
  offline_ia_reserve: 70000,
  base_yield_rate: 0.01, // 1%
  max_yield_rate: 0.05, // 5%
  min_yield_rate: 0.005, // 0.5%
  anti_cheat_threshold: 60, // 60 segundos mínimos por jogo
  screens_required_per_game: 3, // mínimo 3 telas navegadas
};

// Custos padrão do modo carreira
export const DEFAULT_CAREER_COSTS: CareerCosts = {
  season_fee: 50,
  maintenance_fee: 20,
  division_multiplier: {
    "serie-a": 1.2,
    "serie-b": 0.8,
    "serie-c": 0.5,
  },
  penalty_for_bankruptcy: 100,
};
