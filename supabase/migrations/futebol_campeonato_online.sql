-- ============================================================================
-- MODO CAMPEONATO ONLINE (multi-jogador) — extensão aditiva
-- Reaproveita mesas_futebol (1 mesa = 1 partida) e adiciona um campeonato
-- que agrupa N partidas entre os jogadores de uma sala.
--
-- Este bloco é complementar a futebol.sql e pode ser executado depois dele.
-- ============================================================================

-- Tabela de campeonatos online
CREATE TABLE IF NOT EXISTS public.botao_campeonatos_online (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo          TEXT NOT NULL UNIQUE,                       -- código curto de sala
  nome            TEXT NOT NULL DEFAULT 'Campeonato Online',
  criador_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'aguardando'
                  CHECK (status IN ('aguardando','em_andamento','finalizado','cancelado')),
  max_jogadores   INTEGER NOT NULL DEFAULT 4 CHECK (max_jogadores BETWEEN 2 AND 8),
  fase            INTEGER NOT NULL DEFAULT 0,                 -- 0=espera · 1..n=rodadas · -1=fim
  participantes   JSONB NOT NULL DEFAULT '[]'::JSONB,         -- [{user_id, nome, time_id, abreviacao, pontos, gols_pro, gols_contra}]
  confrontos      JSONB NOT NULL DEFAULT '[]'::JSONB,         -- [{rodada, mesa_id, j1_id, j2_id, pl_j1, pl_j2, status, bye}]
  rodada_atual    INTEGER NOT NULL DEFAULT 0,
  vencedor_id     UUID REFERENCES auth.users(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_codigo ON public.botao_campeonatos_online(codigo);
CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_status ON public.botao_campeonatos_online(status);
CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_criador ON public.botao_campeonatos_online(criador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_campeonatos_online TO authenticated;
GRANT SELECT ON public.botao_campeonatos_online TO anon;
GRANT ALL ON public.botao_campeonatos_online TO service_role;

ALTER TABLE public.botao_campeonatos_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campeonato_select_publico" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_select_publico" ON public.botao_campeonatos_online
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campeonato_insert_criador" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_insert_criador" ON public.botao_campeonatos_online
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criador_id);

DROP POLICY IF EXISTS "campeonato_update_participantes" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_update_participantes" ON public.botao_campeonatos_online
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger de atualizado_em
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_campeonato()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_atualizar_campeonato ON public.botao_campeonatos_online;
CREATE TRIGGER trigger_atualizar_campeonato
BEFORE UPDATE ON public.botao_campeonatos_online
FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_campeonato();

-- Realtime para campeonatos
ALTER TABLE public.botao_campeonatos_online REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.botao_campeonatos_online;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Modo da mesa (amistoso | campeonato) — coluna aditiva em mesas_futebol
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT 'amistoso'
  CHECK (modalidade IN ('amistoso','campeonato'));
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS campeonato_id BIGINT REFERENCES public.botao_campeonatos_online(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- RPC: criar_campeonato_online(p_nome TEXT, p_max INTEGER DEFAULT 4)
-- Cria a sala, insere o criador como primeiro participante e devolve a row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_campeonato_online(
  p_nome TEXT DEFAULT 'Campeonato Online',
  p_max INTEGER DEFAULT 4
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
  IF p_max NOT BETWEEN 2 AND 8 THEN RAISE EXCEPTION 'max_jogadores precisa estar entre 2 e 8'; END IF;

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

  INSERT INTO public.botao_campeonatos_online (codigo, nome, criador_id, max_jogadores, participantes)
  VALUES (v_codigo, p_nome, v_uid, p_max, v_part)
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

-- ---------------------------------------------------------------------------
-- RPC: entrar_campeonato_online(p_codigo TEXT)
-- Adiciona o usuário como participante se houver vaga e a sala ainda aguarda.
-- ---------------------------------------------------------------------------
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
  IF jsonb_array_length(v_row.participantes) >= v_row.max_jogadores THEN
    RAISE EXCEPTION 'campeonato cheio';
  END IF;

  v_part := v_row.participantes;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = v_uid::TEXT) THEN
    RETURN v_row;  -- já é participante
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

-- ---------------------------------------------------------------------------
-- RPC: sair_campeonato_online(p_codigo TEXT)
-- Remove o usuário da sala se ainda não começou.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sair_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato ja comecou'; END IF;

  v_part := (
    SELECT COALESCE(jsonb_agg(el), '[]'::JSONB)
    FROM jsonb_array_elements(v_row.participantes) el
    WHERE el->>'user_id' <> v_uid::TEXT
  );

  UPDATE public.botao_campeonatos_online
     SET participantes = v_part
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

-- ---------------------------------------------------------------------------
-- Helper: gerar confrontos round-robin (circle method) em JS puro no cliente.
-- A versão SQL abaixo só é usada pelo iniciar_campeonato_online.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gerar_confrontos_campeonato(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_n INTEGER := array_length(p_ids, 1);
  v_ids UUID[] := p_ids;
  v_fixo UUID;
  v_rodadas JSONB := '[]'::JSONB;
  v_rodada JSONB;
  v_round INTEGER;
  v_i INTEGER;
  v_half INTEGER;
  v_arr UUID[];
  v_tmp UUID;
  v_pares JSONB;
  v_p JSONB;
  v_home UUID;
  v_away UUID;
BEGIN
  IF v_n IS NULL OR v_n < 2 THEN RETURN '[]'::JSONB; END IF;
  IF v_n % 2 = 1 THEN
    v_ids := v_ids || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END IF;

  v_fixo := v_ids[1];
  v_arr := v_ids[2..v_n];

  FOR v_round IN 1..(v_n - 1) LOOP
    v_pares := '[]'::JSONB;
    v_half := v_n / 2;
    FOR v_i IN 1..v_half LOOP
      IF v_i = 1 THEN
        v_home := v_fixo;
        v_away := v_arr[v_half];
      ELSE
        v_home := v_arr[v_i - 1];
        v_away := v_arr[v_n - v_i + 1];
      END IF;
      v_p := jsonb_build_object('j1_id', v_home, 'j2_id', v_away, 'bye', v_home IS NULL OR v_away IS NULL);
      v_pares := v_pares || jsonb_build_array(v_p);
    END LOOP;

    v_rodada := jsonb_build_object('rodada', v_round, 'pares', v_pares);
    v_rodadas := v_rodadas || jsonb_build_array(v_rodada);

    -- rotaciona v_arr à esquerda
    v_tmp := v_arr[1];
    v_arr := v_arr[2..array_length(v_arr,1)] || ARRAY[v_tmp];
  END LOOP;

  RETURN v_rodadas;
END; $$;

-- ---------------------------------------------------------------------------
-- RPC: iniciar_campeonato_online(p_codigo TEXT)
-- Sorteia confrontos (round-robin), marca status em_andamento e devolve a row.
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
        'status', 'pendente',
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

-- ---------------------------------------------------------------------------
-- RPC: vincular_mesa_campeonato(p_campeonato_id BIGINT, p_rodada INTEGER, p_mesa_id TEXT)
-- Marca a mesa recém-criada no confronto correspondente (jogador é participante).
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
  v_total INTEGER;
  v_item JSONB;
  v_j1 UUID;
  v_j2 UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx + 1];
    IF (v_item->>'rodada')::INT = p_rodada
       AND v_item->>'mesa_id' IS NULL
       AND v_item->>'status' = 'pendente'
       AND COALESCE((v_item->>'bye')::BOOLEAN, false) = false THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      IF v_uid = v_j1 OR v_uid = v_j2 THEN
        v_item := jsonb_set(v_item, '{mesa_id}', to_jsonb(p_mesa_id));
        v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx + 1], v_item);
        UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos
         WHERE id = v_row.id RETURNING * INTO v_row;
        RETURN v_row;
      END IF;
    END IF;
  END LOOP;

  RETURN v_row;
END; $$;

-- ---------------------------------------------------------------------------
-- RPC: registrar_resultado_campeonato(
--   p_campeonato_id BIGINT, p_mesa_id TEXT, p_gols_j1 INTEGER, p_gols_j2 INTEGER
-- )
-- Atualiza o confronto correspondente, computa pontos (V=3/E=1/D=0) e soberania.
-- Finaliza o campeonato quando todas as rodadas estiverem concluídas.
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
  v_campeao TEXT;
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
    v_item := v_confrontos[v_idx + 1];
    IF v_item->>'mesa_id' = p_mesa_id AND v_item->>'status' <> 'finalizado' THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(p_gols_j1));
      v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(p_gols_j2));
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx + 1], v_item);

      -- Atualiza participantes (pontos 3/1/0 + gols)
      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = v_j1::TEXT THEN
              el
                || jsonb_build_object(
                  'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                  'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                  'gols_contra', (el->>'gols_contra')::INT + p_gols_j2
                )
            WHEN el->>'user_id' = v_j2::TEXT THEN
              el
                || jsonb_build_object(
                  'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                  'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                  'gols_contra', (el->>'gols_contra')::INT + p_gols_j1
                )
            ELSE el
          END
        )
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);

      -- Atualiza pontos de soberania reais dos jogadores (V=+3, E=+1, D=-3)
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
    -- Campeão = maior pontuação (desempate por saldo de gols)
    SELECT el->>'user_id' INTO v_campeao
    FROM jsonb_array_elements(v_part) el
    ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC
    LIMIT 1;

    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado',
           fase = -1,
           participantes = v_part,
           confrontos = v_confrontos,
           vencedor_id = v_campeao::UUID
     WHERE id = v_row.id
    RETURNING * INTO v_row;

    -- Bônus de título no perfil do campeão
    UPDATE public.botao_usuarios
       SET pontos_soberania = pontos_soberania + 50,
           campeonatos_ganhos = campeonatos_ganhos + 1
     WHERE user_id = v_campeao::UUID;
  ELSE
    -- Avança rodada_atual quando a rodada atual estiver completa
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

GRANT EXECUTE ON FUNCTION public.criar_campeonato_online(TEXT, INTEGER)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.entrar_campeonato_online(TEXT)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_campeonato_online(TEXT)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_campeonato_online(TEXT)                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_mesa_campeonato(BIGINT, INTEGER, TEXT)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_resultado_campeonato(BIGINT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public._gerar_confrontos_campeonato(UUID[])                           TO service_role;

NOTIFY pgrst, 'reload schema';
