-- ============================================================
-- QI — SIMULAÇÃO (questões próprias de raciocínio não verbal)
-- Banco de questões (EXERCÍCIOS × SIMULAÇÃO) + tentativas + RPCs
-- de pontuação calculada NO SERVIDOR.
-- Gerado por testes/gerador-qi-seed.mts em 2026-08-28T21:51:16.598Z.
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT).
-- ============================================================

-- ---------- 1. Banco de questões ----------
CREATE TABLE IF NOT EXISTS public.qi_questions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('exercise', 'simulation')),
  difficulty TEXT NOT NULL,
  difficulty_order INTEGER NOT NULL CHECK (difficulty_order BETWEEN 1 AND 7),
  category TEXT NOT NULL,
  matrix_data JSONB NOT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 5),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qi_questions IS
  'Banco de questões de raciocínio não verbal. mode = exercise (EXERCÍCIOS) '
  'ou simulation (SIMULAÇÃO). A simulação SÓ consulta mode=simulation; os '
  'exercícios SÓ mode=exercise. correct_option é o índice canônico em '
  'options (antes do embaralhamento) — nunca exposto por RPC pública.';

ALTER TABLE public.qi_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qi_questions FROM anon, authenticated;
GRANT SELECT ON public.qi_questions TO service_role;
-- Sem policies: acesso apenas via RPC qi_buscar_questoes (renderização sem
-- correct_option) e qi_finalizar_simulacao (SECURITY DEFINER, valida dono).

CREATE INDEX IF NOT EXISTS qi_questions_modo_idx
  ON public.qi_questions (mode, active, difficulty_order);

-- ---------- 2. Tentativas da simulação ----------
CREATE TABLE IF NOT EXISTS public.qi_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'simulation',
  version INTEGER NOT NULL DEFAULT 1,
  total_questions INTEGER NOT NULL DEFAULT 32,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  raw_score INTEGER NOT NULL DEFAULT 0,
  estimated_result INTEGER,
  time_limit_seconds INTEGER NOT NULL DEFAULT 1500,
  time_used_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'expired', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qi_attempts_user_idx
  ON public.qi_test_attempts (user_id, started_at DESC);

ALTER TABLE public.qi_test_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qi_test_attempts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qi_test_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qi_test_attempts TO service_role;

-- RLS: cada usuário vê/edita APENAS as próprias tentativas.
-- Idempotente: DROP POLICY IF EXISTS permite reaplicar a migration sem erro 42710.
DROP POLICY IF EXISTS qi_attempts_proprias_select ON public.qi_test_attempts;
DROP POLICY IF EXISTS qi_attempts_proprias_insert ON public.qi_test_attempts;
DROP POLICY IF EXISTS qi_attempts_proprias_update ON public.qi_test_attempts;
DROP POLICY IF EXISTS qi_attempts_proprias_delete ON public.qi_test_attempts;

CREATE POLICY qi_attempts_proprias_select ON public.qi_test_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_insert ON public.qi_test_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_update ON public.qi_test_attempts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_delete ON public.qi_test_attempts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- 3. RPC: questões por modo (SEM correct_option) ----------
CREATE OR REPLACE FUNCTION public.qi_buscar_questoes(p_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF p_mode NOT IN ('exercise', 'simulation') THEN
    RAISE EXCEPTION 'modo inválido: %', p_mode;
  END IF;
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'mode', q.mode,
      'difficulty', q.difficulty,
      'difficulty_order', q.difficulty_order,
      'category', q.category,
      'matrix_data', q.matrix_data,
      'options', q.options,
      'active', q.active,
      'version', q.version
    ) ORDER BY q.difficulty_order ASC, q.id ASC
  )
  INTO v_rows
  FROM public.qi_questions q
  WHERE q.mode = p_mode AND q.active = TRUE;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END
$$;

REVOKE ALL ON FUNCTION public.qi_buscar_questoes(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_buscar_questoes(TEXT) TO anon, authenticated;

-- ---------- 4. RPC: criar tentativa ----------
CREATE OR REPLACE FUNCTION public.qi_criar_tentativa()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_questions JSONB;
  v_attempt UUID;
  v_total INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('question_id', q.id, 'difficulty_order', q.difficulty_order)
                   ORDER BY q.difficulty_order ASC, q.id ASC)
  INTO v_questions
  FROM public.qi_questions q
  WHERE q.mode = 'simulation' AND q.active = TRUE;
  v_total := COALESCE(jsonb_array_length(v_questions), 0);
  IF v_total = 0 THEN
    RAISE EXCEPTION 'banco de simulação vazio — aplique a migration qi_simulacao.sql';
  END IF;
  INSERT INTO public.qi_test_attempts (user_id, test_type, version, total_questions, questions, answers, status)
  VALUES (v_uid, 'simulation', 1, v_total, v_questions,
          (SELECT jsonb_agg(x) FROM generate_series(1, v_total) g(x)),
          'in_progress')
  RETURNING id INTO v_attempt;
  RETURN jsonb_build_object('attempt_id', v_attempt, 'total_questions', v_total);
END
$$;

REVOKE ALL ON FUNCTION public.qi_criar_tentativa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_criar_tentativa() TO authenticated;

-- ---------- 5. RPC: tentativa ativa (F5 / retomada) ----------
CREATE OR REPLACE FUNCTION public.qi_obter_tentativa_ativa()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.qi_test_attempts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT * INTO v_row FROM public.qi_test_attempts
  WHERE user_id = v_uid AND test_type = 'simulation' AND status = 'in_progress'
  ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'attempt_id', v_row.id,
    'test_type', v_row.test_type,
    'version', v_row.version,
    'total_questions', v_row.total_questions,
    'questions', v_row.questions,
    'answers', v_row.answers,
    'answered_questions', v_row.answered_questions,
    'time_limit_seconds', v_row.time_limit_seconds,
    'started_at', v_row.started_at,
    'status', v_row.status
  );
END
$$;

REVOKE ALL ON FUNCTION public.qi_obter_tentativa_ativa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_obter_tentativa_ativa() TO authenticated;

-- ---------- 6. RPC: salvar respostas (prova em andamento) ----------
CREATE OR REPLACE FUNCTION public.qi_salvar_respostas(p_attempt_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_answered INT;
  v_found BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  UPDATE public.qi_test_attempts
  SET answers = p_answers,
      answered_questions = (SELECT COUNT(*)
                            FROM jsonb_array_elements_text(COALESCE(p_answers, '[]'::jsonb)) e
                            WHERE e IS NOT NULL AND e <> '')
  WHERE id = p_attempt_id AND user_id = v_uid AND status = 'in_progress';
  GET DIAGNOSTICS v_found = ROW_COUNT;
  IF NOT v_found THEN
    RAISE EXCEPTION 'tentativa não encontrada, de outro usuário ou já encerrada';
  END IF;
  RETURN jsonb_build_object('ok', TRUE);
END
$$;

REVOKE ALL ON FUNCTION public.qi_salvar_respostas(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_salvar_respostas(UUID, JSONB) TO authenticated;

-- ---------- 7. RPC: finalizar (pontuação NO SERVIDOR) ----------
CREATE OR REPLACE FUNCTION public.qi_finalizar_simulacao(
  p_attempt_id UUID,
  p_answers JSONB,
  p_finalizacao TEXT DEFAULT 'submit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.qi_test_attempts%ROWTYPE;
  v_total INT;
  v_correct INT := 0;
  v_answered INT := 0;
  v_ans TEXT;
  v_qrow public.qi_questions%ROWTYPE;
  v_op JSONB;
  v_correct_id TEXT;
  v_time_used INT;
  v_status TEXT;
  v_est INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  IF p_finalizacao NOT IN ('submit', 'expired') THEN
    RAISE EXCEPTION 'finalização inválida';
  END IF;

  SELECT * INTO v_row FROM public.qi_test_attempts
  WHERE id = p_attempt_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tentativa não encontrada ou de outro usuário';
  END IF;
  IF v_row.status <> 'in_progress' THEN
    RETURN jsonb_build_object('already_finalized', TRUE, 'attempt_id', v_row.id);
  END IF;

  v_total := v_row.total_questions;
  -- Contagem REAL: cruza as respostas com o banco de questões.
  FOR i IN 0 .. jsonb_array_length(v_row.questions) - 1 LOOP
    v_ans := NULLIF(COALESCE(p_answers->>i, ''), '');
    IF v_ans IS NOT NULL THEN
      v_answered := v_answered + 1;
      SELECT * INTO v_qrow FROM public.qi_questions WHERE id = v_row.questions->i->>'question_id';
      IF FOUND THEN
        v_op := v_qrow.options->(v_qrow.correct_option);
        v_correct_id := v_op->>'id';
        IF v_ans = v_correct_id THEN
          v_correct := v_correct + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  v_time_used := GREATEST(0, LEAST(v_row.time_limit_seconds,
    EXTRACT(EPOCH FROM (now() - v_row.started_at))::INT));
  v_status := CASE WHEN p_finalizacao = 'expired' THEN 'expired' ELSE 'completed' END;
  -- Estimativa experimental (MESMA fórmula do calculateEstimatedResult).
  v_est := round(100.0 + (v_correct::numeric - v_total::numeric / 2.0) * 2.0);

  UPDATE public.qi_test_attempts
  SET answers = p_answers,
      answered_questions = v_answered,
      correct_answers = v_correct,
      raw_score = v_correct,
      estimated_result = v_est,
      time_used_seconds = v_time_used,
      status = v_status,
      completed_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_row.id,
    'status', v_status,
    'raw_score', v_correct,
    'correct_answers', v_correct,
    'answered_questions', v_answered,
    'total_questions', v_total,
    'percentual', round((v_correct::numeric / NULLIF(v_total, 0)) * 100.0),
    'estimated_result', v_est,
    'time_used_seconds', v_time_used,
    'time_limit_seconds', v_row.time_limit_seconds
  );
END
$$;

REVOKE ALL ON FUNCTION public.qi_finalizar_simulacao(UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_finalizar_simulacao(UUID, JSONB, TEXT) TO authenticated;

-- ---------- 8. RPC: histórico do usuário ----------
CREATE OR REPLACE FUNCTION public.qi_listar_tentativas(p_limite INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rows JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'attempt_id', t.id,
      'total_questions', t.total_questions,
      'answered_questions', t.answered_questions,
      'correct_answers', t.correct_answers,
      'raw_score', t.raw_score,
      'estimated_result', t.estimated_result,
      'time_used_seconds', t.time_used_seconds,
      'time_limit_seconds', t.time_limit_seconds,
      'started_at', t.started_at,
      'completed_at', t.completed_at,
      'status', t.status
    ) ORDER BY t.started_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM public.qi_test_attempts t
  WHERE t.user_id = v_uid
  LIMIT GREATEST(1, LEAST(COALESCE(p_limite, 50), 200));
  RETURN v_rows;
END
$$;

REVOKE ALL ON FUNCTION public.qi_listar_tentativas(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_listar_tentativas(INT) TO authenticated;

-- ---------- 9. Seed (56 questões: 32 simulação + 24 exercício) ----------
INSERT INTO public.qi_questions
  (id, mode, difficulty, difficulty_order, category, matrix_data, options, correct_option, active, version)
VALUES
  ('sim-01', 'simulation', 'introdutório', 1, 'Continuidade e quantidade', '{"cells":[{"entities":[[2,0,5,3,0.5,0.5,1,1]]},{"entities":[[2,0,5,3,0.5,0.5,1,1]]},{"entities":[[2,0,5,3,0.5,0.5,1,1]]},{"entities":[[2,1,7,4,0.5,0.5,1,1]]},{"entities":[[2,1,7,4,0.5,0.5,1,1]]},{"entities":[[2,1,7,4,0.5,0.5,1,1]]},{"entities":[[3,4,6,2,0.5,0.5,1,1]]},{"entities":[[3,4,6,2,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-01","panel":{"entities":[[2,4,6,2,0.5,0.5,1,1]]}},{"id":"op-1-sim-01","panel":{"entities":[[3,1,6,2,0.5,0.5,1,1]]}},{"id":"op-2-sim-01","panel":{"entities":[[3,3,6,2,0.5,0.5,1,1]]}},{"id":"op-3-sim-01","panel":{"entities":[[4,4,6,2,0.5,0.5,1,1]]}},{"id":"op-4-sim-01","panel":{"entities":[[3,4,6,2,0.5,0.5,1,1]]}},{"id":"op-5-sim-01","panel":{"entities":[[1,4,6,2,0.5,0.5,1,1]]}}]'::jsonb, 4, TRUE, 1),
  ('sim-02', 'simulation', 'introdutório', 1, 'Quantidade — um passo', '{"cells":[{"entities":[[1,3,4,3,0.25,0.25,0.5,0.5]]},{"entities":[[1,3,4,3,0.25,0.75,0.5,0.5],[1,3,4,3,0.75,0.25,0.5,0.5]]},{"entities":[[1,3,4,3,0.75,0.25,0.5,0.5],[1,3,4,3,0.25,0.75,0.5,0.5],[1,3,4,3,0.75,0.75,0.5,0.5]]},{"entities":[[3,5,1,4,0.25,0.75,0.5,0.5]]},{"entities":[[3,5,1,4,0.75,0.25,0.5,0.5],[3,5,1,4,0.25,0.75,0.5,0.5]]},{"entities":[[3,5,1,4,0.25,0.75,0.5,0.5],[3,5,1,4,0.25,0.25,0.5,0.5],[3,5,1,4,0.75,0.75,0.5,0.5]]},{"entities":[[1,0,2,3,0.25,0.25,0.5,0.5],[1,0,2,3,0.75,0.25,0.5,0.5]]},{"entities":[[1,0,2,3,0.25,0.75,0.5,0.5],[1,0,2,3,0.75,0.75,0.5,0.5],[1,0,2,3,0.75,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-02","panel":{"entities":[[1,0,2,3,0.75,0.25,0.5,0.5],[1,0,2,3,0.25,0.25,0.5,0.5],[1,0,2,3,0.75,0.75,0.5,0.5],[1,0,2,3,0.25,0.75,0.5,0.5]]}},{"id":"op-1-sim-02","panel":{"entities":[[1,0,2,3,0.25,0.75,0.5,0.5],[1,0,2,3,0.25,0.25,0.5,0.5]]}},{"id":"op-2-sim-02","panel":{"entities":[[1,0,2,3,0.75,0.25,0.5,0.5],[1,0,2,3,0.25,0.75,0.5,0.5],[1,0,2,3,0.75,0.75,0.5,0.5]]}},{"id":"op-3-sim-02","panel":{"entities":[[1,0,2,3,0.25,0.75,0.5,0.5],[1,0,2,3,0.75,0.75,0.5,0.5]]}},{"id":"op-4-sim-02","panel":{"entities":[[1,0,2,3,0.75,0.75,0.5,0.5]]}},{"id":"op-5-sim-02","panel":{"entities":[[1,0,2,3,0.75,0.25,0.5,0.5],[1,0,2,3,0.25,0.75,0.5,0.5],[1,0,2,3,0.25,0.25,0.5,0.5]]}}]'::jsonb, 0, TRUE, 1),
  ('sim-03', 'simulation', 'introdutório', 1, 'Quantidade — um passo', '{"cells":[{"entities":[[2,4,9,0,0.25,0.25,0.5,0.5],[2,4,9,0,0.25,0.75,0.5,0.5],[2,4,9,0,0.75,0.25,0.5,0.5],[2,4,9,0,0.75,0.75,0.5,0.5]]},{"entities":[[2,4,9,0,0.75,0.25,0.5,0.5],[2,4,9,0,0.25,0.25,0.5,0.5],[2,4,9,0,0.75,0.75,0.5,0.5]]},{"entities":[[2,4,9,0,0.75,0.25,0.5,0.5],[2,4,9,0,0.25,0.75,0.5,0.5]]},{"entities":[[3,2,2,7,0.25,0.25,0.5,0.5],[3,2,2,7,0.75,0.75,0.5,0.5],[3,2,2,7,0.75,0.25,0.5,0.5]]},{"entities":[[3,2,2,7,0.75,0.75,0.5,0.5],[3,2,2,7,0.25,0.75,0.5,0.5]]},{"entities":[[3,2,2,7,0.75,0.25,0.5,0.5]]},{"entities":[[4,1,1,2,0.75,0.25,0.5,0.5],[4,1,1,2,0.25,0.75,0.5,0.5],[4,1,1,2,0.25,0.25,0.5,0.5],[4,1,1,2,0.75,0.75,0.5,0.5]]},{"entities":[[4,1,1,2,0.75,0.25,0.5,0.5],[4,1,1,2,0.25,0.75,0.5,0.5],[4,1,1,2,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-03","panel":{"entities":[[4,1,1,2,0.25,0.25,0.5,0.5]]}},{"id":"op-1-sim-03","panel":{"entities":[[4,1,1,2,0.25,0.75,0.5,0.5],[4,1,1,2,0.25,0.25,0.5,0.5],[4,1,1,2,0.75,0.25,0.5,0.5]]}},{"id":"op-2-sim-03","panel":{"entities":[[4,1,1,2,0.75,0.75,0.5,0.5]]}},{"id":"op-3-sim-03","panel":{"entities":[[4,1,1,2,0.75,0.75,0.5,0.5],[4,1,1,2,0.75,0.25,0.5,0.5],[4,1,1,2,0.25,0.75,0.5,0.5]]}},{"id":"op-4-sim-03","panel":{"entities":[[4,1,1,2,0.75,0.75,0.5,0.5],[4,1,1,2,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-03","panel":{"entities":[[4,1,1,2,0.25,0.25,0.5,0.5],[4,1,1,2,0.75,0.25,0.5,0.5],[4,1,1,2,0.75,0.75,0.5,0.5]]}}]'::jsonb, 4, TRUE, 1),
  ('sim-04', 'simulation', 'introdutório', 1, 'Sequência básica de forma', '{"cells":[{"entities":[[2,1,8,1,0.5,0.5,1,1]]},{"entities":[[3,1,8,1,0.5,0.5,1,1]]},{"entities":[[4,1,8,1,0.5,0.5,1,1]]},{"entities":[[2,2,9,0,0.5,0.5,1,1]]},{"entities":[[3,2,9,0,0.5,0.5,1,1]]},{"entities":[[4,2,9,0,0.5,0.5,1,1]]},{"entities":[[2,5,6,3,0.5,0.5,1,1]]},{"entities":[[3,5,6,3,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-04","panel":{"entities":[[2,5,6,3,0.5,0.5,1,1]]}},{"id":"op-1-sim-04","panel":{"entities":[[5,5,6,3,0.5,0.5,1,1]]}},{"id":"op-2-sim-04","panel":{"entities":[[2,5,6,3,0.5,0.5,1,1]]}},{"id":"op-3-sim-04","panel":{"entities":[[4,5,6,3,0.5,0.5,1,1]]}},{"id":"op-4-sim-04","panel":{"entities":[[5,5,6,3,0.5,0.5,1,1]]}},{"id":"op-5-sim-04","panel":{"entities":[[3,5,6,3,0.5,0.5,1,1]]}}]'::jsonb, 3, TRUE, 1),
  ('sim-05', 'simulation', 'introdutório', 1, 'Posição — rolagem simples', '{"cells":[{"entities":[[5,3,9,3,0.25,0.25,0.5,0.5]]},{"entities":[[5,3,9,3,0.25,0.75,0.5,0.5]]},{"entities":[[5,3,9,3,0.75,0.25,0.5,0.5]]},{"entities":[[1,2,3,4,0.75,0.75,0.5,0.5]]},{"entities":[[1,2,3,4,0.25,0.25,0.5,0.5]]},{"entities":[[1,2,3,4,0.25,0.75,0.5,0.5]]},{"entities":[[5,2,3,3,0.75,0.25,0.5,0.5]]},{"entities":[[5,2,3,3,0.75,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-05","panel":{"entities":[[5,2,3,3,0.75,0.25,0.5,0.5],[5,2,3,3,0.25,0.75,0.5,0.5]]}},{"id":"op-1-sim-05","panel":{"entities":[[5,2,3,3,0.25,0.25,0.5,0.5]]}},{"id":"op-2-sim-05","panel":{"entities":[[5,2,3,3,0.25,0.25,0.5,0.5],[5,2,3,3,0.25,0.75,0.5,0.5],[5,2,3,3,0.75,0.25,0.5,0.5]]}},{"id":"op-3-sim-05","panel":{"entities":[[5,2,3,3,0.25,0.25,0.5,0.5],[5,2,3,3,0.75,0.25,0.5,0.5]]}},{"id":"op-4-sim-05","panel":{"entities":[[5,2,3,3,0.25,0.75,0.5,0.5]]}},{"id":"op-5-sim-05","panel":{"entities":[[5,2,3,3,0.25,0.25,0.5,0.5],[5,2,3,3,0.25,0.75,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-06', 'simulation', 'introdutório', 1, 'Quantidade e posição', '{"cells":[{"entities":[[4,0,2,3,0.75,0.75,0.5,0.5],[2,1,5,2,0.25,0.25,0.5,0.5]]},{"entities":[[3,0,3,7,0.25,0.75,0.5,0.5],[3,3,0,3,0.75,0.75,0.5,0.5],[3,4,4,7,0.75,0.25,0.5,0.5]]},{"entities":[[1,0,4,5,0.75,0.75,0.5,0.5],[2,0,0,4,0.25,0.75,0.5,0.5],[2,1,0,5,0.75,0.25,0.5,0.5],[2,0,3,3,0.25,0.25,0.5,0.5]]},{"entities":[[5,5,2,4,0.75,0.25,0.5,0.5],[4,2,3,2,0.75,0.75,0.5,0.5]]},{"entities":[[4,0,8,5,0.75,0.25,0.5,0.5],[4,2,8,0,0.75,0.75,0.5,0.5],[1,1,7,0,0.25,0.75,0.5,0.5]]},{"entities":[[5,3,5,4,0.25,0.75,0.5,0.5],[5,3,6,7,0.75,0.75,0.5,0.5],[1,5,5,7,0.25,0.25,0.5,0.5],[4,1,7,4,0.75,0.25,0.5,0.5]]},{"entities":[[5,3,7,1,0.75,0.75,0.5,0.5]]},{"entities":[[4,4,4,4,0.25,0.25,0.5,0.5],[5,3,4,6,0.75,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-06","panel":{"entities":[[4,2,7,3,0.75,0.25,0.5,0.5],[3,3,3,7,0.25,0.75,0.5,0.5]]}},{"id":"op-1-sim-06","panel":{"entities":[[3,3,3,7,0.25,0.25,0.5,0.5],[4,2,7,3,0.25,0.75,0.5,0.5],[5,0,9,6,0.75,0.75,0.5,0.5]]}},{"id":"op-2-sim-06","panel":{"entities":[[3,3,3,7,0.25,0.25,0.5,0.5],[5,0,9,6,0.75,0.75,0.5,0.5]]}},{"id":"op-3-sim-06","panel":{"entities":[[3,3,3,7,0.25,0.75,0.5,0.5],[4,2,7,3,0.25,0.25,0.5,0.5],[5,0,9,6,0.75,0.25,0.5,0.5],[4,2,7,3,0.75,0.75,0.5,0.5]]}},{"id":"op-4-sim-06","panel":{"entities":[[4,2,7,3,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-06","panel":{"entities":[[3,3,3,7,0.25,0.25,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-07', 'simulation', 'fácil/intermediário', 2, 'Progressão de quantidade', '{"cells":[{"entities":[[2,1,0,4,0.5,0.83,0.33,0.33],[2,2,9,6,0.5,0.5,0.33,0.33],[4,0,6,5,0.16,0.83,0.33,0.33]]},{"entities":[[3,0,1,5,0.5,0.16,0.33,0.33],[5,2,3,1,0.5,0.5,0.33,0.33],[4,2,8,7,0.5,0.83,0.33,0.33],[3,5,4,1,0.16,0.16,0.33,0.33],[2,2,6,1,0.83,0.16,0.33,0.33]]},{"entities":[[2,1,4,2,0.83,0.16,0.33,0.33],[3,1,5,4,0.5,0.83,0.33,0.33],[2,5,7,7,0.16,0.5,0.33,0.33],[1,2,1,4,0.5,0.16,0.33,0.33],[2,5,2,5,0.16,0.83,0.33,0.33],[3,1,4,1,0.83,0.5,0.33,0.33],[3,1,1,7,0.16,0.16,0.33,0.33]]},{"entities":[[5,2,8,6,0.83,0.83,0.33,0.33],[5,1,8,4,0.83,0.5,0.33,0.33]]},{"entities":[[2,2,0,6,0.5,0.16,0.33,0.33],[1,2,0,5,0.5,0.5,0.33,0.33],[2,5,4,7,0.16,0.16,0.33,0.33],[3,3,6,4,0.83,0.83,0.33,0.33]]},{"entities":[[2,3,8,6,0.83,0.83,0.33,0.33],[5,1,4,5,0.16,0.83,0.33,0.33],[5,1,1,5,0.16,0.16,0.33,0.33],[5,3,0,7,0.5,0.83,0.33,0.33],[1,0,1,2,0.5,0.5,0.33,0.33],[1,3,2,5,0.5,0.16,0.33,0.33]]},{"entities":[[3,2,1,7,0.16,0.5,0.33,0.33],[3,5,6,6,0.83,0.83,0.33,0.33],[3,4,2,4,0.83,0.5,0.33,0.33],[4,0,6,6,0.5,0.16,0.33,0.33],[1,3,8,3,0.16,0.83,0.33,0.33]]},{"entities":[[3,3,2,1,0.83,0.83,0.33,0.33],[5,4,3,2,0.83,0.5,0.33,0.33],[4,4,4,7,0.5,0.83,0.33,0.33],[4,3,1,5,0.16,0.83,0.33,0.33],[2,3,8,4,0.5,0.16,0.33,0.33],[5,1,1,5,0.16,0.16,0.33,0.33],[5,4,4,3,0.83,0.16,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-sim-07","panel":{"entities":[[3,1,9,7,0.83,0.83,0.33,0.33],[2,4,9,2,0.83,0.5,0.33,0.33],[3,5,0,3,0.5,0.5,0.33,0.33],[4,3,2,4,0.5,0.83,0.33,0.33],[2,5,2,2,0.83,0.16,0.33,0.33]]}},{"id":"op-1-sim-07","panel":{"entities":[[3,5,0,3,0.83,0.16,0.33,0.33],[3,3,0,1,0.83,0.83,0.33,0.33],[5,2,7,6,0.5,0.83,0.33,0.33],[4,3,2,4,0.16,0.83,0.33,0.33],[2,4,9,2,0.16,0.5,0.33,0.33],[3,1,9,7,0.16,0.16,0.33,0.33],[1,3,9,0,0.83,0.5,0.33,0.33],[2,5,2,2,0.5,0.16,0.33,0.33]]}},{"id":"op-2-sim-07","panel":{"entities":[[3,3,0,1,0.83,0.16,0.33,0.33],[5,2,7,6,0.83,0.5,0.33,0.33],[2,4,9,2,0.16,0.16,0.33,0.33],[1,3,9,0,0.83,0.83,0.33,0.33],[4,5,3,2,0.5,0.83,0.33,0.33],[4,3,2,4,0.5,0.5,0.33,0.33],[3,5,0,3,0.5,0.16,0.33,0.33],[3,1,9,7,0.16,0.83,0.33,0.33],[2,5,2,2,0.16,0.5,0.33,0.33]]}},{"id":"op-3-sim-07","panel":{"entities":[[3,5,0,3,0.16,0.83,0.33,0.33],[3,3,0,1,0.16,0.5,0.33,0.33],[3,1,9,7,0.83,0.16,0.33,0.33]]}},{"id":"op-4-sim-07","panel":{"entities":[[4,3,2,4,0.83,0.83,0.33,0.33],[3,3,0,1,0.83,0.5,0.33,0.33],[2,4,9,2,0.5,0.16,0.33,0.33],[2,5,2,2,0.83,0.16,0.33,0.33],[1,3,9,0,0.16,0.83,0.33,0.33],[3,5,0,3,0.16,0.5,0.33,0.33],[4,5,3,2,0.16,0.16,0.33,0.33]]}},{"id":"op-5-sim-07","panel":{"entities":[[2,5,2,2,0.83,0.83,0.33,0.33],[5,2,7,6,0.16,0.5,0.33,0.33],[3,5,0,3,0.5,0.16,0.33,0.33],[3,1,9,7,0.83,0.5,0.33,0.33]]}}]'::jsonb, 2, TRUE, 1),
  ('sim-08', 'simulation', 'fácil/intermediário', 2, 'Alternância de forma', '{"cells":[{"entities":[[1,5,0,7,0.5,0.5,1,1]]},{"entities":[[3,5,0,7,0.5,0.5,1,1]]},{"entities":[[2,5,0,7,0.5,0.5,1,1]]},{"entities":[[2,2,1,4,0.5,0.5,1,1]]},{"entities":[[1,2,1,4,0.5,0.5,1,1]]},{"entities":[[3,2,1,4,0.5,0.5,1,1]]},{"entities":[[3,1,9,0,0.5,0.5,1,1]]},{"entities":[[2,1,9,0,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-08","panel":{"entities":[[3,1,9,0,0.5,0.5,1,1]]}},{"id":"op-1-sim-08","panel":{"entities":[[4,1,9,0,0.5,0.5,1,1]]}},{"id":"op-2-sim-08","panel":{"entities":[[2,1,9,0,0.5,0.5,1,1]]}},{"id":"op-3-sim-08","panel":{"entities":[[5,1,9,0,0.5,0.5,1,1]]}},{"id":"op-4-sim-08","panel":{"entities":[[3,1,9,0,0.5,0.5,1,1]]}},{"id":"op-5-sim-08","panel":{"entities":[[1,1,9,0,0.5,0.5,1,1]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-09', 'simulation', 'fácil/intermediário', 2, 'Rotação simples (posição)', '{"cells":[{"entities":[[4,0,8,1,0.25,0.75,0.5,0.5]]},{"entities":[[4,0,8,1,0.75,0.25,0.5,0.5]]},{"entities":[[4,0,8,1,0.75,0.75,0.5,0.5]]},{"entities":[[2,1,4,1,0.75,0.25,0.5,0.5]]},{"entities":[[2,1,4,1,0.75,0.75,0.5,0.5]]},{"entities":[[2,1,4,1,0.25,0.25,0.5,0.5]]},{"entities":[[3,4,6,4,0.75,0.25,0.5,0.5]]},{"entities":[[3,4,6,4,0.75,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-09","panel":{"entities":[[3,4,6,4,0.75,0.75,0.5,0.5],[3,4,6,4,0.25,0.75,0.5,0.5]]}},{"id":"op-1-sim-09","panel":{"entities":[[3,4,6,4,0.25,0.25,0.5,0.5]]}},{"id":"op-2-sim-09","panel":{"entities":[[3,4,6,4,0.75,0.75,0.5,0.5]]}},{"id":"op-3-sim-09","panel":{"entities":[[3,4,6,4,0.25,0.25,0.5,0.5],[3,4,6,4,0.25,0.75,0.5,0.5],[3,4,6,4,0.75,0.75,0.5,0.5],[3,4,6,4,0.75,0.25,0.5,0.5]]}},{"id":"op-4-sim-09","panel":{"entities":[[3,4,6,4,0.75,0.25,0.5,0.5],[3,4,6,4,0.25,0.75,0.5,0.5],[3,4,6,4,0.25,0.25,0.5,0.5]]}},{"id":"op-5-sim-09","panel":{"entities":[[3,4,6,4,0.25,0.25,0.5,0.5],[3,4,6,4,0.75,0.75,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-10', 'simulation', 'fácil/intermediário', 2, 'Reflexão no espelho', '{"cells":[{"structure":"Left_Right","entities":[[1,1,9,6,0.5,0.25,0.5,0.5],[3,2,7,5,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[2,1,9,6,0.5,0.25,0.5,0.5],[4,2,7,5,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,1,9,6,0.5,0.25,0.5,0.5],[5,2,7,5,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,5,7,5,0.5,0.25,0.5,0.5],[1,5,0,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,5,7,5,0.5,0.25,0.5,0.5],[2,5,0,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,5,7,5,0.5,0.25,0.5,0.5],[3,5,0,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[2,5,3,7,0.5,0.25,0.5,0.5],[1,1,2,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,5,3,7,0.5,0.25,0.5,0.5],[2,1,2,4,0.5,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-10","panel":{"structure":"Left_Right","entities":[[1,5,3,7,0.5,0.25,0.5,0.5],[3,1,2,4,0.5,0.75,0.5,0.5]]}},{"id":"op-1-sim-10","panel":{"structure":"Left_Right","entities":[[4,5,3,7,0.5,0.25,0.5,0.5],[3,1,2,4,0.5,0.75,0.5,0.5]]}},{"id":"op-2-sim-10","panel":{"structure":"Left_Right","entities":[[1,5,3,7,0.5,0.25,0.5,0.5],[5,1,2,4,0.5,0.75,0.5,0.5]]}},{"id":"op-3-sim-10","panel":{"structure":"Left_Right","entities":[[4,5,3,7,0.5,0.25,0.5,0.5],[1,1,2,4,0.5,0.75,0.5,0.5]]}},{"id":"op-4-sim-10","panel":{"structure":"Left_Right","entities":[[4,5,3,7,0.5,0.25,0.5,0.5],[5,1,2,4,0.5,0.75,0.5,0.5]]}},{"id":"op-5-sim-10","panel":{"structure":"Left_Right","entities":[[1,5,3,7,0.5,0.25,0.5,0.5],[1,1,2,4,0.5,0.75,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-11', 'simulation', 'fácil/intermediário', 2, 'Relações entre elementos', '{"cells":[{"entities":[[4,2,3,0,0.25,0.25,0.5,0.5],[1,1,2,5,0.75,0.25,0.5,0.5]]},{"entities":[[4,2,3,0,0.25,0.75,0.5,0.5],[1,1,2,5,0.75,0.75,0.5,0.5]]},{"entities":[[4,2,3,0,0.75,0.25,0.5,0.5],[1,1,2,5,0.25,0.25,0.5,0.5]]},{"entities":[[3,0,1,0,0.25,0.25,0.5,0.5],[5,0,0,0,0.75,0.25,0.5,0.5]]},{"entities":[[3,0,1,0,0.25,0.75,0.5,0.5],[5,0,0,0,0.75,0.75,0.5,0.5]]},{"entities":[[3,0,1,0,0.75,0.25,0.5,0.5],[5,0,0,0,0.25,0.25,0.5,0.5]]},{"entities":[[1,4,1,2,0.75,0.25,0.5,0.5],[3,3,4,7,0.25,0.25,0.5,0.5]]},{"entities":[[1,4,1,2,0.75,0.75,0.5,0.5],[3,3,4,7,0.25,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-11","panel":{"entities":[[1,4,1,2,0.75,0.75,0.5,0.5],[3,3,4,7,0.75,0.25,0.5,0.5],[1,4,1,2,0.25,0.25,0.5,0.5]]}},{"id":"op-1-sim-11","panel":{"entities":[[1,4,1,2,0.25,0.25,0.5,0.5],[3,3,4,7,0.25,0.75,0.5,0.5]]}},{"id":"op-2-sim-11","panel":{"entities":[[1,4,1,2,0.25,0.75,0.5,0.5]]}},{"id":"op-3-sim-11","panel":{"entities":[[1,4,1,2,0.25,0.25,0.5,0.5]]}},{"id":"op-4-sim-11","panel":{"entities":[[1,4,1,2,0.75,0.75,0.5,0.5],[3,3,4,7,0.25,0.75,0.5,0.5],[1,4,1,2,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-11","panel":{"entities":[[1,4,1,2,0.25,0.25,0.5,0.5],[3,3,4,7,0.75,0.25,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-12', 'simulation', 'fácil/intermediário', 2, 'Combinação de dois padrões', '{"cells":[{"entities":[[1,4,0,1,0.5,0.5,1,1]]},{"entities":[[2,4,0,1,0.5,0.5,1,1]]},{"entities":[[3,4,0,1,0.5,0.5,1,1]]},{"entities":[[2,3,6,2,0.5,0.5,1,1]]},{"entities":[[3,3,6,2,0.5,0.5,1,1]]},{"entities":[[4,3,6,2,0.5,0.5,1,1]]},{"entities":[[2,3,6,6,0.5,0.5,1,1]]},{"entities":[[3,3,6,6,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-12","panel":{"entities":[[4,3,6,6,0.5,0.5,1,1]]}},{"id":"op-1-sim-12","panel":{"entities":[[3,3,6,6,0.5,0.5,1,1]]}},{"id":"op-2-sim-12","panel":{"entities":[[2,3,6,6,0.5,0.5,1,1]]}},{"id":"op-3-sim-12","panel":{"entities":[[3,3,6,6,0.5,0.5,1,1]]}},{"id":"op-4-sim-12","panel":{"entities":[[2,3,6,6,0.5,0.5,1,1]]}},{"id":"op-5-sim-12","panel":{"entities":[[1,3,6,6,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('sim-13', 'simulation', 'intermediário', 3, 'Duas regras simultâneas', '{"cells":[{"entities":[[3,0,6,4,0.75,0.25,0.5,0.5],[3,0,6,4,0.25,0.75,0.5,0.5]]},{"entities":[[4,0,6,4,0.75,0.75,0.5,0.5],[4,0,6,4,0.25,0.25,0.5,0.5],[4,0,6,4,0.75,0.25,0.5,0.5]]},{"entities":[[5,0,6,4,0.75,0.75,0.5,0.5],[5,0,6,4,0.25,0.75,0.5,0.5],[5,0,6,4,0.75,0.25,0.5,0.5],[5,0,6,4,0.25,0.25,0.5,0.5]]},{"entities":[[1,4,3,0,0.75,0.75,0.5,0.5]]},{"entities":[[2,4,3,0,0.75,0.75,0.5,0.5],[2,4,3,0,0.75,0.25,0.5,0.5]]},{"entities":[[3,4,3,0,0.75,0.25,0.5,0.5],[3,4,3,0,0.25,0.25,0.5,0.5],[3,4,3,0,0.75,0.75,0.5,0.5]]},{"entities":[[3,3,7,5,0.75,0.75,0.5,0.5]]},{"entities":[[4,3,7,5,0.75,0.25,0.5,0.5],[4,3,7,5,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-13","panel":{"entities":[[5,3,7,5,0.25,0.25,0.5,0.5]]}},{"id":"op-1-sim-13","panel":{"entities":[[5,3,7,5,0.75,0.75,0.5,0.5],[5,3,7,5,0.25,0.25,0.5,0.5],[5,3,7,5,0.75,0.25,0.5,0.5]]}},{"id":"op-2-sim-13","panel":{"entities":[[2,3,7,5,0.75,0.75,0.5,0.5],[2,3,7,5,0.25,0.25,0.5,0.5],[2,3,7,5,0.75,0.25,0.5,0.5]]}},{"id":"op-3-sim-13","panel":{"entities":[[2,3,7,5,0.75,0.25,0.5,0.5],[2,3,7,5,0.25,0.75,0.5,0.5]]}},{"id":"op-4-sim-13","panel":{"entities":[[2,3,7,5,0.25,0.25,0.5,0.5],[2,3,7,5,0.75,0.75,0.5,0.5],[2,3,7,5,0.25,0.75,0.5,0.5],[2,3,7,5,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-13","panel":{"entities":[[5,3,7,5,0.25,0.25,0.5,0.5],[5,3,7,5,0.75,0.75,0.5,0.5],[5,3,7,5,0.25,0.75,0.5,0.5],[5,3,7,5,0.75,0.25,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-14', 'simulation', 'intermediário', 3, 'Relações entre linhas e colunas', '{"cells":[{"entities":[[3,4,6,0,0.5,0.5,1,1]]},{"entities":[[1,4,6,0,0.5,0.5,1,1]]},{"entities":[[5,4,6,0,0.5,0.5,1,1]]},{"entities":[[5,4,6,2,0.5,0.5,1,1]]},{"entities":[[3,4,6,2,0.5,0.5,1,1]]},{"entities":[[1,4,6,2,0.5,0.5,1,1]]},{"entities":[[1,0,1,3,0.5,0.5,1,1]]},{"entities":[[5,0,1,3,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-14","panel":{"entities":[[5,0,1,3,0.5,0.5,1,1]]}},{"id":"op-1-sim-14","panel":{"entities":[[5,0,1,3,0.5,0.5,1,1]]}},{"id":"op-2-sim-14","panel":{"entities":[[4,0,1,3,0.5,0.5,1,1]]}},{"id":"op-3-sim-14","panel":{"entities":[[4,0,1,3,0.5,0.5,1,1]]}},{"id":"op-4-sim-14","panel":{"entities":[[3,0,1,3,0.5,0.5,1,1]]}},{"id":"op-5-sim-14","panel":{"entities":[[4,0,1,3,0.5,0.5,1,1]]}}]'::jsonb, 4, TRUE, 1),
  ('sim-15', 'simulation', 'intermediário', 3, 'Transformação de elementos', '{"cells":[{"entities":[[3,0,8,6,0.5,0.5,1,1]]},{"entities":[[4,1,8,6,0.5,0.5,1,1]]},{"entities":[[5,2,8,6,0.5,0.5,1,1]]},{"entities":[[1,1,0,6,0.5,0.5,1,1]]},{"entities":[[2,2,0,6,0.5,0.5,1,1]]},{"entities":[[3,3,0,6,0.5,0.5,1,1]]},{"entities":[[1,2,9,5,0.5,0.5,1,1]]},{"entities":[[2,3,9,5,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-15","panel":{"entities":[[2,1,9,5,0.5,0.5,1,1]]}},{"id":"op-1-sim-15","panel":{"entities":[[3,3,9,5,0.5,0.5,1,1]]}},{"id":"op-2-sim-15","panel":{"entities":[[3,4,9,5,0.5,0.5,1,1]]}},{"id":"op-3-sim-15","panel":{"entities":[[3,1,9,5,0.5,0.5,1,1]]}},{"id":"op-4-sim-15","panel":{"entities":[[2,3,9,5,0.5,0.5,1,1]]}},{"id":"op-5-sim-15","panel":{"entities":[[2,4,9,5,0.5,0.5,1,1]]}}]'::jsonb, 2, TRUE, 1),
  ('sim-16', 'simulation', 'intermediário', 3, 'Composição/decomposição', '{"cells":[{"structure":"Left_Right","entities":[[4,3,4,5,0.5,0.25,0.5,0.5],[5,0,1,7,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,3,4,5,0.5,0.25,0.5,0.5],[4,0,1,7,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,3,4,5,0.5,0.25,0.5,0.5],[3,0,1,7,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,3,6,5,0.5,0.25,0.5,0.5],[4,0,7,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,3,6,5,0.5,0.25,0.5,0.5],[3,0,7,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,3,6,5,0.5,0.25,0.5,0.5],[5,0,7,4,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,5,5,0,0.5,0.25,0.5,0.5],[3,3,6,1,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,5,5,0,0.5,0.25,0.5,0.5],[5,3,6,1,0.5,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-16","panel":{"structure":"Left_Right","entities":[[3,5,5,0,0.5,0.25,0.5,0.5],[5,3,6,1,0.5,0.75,0.5,0.5]]}},{"id":"op-1-sim-16","panel":{"structure":"Left_Right","entities":[[3,5,5,0,0.5,0.25,0.5,0.5],[2,3,6,1,0.5,0.75,0.5,0.5]]}},{"id":"op-2-sim-16","panel":{"structure":"Left_Right","entities":[[1,5,5,0,0.5,0.25,0.5,0.5],[4,3,6,1,0.5,0.75,0.5,0.5]]}},{"id":"op-3-sim-16","panel":{"structure":"Left_Right","entities":[[3,5,5,0,0.5,0.25,0.5,0.5],[4,3,6,1,0.5,0.75,0.5,0.5]]}},{"id":"op-4-sim-16","panel":{"structure":"Left_Right","entities":[[1,5,5,0,0.5,0.25,0.5,0.5],[1,3,6,1,0.5,0.75,0.5,0.5]]}},{"id":"op-5-sim-16","panel":{"structure":"Left_Right","entities":[[3,5,5,0,0.5,0.25,0.5,0.5],[1,3,6,1,0.5,0.75,0.5,0.5]]}}]'::jsonb, 3, TRUE, 1),
  ('sim-17', 'simulation', 'intermediário', 3, 'Regras simultâneas', '{"cells":[{"structure":"Out_In","entities":[[3,5,0,7,0.5,0.5,1,1],[1,2,9,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,5,0,7,0.5,0.5,1,1],[2,2,9,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,5,0,7,0.5,0.5,1,1],[3,2,9,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,3,0,0,0.5,0.5,1,1],[2,3,1,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,3,0,0,0.5,0.5,1,1],[3,3,1,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,3,0,0,0.5,0.5,1,1],[4,3,1,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,3,0,7,0.5,0.5,1,1],[1,3,3,2,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,3,0,7,0.5,0.5,1,1],[2,3,3,2,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-sim-17","panel":{"structure":"Out_In","entities":[[5,3,0,7,0.5,0.5,1,1],[3,3,3,2,0.5,0.5,0.33,0.33]]}},{"id":"op-1-sim-17","panel":{"structure":"Out_In","entities":[[3,3,0,7,0.5,0.5,1,1],[4,3,3,2,0.5,0.5,0.33,0.33]]}},{"id":"op-2-sim-17","panel":{"structure":"Out_In","entities":[[5,3,0,7,0.5,0.5,1,1],[4,3,3,2,0.5,0.5,0.33,0.33]]}},{"id":"op-3-sim-17","panel":{"structure":"Out_In","entities":[[3,3,0,7,0.5,0.5,1,1],[1,3,3,2,0.5,0.5,0.33,0.33]]}},{"id":"op-4-sim-17","panel":{"structure":"Out_In","entities":[[5,3,0,7,0.5,0.5,1,1],[4,3,3,2,0.5,0.5,0.33,0.33]]}},{"id":"op-5-sim-17","panel":{"structure":"Out_In","entities":[[3,3,0,7,0.5,0.5,1,1],[3,3,3,2,0.5,0.5,0.33,0.33]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-18', 'simulation', 'intermediário', 3, 'Relações entre elementos', '{"cells":[{"entities":[[1,5,9,2,0.25,0.75,0.5,0.5],[1,5,9,2,0.75,0.75,0.5,0.5],[1,5,9,2,0.25,0.25,0.5,0.5]]},{"entities":[[1,5,9,2,0.75,0.75,0.5,0.5]]},{"entities":[[1,5,9,2,0.75,0.75,0.5,0.5],[1,5,9,2,0.75,0.25,0.5,0.5],[1,5,9,2,0.25,0.75,0.5,0.5],[1,5,9,2,0.25,0.25,0.5,0.5]]},{"entities":[[3,3,4,6,0.25,0.75,0.5,0.5],[3,3,4,6,0.75,0.25,0.5,0.5],[3,3,4,6,0.75,0.75,0.5,0.5]]},{"entities":[[3,3,4,6,0.75,0.75,0.5,0.5]]},{"entities":[[3,3,4,6,0.25,0.25,0.5,0.5],[3,3,4,6,0.75,0.25,0.5,0.5],[3,3,4,6,0.25,0.75,0.5,0.5],[3,3,4,6,0.75,0.75,0.5,0.5]]},{"entities":[[2,0,3,0,0.75,0.25,0.5,0.5],[2,0,3,0,0.75,0.75,0.5,0.5]]},{"entities":[[2,0,3,0,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-18","panel":{"entities":[[2,0,3,0,0.75,0.25,0.5,0.5],[2,0,3,0,0.25,0.25,0.5,0.5],[2,0,3,0,0.25,0.75,0.5,0.5],[2,0,3,0,0.75,0.75,0.5,0.5]]}},{"id":"op-1-sim-18","panel":{"entities":[[2,0,3,0,0.25,0.25,0.5,0.5]]}},{"id":"op-2-sim-18","panel":{"entities":[[2,0,3,0,0.75,0.25,0.5,0.5],[2,0,3,0,0.75,0.75,0.5,0.5]]}},{"id":"op-3-sim-18","panel":{"entities":[[2,0,3,0,0.25,0.25,0.5,0.5],[2,0,3,0,0.75,0.75,0.5,0.5]]}},{"id":"op-4-sim-18","panel":{"entities":[[2,0,3,0,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-18","panel":{"entities":[[2,0,3,0,0.75,0.25,0.5,0.5],[2,0,3,0,0.75,0.75,0.5,0.5],[2,0,3,0,0.25,0.75,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-19', 'simulation', 'intermediário/avançado', 4, 'Múltiplas regras', '{"cells":[{"structure":"Out_In","entities":[[2,4,0,3,0.5,0.5,1,1],[5,0,5,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,3,0.5,0.5,1,1],[4,0,5,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,4,0,3,0.5,0.5,1,1],[3,0,5,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,4,0,6,0.5,0.5,1,1],[4,0,7,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,6,0.5,0.5,1,1],[3,0,7,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,4,0,6,0.5,0.5,1,1],[2,0,7,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,5,0,0,0.5,0.5,1,1],[5,1,5,2,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,5,0,0,0.5,0.5,1,1],[4,1,5,2,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-sim-19","panel":{"structure":"Out_In","entities":[[1,5,0,0,0.5,0.5,1,1],[2,1,5,2,0.5,0.5,0.33,0.33]]}},{"id":"op-1-sim-19","panel":{"structure":"Out_In","entities":[[1,5,0,0,0.5,0.5,1,1],[2,1,5,2,0.5,0.5,0.33,0.33]]}},{"id":"op-2-sim-19","panel":{"structure":"Out_In","entities":[[1,5,0,0,0.5,0.5,1,1],[1,1,5,2,0.5,0.5,0.33,0.33]]}},{"id":"op-3-sim-19","panel":{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[1,1,5,2,0.5,0.5,0.33,0.33]]}},{"id":"op-4-sim-19","panel":{"structure":"Out_In","entities":[[1,5,0,0,0.5,0.5,1,1],[3,1,5,2,0.5,0.5,0.33,0.33]]}},{"id":"op-5-sim-19","panel":{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[3,1,5,2,0.5,0.5,0.33,0.33]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-20', 'simulation', 'intermediário/avançado', 4, 'Rotação + quantidade', '{"cells":[{"entities":[[1,3,0,2,0.75,0.25,0.5,0.5]]},{"entities":[[2,3,0,2,0.75,0.75,0.5,0.5]]},{"entities":[[3,3,0,2,0.25,0.25,0.5,0.5]]},{"entities":[[1,1,8,3,0.25,0.25,0.5,0.5]]},{"entities":[[2,1,8,3,0.25,0.75,0.5,0.5]]},{"entities":[[3,1,8,3,0.75,0.25,0.5,0.5]]},{"entities":[[2,1,0,4,0.75,0.25,0.5,0.5],[2,3,9,4,0.25,0.75,0.5,0.5]]},{"entities":[[3,1,0,4,0.75,0.75,0.5,0.5],[3,3,9,4,0.75,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-20","panel":{"entities":[[3,3,9,4,0.25,0.25,0.5,0.5]]}},{"id":"op-1-sim-20","panel":{"entities":[[4,1,0,4,0.25,0.25,0.5,0.5],[4,3,9,4,0.75,0.75,0.5,0.5]]}},{"id":"op-2-sim-20","panel":{"entities":[[4,3,9,4,0.75,0.25,0.5,0.5]]}},{"id":"op-3-sim-20","panel":{"entities":[[3,3,9,4,0.75,0.25,0.5,0.5]]}},{"id":"op-4-sim-20","panel":{"entities":[[4,3,9,4,0.25,0.25,0.5,0.5]]}},{"id":"op-5-sim-20","panel":{"entities":[[3,1,0,4,0.25,0.25,0.5,0.5],[3,3,9,4,0.75,0.75,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-21', 'simulation', 'intermediário/avançado', 4, 'Posição + forma', '{"cells":[{"entities":[[2,5,6,7,0.25,0.25,0.5,0.5]]},{"entities":[[5,5,6,7,0.25,0.75,0.5,0.5]]},{"entities":[[1,5,6,7,0.75,0.25,0.5,0.5]]},{"entities":[[1,1,3,0,0.25,0.25,0.5,0.5],[1,1,3,0,0.75,0.75,0.5,0.5]]},{"entities":[[2,1,3,0,0.25,0.75,0.5,0.5],[2,1,3,0,0.25,0.25,0.5,0.5]]},{"entities":[[5,1,3,0,0.75,0.25,0.5,0.5],[5,1,3,0,0.25,0.75,0.5,0.5]]},{"entities":[[5,5,8,6,0.25,0.75,0.5,0.5]]},{"entities":[[1,5,8,6,0.75,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-21","panel":{"entities":[[2,5,8,6,0.25,0.25,0.5,0.5],[2,5,8,6,0.75,0.75,0.5,0.5],[2,5,8,6,0.25,0.75,0.5,0.5]]}},{"id":"op-1-sim-21","panel":{"entities":[[2,5,8,6,0.75,0.75,0.5,0.5]]}},{"id":"op-2-sim-21","panel":{"entities":[[4,5,8,6,0.25,0.25,0.5,0.5],[4,5,8,6,0.75,0.75,0.5,0.5],[4,5,8,6,0.25,0.75,0.5,0.5]]}},{"id":"op-3-sim-21","panel":{"entities":[[2,5,8,6,0.25,0.25,0.5,0.5]]}},{"id":"op-4-sim-21","panel":{"entities":[[4,5,8,6,0.25,0.25,0.5,0.5]]}},{"id":"op-5-sim-21","panel":{"entities":[[4,5,8,6,0.25,0.25,0.5,0.5],[4,5,8,6,0.75,0.75,0.5,0.5],[4,5,8,6,0.75,0.25,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-22', 'simulation', 'intermediário/avançado', 4, 'Transformações combinadas', '{"cells":[{"entities":[[1,3,1,0,0.5,0.5,1,1]]},{"entities":[[2,1,1,0,0.5,0.5,1,1]]},{"entities":[[3,5,1,0,0.5,0.5,1,1]]},{"entities":[[3,0,7,1,0.5,0.5,1,1]]},{"entities":[[4,4,7,1,0.5,0.5,1,1]]},{"entities":[[5,5,7,1,0.5,0.5,1,1]]},{"entities":[[2,3,3,0,0.5,0.5,1,1]]},{"entities":[[3,0,3,0,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-22","panel":{"entities":[[4,5,3,0,0.5,0.5,1,1]]}},{"id":"op-1-sim-22","panel":{"entities":[[4,1,3,0,0.5,0.5,1,1]]}},{"id":"op-2-sim-22","panel":{"entities":[[1,4,3,0,0.5,0.5,1,1]]}},{"id":"op-3-sim-22","panel":{"entities":[[4,3,3,0,0.5,0.5,1,1]]}},{"id":"op-4-sim-22","panel":{"entities":[[4,4,3,0,0.5,0.5,1,1]]}},{"id":"op-5-sim-22","panel":{"entities":[[1,5,3,0,0.5,0.5,1,1]]}}]'::jsonb, 4, TRUE, 1),
  ('sim-23', 'simulation', 'intermediário/avançado', 4, 'Regras cruzadas', '{"cells":[{"structure":"Out_In","entities":[[3,4,0,2,0.5,0.5,1,1],[1,5,5,1,0.58,0.58,0.15,0.15],[1,5,5,1,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[4,4,0,2,0.5,0.5,1,1],[2,5,5,1,0.58,0.58,0.15,0.15],[2,5,5,1,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[5,4,0,2,0.5,0.5,1,1],[3,5,5,1,0.58,0.58,0.15,0.15],[3,5,5,1,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[3,3,0,0,0.5,0.5,1,1],[1,4,8,4,0.42,0.42,0.15,0.15],[1,4,8,4,0.42,0.58,0.15,0.15],[1,4,8,4,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[4,3,0,0,0.5,0.5,1,1],[2,4,8,4,0.42,0.42,0.15,0.15],[2,4,8,4,0.42,0.58,0.15,0.15],[2,4,8,4,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[5,3,0,0,0.5,0.5,1,1],[3,4,8,4,0.42,0.42,0.15,0.15],[3,4,8,4,0.42,0.58,0.15,0.15],[3,4,8,4,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[1,4,0,7,0.5,0.5,1,1],[1,5,6,5,0.42,0.58,0.15,0.15],[1,5,6,5,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[2,4,0,7,0.5,0.5,1,1],[2,5,6,5,0.42,0.58,0.15,0.15],[2,5,6,5,0.42,0.42,0.15,0.15]]}]}'::jsonb, '[{"id":"op-0-sim-23","panel":{"structure":"Out_In","entities":[[3,4,0,7,0.5,0.5,1,1],[3,5,6,5,0.42,0.58,0.15,0.15],[3,5,6,5,0.42,0.42,0.15,0.15]]}},{"id":"op-1-sim-23","panel":{"structure":"Out_In","entities":[[3,4,0,7,0.5,0.5,1,1],[2,5,6,5,0.42,0.58,0.15,0.15],[2,5,6,5,0.42,0.42,0.15,0.15]]}},{"id":"op-2-sim-23","panel":{"structure":"Out_In","entities":[[3,4,0,7,0.5,0.5,1,1],[2,5,6,5,0.58,0.58,0.15,0.15],[2,5,6,5,0.58,0.42,0.15,0.15],[2,5,6,5,0.42,0.42,0.15,0.15]]}},{"id":"op-3-sim-23","panel":{"structure":"Out_In","entities":[[2,4,0,7,0.5,0.5,1,1],[2,5,6,5,0.58,0.58,0.15,0.15],[2,5,6,5,0.58,0.42,0.15,0.15],[2,5,6,5,0.42,0.42,0.15,0.15]]}},{"id":"op-4-sim-23","panel":{"structure":"Out_In","entities":[[2,4,0,7,0.5,0.5,1,1],[3,5,6,5,0.42,0.58,0.15,0.15],[3,5,6,5,0.42,0.42,0.15,0.15]]}},{"id":"op-5-sim-23","panel":{"structure":"Out_In","entities":[[2,4,0,7,0.5,0.5,1,1],[3,5,6,5,0.58,0.58,0.15,0.15],[3,5,6,5,0.58,0.42,0.15,0.15],[3,5,6,5,0.42,0.42,0.15,0.15]]}}]'::jsonb, 0, TRUE, 1),
  ('sim-24', 'simulation', 'intermediário/avançado', 4, 'Padrões menos óbvios', '{"cells":[{"structure":"Up_Down","entities":[[2,3,2,1,0.25,0.5,0.5,0.5],[2,0,0,2,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,4,2,1,0.25,0.5,0.5,0.5],[3,1,0,2,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,5,2,1,0.25,0.5,0.5,0.5],[4,2,0,2,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[1,3,4,5,0.25,0.5,0.5,0.5],[2,2,9,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,4,4,5,0.25,0.5,0.5,0.5],[3,3,9,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,5,4,5,0.25,0.5,0.5,0.5],[4,4,9,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,3,0,3,0.25,0.5,0.5,0.5],[2,3,7,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,4,0,3,0.25,0.5,0.5,0.5],[3,4,7,7,0.75,0.5,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-24","panel":{"structure":"Up_Down","entities":[[5,5,0,3,0.25,0.5,0.5,0.5],[3,5,7,7,0.75,0.5,0.5,0.5]]}},{"id":"op-1-sim-24","panel":{"structure":"Up_Down","entities":[[5,4,0,3,0.25,0.5,0.5,0.5],[4,0,7,7,0.75,0.5,0.5,0.5]]}},{"id":"op-2-sim-24","panel":{"structure":"Up_Down","entities":[[5,5,0,3,0.25,0.5,0.5,0.5],[4,0,7,7,0.75,0.5,0.5,0.5]]}},{"id":"op-3-sim-24","panel":{"structure":"Up_Down","entities":[[5,4,0,3,0.25,0.5,0.5,0.5],[4,5,7,7,0.75,0.5,0.5,0.5]]}},{"id":"op-4-sim-24","panel":{"structure":"Up_Down","entities":[[5,5,0,3,0.25,0.5,0.5,0.5],[4,5,7,7,0.75,0.5,0.5,0.5]]}},{"id":"op-5-sim-24","panel":{"structure":"Up_Down","entities":[[5,4,0,3,0.25,0.5,0.5,0.5],[3,5,7,7,0.75,0.5,0.5,0.5]]}}]'::jsonb, 4, TRUE, 1),
  ('sim-25', 'simulation', 'avançado', 5, 'Abstração — distribuição de três', '{"cells":[{"entities":[[2,2,9,1,0.75,0.75,0.5,0.5],[2,2,2,3,0.25,0.25,0.5,0.5],[2,2,5,3,0.75,0.25,0.5,0.5]]},{"entities":[[3,3,7,6,0.25,0.75,0.5,0.5],[3,3,8,7,0.25,0.25,0.5,0.5],[3,3,4,0,0.75,0.25,0.5,0.5],[3,3,8,2,0.75,0.75,0.5,0.5]]},{"entities":[[4,4,7,4,0.75,0.75,0.5,0.5]]},{"entities":[[3,2,9,6,0.75,0.75,0.5,0.5]]},{"entities":[[4,3,2,5,0.75,0.25,0.5,0.5],[4,3,7,2,0.25,0.75,0.5,0.5],[4,3,3,4,0.75,0.75,0.5,0.5]]},{"entities":[[5,4,3,5,0.75,0.25,0.5,0.5],[5,4,8,5,0.25,0.25,0.5,0.5],[5,4,9,0,0.75,0.75,0.5,0.5],[5,4,1,0,0.25,0.75,0.5,0.5]]},{"entities":[[2,0,1,4,0.25,0.25,0.5,0.5],[2,0,7,6,0.75,0.25,0.5,0.5],[2,0,8,1,0.75,0.75,0.5,0.5],[2,0,7,2,0.25,0.75,0.5,0.5]]},{"entities":[[3,1,1,7,0.75,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-25","panel":{"entities":[[4,0,1,3,0.25,0.75,0.5,0.5],[4,0,9,4,0.75,0.75,0.5,0.5],[4,0,5,4,0.75,0.25,0.5,0.5]]}},{"id":"op-1-sim-25","panel":{"entities":[[4,0,9,4,0.75,0.25,0.5,0.5],[4,0,1,3,0.25,0.75,0.5,0.5]]}},{"id":"op-2-sim-25","panel":{"entities":[[5,0,1,3,0.25,0.75,0.5,0.5],[5,0,9,4,0.75,0.75,0.5,0.5],[5,0,5,4,0.75,0.25,0.5,0.5]]}},{"id":"op-3-sim-25","panel":{"entities":[[4,2,1,3,0.25,0.75,0.5,0.5],[4,2,9,4,0.75,0.75,0.5,0.5],[4,2,5,4,0.75,0.25,0.5,0.5]]}},{"id":"op-4-sim-25","panel":{"entities":[[4,2,9,4,0.75,0.25,0.5,0.5],[4,2,1,3,0.25,0.75,0.5,0.5]]}},{"id":"op-5-sim-25","panel":{"entities":[[5,0,9,4,0.75,0.25,0.5,0.5],[5,0,1,3,0.25,0.75,0.5,0.5]]}}]'::jsonb, 3, TRUE, 1),
  ('sim-26', 'simulation', 'avançado', 5, 'Múltiplas operações simultâneas', '{"cells":[{"structure":"Out_In","entities":[[1,4,0,3,0.5,0.5,1,1],[5,5,6,2,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,4,0,3,0.5,0.5,1,1],[4,5,6,2,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,3,0.5,0.5,1,1],[3,5,6,2,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,4,0,3,0.5,0.5,1,1],[4,2,3,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,4,0,3,0.5,0.5,1,1],[3,2,3,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,3,0.5,0.5,1,1],[2,2,3,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,5,0,1,0.5,0.5,1,1],[4,3,3,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,5,0,1,0.5,0.5,1,1],[3,3,3,4,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-sim-26","panel":{"structure":"Out_In","entities":[[4,5,0,1,0.5,0.5,1,1],[1,3,3,4,0.5,0.5,0.33,0.33]]}},{"id":"op-1-sim-26","panel":{"structure":"Out_In","entities":[[5,5,0,1,0.5,0.5,1,1],[2,3,3,4,0.5,0.5,0.33,0.33]]}},{"id":"op-2-sim-26","panel":{"structure":"Out_In","entities":[[4,5,0,1,0.5,0.5,1,1],[2,3,3,4,0.5,0.5,0.33,0.33]]}},{"id":"op-3-sim-26","panel":{"structure":"Out_In","entities":[[4,5,0,1,0.5,0.5,1,1],[4,3,3,4,0.5,0.5,0.33,0.33]]}},{"id":"op-4-sim-26","panel":{"structure":"Out_In","entities":[[4,5,0,1,0.5,0.5,1,1],[4,3,3,4,0.5,0.5,0.33,0.33]]}},{"id":"op-5-sim-26","panel":{"structure":"Out_In","entities":[[5,5,0,1,0.5,0.5,1,1],[1,3,3,4,0.5,0.5,0.33,0.33]]}}]'::jsonb, 2, TRUE, 1),
  ('sim-27', 'simulation', 'avançado', 5, 'Relações entre linhas e colunas', '{"cells":[{"entities":[[5,1,4,1,0.5,0.5,1,1]]},{"entities":[[2,2,4,1,0.5,0.5,1,1]]},{"entities":[[3,3,4,1,0.5,0.5,1,1]]},{"entities":[[2,3,0,7,0.5,0.5,1,1]]},{"entities":[[3,4,0,7,0.5,0.5,1,1]]},{"entities":[[5,5,0,7,0.5,0.5,1,1]]},{"entities":[[3,0,0,7,0.5,0.5,1,1]]},{"entities":[[5,1,0,7,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-sim-27","panel":{"entities":[[2,5,0,7,0.5,0.5,1,1]]}},{"id":"op-1-sim-27","panel":{"entities":[[2,2,0,7,0.5,0.5,1,1]]}},{"id":"op-2-sim-27","panel":{"entities":[[4,5,0,7,0.5,0.5,1,1]]}},{"id":"op-3-sim-27","panel":{"entities":[[4,2,0,7,0.5,0.5,1,1]]}},{"id":"op-4-sim-27","panel":{"entities":[[4,0,0,7,0.5,0.5,1,1]]}},{"id":"op-5-sim-27","panel":{"entities":[[2,1,0,7,0.5,0.5,1,1]]}}]'::jsonb, 1, TRUE, 1),
  ('sim-28', 'simulation', 'avançado', 5, 'Regras implícitas', '{"cells":[{"structure":"Up_Down","entities":[[1,2,7,0,0.25,0.5,0.5,0.5],[1,5,7,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,3,7,0,0.25,0.5,0.5,0.5],[2,5,7,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,4,7,0,0.25,0.5,0.5,0.5],[3,5,7,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,3,9,1,0.25,0.5,0.5,0.5],[1,2,2,5,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,4,9,1,0.25,0.5,0.5,0.5],[2,2,2,5,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[1,5,9,1,0.25,0.5,0.5,0.5],[3,2,2,5,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,3,6,6,0.25,0.5,0.5,0.5],[2,2,0,1,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[1,4,6,6,0.25,0.5,0.5,0.5],[3,2,0,1,0.75,0.5,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-28","panel":{"structure":"Up_Down","entities":[[2,5,6,6,0.25,0.5,0.5,0.5],[3,2,0,1,0.75,0.5,0.5,0.5]]}},{"id":"op-1-sim-28","panel":{"structure":"Up_Down","entities":[[4,5,6,6,0.25,0.5,0.5,0.5],[4,2,0,1,0.75,0.5,0.5,0.5]]}},{"id":"op-2-sim-28","panel":{"structure":"Up_Down","entities":[[4,4,6,6,0.25,0.5,0.5,0.5],[3,2,0,1,0.75,0.5,0.5,0.5]]}},{"id":"op-3-sim-28","panel":{"structure":"Up_Down","entities":[[2,5,6,6,0.25,0.5,0.5,0.5],[4,2,0,1,0.75,0.5,0.5,0.5]]}},{"id":"op-4-sim-28","panel":{"structure":"Up_Down","entities":[[4,4,6,6,0.25,0.5,0.5,0.5],[4,2,0,1,0.75,0.5,0.5,0.5]]}},{"id":"op-5-sim-28","panel":{"structure":"Up_Down","entities":[[2,4,6,6,0.25,0.5,0.5,0.5],[3,2,0,1,0.75,0.5,0.5,0.5]]}}]'::jsonb, 3, TRUE, 1),
  ('sim-29', 'simulation', 'muito avançado', 6, 'Abstração elevada', '{"cells":[{"structure":"Out_In","entities":[[3,4,0,2,0.5,0.5,1,1],[5,5,1,0,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[4,4,0,2,0.5,0.5,1,1],[4,5,1,0,0.58,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[5,4,0,2,0.5,0.5,1,1],[3,5,1,0,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[2,4,0,7,0.5,0.5,1,1],[4,5,0,0,0.58,0.42,0.15,0.15],[4,4,8,6,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[3,4,0,7,0.5,0.5,1,1],[3,5,0,0,0.58,0.58,0.15,0.15],[3,4,8,6,0.42,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[4,4,0,7,0.5,0.5,1,1],[2,5,0,0,0.42,0.42,0.15,0.15],[2,4,8,6,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[2,5,0,3,0.5,0.5,1,1],[3,2,0,0,0.58,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[3,5,0,3,0.5,0.5,1,1],[2,2,0,0,0.58,0.58,0.15,0.15]]}]}'::jsonb, '[{"id":"op-0-sim-29","panel":{"structure":"Out_In","entities":[[4,5,0,3,0.5,0.5,1,1],[5,2,0,0,0.42,0.58,0.15,0.15],[5,2,0,0,0.42,0.42,0.15,0.15],[5,2,0,0,0.58,0.58,0.15,0.15],[5,2,0,0,0.58,0.42,0.15,0.15]]}},{"id":"op-1-sim-29","panel":{"structure":"Out_In","entities":[[4,5,0,3,0.5,0.5,1,1],[1,2,0,0,0.42,0.58,0.15,0.15],[1,2,0,0,0.42,0.42,0.15,0.15],[1,2,0,0,0.58,0.58,0.15,0.15],[1,2,0,0,0.58,0.42,0.15,0.15]]}},{"id":"op-2-sim-29","panel":{"structure":"Out_In","entities":[[3,5,0,3,0.5,0.5,1,1],[1,2,0,0,0.42,0.58,0.15,0.15],[1,2,0,0,0.42,0.42,0.15,0.15],[1,2,0,0,0.58,0.58,0.15,0.15],[1,2,0,0,0.58,0.42,0.15,0.15]]}},{"id":"op-3-sim-29","panel":{"structure":"Out_In","entities":[[3,5,0,3,0.5,0.5,1,1],[5,2,0,0,0.42,0.42,0.15,0.15]]}},{"id":"op-4-sim-29","panel":{"structure":"Out_In","entities":[[4,5,0,3,0.5,0.5,1,1],[5,2,0,0,0.42,0.42,0.15,0.15]]}},{"id":"op-5-sim-29","panel":{"structure":"Out_In","entities":[[4,5,0,3,0.5,0.5,1,1],[1,2,0,0,0.42,0.42,0.15,0.15]]}}]'::jsonb, 5, TRUE, 1),
  ('sim-30', 'simulation', 'muito avançado', 6, 'Múltiplas operações simultâneas', '{"cells":[{"entities":[[1,4,0,0,0.75,0.25,0.5,0.5],[1,4,3,0,0.25,0.25,0.5,0.5]]},{"entities":[[2,0,6,5,0.75,0.25,0.5,0.5],[2,0,6,6,0.25,0.75,0.5,0.5],[2,0,7,0,0.25,0.25,0.5,0.5]]},{"entities":[[3,5,7,1,0.25,0.75,0.5,0.5],[3,5,6,0,0.25,0.25,0.5,0.5],[3,5,7,4,0.75,0.75,0.5,0.5],[3,5,5,4,0.75,0.25,0.5,0.5]]},{"entities":[[3,1,7,7,0.25,0.75,0.5,0.5],[3,1,8,1,0.75,0.75,0.5,0.5]]},{"entities":[[4,1,4,7,0.75,0.75,0.5,0.5],[4,1,5,7,0.75,0.25,0.5,0.5],[4,1,6,1,0.25,0.75,0.5,0.5]]},{"entities":[[5,3,6,2,0.25,0.25,0.5,0.5],[5,3,9,7,0.75,0.75,0.5,0.5],[5,3,0,6,0.25,0.75,0.5,0.5],[5,3,0,4,0.75,0.25,0.5,0.5]]},{"entities":[[2,4,3,4,0.25,0.25,0.5,0.5],[2,4,3,7,0.75,0.75,0.5,0.5]]},{"entities":[[3,0,2,3,0.75,0.25,0.5,0.5],[3,0,8,1,0.75,0.75,0.5,0.5],[3,0,0,4,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-30","panel":{"entities":[[4,5,0,6,0.25,0.75,0.5,0.5],[4,5,3,3,0.75,0.25,0.5,0.5]]}},{"id":"op-1-sim-30","panel":{"entities":[[1,1,3,3,0.25,0.25,0.5,0.5],[1,1,0,6,0.75,0.25,0.5,0.5],[1,1,8,6,0.75,0.75,0.5,0.5],[1,1,8,4,0.25,0.75,0.5,0.5]]}},{"id":"op-2-sim-30","panel":{"entities":[[1,1,0,6,0.25,0.75,0.5,0.5],[1,1,3,3,0.75,0.25,0.5,0.5]]}},{"id":"op-3-sim-30","panel":{"entities":[[4,5,3,3,0.25,0.25,0.5,0.5],[4,5,0,6,0.75,0.25,0.5,0.5],[4,5,8,6,0.75,0.75,0.5,0.5],[4,5,8,4,0.25,0.75,0.5,0.5]]}},{"id":"op-4-sim-30","panel":{"entities":[[1,5,0,6,0.25,0.75,0.5,0.5],[1,5,3,3,0.75,0.25,0.5,0.5]]}},{"id":"op-5-sim-30","panel":{"entities":[[4,1,0,6,0.25,0.75,0.5,0.5],[4,1,3,3,0.75,0.25,0.5,0.5]]}}]'::jsonb, 3, TRUE, 1),
  ('sim-31', 'simulation', 'muito avançado', 6, 'Composição de padrões', '{"cells":[{"structure":"Up_Down","entities":[[2,4,5,2,0.25,0.5,0.5,0.5],[1,1,2,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,0,5,2,0.25,0.5,0.5,0.5],[2,2,2,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[5,5,5,2,0.25,0.5,0.5,0.5],[3,4,2,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[5,2,1,5,0.25,0.5,0.5,0.5],[2,4,7,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,1,1,5,0.25,0.5,0.5,0.5],[3,0,7,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,4,1,5,0.25,0.5,0.5,0.5],[4,5,7,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,0,0,0,0.25,0.5,0.5,0.5],[3,4,0,3,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[5,0,0,0,0.25,0.5,0.5,0.5],[4,0,0,3,0.75,0.5,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-sim-31","panel":{"structure":"Up_Down","entities":[[5,1,0,0,0.25,0.5,0.5,0.5],[5,5,0,3,0.75,0.5,0.5,0.5]]}},{"id":"op-1-sim-31","panel":{"structure":"Up_Down","entities":[[5,1,0,0,0.25,0.5,0.5,0.5],[5,0,0,3,0.75,0.5,0.5,0.5]]}},{"id":"op-2-sim-31","panel":{"structure":"Up_Down","entities":[[2,1,0,0,0.25,0.5,0.5,0.5],[5,5,0,3,0.75,0.5,0.5,0.5]]}},{"id":"op-3-sim-31","panel":{"structure":"Up_Down","entities":[[2,1,0,0,0.25,0.5,0.5,0.5],[4,0,0,3,0.75,0.5,0.5,0.5]]}},{"id":"op-4-sim-31","panel":{"structure":"Up_Down","entities":[[2,1,0,0,0.25,0.5,0.5,0.5],[5,0,0,3,0.75,0.5,0.5,0.5]]}},{"id":"op-5-sim-31","panel":{"structure":"Up_Down","entities":[[5,1,0,0,0.25,0.5,0.5,0.5],[4,5,0,3,0.75,0.5,0.5,0.5]]}}]'::jsonb, 2, TRUE, 1),
  ('sim-32', 'simulation', 'muito avançado', 6, 'Relações espaciais', '{"cells":[{"structure":"Out_In","entities":[[3,5,0,7,0.5,0.5,1,1],[2,0,3,7,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,5,0,7,0.5,0.5,1,1],[3,0,3,7,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,5,0,7,0.5,0.5,1,1],[4,0,3,7,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,5,0,4,0.5,0.5,1,1],[2,3,7,1,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,5,0,4,0.5,0.5,1,1],[3,3,7,1,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,5,0,4,0.5,0.5,1,1],[4,3,7,1,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,4,0,0,0.5,0.5,1,1],[3,1,2,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[4,1,2,6,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-sim-32","panel":{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[3,1,2,6,0.5,0.5,0.33,0.33]]}},{"id":"op-1-sim-32","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[5,1,2,6,0.5,0.5,0.33,0.33]]}},{"id":"op-2-sim-32","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[2,1,2,6,0.5,0.5,0.33,0.33]]}},{"id":"op-3-sim-32","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[4,1,2,6,0.5,0.5,0.33,0.33]]}},{"id":"op-4-sim-32","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[3,1,2,6,0.5,0.5,0.33,0.33]]}},{"id":"op-5-sim-32","panel":{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[5,1,2,6,0.5,0.5,0.33,0.33]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-01', 'exercise', 'muito fácil', 1, 'Continuidade', '{"cells":[{"entities":[[3,2,6,6,0.5,0.5,1,1]]},{"entities":[[3,2,6,6,0.5,0.5,1,1]]},{"entities":[[3,2,6,6,0.5,0.5,1,1]]},{"entities":[[2,3,3,6,0.5,0.5,1,1]]},{"entities":[[2,3,3,6,0.5,0.5,1,1]]},{"entities":[[2,3,3,6,0.5,0.5,1,1]]},{"entities":[[2,4,2,1,0.5,0.5,1,1]]},{"entities":[[2,4,2,1,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-01","panel":{"entities":[[2,4,2,1,0.5,0.5,1,1]]}},{"id":"op-1-ex-01","panel":{"entities":[[2,1,2,1,0.5,0.5,1,1]]}},{"id":"op-2-ex-01","panel":{"entities":[[2,0,2,1,0.5,0.5,1,1]]}},{"id":"op-3-ex-01","panel":{"entities":[[2,5,2,1,0.5,0.5,1,1]]}},{"id":"op-4-ex-01","panel":{"entities":[[2,3,2,1,0.5,0.5,1,1]]}},{"id":"op-5-ex-01","panel":{"entities":[[3,4,2,1,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-02', 'exercise', 'muito fácil', 1, 'Quantidade', '{"cells":[{"entities":[[5,3,3,6,0.25,0.75,0.5,0.5]]},{"entities":[[2,2,8,6,0.25,0.75,0.5,0.5],[4,3,5,5,0.75,0.25,0.5,0.5]]},{"entities":[[5,2,9,6,0.25,0.25,0.5,0.5],[4,0,2,1,0.75,0.25,0.5,0.5],[2,0,1,3,0.25,0.75,0.5,0.5]]},{"entities":[[1,4,9,2,0.75,0.25,0.5,0.5]]},{"entities":[[2,3,0,2,0.75,0.25,0.5,0.5],[1,1,0,2,0.75,0.75,0.5,0.5]]},{"entities":[[5,4,2,6,0.25,0.25,0.5,0.5],[2,0,1,5,0.75,0.25,0.5,0.5],[3,3,9,3,0.75,0.75,0.5,0.5]]},{"entities":[[4,1,3,3,0.25,0.75,0.5,0.5]]},{"entities":[[1,5,1,1,0.75,0.25,0.5,0.5],[5,4,8,3,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-02","panel":{"entities":[[1,3,9,1,0.75,0.75,0.5,0.5]]}},{"id":"op-1-ex-02","panel":{"entities":[[3,2,2,6,0.75,0.75,0.5,0.5],[1,3,9,1,0.25,0.25,0.5,0.5]]}},{"id":"op-2-ex-02","panel":{"entities":[[2,3,5,1,0.25,0.75,0.5,0.5],[3,2,2,6,0.25,0.25,0.5,0.5]]}},{"id":"op-3-ex-02","panel":{"entities":[[3,2,2,6,0.25,0.75,0.5,0.5],[1,3,9,1,0.75,0.75,0.5,0.5]]}},{"id":"op-4-ex-02","panel":{"entities":[[2,3,5,1,0.25,0.75,0.5,0.5],[1,3,9,1,0.75,0.25,0.5,0.5],[3,2,2,6,0.25,0.25,0.5,0.5]]}},{"id":"op-5-ex-02","panel":{"entities":[[3,2,2,6,0.25,0.75,0.5,0.5]]}}]'::jsonb, 4, TRUE, 1),
  ('ex-03', 'exercise', 'muito fácil', 1, 'Posição', '{"cells":[{"entities":[[1,0,4,0,0.25,0.75,0.5,0.5],[4,2,7,2,0.75,0.75,0.5,0.5]]},{"entities":[[1,0,4,0,0.75,0.25,0.5,0.5],[4,2,7,2,0.25,0.25,0.5,0.5]]},{"entities":[[1,0,4,0,0.75,0.75,0.5,0.5],[4,2,7,2,0.25,0.75,0.5,0.5]]},{"entities":[[4,2,4,6,0.25,0.75,0.5,0.5],[3,3,9,4,0.75,0.25,0.5,0.5]]},{"entities":[[4,2,4,6,0.75,0.25,0.5,0.5],[3,3,9,4,0.75,0.75,0.5,0.5]]},{"entities":[[4,2,4,6,0.75,0.75,0.5,0.5],[3,3,9,4,0.25,0.25,0.5,0.5]]},{"entities":[[3,5,9,3,0.25,0.25,0.5,0.5],[5,0,8,0,0.75,0.75,0.5,0.5]]},{"entities":[[3,5,9,3,0.25,0.75,0.5,0.5],[5,0,8,0,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-03","panel":{"entities":[[3,5,9,3,0.25,0.75,0.5,0.5]]}},{"id":"op-1-ex-03","panel":{"entities":[[3,5,9,3,0.75,0.25,0.5,0.5],[5,0,8,0,0.25,0.75,0.5,0.5]]}},{"id":"op-2-ex-03","panel":{"entities":[[3,5,9,3,0.75,0.75,0.5,0.5],[5,0,8,0,0.75,0.25,0.5,0.5],[3,5,9,3,0.25,0.75,0.5,0.5]]}},{"id":"op-3-ex-03","panel":{"entities":[[3,5,9,3,0.75,0.25,0.5,0.5],[5,0,8,0,0.25,0.25,0.5,0.5],[5,0,8,0,0.75,0.75,0.5,0.5]]}},{"id":"op-4-ex-03","panel":{"entities":[[3,5,9,3,0.25,0.25,0.5,0.5]]}},{"id":"op-5-ex-03","panel":{"entities":[[3,5,9,3,0.75,0.25,0.5,0.5],[5,0,8,0,0.25,0.25,0.5,0.5]]}}]'::jsonb, 1, TRUE, 1),
  ('ex-04', 'exercise', 'muito fácil', 1, 'Sequência básica', '{"cells":[{"entities":[[3,3,0,1,0.5,0.5,1,1]]},{"entities":[[4,3,0,1,0.5,0.5,1,1]]},{"entities":[[5,3,0,1,0.5,0.5,1,1]]},{"entities":[[3,4,1,6,0.5,0.5,1,1]]},{"entities":[[4,4,1,6,0.5,0.5,1,1]]},{"entities":[[5,4,1,6,0.5,0.5,1,1]]},{"entities":[[1,5,4,2,0.5,0.5,1,1]]},{"entities":[[2,5,4,2,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-04","panel":{"entities":[[3,5,4,2,0.5,0.5,1,1]]}},{"id":"op-1-ex-04","panel":{"entities":[[4,5,4,2,0.5,0.5,1,1]]}},{"id":"op-2-ex-04","panel":{"entities":[[4,5,4,2,0.5,0.5,1,1]]}},{"id":"op-3-ex-04","panel":{"entities":[[1,5,4,2,0.5,0.5,1,1]]}},{"id":"op-4-ex-04","panel":{"entities":[[1,5,4,2,0.5,0.5,1,1]]}},{"id":"op-5-ex-04","panel":{"entities":[[2,5,4,2,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-05', 'exercise', 'muito fácil', 1, 'Forma', '{"cells":[{"entities":[[2,3,6,3,0.5,0.5,1,1]]},{"entities":[[3,3,6,3,0.5,0.5,1,1]]},{"entities":[[4,3,6,3,0.5,0.5,1,1]]},{"entities":[[2,5,0,6,0.5,0.5,1,1]]},{"entities":[[3,5,0,6,0.5,0.5,1,1]]},{"entities":[[4,5,0,6,0.5,0.5,1,1]]},{"entities":[[3,4,5,0,0.5,0.5,1,1]]},{"entities":[[4,4,5,0,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-05","panel":{"entities":[[5,4,5,0,0.5,0.5,1,1]]}},{"id":"op-1-ex-05","panel":{"entities":[[3,4,5,0,0.5,0.5,1,1]]}},{"id":"op-2-ex-05","panel":{"entities":[[2,4,5,0,0.5,0.5,1,1]]}},{"id":"op-3-ex-05","panel":{"entities":[[4,4,5,0,0.5,0.5,1,1]]}},{"id":"op-4-ex-05","panel":{"entities":[[2,4,5,0,0.5,0.5,1,1]]}},{"id":"op-5-ex-05","panel":{"entities":[[1,4,5,0,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-06', 'exercise', 'muito fácil', 1, 'Tamanho', '{"cells":[{"entities":[[4,0,6,6,0.5,0.5,1,1]]},{"entities":[[4,1,6,6,0.5,0.5,1,1]]},{"entities":[[4,2,6,6,0.5,0.5,1,1]]},{"entities":[[5,3,4,3,0.5,0.5,1,1]]},{"entities":[[5,4,4,3,0.5,0.5,1,1]]},{"entities":[[5,5,4,3,0.5,0.5,1,1]]},{"entities":[[3,3,0,2,0.5,0.5,1,1]]},{"entities":[[3,4,0,2,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-06","panel":{"entities":[[3,5,0,2,0.5,0.5,1,1]]}},{"id":"op-1-ex-06","panel":{"entities":[[3,2,0,2,0.5,0.5,1,1]]}},{"id":"op-2-ex-06","panel":{"entities":[[3,4,0,2,0.5,0.5,1,1]]}},{"id":"op-3-ex-06","panel":{"entities":[[3,1,0,2,0.5,0.5,1,1]]}},{"id":"op-4-ex-06","panel":{"entities":[[3,2,0,2,0.5,0.5,1,1]]}},{"id":"op-5-ex-06","panel":{"entities":[[3,2,0,2,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-07', 'exercise', 'fácil', 2, 'Alternância', '{"cells":[{"entities":[[4,0,9,5,0.5,0.5,1,1]]},{"entities":[[1,0,9,5,0.5,0.5,1,1]]},{"entities":[[3,0,9,5,0.5,0.5,1,1]]},{"entities":[[3,0,6,4,0.5,0.5,1,1]]},{"entities":[[4,0,6,4,0.5,0.5,1,1]]},{"entities":[[1,0,6,4,0.5,0.5,1,1]]},{"entities":[[1,1,7,1,0.5,0.5,1,1]]},{"entities":[[3,1,7,1,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-07","panel":{"entities":[[4,1,7,1,0.5,0.5,1,1]]}},{"id":"op-1-ex-07","panel":{"entities":[[2,1,7,1,0.5,0.5,1,1]]}},{"id":"op-2-ex-07","panel":{"entities":[[5,1,7,1,0.5,0.5,1,1]]}},{"id":"op-3-ex-07","panel":{"entities":[[3,1,7,1,0.5,0.5,1,1]]}},{"id":"op-4-ex-07","panel":{"entities":[[5,1,7,1,0.5,0.5,1,1]]}},{"id":"op-5-ex-07","panel":{"entities":[[1,1,7,1,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-08', 'exercise', 'fácil', 2, 'Rotação simples', '{"cells":[{"entities":[[4,1,7,4,0.25,0.25,0.5,0.5]]},{"entities":[[4,1,7,4,0.25,0.75,0.5,0.5]]},{"entities":[[4,1,7,4,0.75,0.25,0.5,0.5]]},{"entities":[[5,4,9,7,0.25,0.25,0.5,0.5],[3,5,4,4,0.75,0.25,0.5,0.5]]},{"entities":[[5,4,9,7,0.25,0.75,0.5,0.5],[3,5,4,4,0.75,0.75,0.5,0.5]]},{"entities":[[5,4,9,7,0.75,0.25,0.5,0.5],[3,5,4,4,0.25,0.25,0.5,0.5]]},{"entities":[[1,3,4,5,0.75,0.75,0.5,0.5]]},{"entities":[[1,3,4,5,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-08","panel":{"entities":[[1,3,4,5,0.25,0.25,0.5,0.5],[1,3,4,5,0.75,0.25,0.5,0.5]]}},{"id":"op-1-ex-08","panel":{"entities":[[1,3,4,5,0.75,0.75,0.5,0.5],[1,3,4,5,0.75,0.25,0.5,0.5]]}},{"id":"op-2-ex-08","panel":{"entities":[[1,3,4,5,0.25,0.25,0.5,0.5]]}},{"id":"op-3-ex-08","panel":{"entities":[[1,3,4,5,0.75,0.25,0.5,0.5],[1,3,4,5,0.25,0.25,0.5,0.5],[1,3,4,5,0.75,0.75,0.5,0.5],[1,3,4,5,0.25,0.75,0.5,0.5]]}},{"id":"op-4-ex-08","panel":{"entities":[[1,3,4,5,0.75,0.25,0.5,0.5],[1,3,4,5,0.75,0.75,0.5,0.5],[1,3,4,5,0.25,0.75,0.5,0.5]]}},{"id":"op-5-ex-08","panel":{"entities":[[1,3,4,5,0.25,0.75,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-09', 'exercise', 'fácil', 2, 'Sequência de quantidade', '{"cells":[{"entities":[[5,3,3,4,0.25,0.75,0.5,0.5]]},{"entities":[[1,3,3,4,0.75,0.25,0.5,0.5],[1,0,5,3,0.25,0.75,0.5,0.5]]},{"entities":[[5,2,6,4,0.75,0.25,0.5,0.5],[1,5,3,6,0.75,0.75,0.5,0.5],[3,3,6,2,0.25,0.25,0.5,0.5]]},{"entities":[[5,5,7,6,0.75,0.25,0.5,0.5],[4,4,4,3,0.25,0.75,0.5,0.5]]},{"entities":[[5,0,2,0,0.75,0.75,0.5,0.5],[1,4,3,3,0.75,0.25,0.5,0.5],[1,5,9,1,0.25,0.75,0.5,0.5]]},{"entities":[[5,2,0,4,0.75,0.75,0.5,0.5],[1,3,0,0,0.25,0.75,0.5,0.5],[3,0,2,5,0.75,0.25,0.5,0.5],[4,0,7,3,0.25,0.25,0.5,0.5]]},{"entities":[[3,2,0,7,0.25,0.75,0.5,0.5],[2,3,5,3,0.25,0.25,0.5,0.5]]},{"entities":[[2,4,1,2,0.25,0.75,0.5,0.5],[1,5,7,5,0.25,0.25,0.5,0.5],[5,4,5,2,0.75,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-09","panel":{"entities":[[2,5,3,7,0.25,0.25,0.5,0.5]]}},{"id":"op-1-ex-09","panel":{"entities":[[3,4,1,0,0.75,0.75,0.5,0.5],[5,0,0,7,0.25,0.75,0.5,0.5],[2,5,3,7,0.25,0.25,0.5,0.5]]}},{"id":"op-2-ex-09","panel":{"entities":[[5,0,0,7,0.25,0.75,0.5,0.5],[2,5,3,7,0.75,0.75,0.5,0.5]]}},{"id":"op-3-ex-09","panel":{"entities":[[2,5,3,7,0.75,0.75,0.5,0.5],[3,4,1,0,0.75,0.25,0.5,0.5],[2,1,3,7,0.25,0.75,0.5,0.5],[5,0,0,7,0.25,0.25,0.5,0.5]]}},{"id":"op-4-ex-09","panel":{"entities":[[2,1,3,7,0.75,0.25,0.5,0.5],[3,4,1,0,0.25,0.75,0.5,0.5],[5,0,0,7,0.75,0.75,0.5,0.5]]}},{"id":"op-5-ex-09","panel":{"entities":[[3,4,1,0,0.75,0.25,0.5,0.5]]}}]'::jsonb, 3, TRUE, 1),
  ('ex-10', 'exercise', 'fácil', 2, 'Relações entre elementos', '{"cells":[{"structure":"Left_Right","entities":[[3,5,3,3,0.5,0.25,0.5,0.5],[3,5,0,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,5,3,3,0.5,0.25,0.5,0.5],[4,5,0,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,5,3,3,0.5,0.25,0.5,0.5],[5,5,0,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[2,3,8,4,0.5,0.25,0.5,0.5],[3,5,8,2,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,3,8,4,0.5,0.25,0.5,0.5],[4,5,8,2,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,3,8,4,0.5,0.25,0.5,0.5],[5,5,8,2,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[1,1,6,1,0.5,0.25,0.5,0.5],[2,4,7,1,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[2,1,6,1,0.5,0.25,0.5,0.5],[3,4,7,1,0.5,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-10","panel":{"structure":"Left_Right","entities":[[3,1,6,1,0.5,0.25,0.5,0.5],[2,4,7,1,0.5,0.75,0.5,0.5]]}},{"id":"op-1-ex-10","panel":{"structure":"Left_Right","entities":[[5,1,6,1,0.5,0.25,0.5,0.5],[2,4,7,1,0.5,0.75,0.5,0.5]]}},{"id":"op-2-ex-10","panel":{"structure":"Left_Right","entities":[[3,1,6,1,0.5,0.25,0.5,0.5],[5,4,7,1,0.5,0.75,0.5,0.5]]}},{"id":"op-3-ex-10","panel":{"structure":"Left_Right","entities":[[5,1,6,1,0.5,0.25,0.5,0.5],[3,4,7,1,0.5,0.75,0.5,0.5]]}},{"id":"op-4-ex-10","panel":{"structure":"Left_Right","entities":[[5,1,6,1,0.5,0.25,0.5,0.5],[5,4,7,1,0.5,0.75,0.5,0.5]]}},{"id":"op-5-ex-10","panel":{"structure":"Left_Right","entities":[[3,1,6,1,0.5,0.25,0.5,0.5],[4,4,7,1,0.5,0.75,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-11', 'exercise', 'fácil', 2, 'Transformação de forma', '{"cells":[{"entities":[[2,4,2,3,0.5,0.5,1,1]]},{"entities":[[3,4,2,3,0.5,0.5,1,1]]},{"entities":[[4,4,2,3,0.5,0.5,1,1]]},{"entities":[[3,5,2,6,0.5,0.5,1,1]]},{"entities":[[4,5,2,6,0.5,0.5,1,1]]},{"entities":[[5,5,2,6,0.5,0.5,1,1]]},{"entities":[[3,5,7,4,0.5,0.5,1,1]]},{"entities":[[4,5,7,4,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-11","panel":{"entities":[[2,5,7,4,0.5,0.5,1,1]]}},{"id":"op-1-ex-11","panel":{"entities":[[5,5,7,4,0.5,0.5,1,1]]}},{"id":"op-2-ex-11","panel":{"entities":[[1,5,7,4,0.5,0.5,1,1]]}},{"id":"op-3-ex-11","panel":{"entities":[[1,5,7,4,0.5,0.5,1,1]]}},{"id":"op-4-ex-11","panel":{"entities":[[3,5,7,4,0.5,0.5,1,1]]}},{"id":"op-5-ex-11","panel":{"entities":[[4,5,7,4,0.5,0.5,1,1]]}}]'::jsonb, 1, TRUE, 1),
  ('ex-12', 'exercise', 'fácil', 2, 'Combinação de padrões', '{"cells":[{"entities":[[1,4,2,1,0.5,0.5,1,1]]},{"entities":[[3,4,2,1,0.5,0.5,1,1]]},{"entities":[[2,4,2,1,0.5,0.5,1,1]]},{"entities":[[3,5,3,5,0.5,0.5,1,1]]},{"entities":[[2,5,3,5,0.5,0.5,1,1]]},{"entities":[[1,5,3,5,0.5,0.5,1,1]]},{"entities":[[2,1,4,4,0.5,0.5,1,1]]},{"entities":[[1,1,4,4,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-12","panel":{"entities":[[1,1,4,4,0.5,0.5,1,1]]}},{"id":"op-1-ex-12","panel":{"entities":[[1,1,4,4,0.5,0.5,1,1]]}},{"id":"op-2-ex-12","panel":{"entities":[[4,1,4,4,0.5,0.5,1,1]]}},{"id":"op-3-ex-12","panel":{"entities":[[2,1,4,4,0.5,0.5,1,1]]}},{"id":"op-4-ex-12","panel":{"entities":[[5,1,4,4,0.5,0.5,1,1]]}},{"id":"op-5-ex-12","panel":{"entities":[[3,1,4,4,0.5,0.5,1,1]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-13', 'exercise', 'fácil/intermediário', 3, 'Duas regras', '{"cells":[{"entities":[[2,0,0,2,0.25,0.75,0.5,0.5],[2,4,1,0,0.75,0.25,0.5,0.5]]},{"entities":[[3,2,4,5,0.25,0.25,0.5,0.5],[3,3,4,2,0.75,0.25,0.5,0.5],[3,1,6,6,0.75,0.75,0.5,0.5]]},{"entities":[[4,2,0,3,0.75,0.25,0.5,0.5],[4,2,6,3,0.75,0.75,0.5,0.5],[4,4,4,2,0.25,0.75,0.5,0.5],[4,2,7,4,0.25,0.25,0.5,0.5]]},{"entities":[[2,1,1,2,0.25,0.75,0.5,0.5]]},{"entities":[[3,0,0,3,0.75,0.75,0.5,0.5],[3,2,5,0,0.25,0.75,0.5,0.5]]},{"entities":[[4,3,5,1,0.75,0.25,0.5,0.5],[4,5,1,0,0.25,0.75,0.5,0.5],[4,4,3,5,0.75,0.75,0.5,0.5]]},{"entities":[[3,1,6,1,0.25,0.75,0.5,0.5]]},{"entities":[[4,1,2,2,0.75,0.25,0.5,0.5],[4,4,4,0,0.75,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-13","panel":{"entities":[[5,4,2,3,0.75,0.25,0.5,0.5],[5,2,8,6,0.25,0.75,0.5,0.5],[5,2,2,4,0.75,0.75,0.5,0.5]]}},{"id":"op-1-ex-13","panel":{"entities":[[1,4,2,3,0.75,0.25,0.5,0.5],[1,2,8,6,0.25,0.75,0.5,0.5],[1,2,2,4,0.75,0.75,0.5,0.5]]}},{"id":"op-2-ex-13","panel":{"entities":[[5,4,2,3,0.75,0.25,0.5,0.5],[5,2,8,6,0.25,0.75,0.5,0.5],[5,2,2,4,0.25,0.25,0.5,0.5],[5,4,2,3,0.75,0.75,0.5,0.5]]}},{"id":"op-3-ex-13","panel":{"entities":[[5,2,8,6,0.75,0.25,0.5,0.5],[5,4,2,3,0.25,0.75,0.5,0.5]]}},{"id":"op-4-ex-13","panel":{"entities":[[1,4,2,3,0.75,0.25,0.5,0.5],[1,2,8,6,0.25,0.75,0.5,0.5],[1,2,2,4,0.25,0.25,0.5,0.5],[1,4,2,3,0.75,0.75,0.5,0.5]]}},{"id":"op-5-ex-13","panel":{"entities":[[1,2,8,6,0.75,0.25,0.5,0.5],[1,4,2,3,0.25,0.75,0.5,0.5]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-14', 'exercise', 'fácil/intermediário', 3, 'Relações entre linhas', '{"cells":[{"entities":[[2,3,9,7,0.5,0.5,1,1]]},{"entities":[[3,4,9,7,0.5,0.5,1,1]]},{"entities":[[4,5,9,7,0.5,0.5,1,1]]},{"entities":[[3,0,9,5,0.5,0.5,1,1]]},{"entities":[[4,1,9,5,0.5,0.5,1,1]]},{"entities":[[5,2,9,5,0.5,0.5,1,1]]},{"entities":[[3,0,5,5,0.5,0.5,1,1]]},{"entities":[[4,1,5,5,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-14","panel":{"entities":[[4,5,5,5,0.5,0.5,1,1]]}},{"id":"op-1-ex-14","panel":{"entities":[[5,2,5,5,0.5,0.5,1,1]]}},{"id":"op-2-ex-14","panel":{"entities":[[5,5,5,5,0.5,0.5,1,1]]}},{"id":"op-3-ex-14","panel":{"entities":[[5,5,5,5,0.5,0.5,1,1]]}},{"id":"op-4-ex-14","panel":{"entities":[[5,1,5,5,0.5,0.5,1,1]]}},{"id":"op-5-ex-14","panel":{"entities":[[4,2,5,5,0.5,0.5,1,1]]}}]'::jsonb, 1, TRUE, 1),
  ('ex-15', 'exercise', 'fácil/intermediário', 3, 'Composição/decomposição', '{"cells":[{"structure":"Left_Right","entities":[[5,1,9,0,0.5,0.25,0.5,0.5],[1,2,3,3,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,1,9,0,0.5,0.25,0.5,0.5],[5,2,3,3,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,1,9,0,0.5,0.25,0.5,0.5],[2,2,3,3,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[3,2,7,1,0.5,0.25,0.5,0.5],[5,2,3,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,2,7,1,0.5,0.25,0.5,0.5],[2,2,3,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,2,7,1,0.5,0.25,0.5,0.5],[1,2,3,0,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[4,3,2,1,0.5,0.25,0.5,0.5],[2,4,8,1,0.5,0.75,0.5,0.5]]},{"structure":"Left_Right","entities":[[5,3,2,1,0.5,0.25,0.5,0.5],[1,4,8,1,0.5,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-15","panel":{"structure":"Left_Right","entities":[[4,3,2,1,0.5,0.25,0.5,0.5],[5,4,8,1,0.5,0.75,0.5,0.5]]}},{"id":"op-1-ex-15","panel":{"structure":"Left_Right","entities":[[3,3,2,1,0.5,0.25,0.5,0.5],[3,4,8,1,0.5,0.75,0.5,0.5]]}},{"id":"op-2-ex-15","panel":{"structure":"Left_Right","entities":[[4,3,2,1,0.5,0.25,0.5,0.5],[1,4,8,1,0.5,0.75,0.5,0.5]]}},{"id":"op-3-ex-15","panel":{"structure":"Left_Right","entities":[[4,3,2,1,0.5,0.25,0.5,0.5],[3,4,8,1,0.5,0.75,0.5,0.5]]}},{"id":"op-4-ex-15","panel":{"structure":"Left_Right","entities":[[4,3,2,1,0.5,0.25,0.5,0.5],[2,4,8,1,0.5,0.75,0.5,0.5]]}},{"id":"op-5-ex-15","panel":{"structure":"Left_Right","entities":[[3,3,2,1,0.5,0.25,0.5,0.5],[5,4,8,1,0.5,0.75,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-16', 'exercise', 'fácil/intermediário', 3, 'Duas regras', '{"cells":[{"entities":[[1,1,7,5,0.5,0.5,1,1]]},{"entities":[[4,2,7,5,0.5,0.5,1,1]]},{"entities":[[3,3,7,5,0.5,0.5,1,1]]},{"entities":[[3,2,6,4,0.5,0.5,1,1]]},{"entities":[[1,3,6,4,0.5,0.5,1,1]]},{"entities":[[4,4,6,4,0.5,0.5,1,1]]},{"entities":[[4,1,5,2,0.5,0.5,1,1]]},{"entities":[[3,2,5,2,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-16","panel":{"entities":[[1,3,5,2,0.5,0.5,1,1]]}},{"id":"op-1-ex-16","panel":{"entities":[[1,5,5,2,0.5,0.5,1,1]]}},{"id":"op-2-ex-16","panel":{"entities":[[1,1,5,2,0.5,0.5,1,1]]}},{"id":"op-3-ex-16","panel":{"entities":[[1,1,5,2,0.5,0.5,1,1]]}},{"id":"op-4-ex-16","panel":{"entities":[[2,3,5,2,0.5,0.5,1,1]]}},{"id":"op-5-ex-16","panel":{"entities":[[2,1,5,2,0.5,0.5,1,1]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-17', 'exercise', 'fácil/intermediário', 3, 'Regras simultâneas', '{"cells":[{"structure":"Out_In","entities":[[2,4,0,0,0.5,0.5,1,1],[3,0,2,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[4,0,2,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,4,0,0,0.5,0.5,1,1],[5,0,2,3,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,5,0,3,0.5,0.5,1,1],[3,4,3,0,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,5,0,3,0.5,0.5,1,1],[4,4,3,0,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,5,0,3,0.5,0.5,1,1],[5,4,3,0,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,3,0,0,0.5,0.5,1,1],[3,1,7,0,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,3,0,0,0.5,0.5,1,1],[4,1,7,0,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-ex-17","panel":{"structure":"Out_In","entities":[[4,3,0,0,0.5,0.5,1,1],[5,1,7,0,0.5,0.5,0.33,0.33]]}},{"id":"op-1-ex-17","panel":{"structure":"Out_In","entities":[[2,3,0,0,0.5,0.5,1,1],[2,1,7,0,0.5,0.5,0.33,0.33]]}},{"id":"op-2-ex-17","panel":{"structure":"Out_In","entities":[[2,3,0,0,0.5,0.5,1,1],[5,1,7,0,0.5,0.5,0.33,0.33]]}},{"id":"op-3-ex-17","panel":{"structure":"Out_In","entities":[[4,3,0,0,0.5,0.5,1,1],[3,1,7,0,0.5,0.5,0.33,0.33]]}},{"id":"op-4-ex-17","panel":{"structure":"Out_In","entities":[[2,3,0,0,0.5,0.5,1,1],[2,1,7,0,0.5,0.5,0.33,0.33]]}},{"id":"op-5-ex-17","panel":{"structure":"Out_In","entities":[[4,3,0,0,0.5,0.5,1,1],[2,1,7,0,0.5,0.5,0.33,0.33]]}}]'::jsonb, 0, TRUE, 1),
  ('ex-18', 'exercise', 'fácil/intermediário', 3, 'Composição', '{"cells":[{"entities":[[2,3,5,6,0.75,0.25,0.5,0.5],[2,3,5,6,0.25,0.25,0.5,0.5]]},{"entities":[[2,3,5,6,0.25,0.75,0.5,0.5],[2,3,5,6,0.25,0.25,0.5,0.5]]},{"entities":[[2,3,5,6,0.75,0.25,0.5,0.5],[2,3,5,6,0.75,0.75,0.5,0.5],[2,3,5,6,0.25,0.75,0.5,0.5],[2,3,5,6,0.25,0.25,0.5,0.5]]},{"entities":[[3,5,9,1,0.25,0.75,0.5,0.5]]},{"entities":[[3,5,9,1,0.75,0.25,0.5,0.5],[3,5,9,1,0.75,0.75,0.5,0.5],[3,5,9,1,0.25,0.25,0.5,0.5]]},{"entities":[[3,5,9,1,0.25,0.25,0.5,0.5],[3,5,9,1,0.75,0.75,0.5,0.5],[3,5,9,1,0.25,0.75,0.5,0.5],[3,5,9,1,0.75,0.25,0.5,0.5]]},{"entities":[[1,5,4,7,0.25,0.25,0.5,0.5]]},{"entities":[[1,5,4,7,0.25,0.25,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-18","panel":{"entities":[[1,5,4,7,0.75,0.75,0.5,0.5]]}},{"id":"op-1-ex-18","panel":{"entities":[[1,5,4,7,0.75,0.75,0.5,0.5],[1,5,4,7,0.75,0.25,0.5,0.5],[1,5,4,7,0.25,0.25,0.5,0.5]]}},{"id":"op-2-ex-18","panel":{"entities":[[1,5,4,7,0.25,0.75,0.5,0.5],[1,5,4,7,0.75,0.75,0.5,0.5],[1,5,4,7,0.25,0.25,0.5,0.5]]}},{"id":"op-3-ex-18","panel":{"entities":[[1,5,4,7,0.75,0.25,0.5,0.5]]}},{"id":"op-4-ex-18","panel":{"entities":[[1,5,4,7,0.25,0.75,0.5,0.5]]}},{"id":"op-5-ex-18","panel":{"entities":[[1,5,4,7,0.25,0.75,0.5,0.5],[1,5,4,7,0.25,0.25,0.5,0.5]]}}]'::jsonb, 5, TRUE, 1),
  ('ex-19', 'exercise', 'intermediário', 4, 'Múltiplas regras', '{"cells":[{"structure":"Out_In","entities":[[1,4,0,2,0.5,0.5,1,1],[5,1,1,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,4,0,2,0.5,0.5,1,1],[4,1,1,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,4,0,2,0.5,0.5,1,1],[3,1,1,6,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[5,1,9,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[4,5,0,0,0.5,0.5,1,1],[4,1,9,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[5,5,0,0,0.5,0.5,1,1],[3,1,9,4,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[1,4,0,0,0.5,0.5,1,1],[5,1,6,5,0.5,0.5,0.33,0.33]]},{"structure":"Out_In","entities":[[2,4,0,0,0.5,0.5,1,1],[4,1,6,5,0.5,0.5,0.33,0.33]]}]}'::jsonb, '[{"id":"op-0-ex-19","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[3,1,6,5,0.5,0.5,0.33,0.33]]}},{"id":"op-1-ex-19","panel":{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[3,1,6,5,0.5,0.5,0.33,0.33]]}},{"id":"op-2-ex-19","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[4,1,6,5,0.5,0.5,0.33,0.33]]}},{"id":"op-3-ex-19","panel":{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[4,1,6,5,0.5,0.5,0.33,0.33]]}},{"id":"op-4-ex-19","panel":{"structure":"Out_In","entities":[[5,4,0,0,0.5,0.5,1,1],[4,1,6,5,0.5,0.5,0.33,0.33]]}},{"id":"op-5-ex-19","panel":{"structure":"Out_In","entities":[[3,4,0,0,0.5,0.5,1,1],[4,1,6,5,0.5,0.5,0.33,0.33]]}}]'::jsonb, 1, TRUE, 1),
  ('ex-20', 'exercise', 'intermediário', 4, 'Transformações combinadas', '{"cells":[{"entities":[[1,3,9,5,0.25,0.25,0.5,0.5],[1,1,1,6,0.75,0.25,0.5,0.5]]},{"entities":[[2,3,9,5,0.25,0.75,0.5,0.5],[2,1,1,6,0.75,0.75,0.5,0.5]]},{"entities":[[3,3,9,5,0.75,0.25,0.5,0.5],[3,1,1,6,0.25,0.25,0.5,0.5]]},{"entities":[[1,3,2,2,0.25,0.75,0.5,0.5]]},{"entities":[[2,3,2,2,0.75,0.25,0.5,0.5]]},{"entities":[[3,3,2,2,0.75,0.75,0.5,0.5]]},{"entities":[[2,2,4,6,0.25,0.25,0.5,0.5]]},{"entities":[[3,2,4,6,0.25,0.75,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-20","panel":{"entities":[[4,2,4,6,0.25,0.25,0.5,0.5],[4,2,4,6,0.75,0.75,0.5,0.5]]}},{"id":"op-1-ex-20","panel":{"entities":[[3,2,4,6,0.25,0.25,0.5,0.5]]}},{"id":"op-2-ex-20","panel":{"entities":[[3,2,4,6,0.25,0.25,0.5,0.5],[3,2,4,6,0.75,0.75,0.5,0.5]]}},{"id":"op-3-ex-20","panel":{"entities":[[3,2,4,6,0.75,0.25,0.5,0.5]]}},{"id":"op-4-ex-20","panel":{"entities":[[4,2,4,6,0.75,0.25,0.5,0.5]]}},{"id":"op-5-ex-20","panel":{"entities":[[4,2,4,6,0.25,0.25,0.5,0.5]]}}]'::jsonb, 4, TRUE, 1),
  ('ex-21', 'exercise', 'intermediário', 4, 'Regras cruzadas', '{"cells":[{"structure":"Out_In","entities":[[2,3,0,5,0.5,0.5,1,1],[2,5,9,1,0.58,0.58,0.15,0.15],[2,5,8,1,0.42,0.58,0.15,0.15],[2,4,3,7,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[3,3,0,5,0.5,0.5,1,1],[3,5,9,1,0.58,0.58,0.15,0.15],[3,5,8,1,0.42,0.58,0.15,0.15],[3,4,3,7,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[4,3,0,5,0.5,0.5,1,1],[4,5,9,1,0.58,0.58,0.15,0.15],[4,5,8,1,0.42,0.58,0.15,0.15],[4,4,3,7,0.42,0.42,0.15,0.15]]},{"structure":"Out_In","entities":[[1,4,0,6,0.5,0.5,1,1],[1,3,2,0,0.58,0.42,0.15,0.15],[1,4,9,5,0.42,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[2,4,0,6,0.5,0.5,1,1],[2,3,2,0,0.58,0.42,0.15,0.15],[2,4,9,5,0.42,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[3,4,0,6,0.5,0.5,1,1],[3,3,2,0,0.58,0.42,0.15,0.15],[3,4,9,5,0.42,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[2,5,0,0,0.5,0.5,1,1],[3,3,6,7,0.58,0.42,0.15,0.15],[3,3,2,6,0.58,0.58,0.15,0.15],[3,4,8,2,0.42,0.42,0.15,0.15],[3,2,9,6,0.42,0.58,0.15,0.15]]},{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[4,3,6,7,0.58,0.42,0.15,0.15],[4,3,2,6,0.58,0.58,0.15,0.15],[4,4,8,2,0.42,0.42,0.15,0.15],[4,2,9,6,0.42,0.58,0.15,0.15]]}]}'::jsonb, '[{"id":"op-0-ex-21","panel":{"structure":"Out_In","entities":[[4,5,0,0,0.5,0.5,1,1],[3,3,6,7,0.58,0.42,0.15,0.15],[3,3,2,6,0.58,0.58,0.15,0.15],[3,4,8,2,0.42,0.42,0.15,0.15],[3,2,9,6,0.42,0.58,0.15,0.15]]}},{"id":"op-1-ex-21","panel":{"structure":"Out_In","entities":[[4,5,0,0,0.5,0.5,1,1],[5,3,6,7,0.58,0.42,0.15,0.15],[5,3,2,6,0.58,0.58,0.15,0.15],[5,4,8,2,0.42,0.42,0.15,0.15],[5,2,9,6,0.42,0.58,0.15,0.15]]}},{"id":"op-2-ex-21","panel":{"structure":"Out_In","entities":[[4,5,0,0,0.5,0.5,1,1],[3,3,6,7,0.58,0.58,0.15,0.15]]}},{"id":"op-3-ex-21","panel":{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[5,3,6,7,0.58,0.58,0.15,0.15]]}},{"id":"op-4-ex-21","panel":{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[5,3,6,7,0.58,0.42,0.15,0.15],[5,3,2,6,0.58,0.58,0.15,0.15],[5,4,8,2,0.42,0.42,0.15,0.15],[5,2,9,6,0.42,0.58,0.15,0.15]]}},{"id":"op-5-ex-21","panel":{"structure":"Out_In","entities":[[3,5,0,0,0.5,0.5,1,1],[3,3,6,7,0.58,0.42,0.15,0.15],[3,3,2,6,0.58,0.58,0.15,0.15],[3,4,8,2,0.42,0.42,0.15,0.15],[3,2,9,6,0.42,0.58,0.15,0.15]]}}]'::jsonb, 1, TRUE, 1),
  ('ex-22', 'exercise', 'intermediário', 4, 'Relações entre linhas e colunas', '{"cells":[{"structure":"Up_Down","entities":[[3,1,8,3,0.25,0.5,0.5,0.5],[1,1,9,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[4,2,8,3,0.25,0.5,0.5,0.5],[2,2,9,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[5,3,8,3,0.25,0.5,0.5,0.5],[3,3,9,4,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[1,2,6,0,0.25,0.5,0.5,0.5],[2,3,6,1,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,3,6,0,0.25,0.5,0.5,0.5],[3,4,6,1,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[3,4,6,0,0.25,0.5,0.5,0.5],[4,5,6,1,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[1,1,5,2,0.25,0.5,0.5,0.5],[3,3,5,7,0.75,0.5,0.5,0.5]]},{"structure":"Up_Down","entities":[[2,2,5,2,0.25,0.5,0.5,0.5],[4,4,5,7,0.75,0.5,0.5,0.5]]}]}'::jsonb, '[{"id":"op-0-ex-22","panel":{"structure":"Up_Down","entities":[[4,3,5,2,0.25,0.5,0.5,0.5],[5,4,5,7,0.75,0.5,0.5,0.5]]}},{"id":"op-1-ex-22","panel":{"structure":"Up_Down","entities":[[3,3,5,2,0.25,0.5,0.5,0.5],[1,4,5,7,0.75,0.5,0.5,0.5]]}},{"id":"op-2-ex-22","panel":{"structure":"Up_Down","entities":[[4,3,5,2,0.25,0.5,0.5,0.5],[1,5,5,7,0.75,0.5,0.5,0.5]]}},{"id":"op-3-ex-22","panel":{"structure":"Up_Down","entities":[[4,3,5,2,0.25,0.5,0.5,0.5],[5,5,5,7,0.75,0.5,0.5,0.5]]}},{"id":"op-4-ex-22","panel":{"structure":"Up_Down","entities":[[3,3,5,2,0.25,0.5,0.5,0.5],[5,5,5,7,0.75,0.5,0.5,0.5]]}},{"id":"op-5-ex-22","panel":{"structure":"Up_Down","entities":[[3,3,5,2,0.25,0.5,0.5,0.5],[5,4,5,7,0.75,0.5,0.5,0.5]]}}]'::jsonb, 4, TRUE, 1),
  ('ex-23', 'exercise', 'intermediário', 4, 'Progressão dupla', '{"cells":[{"entities":[[2,0,2,7,0.5,0.5,1,1]]},{"entities":[[4,1,2,7,0.5,0.5,1,1]]},{"entities":[[1,2,2,7,0.5,0.5,1,1]]},{"entities":[[4,2,9,5,0.5,0.5,1,1]]},{"entities":[[1,3,9,5,0.5,0.5,1,1]]},{"entities":[[2,4,9,5,0.5,0.5,1,1]]},{"entities":[[1,2,9,6,0.5,0.5,1,1]]},{"entities":[[2,3,9,6,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-23","panel":{"entities":[[5,3,9,6,0.5,0.5,1,1]]}},{"id":"op-1-ex-23","panel":{"entities":[[5,1,9,6,0.5,0.5,1,1]]}},{"id":"op-2-ex-23","panel":{"entities":[[5,2,9,6,0.5,0.5,1,1]]}},{"id":"op-3-ex-23","panel":{"entities":[[4,4,9,6,0.5,0.5,1,1]]}},{"id":"op-4-ex-23","panel":{"entities":[[4,2,9,6,0.5,0.5,1,1]]}},{"id":"op-5-ex-23","panel":{"entities":[[5,4,9,6,0.5,0.5,1,1]]}}]'::jsonb, 3, TRUE, 1),
  ('ex-24', 'exercise', 'intermediário', 4, 'Distribuição', '{"cells":[{"entities":[[1,1,3,3,0.5,0.5,1,1]]},{"entities":[[4,2,3,3,0.5,0.5,1,1]]},{"entities":[[3,3,3,3,0.5,0.5,1,1]]},{"entities":[[3,3,8,2,0.5,0.5,1,1]]},{"entities":[[1,4,8,2,0.5,0.5,1,1]]},{"entities":[[4,5,8,2,0.5,0.5,1,1]]},{"entities":[[4,0,3,0,0.5,0.5,1,1]]},{"entities":[[3,1,3,0,0.5,0.5,1,1]]}]}'::jsonb, '[{"id":"op-0-ex-24","panel":{"entities":[[1,1,3,0,0.5,0.5,1,1]]}},{"id":"op-1-ex-24","panel":{"entities":[[2,2,3,0,0.5,0.5,1,1]]}},{"id":"op-2-ex-24","panel":{"entities":[[1,2,3,0,0.5,0.5,1,1]]}},{"id":"op-3-ex-24","panel":{"entities":[[1,1,3,0,0.5,0.5,1,1]]}},{"id":"op-4-ex-24","panel":{"entities":[[1,3,3,0,0.5,0.5,1,1]]}},{"id":"op-5-ex-24","panel":{"entities":[[2,1,3,0,0.5,0.5,1,1]]}}]'::jsonb, 2, TRUE, 1)
ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  difficulty = EXCLUDED.difficulty,
  difficulty_order = EXCLUDED.difficulty_order,
  category = EXCLUDED.category,
  matrix_data = EXCLUDED.matrix_data,
  options = EXCLUDED.options,
  correct_option = EXCLUDED.correct_option,
  active = EXCLUDED.active,
  version = 1;
