-- Feira da Cidadela — marketplace de itens (Pergaminhos) integrado ao SOV BANK
-- Depende de: sov_financial_system.sql + sov_bank.sql (sov_bank_registrar).
-- Toda compra/venda passa pelo SOV Bank (ledger rastreável) — nunca altera
-- saldo diretamente. Idempotente: seguro rodar mais de uma vez no SQL Editor.

-- =========================================================
-- 1. Catálogo de itens
-- =========================================================
CREATE TABLE IF NOT EXISTS cidadela_itens (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'pergaminho',
  raridade TEXT NOT NULL DEFAULT 'comum',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pergaminhos negociáveis da Cidadela (fragmentos históricos genéricos —
-- os fragmentos narrativos da história principal vivem no progresso do jogador).
INSERT INTO cidadela_itens (slug, nome, tipo, descricao, raridade)
VALUES
  ('pergaminho-antigo', 'Pergaminho Antigo', 'pergaminho', 'Fragmento histórico gasto pelo tempo, encontrado nos arquivos da Cidadela.', 'comum'),
  ('pergaminho-catalogo', 'Pergaminho de Catálogo', 'pergaminho', 'Ficha catalográfica antiga da Biblioteca — o tipo de papel que registra quem consultou o quê.', 'comum'),
  ('pergaminho-mapa', 'Pergaminho de Mapa', 'pergaminho', 'Mapa desenhado à mão de uma parte esquecida da Cidadela.', 'raro'),
  ('pergaminho-selo', 'Pergaminho Selado', 'pergaminho', 'Documento lacrado com o selo de cera da fundação da Cidadela.', 'raro')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE cidadela_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Itens leitura publica" ON cidadela_itens;
CREATE POLICY "Itens leitura publica" ON cidadela_itens FOR SELECT USING (true);

-- =========================================================
-- 2. Inventário dos jogadores
-- =========================================================
CREATE TABLE IF NOT EXISTS cidadela_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_slug TEXT NOT NULL REFERENCES cidadela_itens(slug),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_slug)
);

ALTER TABLE cidadela_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventario dono le" ON cidadela_inventory;
CREATE POLICY "Inventario dono le" ON cidadela_inventory
  FOR SELECT USING (auth.uid() = user_id);

-- Concessões rastreáveis de itens (idempotência por usuário+evento de origem).
CREATE TABLE IF NOT EXISTS cidadela_item_grants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  item_slug TEXT NOT NULL REFERENCES cidadela_itens(slug),
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, evento, item_slug)
);

ALTER TABLE cidadela_item_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Grants dono le" ON cidadela_item_grants;
CREATE POLICY "Grants dono le" ON cidadela_item_grants
  FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- 3. Ofertas do marketplace
-- =========================================================
CREATE TABLE IF NOT EXISTS cidadela_market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_nome TEXT NOT NULL DEFAULT 'Recruta',
  item_slug TEXT NOT NULL REFERENCES cidadela_itens(slug),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_sov DECIMAL(15, 2) NOT NULL CHECK (preco_sov > 0),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'vendida', 'cancelada')),
  comprador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON cidadela_market_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON cidadela_market_listings(seller_id);

ALTER TABLE cidadela_market_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Listings leitura publica" ON cidadela_market_listings;
CREATE POLICY "Listings leitura publica" ON cidadela_market_listings
  FOR SELECT USING (true);

-- =========================================================
-- 4. RPC: conceder item (origem rastreável, idempotente)
-- =========================================================
-- Usado por eventos reais do jogo (ex.: fragmento de história entregue). A
-- chave (user_id, evento, item_slug) impede duplicar a concessão por retry.
CREATE OR REPLACE FUNCTION feira_conceder_item(
  p_item_slug TEXT,
  p_evento TEXT,
  p_quantidade INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_quantidade < 1 OR p_quantidade > 10 THEN
    RAISE EXCEPTION 'quantidade invalida';
  END IF;

  INSERT INTO cidadela_item_grants (user_id, evento, item_slug, quantidade)
  VALUES (v_uid, p_evento, p_item_slug, p_quantidade)
  ON CONFLICT (user_id, evento, item_slug) DO NOTHING;

  IF FOUND THEN
    INSERT INTO cidadela_inventory (user_id, item_slug, quantidade)
    VALUES (v_uid, p_item_slug, p_quantidade)
    ON CONFLICT (user_id, item_slug)
    DO UPDATE SET quantidade = cidadela_inventory.quantidade + EXCLUDED.quantidade,
                  updated_at = NOW();
  END IF;
  RETURN TRUE;
END;
$$;

-- =========================================================
-- 5. RPC: publicar oferta (retira do inventário)
-- =========================================================
CREATE OR REPLACE FUNCTION feira_publicar_oferta(
  p_item_slug TEXT,
  p_quantidade INTEGER,
  p_preco DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_nome TEXT;
  v_oferta_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_quantidade < 1 THEN
    RAISE EXCEPTION 'quantidade invalida';
  END IF;
  IF p_preco IS NULL OR p_preco <= 0 OR p_preco > 100000 THEN
    RAISE EXCEPTION 'preco invalido';
  END IF;

  -- Debita o estoque do vendedor de forma atômica (falha se insuficiente).
  UPDATE cidadela_inventory
  SET quantidade = quantidade - p_quantidade, updated_at = NOW()
  WHERE user_id = v_uid AND item_slug = p_item_slug AND quantidade >= p_quantidade;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'estoque insuficiente para anunciar';
  END IF;

  v_nome := COALESCE(
    (SELECT nome FROM cidadela_perfis WHERE user_id = v_uid),
    (SELECT nome FROM botao_usuarios WHERE user_id = v_uid),
    'Recruta'
  );

  INSERT INTO cidadela_market_listings (seller_id, seller_nome, item_slug, quantidade, preco_sov)
  VALUES (v_uid, v_nome, p_item_slug, p_quantidade, p_preco)
  RETURNING id INTO v_oferta_id;
  RETURN v_oferta_id;
END;
$$;

-- =========================================================
-- 6. RPC: cancelar oferta (devolve ao inventário)
-- =========================================================
CREATE OR REPLACE FUNCTION feira_cancelar_oferta(p_oferta_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_oferta cidadela_market_listings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT * INTO v_oferta FROM cidadela_market_listings
  WHERE id = p_oferta_id FOR UPDATE;

  IF v_oferta.id IS NULL OR v_oferta.status <> 'ativa' THEN
    RAISE EXCEPTION 'oferta nao encontrada ou ja encerrada';
  END IF;
  IF v_oferta.seller_id <> v_uid THEN
    RAISE EXCEPTION 'somente o vendedor pode cancelar';
  END IF;

  UPDATE cidadela_market_listings SET status = 'cancelada', updated_at = NOW() WHERE id = p_oferta_id;

  INSERT INTO cidadela_inventory (user_id, item_slug, quantidade)
  VALUES (v_uid, v_oferta.item_slug, v_oferta.quantidade)
  ON CONFLICT (user_id, item_slug)
  DO UPDATE SET quantidade = cidadela_inventory.quantidade + EXCLUDED.quantidade,
                updated_at = NOW();
  RETURN TRUE;
END;
$$;

-- =========================================================
-- 7. RPC: comprar oferta — A TRANSAÇÃO CENTRAL DA FEIRA
-- =========================================================
-- Preço/item/vendedor vêm SEMPRE do banco (nunca do cliente). A movimentação
-- financeira passa pelo SOV Bank: débito do comprador + crédito do vendedor,
-- ambos com origem e chaves idempotentes por oferta.
CREATE OR REPLACE FUNCTION feira_comprar(p_oferta_id UUID)
RETURNS TABLE (balance DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_oferta cidadela_market_listings%ROWTYPE;
  v_item_nome TEXT;
  v_bal DECIMAL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  -- Trava a oferta: apenas UMA compra vence, mesmo sob concorrência.
  SELECT * INTO v_oferta FROM cidadela_market_listings
  WHERE id = p_oferta_id FOR UPDATE;

  IF v_oferta.id IS NULL THEN
    RAISE EXCEPTION 'oferta nao encontrada';
  END IF;
  IF v_oferta.status <> 'ativa' THEN
    RAISE EXCEPTION 'oferta nao esta mais disponivel';
  END IF;
  IF v_oferta.seller_id = v_uid THEN
    RAISE EXCEPTION 'voce nao pode comprar a propria oferta';
  END IF;

  v_item_nome := COALESCE(
    (SELECT nome FROM cidadela_itens WHERE slug = v_oferta.item_slug),
    v_oferta.item_slug
  );

  -- 1. Débito do comprador no SOV Bank (falha se saldo insuficiente).
  PERFORM sov_bank_registrar(
    v_uid, -v_oferta.preco_sov, 'fee',
    format('Feira: compra de %s (x%s)', v_item_nome, v_oferta.quantidade),
    'market', 'feira_compra', 'feira:compra:' || p_oferta_id::TEXT || ':' || v_uid::TEXT,
    jsonb_build_object('oferta_id', p_oferta_id, 'item', v_oferta.item_slug,
                       'quantidade', v_oferta.quantidade, 'vendedor', v_oferta.seller_id)
  );

  -- 2. Crédito do vendedor no SOV Bank.
  PERFORM sov_bank_registrar(
    v_oferta.seller_id, v_oferta.preco_sov, 'reward',
    format('Feira: venda de %s (x%s)', v_item_nome, v_oferta.quantidade),
    'market', 'feira_venda', 'feira:venda:' || p_oferta_id::TEXT,
    jsonb_build_object('oferta_id', p_oferta_id, 'item', v_oferta.item_slug,
                       'quantidade', v_oferta.quantidade, 'comprador', v_uid)
  );

  -- 3. Transfere o item para o inventário do comprador.
  INSERT INTO cidadela_inventory (user_id, item_slug, quantidade)
  VALUES (v_uid, v_oferta.item_slug, v_oferta.quantidade)
  ON CONFLICT (user_id, item_slug)
  DO UPDATE SET quantidade = cidadela_inventory.quantidade + EXCLUDED.quantidade,
                updated_at = NOW();

  -- 4. Encerra a oferta (rastreável: quem comprou e quando).
  UPDATE cidadela_market_listings
  SET status = 'vendida', comprador_id = v_uid, updated_at = NOW()
  WHERE id = p_oferta_id;

  SELECT w.balance INTO v_bal FROM user_wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT COALESCE(v_bal, 0::DECIMAL);
END;
$$;

-- =========================================================
-- 8. Permissões
-- =========================================================
GRANT EXECUTE ON FUNCTION feira_conceder_item(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION feira_publicar_oferta(TEXT, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION feira_cancelar_oferta(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION feira_comprar(UUID) TO authenticated;
