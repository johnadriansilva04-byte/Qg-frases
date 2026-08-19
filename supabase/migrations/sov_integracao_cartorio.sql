-- Integração SOV (Banco Central) + Cartório da Cidadela
-- Centraliza soberania em user_wallets/bank_ledger e adiciona o sistema de
-- pedidos/documentos do Cartório (link entre RPG e Biblioteca).

-- =========================================================
-- 1. RPCs SOV (soberania unificada)
-- =========================================================

-- Drop função existente para poder mudar tipo de retorno
DROP FUNCTION IF EXISTS registrar_transacao_soberania(UUID, DECIMAL, TEXT, TEXT, TEXT, JSONB);

-- Wrapper seguro sobre record_transaction. Valida o autor (auth.uid() ou
-- service_role) e devolve o saldo resultante, para o frontend atualizar o
-- cache pontos_soberania na mesma chamada.
CREATE OR REPLACE FUNCTION registrar_transacao_soberania(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_source_module TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (balance DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id UUID;
  v_bal DECIMAL;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Usuario autenticado nao pode mover soberania de terceiros';
  END IF;

  v_tx_id := record_transaction(
    p_user_id,
    p_type,
    p_amount,
    p_description,
    p_source_module,
    p_metadata
  );

  SELECT balance INTO v_bal FROM user_wallets WHERE user_id = p_user_id;
  RETURN QUERY SELECT v_bal AS balance;
END;
$$;

-- Saldo atual da carteira (fonte de verdade da soberania).
CREATE OR REPLACE FUNCTION obter_saldo_soberania(p_user_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bal DECIMAL;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para ler saldo de terceiros';
  END IF;

  SELECT balance INTO v_bal FROM user_wallets WHERE user_id = p_user_id;
  RETURN COALESCE(v_bal, 0::DECIMAL);
END;
$$;

-- Histórico de transações (bank_ledger), mais recente primeiro.
CREATE OR REPLACE FUNCTION historico_transacoes(
  p_user_id UUID,
  p_limite INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount DECIMAL,
  balance_after DECIMAL,
  description TEXT,
  source_module TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para ler historico de terceiros';
  END IF;

  RETURN QUERY
  SELECT l.id, l.transaction_type, l.amount, l.balance_after, l.description,
         l.source_module, l.metadata, l.created_at
  FROM bank_ledger l
  WHERE l.user_id = p_user_id
  ORDER BY l.created_at DESC
  LIMIT GREATEST(p_limite, 1);
END;
$$;

-- =========================================================
-- 2. Cartório da Cidadela (pedidos + documentos)
-- =========================================================

-- Pedidos pendentes (contrato/peticao/multa) gerados por eventos RPG.
CREATE TABLE IF NOT EXISTS cartorio_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'peticao', 'multa')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido')),
  titulo TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cartorio_pedidos_user ON cartorio_pedidos(user_id, status);

-- Documentos lavrados (contrato/peticao/multa) pela Biblioteca.
CREATE TABLE IF NOT EXISTS cartorio_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES cartorio_pedidos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'peticao', 'multa')),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cartorio_documentos_user ON cartorio_documentos(user_id, created_at DESC);

-- RLS: somente o dono lê; escritas via RPCs SECURITY DEFINER abaixo.
ALTER TABLE cartorio_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartorio_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cartorio_pedidos_select_dono" ON cartorio_pedidos;
CREATE POLICY "cartorio_pedidos_select_dono" ON cartorio_pedidos
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cartorio_documentos_select_dono" ON cartorio_documentos;
CREATE POLICY "cartorio_documentos_select_dono" ON cartorio_documentos
  FOR SELECT USING (auth.uid() = user_id);

-- Cria pedido pendente (evento RPG → link do celular → Biblioteca).
CREATE OR REPLACE FUNCTION criar_pedido_cartorio(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_dados JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para criar pedido de terceiros';
  END IF;
  IF p_tipo NOT IN ('contrato', 'peticao', 'multa') THEN
    RAISE EXCEPTION 'Tipo de pedido invalido: %', p_tipo;
  END IF;

  INSERT INTO cartorio_pedidos (user_id, tipo, titulo, dados, status)
  VALUES (p_user_id, p_tipo, p_titulo, p_dados, 'pendente')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Marca pedido como concluído (somente o dono).
CREATE OR REPLACE FUNCTION concluir_pedido_cartorio(p_pedido_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dono UUID;
BEGIN
  SELECT user_id INTO v_dono FROM cartorio_pedidos WHERE id = p_pedido_id;
  IF v_dono IS NULL THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_dono THEN
    RAISE EXCEPTION 'Sem permissao para concluir pedido de terceiros';
  END IF;

  UPDATE cartorio_pedidos
  SET status = 'concluido', concluido_em = NOW(), updated_at = NOW()
  WHERE id = p_pedido_id;
  RETURN TRUE;
END;
$$;

-- Registra um documento lavrado pela Bibliotecária.
CREATE OR REPLACE FUNCTION salvar_documento_cartorio(
  p_user_id UUID,
  p_pedido_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_conteudo TEXT,
  p_dados JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Sem permissao para lavrar documento de terceiros';
  END IF;
  IF p_tipo NOT IN ('contrato', 'peticao', 'multa') THEN
    RAISE EXCEPTION 'Tipo de documento invalido: %', p_tipo;
  END IF;

  INSERT INTO cartorio_documentos (user_id, pedido_id, tipo, titulo, conteudo, dados)
  VALUES (p_user_id, p_pedido_id, p_tipo, p_titulo, p_conteudo, p_dados)
  RETURNING id INTO v_id;

  IF p_pedido_id IS NOT NULL THEN
    UPDATE cartorio_pedidos
    SET status = 'concluido', concluido_em = NOW(), updated_at = NOW()
    WHERE id = p_pedido_id AND user_id = p_user_id;
  END IF;

  RETURN v_id;
END;
$$;
