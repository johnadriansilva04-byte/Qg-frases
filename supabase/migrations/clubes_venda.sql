-- =========================================================
-- CLUBES À VENDA — marketplace público de clubes (ordem 13)
-- =========================================================
-- O dono de um clube (botao_times.dono_user_id) anuncia a venda com preço.
-- Qualquer jogador autenticado vê a lista e compra: o SOV nasce no
-- bank_ledger (débito do comprador + crédito do vendedor, moeda existente —
-- sem emissão nova) e a posse transfere atomicamente. A participação do
-- vendedor some do snapshot dele (JSONB) para não pagar dividendos a quem
-- já vendeu.
--
-- Idempotente: pode colar no SQL Editor mais de uma vez sem erro.

ALTER TABLE public.botao_times
  ADD COLUMN IF NOT EXISTS em_venda BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.botao_times
  ADD COLUMN IF NOT EXISTS preco_venda NUMERIC;

-- Anunciar / alterar preço / retirar da vitrine. Só o dono anuncia.
-- p_preco NULL ou <= 0 retira o clube da vitrine.
CREATE OR REPLACE FUNCTION public.cidadela_anunciar_venda_clube(
  p_clube_id TEXT,
  p_preco NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_dono UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT dono_user_id INTO v_dono FROM public.botao_times WHERE id = p_clube_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clube nao encontrado: %', p_clube_id;
  END IF;
  IF v_dono IS NULL OR v_dono <> v_uid THEN
    RAISE EXCEPTION 'somente o dono pode anunciar a venda deste clube';
  END IF;

  IF p_preco IS NULL OR p_preco <= 0 THEN
    UPDATE public.botao_times
    SET em_venda = FALSE, preco_venda = NULL
    WHERE id = p_clube_id;
    RETURN jsonb_build_object('clube_id', p_clube_id, 'em_venda', FALSE);
  END IF;

  UPDATE public.botao_times
  SET em_venda = TRUE, preco_venda = ROUND(p_preco, 2)
  WHERE id = p_clube_id;
  RETURN jsonb_build_object('clube_id', p_clube_id, 'em_venda', TRUE, 'preco', ROUND(p_preco, 2));
END;
$$;

-- Vitrine pública: todo cidadão autenticado vê os clubes à venda.
CREATE OR REPLACE FUNCTION public.cidadela_listar_clubes_a_venda()
RETURNS TABLE (clube_id TEXT, nome TEXT, preco NUMERIC, dono_user_id UUID, dono_nome TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.nome,
         t.preco_venda,
         t.dono_user_id,
         bu.nome AS dono_nome
  FROM public.botao_times t
  LEFT JOIN public.botao_usuarios bu ON bu.user_id = t.dono_user_id
  WHERE t.em_venda = TRUE AND t.dono_user_id IS NOT NULL
  ORDER BY t.preco_venda ASC, t.nome;
$$;

-- Compra atômica de clube anunciado: trava a linha, confere a vitrine,
-- debita o comprador e credita o vendedor no ledger (idempotente), move a
-- posse e LIMPA a participação do vendedor no snapshot dele (JSONB) — senão
-- o vendedor continuava recebendo dividendos de um clube que já vendeu.
CREATE OR REPLACE FUNCTION public.cidadela_comprar_clube_anunciado(p_clube_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_dono UUID;
  v_preco NUMERIC;
  v_nome TEXT;
  v_saldo DECIMAL;
  v_tx UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT dono_user_id, preco_venda, nome INTO v_dono, v_preco, v_nome
  FROM public.botao_times WHERE id = p_clube_id AND em_venda = TRUE FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clube nao esta a venda';
  END IF;
  IF v_dono IS NULL THEN
    RAISE EXCEPTION 'clube sem dono nao pode ser comprado na vitrine';
  END IF;
  IF v_dono = v_uid THEN
    RAISE EXCEPTION 'voce ja e o dono deste clube';
  END IF;

  SELECT balance INTO v_saldo FROM public.user_wallets WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_saldo, 0) < v_preco THEN
    RAISE EXCEPTION 'saldo insuficiente';
  END IF;

  -- Débito do comprador (idempotente por clube+comprador).
  IF NOT EXISTS (SELECT 1 FROM public.bank_ledger
                 WHERE user_id = v_uid AND idempotency_key = 'venda-clube:' || p_clube_id || ':' || v_uid) THEN
    v_tx := record_transaction(v_uid, 'transfer', -v_preco,
      'Compra do clube ' || COALESCE(v_nome, p_clube_id) || ' (vitrine)', 'market',
      jsonb_build_object('clube_id', p_clube_id, 'vendedor', v_dono));
    UPDATE public.bank_ledger SET idempotency_key = 'venda-clube:' || p_clube_id || ':' || v_uid,
      source_event = 'vitrine-compra-clube', balance_before = balance_after + v_preco
    WHERE id = v_tx;
  END IF;

  -- Crédito do vendedor (mesma chave-escopo: uma venda, um crédito).
  IF NOT EXISTS (SELECT 1 FROM public.bank_ledger
                 WHERE user_id = v_dono AND idempotency_key = 'venda-clube:' || p_clube_id || ':' || v_uid || ':vendedor') THEN
    v_tx := record_transaction(v_dono, 'transfer', v_preco,
      'Venda do clube ' || COALESCE(v_nome, p_clube_id) || ' (vitrine)', 'market',
      jsonb_build_object('clube_id', p_clube_id, 'comprador', v_uid));
    UPDATE public.bank_ledger SET idempotency_key = 'venda-clube:' || p_clube_id || ':' || v_uid || ':vendedor',
      source_event = 'vitrine-venda-clube', balance_before = balance_after - v_preco
    WHERE id = v_tx;
  END IF;

  -- Posse transferida; vitrine limpa.
  UPDATE public.botao_times
  SET dono_user_id = v_uid, em_venda = FALSE, preco_venda = NULL
  WHERE id = p_clube_id;

  -- A participação do vendedor some do snapshot dele (senão ele seguia
  -- recebendo dividendos e vendendo cotas de um clube que não é mais dele).
  UPDATE public.botao_usuarios
  SET progresso_caminpanha = jsonb_set(
        progresso_caminpanha,
        '{career,propriedadeClubes,participacoes}',
        COALESCE(progresso_caminpanha #> '{career,propriedadeClubes,participacoes}', '{}'::jsonb) - p_clube_id,
        TRUE
      )
  WHERE user_id = v_dono
    AND progresso_caminpanha #> '{career,propriedadeClubes,participacoes}' ? p_clube_id;

  RETURN jsonb_build_object(
    'clube_id', p_clube_id,
    'nome', v_nome,
    'preco', v_preco,
    'de', v_dono,
    'para', v_uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cidadela_anunciar_venda_clube(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_listar_clubes_a_venda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_comprar_clube_anunciado(TEXT) TO authenticated;
