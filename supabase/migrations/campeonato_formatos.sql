-- ============================================================================
-- MIGRATION: Suporte a formatos Mata-Mata e Grupos+Elim no Campeonato Online
-- ============================================================================
-- Antes: todos os formatos (pontos, mata-mata, grupos) geravam round-robin.
-- Agora: cada formato gera confrontos adequados ao seu tipo.
-- ============================================================================

BEGIN;

-- 1) Adicionar coluna grupos para o formato "grupos"
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS grupos JSONB DEFAULT NULL;

COMMIT;

-- ============================================================================
-- 2) Gerar confrontos MATA-MATA (eliminação direta)
--    Recebe N ids, gera bracket com rodadas decrescentes:
--    rodada 1 = N/2 confrontos, rodada 2 = N/4, ..., final = 1 confronto.
--    Byes são criados finalizados quando N não é potência de 2.
-- ============================================================================
CREATE OR REPLACE FUNCTION public._gerar_confrontos_mata_mata(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_n INTEGER := array_length(p_ids, 1);
  v_ids UUID[];
  v_confrontos JSONB := '[]'::JSONB;
  v_rodada INTEGER := 1;
  v_pares JSONB;
  v_i INTEGER;
  v_par JSONB;
  v_total_pares INTEGER;
BEGIN
  IF v_n IS NULL OR v_n < 2 THEN RETURN '[]'::JSONB; END IF;

  -- Embaralha os ids para aleatoriedade
  v_ids := ARRAY(
    SELECT unnest(p_ids) ORDER BY random()
  );

  -- Se N não é potência de 2, adiciona byes para completar
  -- Ex: 6 jogadores → 8 slots (2 byes)
  -- Enquanto não for potência de 2, dobra
  WHILE (v_ids <@ ARRAY(SELECT generate_series(1, 1))) IS NULL
        OR (v_ids::TEXT[] <@ ARRAY(SELECT v::TEXT FROM unnest(v_ids) v))
  LOOP
    -- Verifica se v_n é potência de 2
    IF v_n > 0 AND (v_n & (v_n - 1)) = 0 THEN
      EXIT; -- Já é potência de 2
    END IF;
    -- Adiciona NULL (bye)
    v_ids := v_ids || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END LOOP;

  -- Se ainda não é potência de 2, itera até ser
  WHILE v_n > 0 AND (v_n & (v_n - 1)) <> 0 LOOP
    v_ids := v_ids || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END LOOP;

  -- Gera rodadas: primeira rodada com N/2 confrontos
  v_total_pares := v_n / 2;
  v_rodada := 1;

  WHILE v_total_pares >= 1 LOOP
    v_pares := '[]'::JSONB;
    FOR v_i IN 1..v_total_pares LOOP
      v_par := jsonb_build_object(
        'j1_id', v_ids[(v_i * 2) - 1],
        'j2_id', v_ids[v_i * 2],
        'bye', v_ids[(v_i * 2) - 1] IS NULL OR v_ids[v_i * 2] IS NULL
      );
      v_pares := v_pares || jsonb_build_array(v_par);
    END LOOP;

    -- Adiciona confrontos desta rodada
    FOR v_i IN 0..jsonb_array_length(v_pares) - 1 LOOP
      v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
        'rodada', v_rodada,
        'mesa_id', NULL,
        'j1_id', v_pares[v_i]->>'j1_id',
        'j2_id', v_pares[v_i]->>'j2_id',
        'pl_j1', 0,
        'pl_j2', 0,
        'status', CASE WHEN COALESCE((v_pares[v_i]->>'bye')::BOOLEAN, false) THEN 'finalizado' ELSE 'pendente' END,
        'bye', COALESCE((v_pares[v_i]->>'bye')::BOOLEAN, false)
      ));
    END LOOP;

    -- Próxima rodada: metade dos pares
    v_rodada := v_rodada + 1;
    v_total_pares := v_total_pares / 2;
  END LOOP;

  RETURN v_confrontos;
END; $$;

COMMIT;

-- ============================================================================
-- 3) Gerar confrontos GRUPOS + ELIM
--    Divide jogadores em grupos de 4, gera round-robin dentro de cada grupo,
--    depois gera eliminatórias com os 2 melhores de cada grupo.
-- ============================================================================
CREATE OR REPLACE FUNCTION public._gerar_confrontos_grupos(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_n INTEGER := array_length(p_ids, 1);
  v_ids UUID[];
  v_grupos JSONB := '[]'::JSONB;
  v_grupo JSONB;
  v_grupo_ids UUID[];
  v_grupo_nome TEXT;
  v_grupo_idx INTEGER;
  v_total_grupos INTEGER;
  v_confrontos JSONB := '[]'::JSONB;
  v_rodada INTEGER;
  v_par JSONB;
  v_a UUID; v_b UUID; v_c UUID; v_d UUID;
  v_nomes TEXT[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];
BEGIN
  IF v_n IS NULL OR v_n < 2 THEN RETURN '[]'::JSONB; END IF;

  -- Embaralha
  v_ids := ARRAY(SELECT unnest(p_ids) ORDER BY random());

  -- Adiciona byes se necessário para completar grupos de 4
  WHILE v_n % 4 <> 0 LOOP
    v_ids := v_ids || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END LOOP;

  v_total_grupos := v_n / 4;

  -- Cria grupos de 4 e gera round-robin dentro de cada grupo
  FOR v_grupo_idx IN 1..v_total_grupos LOOP
    v_grupo_ids := ARRAY[
      v_ids[(v_grupo_idx - 1) * 4 + 1],
      v_ids[(v_grupo_idx - 1) * 4 + 2],
      v_ids[(v_grupo_idx - 1) * 4 + 3],
      v_ids[(v_grupo_idx - 1) * 4 + 4]
    ];
    v_grupo_nome := v_nomes[v_grupo_idx];

    -- Registra o grupo
    v_grupo := jsonb_build_object(
      'nome', v_grupo_nome,
      'team_ids', to_jsonb(v_grupo_ids),
      'tabela', jsonb_build_array(
        jsonb_build_object('user_id', v_grupo_ids[1], 'pontos', 0, 'gols_pro', 0, 'gols_contra', 0, 'jogos', 0),
        jsonb_build_object('user_id', v_grupo_ids[2], 'pontos', 0, 'gols_pro', 0, 'gols_contra', 0, 'jogos', 0),
        jsonb_build_object('user_id', v_grupo_ids[3], 'pontos', 0, 'gols_pro', 0, 'gols_contra', 0, 'jogos', 0),
        jsonb_build_object('user_id', v_grupo_ids[4], 'pontos', 0, 'gols_pro', 0, 'gols_contra', 0, 'jogos', 0)
      )
    );
    v_grupos := v_grupos || jsonb_build_array(v_grupo);

    -- Round-robin dentro do grupo: 3 rodadas
    -- Rodada 1: A vs B, C vs D
    -- Rodada 2: A vs C, D vs B
    -- Rodada 3: A vs D, B vs C
    v_a := v_grupo_ids[1]; v_b := v_grupo_ids[2]; v_c := v_grupo_ids[3]; v_d := v_grupo_ids[4];

    -- Fase de grupos usa rodadas 100*grupo + rodada_interna para não colidir com eliminatórias
    v_rodada := v_grupo_idx * 100 + 1;

    -- Rodada 1
    v_confrontos := v_confrontos || jsonb_build_array(
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_a, 'j2_id', v_b, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome),
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_c, 'j2_id', v_d, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome)
    );

    -- Rodada 2
    v_rodada := v_grupo_idx * 100 + 2;
    v_confrontos := v_confrontos || jsonb_build_array(
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_a, 'j2_id', v_c, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome),
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_d, 'j2_id', v_b, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome)
    );

    -- Rodada 3
    v_rodada := v_grupo_idx * 100 + 3;
    v_confrontos := v_confrontos || jsonb_build_array(
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_a, 'j2_id', v_d, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome),
      jsonb_build_object('rodada', v_rodada, 'mesa_id', NULL, 'j1_id', v_b, 'j2_id', v_c, 'pl_j1', 0, 'pl_j2', 0, 'status', 'pendente', 'bye', false, 'grupo', v_grupo_nome)
    );
  END LOOP;

  -- As eliminatórias serão geradas quando a fase de grupos terminar
  -- (pela função avancar_grupos_campeonato)

  RETURN jsonb_build_object('grupos', v_grupos, 'confrontos', v_confrontos);
END; $$;

COMMIT;

-- ============================================================================
-- 4) Gerar eliminatórias a partir dos classificados dos grupos
--    Recebe os grupos com tabelas atualizados, retorna confrontos eliminatórios.
-- ============================================================================
CREATE OR REPLACE FUNCTION public._gerar_eliminatorias_grupos(p_grupos JSONB)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_grupo JSONB;
  v_classificados UUID[] := ARRAY[]::UUID[];
  v_tabela JSONB;
  v_rodada INTEGER;
  v_confrontos JSONB := '[]'::JSONB;
  v_n INTEGER;
  v_i INTEGER;
BEGIN
  -- Pega os 2 melhores de cada grupo (ordenados por pontos, saldo de gols)
  FOR v_grupo IN SELECT jsonb_array_elements(p_grupos) LOOP
    v_tabela := (
      SELECT jsonb_agg(el ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC)
      FROM jsonb_array_elements(v_grupo->'tabela') el
    );
    -- Top 2 de cada grupo avançam
    v_classificados := v_classificados || ARRAY[(v_tabela->0->>'user_id')::UUID];
    v_classificados := v_classificados || ARRAY[(v_tabela->1->>'user_id')::UUID];
  END LOOP;

  -- Se número ímpar de classificados, adiciona bye
  v_n := array_length(v_classificados, 1);
  IF v_n % 2 = 1 THEN
    v_classificados := v_classificados || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END IF;

  -- Embaralha classificados para aleatoriedade nas eliminatórias
  v_classificados := ARRAY(SELECT unnest(v_classificados) ORDER BY random());

  -- Gera bracket eliminatório a partir dos classificados
  -- Rodada 10000+ para não colidir com fase de grupos (que usa 100*grupo+rodada)
  v_rodada := 10001;

  WHILE v_n >= 2 LOOP
    FOR v_i IN 1..(v_n / 2) LOOP
      v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
        'rodada', v_rodada,
        'mesa_id', NULL,
        'j1_id', v_classificados[(v_i * 2) - 1],
        'j2_id', v_classificados[v_i * 2],
        'pl_j1', 0,
        'pl_j2', 0,
        'status', 'pendente',
        'bye', v_classificados[(v_i * 2) - 1] IS NULL OR v_classificados[v_i * 2] IS NULL
      ));
    END LOOP;
    v_rodada := v_rodada + 1;
    v_n := v_n / 2;
  END LOOP;

  RETURN v_confrontos;
END; $$;

COMMIT;

-- ============================================================================
-- 5) Sobrescrever iniciar_campeonato_online para branch por formato
-- ============================================================================
CREATE OR REPLACE FUNCTION public.iniciar_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_ids UUID[];
  v_id UUID;
  v_confrontos JSONB := '[]'::JSONB;
  v_r RECORD;
  v_p RECORD;
  v_c JSONB;
  v_grupos_result JSONB;
  v_grupos JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o criador pode iniciar'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aguardando'; END IF;
  IF jsonb_array_length(v_row.participantes) < 2 THEN RAISE EXCEPTION 'minimo de 2 jogadores'; END IF;

  -- Coleta ids dos participantes
  v_ids := ARRAY[]::UUID[];
  FOR v_id IN SELECT (el->>'user_id')::UUID FROM jsonb_array_elements(v_row.participantes) el LOOP
    v_ids := v_ids || ARRAY[v_id];
  END LOOP;

  -- ===== BRANCH POR FORMATO =====
  IF v_row.formato = 'mata-mata' THEN
    -- MATA-MATA: eliminação direta (bracket)
    v_confrontos := public._gerar_confrontos_mata_mata(v_ids);

    UPDATE public.botao_campeonatos_online
       SET status = 'em_andamento',
           fase = 1,
           rodada_atual = 1,
           confrontos = v_confrontos
     WHERE id = v_row.id
    RETURNING * INTO v_row;

  ELSIF v_row.formato = 'grupos' THEN
    -- GRUPOS + ELIM: fase de grupos primeiro
    v_grupos_result := public._gerar_confrontos_grupos(v_ids);
    v_grupos := v_grupos_result->'grupos';
    v_confrontos := v_grupos_result->'confrontos';

    UPDATE public.botao_campeonatos_online
       SET status = 'em_andamento',
           fase = 1,
           rodada_atual = 1,
           confrontos = v_confrontos,
           grupos = v_grupos
     WHERE id = v_row.id
    RETURNING * INTO v_row;

  ELSE
    -- PONTOS CORRIDOS: round-robin (comportamento original)
    DECLARE
      v_rodadas JSONB;
    BEGIN
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
    END;
  END IF;

  RETURN v_row;
END; $$;

COMMIT;

-- ============================================================================
-- 6) Sobrescrever registrar_resultado_campeonato para formatos mata-mata e grupos
-- ============================================================================
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
  v_grupos JSONB;
  v_grupo JSONB;
  v_grupo_nome TEXT;
  v_tabela JSONB;
  v_elim_confrontos JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_part := v_row.participantes;
  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);
  v_finalizados := 0;

  -- Marca o confronto como finalizado e atualiza placar
  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx];
    IF v_item->>'mesa_id' = p_mesa_id AND v_item->>'status' <> 'finalizado' THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(p_gols_j1));
      v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(p_gols_j2));
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

      -- Atualiza pontos do participante (para ranking/stats)
      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = v_j1::TEXT THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j2,
                'jogos', COALESCE((el->>'jogos')::INT, 0) + 1)
            WHEN el->>'user_id' = v_j2::TEXT THEN
              el || jsonb_build_object(
                'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                'gols_contra', (el->>'gols_contra')::INT + p_gols_j1,
                'jogos', COALESCE((el->>'jogos')::INT, 0) + 1)
            ELSE el
          END)
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);

      -- Estatísticas de soberania (humanos)
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

  -- ===== MATA-MATA: avanço por eliminação =====
  IF v_row.formato = 'mata-mata' THEN
    -- Verifica se a rodada atual está completa
    PERFORM 1
    FROM jsonb_array_elements(v_confrontos) c
    WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado'
    LIMIT 1;

    IF NOT FOUND THEN
      -- Rodada completa — avança vencedores para próxima rodada
      IF v_row.rodada_atual >= v_ultima_rodada THEN
        -- Era a final — torneio finalizado!
        -- Campeão = vencedor do último confronto da última rodada
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
        -- Avança para próxima rodada
        UPDATE public.botao_campeonatos_online
           SET participantes = v_part, confrontos = v_confrontos,
               rodada_atual = v_row.rodada_atual + 1
         WHERE id = v_row.id
        RETURNING * INTO v_row;
      END IF;
    ELSE
      -- Rodada ainda não completa — só atualiza confrontos/participantes
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;

  -- ===== GRUPOS: fase de grupos + eliminatórias =====
  ELSIF v_row.formato = 'grupos' THEN
    -- Atualiza tabela do grupo do confronto finalizado
    v_grupo_nome := (
      SELECT (c->>'grupo')::TEXT
      FROM jsonb_array_elements(v_confrontos) c
      WHERE c->>'mesa_id' = p_mesa_id
      LIMIT 1
    );

    IF v_grupo_nome IS NOT NULL AND v_row.grupos IS NOT NULL THEN
      -- Atualiza a tabela do grupo correspondente
      v_grupos := v_row.grupos;
      FOR v_idx IN 0..jsonb_array_length(v_grupos) - 1 LOOP
        v_grupo := v_grupos[v_idx];
        IF v_grupo->>'nome' = v_grupo_nome THEN
          v_tabela := v_grupo->'tabela';
          v_tabela := (
            SELECT jsonb_agg(
              CASE
                WHEN el->>'user_id' = v_j1::TEXT THEN
                  el || jsonb_build_object(
                    'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                    'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                    'gols_contra', (el->>'gols_contra')::INT + p_gols_j2,
                    'jogos', COALESCE((el->>'jogos')::INT, 0) + 1)
                WHEN el->>'user_id' = v_j2::TEXT THEN
                  el || jsonb_build_object(
                    'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                    'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                    'gols_contra', (el->>'gols_contra')::INT + p_gols_j1,
                    'jogos', COALESCE((el->>'jogos')::INT, 0) + 1)
                ELSE el
              END)
            FROM jsonb_array_elements(v_tabela) el
          );
          v_grupo := jsonb_set(v_grupo, '{tabela}', COALESCE(v_tabela, v_grupo->'tabela'));
          v_grupos := jsonb_set(v_grupos, ARRAY[v_idx]::TEXT[], v_grupo);
          EXIT;
        END IF;
      END LOOP;
      v_row.grupos := v_grupos;
    END IF;

    -- Verifica se TODOS os confrontos da fase de grupos estão finalizados
    -- (confrontos com rodada < 10000 são da fase de grupos)
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_confrontos) c
      WHERE (c->>'rodada')::INT < 10000 AND c->>'status' <> 'finalizado'
    ) AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_confrontos) c
      WHERE (c->>'rodada')::INT < 10000
    ) THEN
      -- Fase de grupos completa — gera eliminatórias!
      v_elim_confrontos := public._gerar_eliminatorias_grupos(v_row.grupos);

      -- Adiciona eliminatórias ao array de confrontos
      v_confrontos := v_confrontos || v_elim_confrontos;

      -- Recalcula última rodada
      SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
      FROM jsonb_array_elements(v_confrontos) c;

      -- Avança para primeira rodada eliminatória (10001)
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos,
             grupos = v_row.grupos,
             rodada_atual = 10001,
             fase = 2
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    ELSE
      -- Ainda na fase de grupos — só atualiza
      UPDATE public.botao_campeonatos_online
         SET participantes = v_part, confrontos = v_confrontos,
             grupos = v_row.grupos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;

    -- Se há confrontos eliminatórios e a rodada atual está completa, avança
    IF v_row.rodada_atual >= 10001 THEN
      PERFORM 1
      FROM jsonb_array_elements(v_confrontos) c
      WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado'
      LIMIT 1;

      IF NOT FOUND THEN
        IF v_row.rodada_atual >= v_ultima_rodada THEN
          -- Final disputada — torneio finalizado!
          SELECT el INTO v_campeao
          FROM jsonb_array_elements(v_part) el
          ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC
          LIMIT 1;

          UPDATE public.botao_campeonatos_online
             SET status = 'finalizado', fase = -1,
                 participantes = v_part, confrontos = v_confrontos,
                 grupos = v_row.grupos,
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
          UPDATE public.botao_campeonatos_online
             SET participantes = v_part, confrontos = v_confrontos,
                 grupos = v_row.grupos,
                 rodada_atual = v_row.rodada_atual + 1
           WHERE id = v_row.id
          RETURNING * INTO v_row;
        END IF;
      ELSE
        UPDATE public.botao_campeonatos_online
           SET participantes = v_part, confrontos = v_confrontos,
               grupos = v_row.grupos
         WHERE id = v_row.id
        RETURNING * INTO v_row;
      END IF;
    END IF;

  -- ===== PONTOS CORRIDOS: round-robin (comportamento original) =====
  ELSE
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
  END IF;

  RETURN v_row;
END; $$;

COMMIT;
