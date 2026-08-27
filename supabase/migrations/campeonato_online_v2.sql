-- ============================================================================
-- CAMPEONATO ONLINE v2 — 32 jogadores, regra dos 50 SOV, bots, prêmio e
-- aposta de mesa cobrada de verdade (2026-08-23)
--
-- Aditivo: nunca recria tabelas. Aplicar DEPOIS de futebol.sql,
-- sov_financial_system.sql e sov_bank.sql (ver migrations/README.md).
--
-- Conteúdo:
--   1) max_jogadores 2..32 + coluna premio_sov;
--   2) record_transaction corrigida (crédito NUNCA bloqueado em conta
--      negativa — só débito é bloqueado);
--   3) regra dos 50 SOV em criar/entrar campeonato;
--   4) preencher_campeonato_bots (só o criador; bots = clubes existentes);
--   5) resolver_confronto_bots (só o criador; bot × bot simulado);
--   6) registrar_resultado_campeonato ciente de bots (campeão bot não quebra
--      a FK de vencedor_id);
--   7) aposta da mesa cobrada na criação/entrada + pagar_premio_mesa;
--   8) UPDATE de botao_campeonatos_online restrito ao criador.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Sala para até 32 jogadores + prêmio do campeonato
-- ---------------------------------------------------------------------------
ALTER TABLE public.botao_campeonatos_online
  DROP CONSTRAINT IF EXISTS botao_campeonatos_online_max_jogadores_check;
ALTER TABLE public.botao_campeonatos_online
  ADD CONSTRAINT botao_campeonatos_online_max_jogadores_check
  CHECK (max_jogadores BETWEEN 2 AND 32);
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS premio_sov NUMERIC NOT NULL DEFAULT 0;

COMMIT;

-- ---------------------------------------------------------------------------
-- 2) record_transaction: crédito nunca é bloqueado por saldo negativo.
--    (Re-aplicada aqui porque a versão antiga em produção rejeitava QUALQUER
--    transação que deixasse a conta negativa — inclusive CRÉDITO — e contas
--    endividadas paravam de receber prêmio/receita/salário.)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_transaction(UUID, TEXT, DECIMAL, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL,
  p_description TEXT,
  p_source_module TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    v_wallet_id := public.create_or_update_wallet(p_user_id);
    v_current_balance := 0.00;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  -- Bloqueio SÓ para débito que ficaria negativo (penalty/bet_loss podem
  -- deixar a conta no vermelho por regra de jogo). CRÉDITO sempre entra:
  -- é ele que recupera uma conta endividada.
  IF p_amount < 0 AND v_new_balance < 0
     AND p_transaction_type NOT IN ('penalty', 'bet_loss') THEN
    RAISE EXCEPTION 'Saldo insuficiente para transação';
  END IF;

  UPDATE public.user_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.bank_ledger (
    user_id, transaction_type, amount, balance_after, description, source_module, metadata
  ) VALUES (
    p_user_id, p_transaction_type, p_amount, v_new_balance, p_description, p_source_module, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 3) Regra dos 50 SOV: criar e entrar no Campeonato Online exigem saldo ≥ 50.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._saldo_sov(p_uid UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance FROM public.user_wallets WHERE user_id = p_uid), 0)
$$;

-- A assinatura antiga (2 args) precisa sair para não ambiguar com a nova.
DROP FUNCTION IF EXISTS public.criar_campeonato_online(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.criar_campeonato_online(
  p_nome TEXT DEFAULT 'Campeonato Online',
  p_max INTEGER DEFAULT 4,
  p_premio_sov NUMERIC DEFAULT 0
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_row   public.botao_campeonatos_online;
  v_part  JSONB;
  v_codigo TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF p_max NOT BETWEEN 2 AND 32 THEN RAISE EXCEPTION 'max_jogadores precisa estar entre 2 e 32'; END IF;
  IF public._saldo_sov(v_uid) < 50 THEN
    RAISE EXCEPTION 'Voce precisa de pelo menos 50 SOV para criar um campeonato online';
  END IF;

  v_codigo := 'CAMP-' || to_char(now(), 'YYMMDDHH24MISSMS') || '-'
              || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 6);

  v_part := jsonb_build_array(jsonb_build_object(
    'user_id', v_uid,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'time_id', COALESCE((SELECT time_personalizado FROM public.botao_usuarios WHERE user_id = v_uid), 'Meu Time'),
    'abreviacao', COALESCE((SELECT abreviacao_time FROM public.botao_usuarios WHERE user_id = v_uid), 'MTI'),
    'pontos', 0,
    'gols_pro', 0,
    'gols_contra', 0
  ));

  INSERT INTO public.botao_campeonatos_online
    (codigo, nome, criador_id, max_jogadores, participantes, premio_sov)
  VALUES (v_codigo, p_nome, v_uid, p_max, v_part, GREATEST(0, COALESCE(p_premio_sov, 0)))
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

CREATE OR REPLACE FUNCTION public.entrar_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
  v_novo JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aberto'; END IF;

  v_part := v_row.participantes;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = v_uid::TEXT) THEN
    RETURN v_row;  -- já é participante (reconexão pelo link: cai direto na sala)
  END IF;

  IF jsonb_array_length(v_part) >= v_row.max_jogadores THEN
    RAISE EXCEPTION 'campeonato cheio';
  END IF;
  IF public._saldo_sov(v_uid) < 50 THEN
    RAISE EXCEPTION 'Voce precisa de pelo menos 50 SOV para entrar no campeonato online';
  END IF;

  v_novo := jsonb_build_object(
    'user_id', v_uid,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'time_id', COALESCE((SELECT time_personalizado FROM public.botao_usuarios WHERE user_id = v_uid), 'Meu Time'),
    'abreviacao', COALESCE((SELECT abreviacao_time FROM public.botao_usuarios WHERE user_id = v_uid), 'MTI'),
    'pontos', 0,
    'gols_pro', 0,
    'gols_contra', 0
  );

  UPDATE public.botao_campeonatos_online
     SET participantes = v_part || jsonb_build_array(v_novo)
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 3b) iniciar_campeonato_online: byes nascem FINALIZADOS (antes ficavam
--     'pendente' para sempre e o campeonato com número ímpar de jogadores
--     nunca avançava de rodada).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iniciar_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_ids UUID[];
  v_id UUID;
  v_rodadas JSONB;
  v_confrontos JSONB := '[]'::JSONB;
  v_r RECORD;
  v_p RECORD;
  v_c JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o criador pode iniciar'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aguardando'; END IF;
  IF jsonb_array_length(v_row.participantes) < 2 THEN RAISE EXCEPTION 'minimo de 2 jogadores'; END IF;

  v_ids := ARRAY[]::UUID[];
  FOR v_id IN SELECT (el->>'user_id')::UUID FROM jsonb_array_elements(v_row.participantes) el LOOP
    v_ids := v_ids || ARRAY[v_id];
  END LOOP;

  v_rodadas := public._gerar_confrontos_campeonato(v_ids);

  FOR v_r IN SELECT * FROM jsonb_array_elements(v_rodadas) WITH ORDINALITY AS t(rd, ord) LOOP
    FOR v_p IN SELECT * FROM jsonb_array_elements((v_r.rd->>'pares')::JSONB) WITH ORDINALITY AS t2(par, ord2) LOOP
      v_c := jsonb_build_object(
        'rodada', (v_r.rd->>'rodada')::INT,
        'mesa_id', NULL,
        'j1_id', v_p.par->>'j1_id',
        'j2_id', v_p.par->>'j2_id',
        'pl_j1', 0,
        'pl_j2', 0,
        -- bye nasce FINALIZADO: não é partida e não pode travar o avanço.
        'status', CASE WHEN COALESCE((v_p.par->>'bye')::BOOLEAN, false) THEN 'finalizado' ELSE 'pendente' END,
        'bye', COALESCE((v_p.par->>'bye')::BOOLEAN, false)
      );
      v_confrontos := v_confrontos || jsonb_build_array(v_c);
    END LOOP;
  END LOOP;

  UPDATE public.botao_campeonatos_online
     SET status = 'em_andamento',
         fase = 1,
         rodada_atual = 1,
         confrontos = v_confrontos
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 4) Preencher com Bots — SÓ o criador. Os bots são os clubes que JÁ existem
--    no universo do jogo (a base de times da Cidadela): o cliente envia a
--    lista e o servidor valida/preenche as vagas restantes. Nenhum usuário
--    novo é criado — o participante bot é uma entrada marcada (bot=true).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preencher_campeonato_bots(
  p_codigo TEXT,
  p_bots JSONB
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_row  public.botao_campeonatos_online;
  v_part JSONB;
  v_bot  JSONB;
  v_vagas INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o dono da sala pode preencher com bots'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato ja comecou'; END IF;

  v_part := v_row.participantes;
  v_vagas := v_row.max_jogadores - jsonb_array_length(v_part);
  IF v_vagas <= 0 THEN RETURN v_row; END IF;

  FOR v_bot IN SELECT * FROM jsonb_array_elements(COALESCE(p_bots, '[]'::JSONB)) LOOP
    EXIT WHEN v_vagas <= 0;
    -- Nunca duplica: nem o mesmo bot (time), nem um usuário já presente.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_part) el
      WHERE el->>'time_id' = v_bot->>'time_id' OR el->>'abreviacao' = v_bot->>'abreviacao'
    );
    v_part := v_part || jsonb_build_array(jsonb_build_object(
      'user_id', gen_random_uuid(),
      'nome', COALESCE(v_bot->>'nome', 'Bot'),
      'time_id', COALESCE(v_bot->>'time_id', 'Bot FC'),
      'abreviacao', COALESCE(v_bot->>'abreviacao', 'BOT'),
      'power', COALESCE((v_bot->>'power')::INT, 50),
      'bot', true,
      'pontos', 0,
      'gols_pro', 0,
      'gols_contra', 0
    ));
    v_vagas := v_vagas - 1;
  END LOOP;

  UPDATE public.botao_campeonatos_online
     SET participantes = v_part
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 5) Resolver confronto bot × bot — SÓ o criador, e apenas quando os DOIS
--    lados são bots. O placar vem da simulação determinística do cliente
--    (motor existente, por força dos clubes). Humanos nunca são afetados.
--    Replica a matemática de pontos e o avanço de rodada do
--    registrar_resultado_campeonato (bots não têm perfil em botao_usuarios).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolver_confronto_bots(
  p_campeonato_id BIGINT,
  p_rodada INTEGER,
  p_j1 TEXT,
  p_j2 TEXT,
  p_gols_j1 INTEGER,
  p_gols_j2 INTEGER
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_item JSONB;
  v_el JSONB;
  v_total INTEGER;
  v_finalizados INTEGER := 0;
  v_ultima_rodada INTEGER;
  v_campeao JSONB;
  v_bot1 BOOLEAN;
  v_bot2 BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o dono da sala resolve confrontos de bots'; END IF;
  IF v_row.status <> 'em_andamento' THEN RAISE EXCEPTION 'campeonato nao esta em andamento'; END IF;

  v_part := v_row.participantes;

  -- Os DOIS lados precisam ser participantes marcados como bot.
  SELECT COALESCE((SELECT bool_or(COALESCE((el->>'bot')::BOOLEAN, false))
                   FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = p_j1), false)
    INTO v_bot1;
  SELECT COALESCE((SELECT bool_or(COALESCE((el->>'bot')::BOOLEAN, false))
                   FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = p_j2), false)
    INTO v_bot2;
  IF NOT v_bot1 OR NOT v_bot2 THEN
    RAISE EXCEPTION 'resolver_confronto_bots vale apenas para confronto bot x bot';
  END IF;

  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx];
    IF (v_item->>'rodada')::INT = p_rodada
       AND v_item->>'j1_id' = p_j1 AND v_item->>'j2_id' = p_j2
       AND v_item->>'status' = 'pendente' THEN
      v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(GREATEST(0, p_gols_j1)));
      v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(GREATEST(0, p_gols_j2)));
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = p_j1 THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j2)
            WHEN el->>'user_id' = p_j2 THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j1)
            ELSE el
          END)
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);
    END IF;
    IF v_item->>'status' = 'finalizado' THEN v_finalizados := v_finalizados + 1; END IF;
  END LOOP;

  SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
  FROM jsonb_array_elements(v_confrontos) c;

  IF v_finalizados = v_total AND v_total > 0 THEN
    SELECT el INTO v_campeao
    FROM jsonb_array_elements(v_part) el
    ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC
    LIMIT 1;

    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado', fase = -1,
           participantes = v_part, confrontos = v_confrontos,
           vencedor_id = CASE
             WHEN COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN NULL
             ELSE (v_campeao->>'user_id')::UUID END
     WHERE id = v_row.id
    RETURNING * INTO v_row;

    IF NOT COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN
      UPDATE public.botao_usuarios
         SET pontos_soberania = pontos_soberania + 50,
             campeonatos_ganhos = campeonatos_ganhos + 1
       WHERE user_id = (v_campeao->>'user_id')::UUID;
    END IF;
  ELSE
    PERFORM 1
    FROM jsonb_array_elements(v_confrontos) c
    WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado'
    LIMIT 1;
    IF NOT FOUND AND v_row.rodada_atual < v_ultima_rodada THEN
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos,
             rodada_atual = v_row.rodada_atual + 1
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    ELSE
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 5b) CORREÇÃO CRÍTICA de indexação (off-by-one): jsonb é 0-based e
--     WITH ORDINALITY é 1-based. As versões antigas liam/gravavam o elemento
--     ERRADO do array de confrontos (pulavam o primeiro ou gravavam no
--     seguinte) — era por isso que a mesa do campeonato "não funcionava".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vincular_mesa_campeonato(
  p_campeonato_id BIGINT,
  p_rodada INTEGER,
  p_mesa_id TEXT
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_item JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_confrontos := v_row.confrontos;

  -- ord é 1-based; o índice jsonb é ord-1.
  SELECT (ord - 1)::INT INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE (t.item->>'rodada')::INT = p_rodada
    AND t.item->>'mesa_id' IS NULL
    AND t.item->>'status' = 'pendente'
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NULL THEN
    RAISE EXCEPTION 'nenhum confronto pendente para voce na rodada %', p_rodada;
  END IF;

  v_item := jsonb_set(v_confrontos[v_idx], '{mesa_id}', to_jsonb(p_mesa_id));
  v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

  UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

CREATE OR REPLACE FUNCTION public.abrir_mesa_campeonato(
  p_campeonato_id BIGINT,
  p_rodada INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_row        public.botao_campeonatos_online;
  v_confrontos JSONB;
  v_idx        INT;
  v_item       JSONB;
  v_j1         TEXT;
  v_j2         TEXT;
  v_time1      TEXT;
  v_time2      TEXT;
  v_mesa_id    TEXT;
  v_existe     INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado (id=%)', p_campeonato_id; END IF;
  IF v_row.status <> 'em_andamento' THEN RAISE EXCEPTION 'campeonato nao esta em andamento (status=%)', v_row.status; END IF;

  v_confrontos := v_row.confrontos;
  IF COALESCE(jsonb_array_length(v_confrontos), 0) = 0 THEN
    RAISE EXCEPTION 'campeonato sem confrontos';
  END IF;

  -- ord é 1-based; o índice jsonb é ord-1. Primeiro tenta um confronto do
  -- usuário JÁ vinculado (reconexão); depois um pendente para vincular.
  SELECT (ord - 1)::INT INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE COALESCE((t.item->>'rodada')::INT, -1) = p_rodada
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND t.item->>'status' = 'pendente'
    AND t.item->>'mesa_id' IS NOT NULL
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NOT NULL THEN
    v_item := v_confrontos[v_idx];
    SELECT COUNT(*) INTO v_existe FROM public.mesas_futebol m WHERE m.mesa_id = (v_item->>'mesa_id');
    IF v_existe > 0 THEN
      RETURN v_item->>'mesa_id';
    END IF;
  END IF;

  SELECT (ord - 1)::INT INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE COALESCE((t.item->>'rodada')::INT, -1) = p_rodada
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND t.item->>'status' = 'pendente'
    AND t.item->>'mesa_id' IS NULL
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NULL THEN
    RAISE EXCEPTION 'nenhum confronto pendente encontrado para voce na rodada % (uid=%)',
      p_rodada, v_uid;
  END IF;

  v_item := v_confrontos[v_idx];
  v_j1 := v_item->>'j1_id';
  v_j2 := v_item->>'j2_id';

  -- BOT não é usuário real: mesa realtime exige FK em auth.users. Quando um
  -- lado é bot, a partida é jogada localmente contra o motor e registrada
  -- direto no confronto (sem mesa). Devolvemos um identificador sintético
  -- que o frontend reconhece e usa o caminho local.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_row.participantes) el
             WHERE el->>'user_id' = v_j1 AND COALESCE((el->>'bot')::BOOLEAN, false))
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_row.participantes) el
                WHERE el->>'user_id' = v_j2 AND COALESCE((el->>'bot')::BOOLEAN, false)) THEN
    RETURN 'botmatch_' || p_campeonato_id || '_' || p_rodada || '_' || v_j1 || '_' || v_j2;
  END IF;

  SELECT
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j1), 'Meu Time'),
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j2), 'Meu Time')
  INTO v_time1, v_time2;

  v_mesa_id := 'camp_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  INSERT INTO public.mesas_futebol
    (mesa_id, jogador_1_id, jogador_2_id, time_j1, time_j2,
     status, turno_atual_id, iniciado_em, tempo_restante_segundos,
     modalidade, campeonato_id, jogador_1_online, jogador_2_online,
     ultimo_heartbeat_j1, ultimo_heartbeat_j2)
  VALUES
    (v_mesa_id, v_j1::UUID, v_j2::UUID, v_time1, v_time2,
     'em_andamento', v_j1::UUID, now(), 300,
     'campeonato', p_campeonato_id, true, false,
     now(), NULL);

  v_item := jsonb_set(v_item, '{mesa_id}', to_jsonb(v_mesa_id));
  v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);
  UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos WHERE id = v_row.id;

  RETURN v_mesa_id;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 5c) Resultado de confronto HUMANO × BOT: o placar jogado localmente contra o
--     motor é registrado direto no confronto (sem mesa realtime, que exige FK
--     em auth.users para o bot). Valida que UM lado é humano (o chamador) e o
--     outro é bot. Atualiza participantes + estatísticas do humano + avanço.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_resultado_vs_bot(
  p_campeonato_id BIGINT,
  p_rodada INTEGER,
  p_gols_humano INTEGER,
  p_gols_bot INTEGER
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_item JSONB;
  v_j1 TEXT;
  v_j2 TEXT;
  v_humano TEXT;
  v_bot TEXT;
  v_gols_j1 INTEGER;
  v_gols_j2 INTEGER;
  v_el JSONB;
  v_total INTEGER;
  v_finalizados INTEGER := 0;
  v_ultima_rodada INTEGER;
  v_campeao JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'em_andamento' THEN RAISE EXCEPTION 'campeonato nao esta em andamento'; END IF;

  v_part := v_row.participantes;
  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  -- Localiza o confronto pendente do humano contra um bot nesta rodada.
  SELECT (ord - 1)::INT INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE (t.item->>'rodada')::INT = p_rodada
    AND t.item->>'status' = 'pendente'
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NULL THEN
    RAISE EXCEPTION 'nenhum confronto pendente seu nesta rodada';
  END IF;

  v_item := v_confrontos[v_idx];
  v_j1 := v_item->>'j1_id';
  v_j2 := v_item->>'j2_id';
  v_humano := v_uid::TEXT;
  v_bot := CASE WHEN v_j1 = v_humano THEN v_j2 ELSE v_j1 END;

  -- Valida que o outro lado é bot.
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_part) el
                 WHERE el->>'user_id' = v_bot AND COALESCE((el->>'bot')::BOOLEAN, false)) THEN
    RAISE EXCEPTION 'registrar_resultado_vs_bot vale apenas contra bot';
  END IF;

  v_gols_j1 := CASE WHEN v_j1 = v_humano THEN p_gols_humano ELSE p_gols_bot END;
  v_gols_j2 := CASE WHEN v_j1 = v_humano THEN p_gols_bot ELSE p_gols_humano END;

  v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(GREATEST(0, v_gols_j1)));
  v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(GREATEST(0, v_gols_j2)));
  v_item := jsonb_set(v_item, '{status}', '"finalizado"');
  v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

  v_el := (
    SELECT jsonb_agg(
      CASE
        WHEN el->>'user_id' = v_j1 THEN
          el || jsonb_build_object(
            'pontos', (el->>'pontos')::INT + CASE WHEN v_gols_j1 > v_gols_j2 THEN 3 WHEN v_gols_j1 = v_gols_j2 THEN 1 ELSE 0 END,
            'gols_pro', (el->>'gols_pro')::INT + v_gols_j1,
            'gols_contra', (el->>'gols_contra')::INT + v_gols_j2)
        WHEN el->>'user_id' = v_j2 THEN
          el || jsonb_build_object(
            'pontos', (el->>'pontos')::INT + CASE WHEN v_gols_j2 > v_gols_j1 THEN 3 WHEN v_gols_j2 = v_gols_j1 THEN 1 ELSE 0 END,
            'gols_pro', (el->>'gols_pro')::INT + v_gols_j2,
            'gols_contra', (el->>'gols_contra')::INT + v_gols_j1)
        ELSE el
      END)
    FROM jsonb_array_elements(v_part) el
  );
  v_part := COALESCE(v_el, v_part);

  -- Estatísticas do humano (o bot não tem perfil).
  UPDATE public.botao_usuarios SET
    pontos_soberania = GREATEST(0, pontos_soberania + CASE WHEN p_gols_humano > p_gols_bot THEN 3 WHEN p_gols_humano = p_gols_bot THEN 1 ELSE -3 END),
    partidas_jogadas = partidas_jogadas + 1,
    partidas_vencidas = partidas_vencidas + CASE WHEN p_gols_humano > p_gols_bot THEN 1 ELSE 0 END,
    vitorias = vitorias + CASE WHEN p_gols_humano > p_gols_bot THEN 1 ELSE 0 END,
    empates = empates + CASE WHEN p_gols_humano = p_gols_bot THEN 1 ELSE 0 END,
    derrotas = derrotas + CASE WHEN p_gols_humano < p_gols_bot THEN 1 ELSE 0 END,
    gols_feitos = gols_feitos + p_gols_humano,
    gols_sofridos = gols_sofridos + p_gols_bot
  WHERE user_id = v_uid;

  -- Avanço de rodada / fim do campeonato (mesma lógica do registrar_resultado).
  FOR v_idx IN 0..(v_total - 1) LOOP
    IF (v_confrontos[v_idx]->>'status') = 'finalizado' THEN v_finalizados := v_finalizados + 1; END IF;
  END LOOP;

  SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
  FROM jsonb_array_elements(v_confrontos) c;

  IF v_finalizados = v_total THEN
    SELECT el INTO v_campeao FROM jsonb_array_elements(v_part) el
    ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC LIMIT 1;
    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado', fase = -1, participantes = v_part, confrontos = v_confrontos,
           vencedor_id = CASE WHEN COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN NULL ELSE (v_campeao->>'user_id')::UUID END
     WHERE id = v_row.id RETURNING * INTO v_row;
    IF NOT COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN
      UPDATE public.botao_usuarios SET pontos_soberania = pontos_soberania + 50,
        campeonatos_ganhos = campeonatos_ganhos + 1 WHERE user_id = (v_campeao->>'user_id')::UUID;
    END IF;
  ELSE
    PERFORM 1 FROM jsonb_array_elements(v_confrontos) c
    WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado' LIMIT 1;
    IF NOT FOUND AND v_row.rodada_atual < v_ultima_rodada THEN
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos, rodada_atual = v_row.rodada_atual + 1
       WHERE id = v_row.id RETURNING * INTO v_row;
    ELSE
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos
       WHERE id = v_row.id RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 6) registrar_resultado_campeonato ciente de bots: campeão bot não quebra a
--    FK de vencedor_id (fica NULL) e não recebe bônus de perfil.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_resultado_campeonato(
  p_campeonato_id BIGINT,
  p_mesa_id TEXT,
  p_gols_j1 INTEGER,
  p_gols_j2 INTEGER
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_item JSONB;
  v_j1 UUID;
  v_j2 UUID;
  v_el JSONB;
  v_total INTEGER;
  v_finalizados INTEGER;
  v_ultima_rodada INTEGER;
  v_campeao JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_part := v_row.participantes;
  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);
  v_finalizados := 0;

  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx];
    IF v_item->>'mesa_id' = p_mesa_id AND v_item->>'status' <> 'finalizado' THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(p_gols_j1));
      v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(p_gols_j2));
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = v_j1::TEXT THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j2)
            WHEN el->>'user_id' = v_j2::TEXT THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j1)
            ELSE el
          END)
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);

      -- Estatísticas reais SÓ de jogadores humanos (bots não têm perfil).
      IF p_gols_j1 > p_gols_j2 THEN
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania + 3),
          partidas_jogadas = partidas_jogadas + 1, partidas_vencidas = partidas_vencidas + 1,
          vitorias = vitorias + 1, gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania - 3),
          partidas_jogadas = partidas_jogadas + 1, derrotas = derrotas + 1,
          gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
      ELSIF p_gols_j2 > p_gols_j1 THEN
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania + 3),
          partidas_jogadas = partidas_jogadas + 1, partidas_vencidas = partidas_vencidas + 1,
          vitorias = vitorias + 1, gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania - 3),
          partidas_jogadas = partidas_jogadas + 1, derrotas = derrotas + 1,
          gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
      ELSE
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania + 1),
          partidas_jogadas = partidas_jogadas + 1, empates = empates + 1,
          gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
        UPDATE public.botao_usuarios SET pontos_soberania = GREATEST(0, pontos_soberania + 1),
          partidas_jogadas = partidas_jogadas + 1, empates = empates + 1,
          gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
      END IF;
    END IF;
    IF v_item->>'status' = 'finalizado' THEN v_finalizados := v_finalizados + 1; END IF;
  END LOOP;

  SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
  FROM jsonb_array_elements(v_confrontos) c;

  IF v_finalizados = v_total THEN
    SELECT el INTO v_campeao
    FROM jsonb_array_elements(v_part) el
    ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC
    LIMIT 1;

    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado', fase = -1,
           participantes = v_part, confrontos = v_confrontos,
           vencedor_id = CASE
             WHEN COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN NULL
             ELSE (v_campeao->>'user_id')::UUID END
     WHERE id = v_row.id
    RETURNING * INTO v_row;

    IF NOT COALESCE((v_campeao->>'bot')::BOOLEAN, false) THEN
      UPDATE public.botao_usuarios
         SET pontos_soberania = pontos_soberania + 50,
             campeonatos_ganhos = campeonatos_ganhos + 1
       WHERE user_id = (v_campeao->>'user_id')::UUID;
    END IF;
  ELSE
    PERFORM 1
    FROM jsonb_array_elements(v_confrontos) c
    WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado'
    LIMIT 1;
    IF NOT FOUND AND v_row.rodada_atual < v_ultima_rodada THEN
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos, rodada_atual = v_row.rodada_atual + 1
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    ELSE
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 6.5) Colunas da mesa (idempotente — a base futebol.sql já pode ter algumas,
--      mas NUNCA assume; sem elas toda criação/entrada quebra em 42703).
-- ---------------------------------------------------------------------------
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMPTZ;
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS aposta_sov NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS aposta_cobrada_de UUID[] NOT NULL DEFAULT '{}';

COMMIT;

-- ---------------------------------------------------------------------------
-- 7) Aposta da mesa cobrada DE VERDADE (zero-sum):
--    - criar_mesa_futebol: aposta > 0 debita o criador na hora;
--    - entrar_mesa_futebol: aposta > 0 debita o convidado na entrada;
--    - pagar_premio_mesa: vencedor leva o pote (2× aposta); empate devolve.
--    Tudo idempotente por chave (aposta:/premio:/devolucao:).
-- ---------------------------------------------------------------------------
-- Ambiguidade de sobrecarga: a assinatura antiga (1 arg) precisa sair para a
-- nova (3 args) assumir — sem isso, chamada com 1 param falha (PGRST203).
-- O DROP sem argumentos é inválido (42725) — sempre especifique a lista.
DROP FUNCTION IF EXISTS public.criar_mesa_futebol(TEXT);

CREATE OR REPLACE FUNCTION public.criar_mesa_futebol(
  p_time TEXT,
  p_data_liberacao TIMESTAMPTZ DEFAULT NULL,
  p_aposta_sov NUMERIC DEFAULT 0
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mesa_id TEXT;
  v_uid     UUID := auth.uid();
  v_aposta  NUMERIC := GREATEST(0, COALESCE(p_aposta_sov, 0));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  v_mesa_id := 'mesa_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  -- Aposta: o criador paga a parte dele na hora (débito bloqueia se não tiver).
  IF v_aposta > 0 THEN
    PERFORM public.sov_bank_registrar(
      v_uid, -v_aposta, 'bet_loss',
      'Aposta da mesa ' || v_mesa_id, 'online', 'aposta_mesa',
      'aposta:' || v_mesa_id || ':' || v_uid::TEXT,
      jsonb_build_object('mesa_id', v_mesa_id)
    );
  END IF;

  INSERT INTO public.mesas_futebol AS m
    (mesa_id, jogador_1_id, time_j1, status, jogador_1_online, ultimo_heartbeat_j1,
     data_liberacao, aposta_sov, aposta_cobrada_de)
  VALUES (v_mesa_id, v_uid, p_time, 'aguardando', true, now(),
          p_data_liberacao, v_aposta,
          CASE WHEN v_aposta > 0 THEN ARRAY[v_uid] ELSE '{}'::UUID[] END);

  RETURN v_mesa_id;
END; $$;

COMMIT;

CREATE OR REPLACE FUNCTION public.entrar_mesa_futebol(p_mesa_id TEXT, p_time TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_mesa  public.mesas_futebol;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT m.* INTO v_mesa
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;

  -- Reconexão: já sou participante, apenas devolvo o estado atual.
  IF v_uid = v_mesa.jogador_1_id OR v_uid = v_mesa.jogador_2_id THEN
    RETURN public.registrar_heartbeat_mesa(p_mesa_id);
  END IF;

  IF v_mesa.jogador_2_id IS NOT NULL THEN RAISE EXCEPTION 'mesa cheia'; END IF;
  IF v_mesa.status <> 'aguardando' THEN RAISE EXCEPTION 'mesa indisponivel'; END IF;
  IF v_mesa.data_liberacao IS NOT NULL AND v_mesa.data_liberacao > now() THEN
    RAISE EXCEPTION 'mesa bloqueada ate %', v_mesa.data_liberacao;
  END IF;

  -- Aposta: o convidado paga a parte dele na entrada (débito bloqueia se não
  -- tiver — quem não pode pagar a aposta não entra na mesa).
  IF COALESCE(v_mesa.aposta_sov, 0) > 0
     AND NOT (v_uid = ANY(COALESCE(v_mesa.aposta_cobrada_de, '{}'::UUID[]))) THEN
    PERFORM public.sov_bank_registrar(
      v_uid, -v_mesa.aposta_sov, 'bet_loss',
      'Aposta da mesa ' || p_mesa_id, 'online', 'aposta_mesa',
      'aposta:' || p_mesa_id || ':' || v_uid::TEXT,
      jsonb_build_object('mesa_id', p_mesa_id)
    );
  END IF;

  UPDATE public.mesas_futebol m
     SET jogador_2_id            = v_uid,
         time_j2                 = p_time,
         jogador_2_online        = true,
         ultimo_heartbeat_j2     = now(),
         jogador_1_online        = true,
         status                  = 'em_andamento',
         turno_atual_id          = m.jogador_1_id,
         iniciado_em             = now(),
         tempo_restante_segundos = m.duracao_segundos,
         aposta_cobrada_de       = CASE
           WHEN COALESCE(m.aposta_sov, 0) > 0
             THEN array_append(COALESCE(m.aposta_cobrada_de, '{}'::UUID[]), v_uid)
           ELSE m.aposta_cobrada_de END
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

COMMIT;

-- Premiação do pote (idempotente): vencedor leva 2× aposta; empate devolve
-- a aposta de cada um. Chamada por qualquer participante ao finalizar.
CREATE OR REPLACE FUNCTION public.pagar_premio_mesa(p_mesa_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_futebol;
  v_pote NUMERIC;
  v_tx   UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT m.* INTO v_mesa FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;
  IF v_uid <> v_mesa.jogador_1_id AND v_uid <> v_mesa.jogador_2_id THEN
    RAISE EXCEPTION 'so participante da mesa pode encerrar a premiacao';
  END IF;
  IF COALESCE(v_mesa.aposta_sov, 0) <= 0 OR v_mesa.jogador_2_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'premio', 0);
  END IF;

  -- Idempotência: o pote já pago (ou devolvido) nunca é pago de novo.
  IF EXISTS (SELECT 1 FROM public.bank_ledger l
             WHERE l.idempotency_key IN ('premio:' || p_mesa_id, 'devolucao:' || p_mesa_id)) THEN
    RETURN jsonb_build_object('ok', true, 'duplicado', true);
  END IF;

  v_pote := v_mesa.aposta_sov * 2;

  IF v_mesa.status = 'finalizado' AND v_mesa.vencedor_id IS NOT NULL
     AND v_mesa.placar_j1 <> v_mesa.placar_j2 THEN
    -- Vencedor leva o pote inteiro (zero-sum: sai das duas apostas).
    v_tx := public.record_transaction(
      v_mesa.vencedor_id, 'bet_win', v_pote,
      'Premio da mesa ' || p_mesa_id, 'online',
      jsonb_build_object('mesa_id', p_mesa_id)
    );
    UPDATE public.bank_ledger
       SET source_event = 'premio_mesa', idempotency_key = 'premio:' || p_mesa_id
     WHERE id = v_tx;
    RETURN jsonb_build_object('ok', true, 'premio', v_pote, 'vencedor', v_mesa.vencedor_id);
  ELSE
    -- Empate ou mesa encerrada sem vencedor: devolve a aposta de cada um.
    v_tx := public.record_transaction(
      v_mesa.jogador_1_id, 'bet_refund', v_mesa.aposta_sov,
      'Devolucao da aposta da mesa ' || p_mesa_id, 'online',
      jsonb_build_object('mesa_id', p_mesa_id)
    );
    UPDATE public.bank_ledger
       SET source_event = 'devolucao_aposta', idempotency_key = 'devolucao:' || p_mesa_id
     WHERE id = v_tx;
    v_tx := public.record_transaction(
      v_mesa.jogador_2_id, 'bet_refund', v_mesa.aposta_sov,
      'Devolucao da aposta da mesa ' || p_mesa_id, 'online',
      jsonb_build_object('mesa_id', p_mesa_id)
    );
    UPDATE public.bank_ledger
       SET source_event = 'devolucao_aposta', idempotency_key = 'devolucao:' || p_mesa_id || ':j2'
     WHERE id = v_tx;
    RETURN jsonb_build_object('ok', true, 'devolvido', v_mesa.aposta_sov);
  END IF;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 8) UPDATE da sala de campeonato só pelo criador (as RPCs são SECURITY
--    DEFINER e continuam funcionando para todos os participantes).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "campeonato_update_participantes" ON public.botao_campeonatos_online;
DROP POLICY IF EXISTS "campeonato_update_criador" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_update_criador" ON public.botao_campeonatos_online
  FOR UPDATE TO authenticated
  USING (auth.uid() = criador_id)
  WITH CHECK (auth.uid() = criador_id);

COMMIT;
