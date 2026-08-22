-- SOV BANK — Livro-caixa central da Cidadela
-- Depende de: sov_financial_system.sql (user_wallets, bank_ledger,
-- record_transaction, create_or_update_wallet) e sov_integracao_cartorio.sql.
-- NOTA (2026-08-21): sov_bank_registrar NÃO engole mais EXCEPTION — erro real
-- (saldo insuficiente, teto de emissão, auth violado) sobe como 400 visível
-- no PostgREST, em vez de devolver {transaction_id NULL, balance 0}. A versão
-- antiga que engolia obrigava o frontend a tratar transaction_id NULL como
-- falha (fallback); remova esse guarda no frontend só depois de re-aplicar
-- esta migração no banco.
-- Idempotente: seguro rodar mais de uma vez no SQL Editor.

-- =========================================================
-- 1. Configuração central da economia (primeira remessa)
-- =========================================================
-- Os limites da primeira remessa vivem AQUI (não espalhados pelo código):
--   max_users_initial     = 100 usuários
--   max_sovereign_initial = 200.000 SOV
--   signup_bonus          = 50 SOV (bônus de cadastro, alinhado ao cache
--                           botao_usuarios.pontos_soberania = 50)
CREATE TABLE IF NOT EXISTS sov_bank_config (
  chave TEXT PRIMARY KEY,
  valor NUMERIC NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sov_bank_config (chave, valor, descricao)
VALUES
  ('max_users_initial', 100, 'Limite de usuários da primeira remessa'),
  ('max_sovereign_initial', 200000, 'Teto de emissão de SOV da primeira remessa'),
  ('signup_bonus', 50, 'Bônus de cadastro em SOV (alinhado ao cache pontos_soberania)')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE sov_bank_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config leitura publica" ON sov_bank_config;
CREATE POLICY "Config leitura publica" ON sov_bank_config
  FOR SELECT USING (true);

-- =========================================================
-- 2. Ledger rastreável: origem, moeda e idempotência
-- =========================================================
ALTER TABLE bank_ledger ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE bank_ledger ADD COLUMN IF NOT EXISTS source_event TEXT;
ALTER TABLE bank_ledger ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SOV';
ALTER TABLE bank_ledger ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15, 2);

-- Um evento econômico identificado não pode gerar duas movimentações.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_ledger_idempotency
  ON bank_ledger (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_ledger_source_event ON bank_ledger (source_event);

-- =========================================================
-- 3. RPC central: sov_bank_registrar
-- =========================================================
-- ÚNICA porta de entrada de movimentações com idempotência e teto de emissão.
-- Retorna a transação (existente, se duplicada) + saldo resultante.
--
-- NOTE arquitetura em duas camadas:
--   * `sov_bank_registrar` (pública): valida auth (o chamador só move a própria
--     soberania) e delega ao interno. É a porta do cliente jogador.
--   * `sov_bank_registrar_interno` (interna, SEM auth-check): toda a lógica
--     econômica (idempotência + teto). Só é chamada por RPCs SECURITY DEFINER
--     de sistema (apex do campeonato, W.O., misses, registerdResult) que
--     precisam movimentar SOV de terceiros arbitrariamente. Não é GRANT-able
--     via PostgREST: sem auth-check, fora dos chamadores públicos.
CREATE OR REPLACE FUNCTION sov_bank_registrar_interno(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_source_module TEXT,
  p_source_event TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (transaction_id UUID, balance DECIMAL, duplicated BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_bal DECIMAL;
  v_emitido DECIMAL;
  v_teto DECIMAL;
BEGIN
  -- Idempotência: o mesmo evento econômico nunca credita duas vezes.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT l.id, l.balance_after INTO v_tx_id, v_bal
    FROM bank_ledger l
    WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT v_tx_id, v_bal, TRUE;
      RETURN;
    END IF;
  END IF;

  -- Teto de emissão (regra configurável em sov_bank_config). Créditos novos
  -- não podem empurrar o total emitido além do limite da remessa.
  IF p_amount > 0 THEN
    SELECT COALESCE(valor, 200000) INTO v_teto
    FROM sov_bank_config WHERE chave = 'max_sovereign_initial';
    v_teto := COALESCE(v_teto, 200000);

    SELECT COALESCE(SUM(l.amount), 0) INTO v_emitido
    FROM bank_ledger l WHERE l.amount > 0;

    IF v_emitido + p_amount > v_teto THEN
      RAISE EXCEPTION 'Teto de emissao da remessa atingido (% SOV)', v_teto;
    END IF;
  END IF;

  v_tx_id := record_transaction(
    p_user_id, p_type, p_amount, p_description, p_source_module, p_metadata
  );

  -- Enriquece a linha do ledger com origem/moeda/saldo anterior.
  UPDATE bank_ledger
  SET source_event = p_source_event,
      idempotency_key = p_idempotency_key,
      balance_before = balance_after - p_amount
  WHERE id = v_tx_id;

  SELECT w.balance INTO v_bal FROM user_wallets w WHERE w.user_id = p_user_id;
  RETURN QUERY SELECT v_tx_id, COALESCE(v_bal, 0::DECIMAL), FALSE;
  RETURN;
END;
$$;

-- Wrapper público: valida auth (cliente jogador move SÓ a própria soberania).
CREATE OR REPLACE FUNCTION sov_bank_registrar(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_source_module TEXT,
  p_source_event TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (transaction_id UUID, balance DECIMAL, duplicated BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Usuario autenticado nao pode mover soberania de terceiros';
  END IF;
  RETURN QUERY SELECT * FROM sov_bank_registrar_interno(
    p_user_id, p_amount, p_type, p_description, p_source_module,
    p_source_event, p_idempotency_key, p_metadata
  );
END;
$$;

-- =========================================================
-- 4. Extrato (origem rastreável de cada movimentação)
-- =========================================================
CREATE OR REPLACE FUNCTION sov_bank_extrato(
  p_user_id UUID,
  p_limite INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount DECIMAL,
  currency TEXT,
  balance_before DECIMAL,
  balance_after DECIMAL,
  description TEXT,
  source_module TEXT,
  source_event TEXT,
  idempotency_key TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para ler extrato de terceiros';
  END IF;

  RETURN QUERY
  SELECT l.id, l.transaction_type, l.amount, l.currency, l.balance_before,
         l.balance_after, l.description, l.source_module, l.source_event,
         l.idempotency_key, l.metadata, l.created_at
  FROM bank_ledger l
  WHERE l.user_id = p_user_id
  ORDER BY l.created_at DESC
  LIMIT GREATEST(p_limite, 1);
END;
$$;

-- =========================================================
-- 5. Reconciliação: saldo materializado vs saldo do ledger
-- =========================================================
-- Nunca corrige silenciosamente: divergência é registrada no anti_cheat_log.
CREATE OR REPLACE FUNCTION sov_bank_reconciliar(p_user_id UUID)
RETURNS TABLE (saldo_carteira DECIMAL, saldo_ledger DECIMAL, consistente BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carteira DECIMAL;
  v_ledger DECIMAL;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para reconciliar carteira de terceiros';
  END IF;

  SELECT COALESCE(w.balance, 0) INTO v_carteira
  FROM user_wallets w WHERE w.user_id = p_user_id;

  SELECT COALESCE(SUM(l.amount), 0) INTO v_ledger
  FROM bank_ledger l WHERE l.user_id = p_user_id;

  v_carteira := COALESCE(v_carteira, 0::DECIMAL);

  IF v_carteira <> v_ledger THEN
    INSERT INTO anti_cheat_log (
      user_id, session_id, action_type, module,
      time_spent_seconds, screens_viewed, is_suspicious, suspicion_reason
    )
    VALUES (
      p_user_id, 'reconciliacao', 'reconciliation_mismatch', 'sov_bank',
      0, 0, TRUE,
      format('saldo_carteira=%s diverge de saldo_ledger=%s', v_carteira, v_ledger)
    );
  END IF;

  RETURN QUERY SELECT v_carteira, v_ledger, (v_carteira = v_ledger);
END;
$$;

-- =========================================================
-- 6. Estatísticas agregadas da economia (estoque monetário)
-- =========================================================
CREATE OR REPLACE FUNCTION sov_bank_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teto DECIMAL;
  v_max_users DECIMAL;
  v_emitido DECIMAL;
  v_retirado DECIMAL;
  v_saldos DECIMAL;
  v_usuarios INTEGER;
  v_transacoes INTEGER;
  v_alertas INTEGER;
BEGIN
  SELECT COALESCE(valor, 200000) INTO v_teto FROM sov_bank_config WHERE chave = 'max_sovereign_initial';
  SELECT COALESCE(valor, 100) INTO v_max_users FROM sov_bank_config WHERE chave = 'max_users_initial';
  v_teto := COALESCE(v_teto, 200000);
  v_max_users := COALESCE(v_max_users, 100);

  SELECT COALESCE(SUM(l.amount), 0) INTO v_emitido FROM bank_ledger l WHERE l.amount > 0;
  SELECT COALESCE(SUM(ABS(l.amount)), 0) INTO v_retirado FROM bank_ledger l WHERE l.amount < 0;
  SELECT COALESCE(SUM(w.balance), 0), COUNT(*) INTO v_saldos, v_usuarios FROM user_wallets w;
  SELECT COUNT(*) INTO v_transacoes FROM bank_ledger;
  SELECT COUNT(*) INTO v_alertas FROM anti_cheat_log WHERE action_type = 'reconciliation_mismatch';

  RETURN jsonb_build_object(
    'moeda', 'SOV',
    'limite_emissao', v_teto,
    'limite_usuarios', v_max_users,
    'emitido_total', v_emitido,
    'retirado_total', v_retirado,
    'em_circulacao', v_saldos,
    'disponivel_emissao', GREATEST(v_teto - v_emitido, 0),
    'usuarios_com_carteira', v_usuarios,
    'vagas_restantes', GREATEST(v_max_users - v_usuarios, 0),
    'transacoes_total', v_transacoes,
    'alertas_reconciliacao', v_alertas
  );
END;
$$;

-- =========================================================
-- 7. Bônus de cadastro (origem rastreável dos 50 SOV iniciais)
-- =========================================================
-- Idempotente por usuário. Respeita o limite de usuários da remessa:
-- carteiras criadas além do limite NÃO recebem o bônus (não quebra o app,
-- apenas não emite moeda nova fora da remessa).
CREATE OR REPLACE FUNCTION sov_bank_bonus_cadastro(p_user_id UUID)
RETURNS TABLE (credited BOOLEAN, balance DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus DECIMAL;
  v_max_users DECIMAL;
  v_usuarios INTEGER;
  v_tx UUID;
  v_bal DECIMAL;
  v_dup BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para creditar bonus de terceiros';
  END IF;

  PERFORM create_or_update_wallet(p_user_id);

  SELECT COALESCE(valor, 50) INTO v_bonus FROM sov_bank_config WHERE chave = 'signup_bonus';
  SELECT COALESCE(valor, 100) INTO v_max_users FROM sov_bank_config WHERE chave = 'max_users_initial';
  v_bonus := COALESCE(v_bonus, 50);
  v_max_users := COALESCE(v_max_users, 100);

  SELECT COUNT(*) INTO v_usuarios FROM user_wallets;

  IF v_usuarios > v_max_users THEN
    SELECT w.balance INTO v_bal FROM user_wallets w WHERE w.user_id = p_user_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_bal, 0::DECIMAL);
    RETURN;
  END IF;

  SELECT r.transaction_id, r.balance, r.duplicated INTO v_tx, v_bal, v_dup
  FROM sov_bank_registrar(
    p_user_id, v_bonus, 'reward', 'Bônus de cadastro na Cidadela',
    'system', 'signup_bonus', 'signup:' || p_user_id::TEXT, '{}'::JSONB
  ) r;

  -- credited reflete a verdade: FALSE quando o bônus já tinha sido creditado
  -- (chamada idempotente de retry/login seguinte). O saldo retornado é
  -- sempre o autoritativo do ledger.
  RETURN QUERY SELECT NOT COALESCE(v_dup, FALSE), COALESCE(v_bal, 0::DECIMAL);
END;
$$;

-- =========================================================
-- 8. Notícias econômicas derivadas de dados reais do ledger
-- =========================================================
CREATE OR REPLACE FUNCTION sov_bank_noticias()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
  v_top_modulo TEXT;
  v_top_volume DECIMAL;
  v_noticias JSONB := '[]'::JSONB;
  v_pct NUMERIC;
BEGIN
  v_stats := sov_bank_stats();
  v_pct := ROUND(
    (v_stats->>'em_circulacao')::NUMERIC / NULLIF((v_stats->>'limite_emissao')::NUMERIC, 0) * 100,
    1
  );

  v_noticias := v_noticias || jsonb_build_object(
    'titulo', 'Estoque monetário da Cidadela',
    'corpo', format(
      'Há %s SOV em circulação nas carteiras dos cidadãos (%s%% do teto de %s SOV da remessa inicial).',
      (v_stats->>'em_circulacao'), v_pct, (v_stats->>'limite_emissao')
    ),
    'fonte', 'sov_bank_stats'
  );

  SELECT l.source_module, SUM(l.amount) INTO v_top_modulo, v_top_volume
  FROM bank_ledger l
  WHERE l.amount > 0
  GROUP BY l.source_module
  ORDER BY SUM(l.amount) DESC
  LIMIT 1;

  IF v_top_modulo IS NOT NULL THEN
    v_noticias := v_noticias || jsonb_build_object(
      'titulo', 'Maior origem de Sovereign',
      'corpo', format(
        'O módulo "%s" já distribuiu %s SOV em recompensas — a maior origem de moeda da economia.',
        v_top_modulo, v_top_volume
      ),
      'fonte', 'bank_ledger'
    );
  END IF;

  v_noticias := v_noticias || jsonb_build_object(
    'titulo', 'Vagas da remessa inicial',
    'corpo', format(
      '%s de %s vagas da primeira remessa já possuem carteira ativa no SOV BANK.',
      (v_stats->>'usuarios_com_carteira'), (v_stats->>'limite_usuarios')
    ),
    'fonte', 'sov_bank_stats'
  );

  RETURN v_noticias;
END;
$$;

-- =========================================================
-- 9. Fix: resgate de missão diária passa pelo ledger
-- =========================================================
-- Antes: UPDATE direto em user_wallets (SOV surgia sem registro — violava a
-- regra de ouro). Agora credita via sov_bank_registrar com chave idempotente.
CREATE OR REPLACE FUNCTION cidadela_resgatar_missao(p_missao_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_recompensa INTEGER;
  v_titulo TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT recompensa_sov, titulo INTO v_recompensa, v_titulo
  FROM cidadela_missoes_diarias
  WHERE id = p_missao_id
    AND user_id = v_uid
    AND status = 'completa';

  IF v_recompensa IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE cidadela_missoes_diarias
  SET status = 'resgatada',
      updated_at = now()
  WHERE id = p_missao_id;

  -- Crédito rastreável no SOV BANK (idempotente por missão).
  BEGIN
    PERFORM sov_bank_registrar(
      v_uid, v_recompensa, 'reward',
      format('Missão diária resgatada: %s', v_titulo),
      'mission', 'missao_diaria', 'missao:' || p_missao_id::TEXT,
      jsonb_build_object('missao_id', p_missao_id, 'titulo', v_titulo)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Sistema financeiro indisponível: não bloqueia o resgate.
    NULL;
  END;

  RETURN v_recompensa;
END;
$$;

-- =========================================================
-- 10. Permissões
-- =========================================================
GRANT EXECUTE ON FUNCTION sov_bank_registrar(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_extrato(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_reconciliar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sov_bank_bonus_cadastro(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sov_bank_noticias() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cidadela_resgatar_missao(UUID) TO authenticated;
