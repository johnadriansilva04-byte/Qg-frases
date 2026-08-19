-- Sistema Financeiro Sovereign (SOV)
-- Infraestrutura centralizada de moeda única para todo o ecossistema

-- Tabela de Carteiras de Usuários (Saldo único por usuário)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  frozen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_balance ON user_wallets(balance);

-- Tabela de Livro Razão (Histórico de transações)
CREATE TABLE IF NOT EXISTS bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'reward', 'penalty', 'bet_win', 'bet_loss', 'fee', 'transfer', 'market_purchase'
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  source_module TEXT NOT NULL, -- 'trilha', 'futebol', 'career', 'market'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance e consultas
CREATE INDEX IF NOT EXISTS idx_bank_ledger_user_id ON bank_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_ledger_transaction_type ON bank_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bank_ledger_source_module ON bank_ledger(source_module);
CREATE INDEX IF NOT EXISTS idx_bank_ledger_created_at ON bank_ledger(created_at DESC);

-- Tabela de Reservas do Banco (Gestão de liquidez pela IA)
CREATE TABLE IF NOT EXISTS bank_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_type TEXT NOT NULL, -- 'online_pvp', 'offline_ia', 'total_supply'
  allocated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  max_cap DECIMAL(15, 2) NOT NULL,
  yield_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0100, -- 1% base
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'frozen', 'depleted'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reserve_type)
);

-- Tabela de Controle Anti-Cheat (Rastreamento de engajamento)
CREATE TABLE IF NOT EXISTS anti_cheat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'game_start', 'game_end', 'screen_view', 'reward_claim'
  module TEXT NOT NULL, -- 'trilha', 'futebol', 'career'
  time_spent_seconds INTEGER NOT NULL,
  screens_viewed INTEGER NOT NULL DEFAULT 1,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  suspicion_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para anti-cheat
CREATE INDEX IF NOT EXISTS idx_anti_cheat_user_id ON anti_cheat_log(user_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_session_id ON anti_cheat_log(session_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_is_suspicious ON anti_cheat_log(is_suspicious);

-- Tabela de Produtos do Marketplace (SOV Market)
CREATE TABLE IF NOT EXISTS sov_market_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_sov DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL, -- 'item', 'reward', 'advantage', 'cosmetic'
  stock INTEGER NOT NULL DEFAULT -1, -- -1 = ilimitado
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Transações do Marketplace
CREATE TABLE IF NOT EXISTS sov_market_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES sov_market_products(id),
  amount_sov DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para marketplace
CREATE INDEX IF NOT EXISTS idx_sov_market_products_category ON sov_market_products(category);
CREATE INDEX IF NOT EXISTS idx_sov_market_products_is_active ON sov_market_products(is_active);
CREATE INDEX IF NOT EXISTS idx_sov_market_transactions_user_id ON sov_market_transactions(user_id);

-- Função para criar/atualizar carteira do usuário
CREATE OR REPLACE FUNCTION create_or_update_wallet(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Tenta inserir, se já existe retorna o ID existente
  INSERT INTO user_wallets (user_id, balance)
  VALUES (p_user_id, 0.00)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id;

  -- Se inseriu, retorna o novo ID
  IF FOUND THEN
    RETURN (SELECT id FROM user_wallets WHERE user_id = p_user_id);
  END IF;

  -- Se já existia, retorna o ID existente
  RETURN (SELECT id FROM user_wallets WHERE user_id = p_user_id);
END;
$$;

-- Função para registrar transação no livro razão
CREATE OR REPLACE FUNCTION record_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL,
  p_description TEXT,
  p_source_module TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Obter carteira do usuário
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    -- Criar carteira se não existir
    v_wallet_id := create_or_update_wallet(p_user_id);
    v_current_balance := 0.00;
  END IF;

  -- Calcular novo saldo
  v_new_balance := v_current_balance + p_amount;

  -- Não permitir saldo negativo (exceto para penalidades específicas)
  IF v_new_balance < 0 AND p_transaction_type NOT IN ('penalty', 'bet_loss') THEN
    RAISE EXCEPTION 'Saldo insuficiente para transação';
  END IF;

  -- Atualizar saldo da carteira
  UPDATE user_wallets
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Registrar transação no livro razão
  INSERT INTO bank_ledger (
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    source_module,
    metadata
  )
  VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    v_new_balance,
    p_description,
    p_source_module,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Função para verificar e atualizar reservas (IA Banco Central)
CREATE OR REPLACE FUNCTION update_reserve_allocation(
  p_reserve_type TEXT,
  p_amount DECIMAL,
  p_operation TEXT -- 'add', 'subtract'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_amount DECIMAL;
  v_max_cap DECIMAL;
  v_new_amount DECIMAL;
BEGIN
  -- Obter valores atuais
  SELECT allocated_amount, max_cap
  INTO v_current_amount, v_max_cap
  FROM bank_reserves
  WHERE reserve_type = p_reserve_type;

  IF v_current_amount IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada: %', p_reserve_type;
  END IF;

  -- Calcular novo valor
  IF p_operation = 'add' THEN
    v_new_amount := v_current_amount + p_amount;
    IF v_new_amount > v_max_cap THEN
      RAISE EXCEPTION 'Valor excede teto máximo da reserva';
    END IF;
  ELSIF p_operation = 'subtract' THEN
    v_new_amount := v_current_amount - p_amount;
    IF v_new_amount < 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente na reserva';
    END IF;
  ELSE
    RAISE EXCEPTION 'Operação inválida: %', p_operation;
  END IF;

  -- Atualizar reserva
  UPDATE bank_reserves
  SET allocated_amount = v_new_amount,
      updated_at = NOW()
  WHERE reserve_type = p_reserve_type;

  RETURN TRUE;
END;
$$;

-- Função para ajustar yield rate baseado em reservas (IA Banco Central)
CREATE OR REPLACE FUNCTION adjust_yield_rate()
RETURNS TABLE(reserve_type TEXT, new_yield_rate DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reserve RECORD;
  v_utilization_ratio DECIMAL;
  v_new_yield DECIMAL;
BEGIN
  -- Para cada reserva, calcular taxa de utilização e ajustar yield
  FOR v_reserve IN SELECT bank_reserves.reserve_type, bank_reserves.allocated_amount, bank_reserves.max_cap FROM bank_reserves WHERE bank_reserves.reserve_type != 'total_supply' LOOP
    v_utilization_ratio := v_reserve.allocated_amount / v_reserve.max_cap;

    -- Lógica da IA: yield aumenta quando reservas estão baixas, diminui quando estão altas
    IF v_utilization_ratio > 0.8 THEN
      -- Reservas baixas: aumentar yield para desestimular gastos
      v_new_yield := LEAST(0.0500, 0.0100 + (v_utilization_ratio - 0.8) * 0.1); -- Max 5%
    ELSIF v_utilization_ratio < 0.3 THEN
      -- Reservas altas: diminuir yield para incentivar gastos
      v_new_yield := GREATEST(0.0050, 0.0100 - (0.3 - v_utilization_ratio) * 0.02); -- Min 0.5%
    ELSE
      -- Reservas equilibradas: yield base
      v_new_yield := 0.0100; -- 1%
    END IF;

    -- Atualizar yield rate
    UPDATE bank_reserves
    SET yield_rate = v_new_yield,
        updated_at = NOW()
    WHERE bank_reserves.reserve_type = v_reserve.reserve_type;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- Inicializar reservas do sistema (só executa se não existirem)
INSERT INTO bank_reserves (reserve_type, allocated_amount, max_cap, yield_rate, metadata)
VALUES
  ('total_supply', 200000.00, 200000.00, 0.0000, '{"description": "Teto máximo do ecossistema SOV"}'),
  ('online_pvp', 130000.00, 130000.00, 0.0100, '{"description": "Reserva para PvP e apostas online"}'),
  ('offline_ia', 70000.00, 70000.00, 0.0100, '{"description": "Reserva para recompensas offline e IA"}')
ON CONFLICT (reserve_type) DO NOTHING;

-- Inicializar produtos do marketplace (placeholder)
INSERT INTO sov_market_products (name, description, price_sov, category, stock, metadata)
VALUES
  ('Pacote Inicial', '100 SOV para começar sua jornada', 10.00, 'item', -1, '{"tier": "starter"}'),
  ('Boost de Experiência', 'Dobrar XP por 24h', 50.00, 'advantage', -1, '{"duration_hours": 24}'),
  ('Skin Exclusiva', 'Aparência especial para seu personagem', 100.00, 'cosmetic', -1, '{"rarity": "rare"}'),
  ('Desbloqueio de Fase', 'Acesso imediato à próxima fase', 75.00, 'advantage', -1, '{"type": "phase_unlock"}')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS)
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_cheat_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sov_market_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_wallets
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update wallets" ON user_wallets;
CREATE POLICY "System can update wallets" ON user_wallets
  FOR UPDATE USING (auth.role() = 'service_role');

-- Políticas RLS para bank_ledger
DROP POLICY IF EXISTS "Users can view own transactions" ON bank_ledger;
CREATE POLICY "Users can view own transactions" ON bank_ledger
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert transactions" ON bank_ledger;
CREATE POLICY "System can insert transactions" ON bank_ledger
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Políticas RLS para anti_cheat_log
DROP POLICY IF EXISTS "Users can view own logs" ON anti_cheat_log;
CREATE POLICY "Users can view own logs" ON anti_cheat_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert logs" ON anti_cheat_log;
CREATE POLICY "System can insert logs" ON anti_cheat_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Políticas RLS para sov_market_transactions
DROP POLICY IF EXISTS "Users can view own purchases" ON sov_market_transactions;
CREATE POLICY "Users can view own purchases" ON sov_market_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert purchases" ON sov_market_transactions;
CREATE POLICY "System can insert purchases" ON sov_market_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- bank_reserves e sov_market_products são públicas para leitura (admin controla escrita)
ALTER TABLE bank_reserves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reserves" ON bank_reserves;
CREATE POLICY "Anyone can view reserves" ON bank_reserves
  FOR SELECT USING (true);

ALTER TABLE sov_market_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view products" ON sov_market_products;
CREATE POLICY "Anyone can view products" ON sov_market_products
  FOR SELECT USING (true);
