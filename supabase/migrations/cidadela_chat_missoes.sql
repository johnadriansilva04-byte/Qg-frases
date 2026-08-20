-- Cidadela dos Clássicos — Sistema de Chat e Missões
-- Chat global da Cidadela e sistema de missões diárias
-- Idempotente: seguro rodar mais de uma vez no SQL Editor

-- =========================================================
-- 1. Chat Global da Cidadela
-- =========================================================

CREATE TABLE IF NOT EXISTS cidadela_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'jogador' CHECK (tipo IN ('jogador', 'sistema')),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cidadela_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat leitura publica" ON cidadela_chat_messages;
CREATE POLICY "Chat leitura publica"
  ON cidadela_chat_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Chat escrita autenticada" ON cidadela_chat_messages;
CREATE POLICY "Chat escrita autenticada"
  ON cidadela_chat_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================
-- 2. Missões Diárias
-- =========================================================

CREATE TABLE IF NOT EXISTS cidadela_missoes_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  missao_key TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  alvo INTEGER NOT NULL,
  progresso INTEGER NOT NULL DEFAULT 0,
  recompensa_sov INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'completa', 'resgatada')),
  data_criada DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, missao_key, data_criada)
);

ALTER TABLE cidadela_missoes_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Missoes dono le" ON cidadela_missoes_diarias;
CREATE POLICY "Missoes dono le"
  ON cidadela_missoes_diarias FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Missoes dono atualiza" ON cidadela_missoes_diarias;
CREATE POLICY "Missoes dono atualiza"
  ON cidadela_missoes_diarias FOR ALL
  USING (auth.uid() = user_id);

-- =========================================================
-- 3. RPCs
-- =========================================================

-- Gera ou reseta missões diárias para o usuário autenticado
CREATE OR REPLACE FUNCTION cidadela_gerar_missoes_diarias()
RETURNS TABLE (
  id UUID,
  missao_key TEXT,
  titulo TEXT,
  descricao TEXT,
  alvo INTEGER,
  progresso INTEGER,
  recompensa_sov INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hoje DATE := CURRENT_DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  -- Remove missões de dias anteriores (limpeza)
  DELETE FROM cidadela_missoes_diarias
  WHERE user_id = v_uid AND data_criada < v_hoje;

  -- Insere missões do dia se não existirem
  INSERT INTO cidadela_missoes_diarias (user_id, missao_key, titulo, descricao, alvo, recompensa_sov, data_criada)
  VALUES
    (v_uid, 'botao_vitoria', 'Ganhe um jogo', 'Vença uma partida no modo carreira', 1, 5, v_hoje),
    (v_uid, 'botao_partida', 'Jogue 3 partidas', 'Dispute 3 partidas no modo carreira', 3, 8, v_hoje),
    (v_uid, 'trilha_jogo', 'Jogue Trilha', 'Entre na Cidadela e jogue uma partida de Trilha', 1, 5, v_hoje),
    (v_uid, 'chat_convite', 'Convide alguém', 'Envie uma mensagem no grupo da Cidadela', 1, 3, v_hoje),
    (v_uid, 'explorar_mercado', 'Explore o mercado', 'Acesse a aba Feira do celular', 1, 2, v_hoje)
  ON CONFLICT (user_id, missao_key, data_criada) DO NOTHING;

  RETURN QUERY
  SELECT id, missao_key, titulo, descricao, alvo, progresso, recompensa_sov, status
  FROM cidadela_missoes_diarias
  WHERE user_id = v_uid AND data_criada = v_hoje;
END;
$$;

-- Registra progresso em uma missão
CREATE OR REPLACE FUNCTION cidadela_progresso_missao(
  p_chave TEXT,
  p_delta INTEGER DEFAULT 1
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hoje DATE := CURRENT_DATE;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  UPDATE cidadela_missoes_diarias
  SET progresso = LEAST(alvo, progresso + p_delta),
      status = CASE WHEN progresso + p_delta >= alvo THEN 'completa' ELSE status END,
      updated_at = now()
  WHERE user_id = v_uid
    AND missao_key = p_chave
    AND data_criada = v_hoje
    AND status = 'ativa'
  RETURNING status INTO v_status;

  RETURN COALESCE(v_status, 'nao_encontrada');
END;
$$;

-- Resgata recompensa de missão completa
CREATE OR REPLACE FUNCTION cidadela_resgatar_missao(p_missao_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_recompensa INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT recompensa_sov INTO v_recompensa
  FROM cidadela_missoes_diarias
  WHERE id = p_missao_id
    AND user_id = v_uid
    AND status = 'completa';

  IF v_recompensa IS NULL THEN
    RETURN NULL;
  END IF;

  -- Marca como resgatada
  UPDATE cidadela_missoes_diarias
  SET status = 'resgatada',
      updated_at = now()
  WHERE id = p_missao_id;

  -- Adiciona SOV ao saldo (se sistema financeiro estiver disponível)
  BEGIN
    PERFORM create_or_update_wallet(v_uid);
    UPDATE user_wallets
    SET balance = balance + v_recompensa
    WHERE user_id = v_uid;
  EXCEPTION WHEN OTHERS THEN
    -- Sistema financeiro não disponível, ignora
    NULL;
  END;

  RETURN v_recompensa;
END;
$$;

GRANT EXECUTE ON FUNCTION cidadela_gerar_missoes_diarias() TO authenticated;
GRANT EXECUTE ON FUNCTION cidadela_progresso_missao(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cidadela_resgatar_missao(UUID) TO authenticated;
