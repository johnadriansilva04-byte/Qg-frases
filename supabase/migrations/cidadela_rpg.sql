-- Cidadela dos Clássicos — Sistema de Profissões + Memória do Mundo
-- Identidade persistente do jogador (profissão) e estado global compartilhado.
-- Idempotente: seguro rodar mais de uma vez no SQL Editor.

-- =========================================================
-- 1. Perfil da Cidadela (identidade do jogador)
-- =========================================================

CREATE TABLE IF NOT EXISTS cidadela_perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profissao_atual TEXT,
  profissoes_desbloqueadas TEXT[] NOT NULL DEFAULT '{}',
  reputacao_global INTEGER NOT NULL DEFAULT 0,
  nivel_cidadela INTEGER NOT NULL DEFAULT 1,
  estado JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cidadela_perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono le proprio perfil cidadela" ON cidadela_perfis;
CREATE POLICY "Dono le proprio perfil cidadela"
  ON cidadela_perfis FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dono atualiza proprio perfil cidadela" ON cidadela_perfis;
CREATE POLICY "Dono atualiza proprio perfil cidadela"
  ON cidadela_perfis FOR UPDATE
  USING (auth.uid() = user_id);

-- =========================================================
-- 2. Memória do Mundo (estado global compartilhado)
-- =========================================================

CREATE TABLE IF NOT EXISTS cidadela_world_state (
  id TEXT PRIMARY KEY,
  clima_economico TEXT NOT NULL DEFAULT 'estavel'
    CHECK (clima_economico IN ('prospera', 'estavel', 'crise')),
  clima_social TEXT NOT NULL DEFAULT 'harmonia'
    CHECK (clima_social IN ('harmonia', 'tensao', 'conflito')),
  eventos_ativos JSONB NOT NULL DEFAULT '[]',
  descobertas_cientificas JSONB NOT NULL DEFAULT '[]',
  decisoes_globais JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cidadela_world_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "World state leitura publica" ON cidadela_world_state;
CREATE POLICY "World state leitura publica"
  ON cidadela_world_state FOR SELECT
  USING (true);

-- Sem policy de escrita para usuários: só service_role altera o mundo.

INSERT INTO cidadela_world_state (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 3. RPCs
-- =========================================================

-- Devolve (ou cria) o perfil da Cidadela do usuário autenticado.
CREATE OR REPLACE FUNCTION obter_perfil_cidadela()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row cidadela_perfis;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  INSERT INTO cidadela_perfis (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    SELECT * INTO v_row FROM cidadela_perfis WHERE user_id = v_uid;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

-- Define a profissão atual do jogador. A primeira escolha também desbloqueia
-- a profissão; trocar para uma não desbloqueada exige reputação mínima.
CREATE OR REPLACE FUNCTION escolher_profissao(p_profissao TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row cidadela_perfis;
  v_validas TEXT[] := ARRAY['tecnico', 'estudante', 'empresario', 'bibliotecario', 'pesquisador'];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF NOT (p_profissao = ANY(v_validas)) THEN
    RAISE EXCEPTION 'profissao invalida: %', p_profissao;
  END IF;

  PERFORM obter_perfil_cidadela();
  SELECT * INTO v_row FROM cidadela_perfis WHERE user_id = v_uid;

  IF NOT (p_profissao = ANY(v_row.profissoes_desbloqueadas)) THEN
    IF array_length(v_row.profissoes_desbloqueadas, 1) IS NOT NULL
       AND v_row.reputacao_global < 100 THEN
      RAISE EXCEPTION 'reputacao insuficiente para desbloquear % (minimo 100)', p_profissao;
    END IF;
    v_row.profissoes_desbloqueadas := array_append(v_row.profissoes_desbloqueadas, p_profissao);
  END IF;

  UPDATE cidadela_perfis
  SET profissao_atual = p_profissao,
      profissoes_desbloqueadas = v_row.profissoes_desbloqueadas,
      updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

-- Persiste o estado individual da profissão (JSONB) e reputação/nível.
CREATE OR REPLACE FUNCTION atualizar_estado_cidadela(
  p_estado JSONB DEFAULT NULL,
  p_reputacao_delta INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row cidadela_perfis;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  PERFORM obter_perfil_cidadela();

  UPDATE cidadela_perfis
  SET estado = CASE WHEN p_estado IS NULL THEN estado
                    ELSE estado || p_estado END,
      reputacao_global = GREATEST(0, reputacao_global + p_reputacao_delta),
      nivel_cidadela = 1 + (GREATEST(0, reputacao_global + p_reputacao_delta) / 50),
      updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

-- Leitura do estado global da Cidadela.
CREATE OR REPLACE FUNCTION obter_world_state()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(w) FROM cidadela_world_state w WHERE w.id = 'global';
$$;

GRANT EXECUTE ON FUNCTION obter_perfil_cidadela() TO authenticated;
GRANT EXECUTE ON FUNCTION escolher_profissao(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_estado_cidadela(JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_world_state() TO authenticated, anon;
