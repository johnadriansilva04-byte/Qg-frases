-- ============================================================================
-- SOV BANK + SOV INVEST — Duas carteiras do MESMO jogador (auditoria §3–§10)
-- ============================================================================
-- SOV Bank   = user_wallets.balance          → dinheiro líquido do jogador
-- SOV Invest = user_wallets.invest_balance   → dinheiro alocado em investimentos
--
-- Regras inegociáveis:
--  * NUNCA criar SOV: Bank + Invest é o dinheiro do MESMO jogador. Transferir
--    entre elas não altera o total (a menos da taxa de retirada).
--  * Bank → Invest: taxa 0% (transferência interna).
--  * Invest → Bank: taxa IOF de 10% (retirada). A taxa sai de circulação e é
--    registrada no ledger como 'fee' (destino contábil = retirado_total).
--  * Dividendos caem SEMPRE no SOV Invest (nunca direto no Bank).
--  * Toda movimentação é atômica (UMA transação SQL) e registrada no ledger.
--
-- Aplicação MANUAL no SQL Editor do Supabase (ordem: após sov_bank.sql).
-- ============================================================================

-- ─── 1. Coluna SOV Invest na carteira ───────────────────────────────────────
ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS invest_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- Nunca permitir saldo de investimento negativo (exceto via função autorizada).
ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS user_wallets_invest_nonnegative;
ALTER TABLE user_wallets
  ADD CONSTRAINT user_wallets_invest_nonnegative CHECK (invest_balance >= 0);

-- ─── 2. Transferência entre carteiras do mesmo jogador ─────────────────────
-- p_direcao: 'bank_para_invest' (taxa 0) | 'invest_para_bank' (taxa 10% IOF).
-- Retorna jsonb com saldos + taxa + líquido. Idempotente por p_idempotency_key.
CREATE OR REPLACE FUNCTION sov_bank_transferir_carteiras(
  p_user_id UUID,
  p_valor DECIMAL,
  p_direcao TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_bank DECIMAL;
  v_invest DECIMAL;
  v_taxa DECIMAL := 0;
  v_liquido DECIMAL;
  v_existente RECORD;
  v_tipo_transfer TEXT;
  v_tipo_fee TEXT := 'fee';
BEGIN
  -- Segurança: só o próprio jogador transfere.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'valor deve ser positivo';
  END IF;
  IF p_direcao NOT IN ('bank_para_invest', 'invest_para_bank') THEN
    RAISE EXCEPTION 'direcao invalida';
  END IF;

  -- Idempotência: mesma chave → devolve o resultado já registrado.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existente FROM bank_ledger
     WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'duplicated', true,
        'bank', (v_existente.metadata->>'bank')::DECIMAL,
        'invest', (v_existente.metadata->>'invest')::DECIMAL,
        'taxa', (v_existente.metadata->>'taxa')::DECIMAL,
        'liquido', (v_existente.metadata->>'liquido')::DECIMAL
      );
    END IF;
  END IF;

  -- Trava a linha da carteira (atomicidade + sem lost update).
  SELECT id, balance, invest_balance INTO v_wallet_id, v_bank, v_invest
    FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'carteira inexistente';
  END IF;

  IF p_direcao = 'bank_para_invest' THEN
    IF v_bank < p_valor THEN RAISE EXCEPTION 'saldo insuficiente no SOV Bank'; END IF;
    v_taxa := 0; v_liquido := p_valor;
    v_bank := v_bank - p_valor;
    v_invest := v_invest + p_valor;
    v_tipo_transfer := 'invest_transfer';
  ELSE
    -- invest_para_bank: IOF de 10% sobre o valor solicitado.
    IF v_invest < p_valor THEN RAISE EXCEPTION 'saldo insuficiente no SOV Invest'; END IF;
    v_taxa := ROUND(p_valor * 0.10, 2);
    v_liquido := p_valor - v_taxa;
    v_invest := v_invest - p_valor;         -- sai o BRUTO do Invest
    v_bank := v_bank + v_liquido;           -- entra o LÍQUIDO no Bank
    v_tipo_transfer := 'invest_withdraw';
  END IF;

  UPDATE user_wallets
     SET balance = v_bank, invest_balance = v_invest, updated_at = NOW()
   WHERE id = v_wallet_id;

  -- Registro da transferência (linha principal, auditável).
  INSERT INTO bank_ledger (
    user_id, transaction_type, amount, balance_after, description,
    source_module, idempotency_key, source_event, currency, balance_before, metadata
  ) VALUES (
    p_user_id, v_tipo_transfer,
    CASE WHEN p_direcao = 'bank_para_invest' THEN -p_valor ELSE v_liquido END,
    v_bank,
    CASE WHEN p_direcao = 'bank_para_invest'
         THEN 'Transferência SOV Bank → SOV Invest'
         ELSE 'Retirada SOV Invest → SOV Bank (líquido após IOF)' END,
    'bank', p_idempotency_key, 'transferencia-carteiras', 'SOV',
    CASE WHEN p_direcao = 'bank_para_invest' THEN v_bank + p_valor ELSE v_bank - v_liquido END,
    jsonb_build_object(
      'direcao', p_direcao, 'valor_solicitado', p_valor,
      'taxa', v_taxa, 'liquido', v_liquido,
      'bank', v_bank, 'invest', v_invest
    )
  );

  -- Registro da TAXA (IOF) como linha própria — destino contábil definido.
  -- A taxa NÃO é creditada a ninguém: sai de circulação (retirado_total).
  IF v_taxa > 0 THEN
    INSERT INTO bank_ledger (
      user_id, transaction_type, amount, balance_after, description,
      source_module, idempotency_key, source_event, currency, balance_before, metadata
    ) VALUES (
      p_user_id, v_tipo_fee, -v_taxa, v_bank,
      'IOF 10% sobre retirada do SOV Invest',
      'bank',
      CASE WHEN p_idempotency_key IS NOT NULL THEN p_idempotency_key || ':iof' ELSE NULL END,
      'iof-retirada-invest', 'SOV', v_bank,
      jsonb_build_object('sobre', p_valor, 'aliquota', 0.10, 'bank', v_bank, 'invest', v_invest)
    );
  END IF;

  RETURN jsonb_build_object(
    'duplicated', false, 'bank', v_bank, 'invest', v_invest,
    'taxa', v_taxa, 'liquido', v_liquido, 'valor_solicitado', p_valor
  );
END;
$$;

-- ─── 3. Dividendo cai no SOV Invest (com IOF de 10% sobre o bruto) ─────────
-- Bruto → taxa (10%, sai de circulação) → líquido creditado no Invest.
-- Idempotente por p_idempotency_key (período).
CREATE OR REPLACE FUNCTION sov_bank_pagar_dividendo(
  p_user_id UUID,
  p_bruto DECIMAL,
  p_descricao TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_bank DECIMAL;
  v_invest DECIMAL;
  v_taxa DECIMAL;
  v_liquido DECIMAL;
  v_existente RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_bruto IS NULL OR p_bruto <= 0 THEN
    RAISE EXCEPTION 'dividendo deve ser positivo';
  END IF;

  -- Idempotência por período: já pago → devolve o registro existente.
  SELECT * INTO v_existente FROM bank_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicated', true,
      'invest', (v_existente.metadata->>'invest')::DECIMAL,
      'bruto', (v_existente.metadata->>'bruto')::DECIMAL,
      'taxa', (v_existente.metadata->>'taxa')::DECIMAL,
      'liquido', (v_existente.metadata->>'liquido')::DECIMAL
    );
  END IF;

  SELECT id, balance, invest_balance INTO v_wallet_id, v_bank, v_invest
    FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'carteira inexistente';
  END IF;

  -- IOF de 10% sobre o dividendo bruto; líquido vai para o SOV Invest.
  v_taxa := ROUND(p_bruto * 0.10, 2);
  v_liquido := p_bruto - v_taxa;
  v_invest := v_invest + v_liquido;

  UPDATE user_wallets
     SET invest_balance = v_invest, updated_at = NOW()
   WHERE id = v_wallet_id;

  -- Dividendo líquido creditado no Invest.
  INSERT INTO bank_ledger (
    user_id, transaction_type, amount, balance_after, description,
    source_module, idempotency_key, source_event, currency, balance_before, metadata
  ) VALUES (
    p_user_id, 'dividend', v_liquido, v_bank,
    p_descricao || ' (líquido no SOV Invest)',
    'market', p_idempotency_key, 'dividendo', 'SOV', v_bank,
    p_metadata || jsonb_build_object(
      'bruto', p_bruto, 'taxa', v_taxa, 'liquido', v_liquido,
      'destino', 'invest', 'bank', v_bank, 'invest', v_invest
    )
  );

  -- Taxa do dividendo (sai de circulação, auditável).
  IF v_taxa > 0 THEN
    INSERT INTO bank_ledger (
      user_id, transaction_type, amount, balance_after, description,
      source_module, idempotency_key, source_event, currency, balance_before, metadata
    ) VALUES (
      p_user_id, 'fee', -v_taxa, v_bank,
      'IOF 10% sobre dividendo',
      'market', p_idempotency_key || ':iof', 'iof-dividendo', 'SOV', v_bank,
      jsonb_build_object('bruto', p_bruto, 'aliquota', 0.10, 'bank', v_bank, 'invest', v_invest)
    );
  END IF;

  RETURN jsonb_build_object(
    'duplicated', false, 'bruto', p_bruto, 'taxa', v_taxa,
    'liquido', v_liquido, 'invest', v_invest, 'bank', v_bank
  );
END;
$$;

-- ─── 4. Compra de ativo ATÔMICA: debita o Invest + confirma posição ────────
-- O dinheiro sai do SOV Invest (carteira de investimento). A posição em si
-- vive no JSONB da carreira (fonte da posição), mas o DÉBITO é confirmado
-- aqui ANTES — se o débito falhar, a compra não acontece. Idempotente.
CREATE OR REPLACE FUNCTION sov_bank_comprar_ativo(
  p_user_id UUID,
  p_custo DECIMAL,
  p_descricao TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_bank DECIMAL;
  v_invest DECIMAL;
  v_existente RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_custo IS NULL OR p_custo <= 0 THEN
    RAISE EXCEPTION 'custo deve ser positivo';
  END IF;

  SELECT * INTO v_existente FROM bank_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicated', true,
      'invest', (v_existente.metadata->>'invest')::DECIMAL,
      'bank', (v_existente.metadata->>'bank')::DECIMAL
    );
  END IF;

  SELECT id, balance, invest_balance INTO v_wallet_id, v_bank, v_invest
    FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'carteira inexistente';
  END IF;

  -- A compra é paga com o SOV Invest (dinheiro de investimento).
  IF v_invest < p_custo THEN
    RAISE EXCEPTION 'saldo insuficiente no SOV Invest';
  END IF;
  v_invest := v_invest - p_custo;

  UPDATE user_wallets
     SET invest_balance = v_invest, updated_at = NOW()
   WHERE id = v_wallet_id;

  INSERT INTO bank_ledger (
    user_id, transaction_type, amount, balance_after, description,
    source_module, idempotency_key, source_event, currency, balance_before, metadata
  ) VALUES (
    p_user_id, 'market_purchase', -p_custo, v_bank,
    p_descricao, 'market', p_idempotency_key, 'bolsa-compra', 'SOV', v_bank,
    p_metadata || jsonb_build_object('origem', 'invest', 'bank', v_bank, 'invest', v_invest)
  );

  RETURN jsonb_build_object('duplicated', false, 'bank', v_bank, 'invest', v_invest, 'custo', p_custo);
END;
$$;

-- ─── 5. Venda de ativo ATÔMICA: credita o Invest (líquido de IOF 10%) ──────
CREATE OR REPLACE FUNCTION sov_bank_vender_ativo(
  p_user_id UUID,
  p_valor DECIMAL,
  p_descricao TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_bank DECIMAL;
  v_invest DECIMAL;
  v_taxa DECIMAL;
  v_liquido DECIMAL;
  v_existente RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'valor deve ser positivo';
  END IF;

  SELECT * INTO v_existente FROM bank_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicated', true,
      'invest', (v_existente.metadata->>'invest')::DECIMAL,
      'bank', (v_existente.metadata->>'bank')::DECIMAL,
      'liquido', (v_existente.metadata->>'liquido')::DECIMAL,
      'taxa', (v_existente.metadata->>'taxa')::DECIMAL
    );
  END IF;

  SELECT id, balance, invest_balance INTO v_wallet_id, v_bank, v_invest
    FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'carteira inexistente';
  END IF;

  -- Venda volta para o SOV Invest, líquida de IOF 10%.
  v_taxa := ROUND(p_valor * 0.10, 2);
  v_liquido := p_valor - v_taxa;
  v_invest := v_invest + v_liquido;

  UPDATE user_wallets
     SET invest_balance = v_invest, updated_at = NOW()
   WHERE id = v_wallet_id;

  INSERT INTO bank_ledger (
    user_id, transaction_type, amount, balance_after, description,
    source_module, idempotency_key, source_event, currency, balance_before, metadata
  ) VALUES (
    p_user_id, 'reward', v_liquido, v_bank,
    p_descricao || ' (líquido no SOV Invest)',
    'market', p_idempotency_key, 'bolsa-venda', 'SOV', v_bank,
    p_metadata || jsonb_build_object(
      'destino', 'invest', 'bruto', p_valor, 'taxa', v_taxa,
      'liquido', v_liquido, 'bank', v_bank, 'invest', v_invest
    )
  );

  IF v_taxa > 0 THEN
    INSERT INTO bank_ledger (
      user_id, transaction_type, amount, balance_after, description,
      source_module, idempotency_key, source_event, currency, balance_before, metadata
    ) VALUES (
      p_user_id, 'fee', -v_taxa, v_bank,
      'IOF 10% sobre venda de ativo',
      'market', p_idempotency_key || ':iof', 'iof-venda', 'SOV', v_bank,
      jsonb_build_object('bruto', p_valor, 'aliquota', 0.10, 'bank', v_bank, 'invest', v_invest)
    );
  END IF;

  RETURN jsonb_build_object(
    'duplicated', false, 'bank', v_bank, 'invest', v_invest,
    'bruto', p_valor, 'taxa', v_taxa, 'liquido', v_liquido
  );
END;
$$;

-- ─── 6. Leitura dos dois saldos ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sov_bank_saldos(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank DECIMAL;
  v_invest DECIMAL;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  SELECT balance, invest_balance INTO v_bank, v_invest
    FROM user_wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN NULL; -- carteira inexistente = saldo DESCONHECIDO (nunca 0)
  END IF;
  RETURN jsonb_build_object('bank', v_bank, 'invest', v_invest);
END;
$$;

-- ─── 7. Permissões ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION sov_bank_transferir_carteiras(UUID, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_pagar_dividendo(UUID, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_comprar_ativo(UUID, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_vender_ativo(UUID, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_saldos(UUID) TO authenticated;
