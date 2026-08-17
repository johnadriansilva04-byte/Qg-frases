-- ============================================================================
-- FIX: abrir_mesa_campeonato retornando 400 "nenhum confronto pendente"
-- ----------------------------------------------------------------------------
-- Diagnóstico: a função falhava systematicamente para AMBOS os jogadores
-- mesmo com confronto válido (status='pendente', rodada=rodada_atual,
-- j1_id/j2_id = auth.uid()). A versão anterior usava cast
-- `(v_item->>'j1_id')::UUID = v_uid` + indexação manual `confrontos[v_i+1]`.
-- Esta versão usa o MESMO padrão comprovadamente funcional de
-- `entrar_campeonato_online`/`vincular_mesa_campeonato`:
--   - comparação por TEXTO: `v_item->>'j1_id' = v_uid::TEXT`
--   - jsonb_array_elements WITH ORDINALITY (sem indexação manual)
--   - mensagens de erro detalhadas para diagnóstico
-- Idempotente: cria UMA mesa compartilhada para o confronto ou devolve a
-- mesa já existente. Ambos os jogadores chamam e caem na mesma mesa.
-- ============================================================================

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
  v_total      INTEGER;
  v_idx        BIGINT := -1;
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
  v_total := COALESCE(jsonb_array_length(v_confrontos), 0);
  IF v_total = 0 THEN RAISE EXCEPTION 'campeonato sem confrontos'; END IF;

  -- Localiza o confronto do usuário nesta rodada (busca set-based, robusta)
  SELECT ord INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE COALESCE((t.item->>'rodada')::INT, -1) = p_rodada
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND t.item->>'status' = 'pendente'
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NULL OR v_idx < 1 THEN
    RAISE EXCEPTION 'nenhum confronto pendente encontrado para voce na rodada % (uid=%, total_confrontos=%)',
      p_rodada, v_uid, v_total;
  END IF;

  v_item := v_confrontos[v_idx::int];
  v_j1 := v_item->>'j1_id';
  v_j2 := v_item->>'j2_id';

  -- Idempotente: se o confronto já tem mesa vinculada e a mesa existe, devolve
  IF v_item->>'mesa_id' IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existe FROM public.mesas_futebol m WHERE m.mesa_id = (v_item->>'mesa_id');
    IF v_existe > 0 THEN
      RETURN v_item->>'mesa_id';
    END IF;
  END IF;

  -- Times dos participantes (do JSONB participantes)
  SELECT
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j1), 'Meu Time'),
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j2), 'Meu Time')
  INTO v_time1, v_time2;

  -- Cria UMA mesa compartilhada com ambos os jogadores já definidos
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

  -- Vincula a mesa ao confronto (mesa_id gravado)
  v_item := jsonb_set(v_item, '{mesa_id}', to_jsonb(v_mesa_id));
  v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx::text], v_item);
  UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos WHERE id = v_row.id;

  RETURN v_mesa_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.abrir_mesa_campeonato(BIGINT, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC de diagnóstico: debug_confronto_campeonato(p_campeonato_id, p_rodada)
-- Retorna o estado de cada confronto sob a ótica do usuário autenticado,
-- para identificar qual condição de casamento falha. Pode ser removida após
-- a estabilização do modo campeonato.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.debug_confronto_campeonato(
  p_campeonato_id BIGINT,
  p_rodada INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('erro', 'nao autenticado'); END IF;
  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c WHERE c.id = p_campeonato_id;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('erro', 'campeonato nao encontrado'); END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'campeonato_id', v_row.id,
    'status', v_row.status,
    'rodada_atual', v_row.rodada_atual,
    'p_rodada', p_rodada,
    'total_confrontos', COALESCE(jsonb_array_length(v_row.confrontos), 0),
    'confrontos', (
      SELECT jsonb_agg(jsonb_build_object(
        'idx', ord,
        'rodada', item->>'rodada',
        'rodada_int', COALESCE((item->>'rodada')::INT, -1),
        'bye', item->>'bye',
        'status', item->>'status',
        'j1_id', item->>'j1_id',
        'j2_id', item->>'j2_id',
        'mesa_id', item->>'mesa_id',
        'match_rodada', COALESCE((item->>'rodada')::INT, -1) = p_rodada,
        'match_bye', COALESCE((item->>'bye')::BOOLEAN, false) = false,
        'match_status', item->>'status' = 'pendente',
        'match_jogador', (item->>'j1_id' = v_uid::TEXT OR item->>'j2_id' = v_uid::TEXT)
      ))
      FROM jsonb_array_elements(v_row.confrontos) WITH ORDINALITY AS t(item, ord)
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.debug_confronto_campeonato(BIGINT, INTEGER) TO authenticated;
