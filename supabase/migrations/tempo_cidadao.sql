-- Tempo de Cidadão + Presença + Perfil público da Cidadela
-- Depende de: cidadela_rpg.sql, cidadela_chat_missoes.sql, sov_bank.sql.
-- Regra econômica: cada 1 HORA de tempo ativo = +10 SOV via SOV Bank,
-- idempotente por hora (chave tempo:{user}:{hora}) — nunca duplica.
-- Idempotente: seguro rodar mais de uma vez no SQL Editor.

-- =========================================================
-- 1. Colunas de identidade no perfil da Cidadela (nome/bio)
-- =========================================================
-- cidadela_atualizar_status já lia cidadela_perfis.nome sem a coluna existir
-- (bug latente de produção) — criada aqui oficialmente.
ALTER TABLE cidadela_perfis ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE cidadela_perfis ADD COLUMN IF NOT EXISTS bio TEXT;

-- =========================================================
-- 2. Tabela de Tempo de Cidadão
-- =========================================================
CREATE TABLE IF NOT EXISTS cidadela_tempo (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  /** Segundos de tempo ativo acumulados (validados no servidor). */
  tempo_total_segundos BIGINT NOT NULL DEFAULT 0,
  /** Horas completas já recompensadas (idempotência da recompensa). */
  horas_recompensadas INTEGER NOT NULL DEFAULT 0,
  /** Data de entrada na Cidadela (informação separada do tempo). */
  primeira_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_atividade TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cidadela_tempo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tempo leitura publica" ON cidadela_tempo;
CREATE POLICY "Tempo leitura publica" ON cidadela_tempo FOR SELECT USING (true);
-- Sem escrita direta: todo tempo entra via RPC validada.

-- =========================================================
-- 3. RPC: heartbeat de tempo (acumula + recompensa por hora)
-- =========================================================
-- O cliente envia os segundos reais decorridos (≤120 por chamada, travado no
-- servidor). O servidor acumula e, ao completar cada hora, paga +10 SOV pelo
-- SOV Bank com chave idempotente — refresh/reconexão/multi-aba não duplicam
-- (a recompensa depende só de horas_recompensadas, que é estado do servidor).
CREATE OR REPLACE FUNCTION tempo_cidadao_heartbeat(p_segundos INTEGER DEFAULT 60)
RETURNS TABLE (
  tempo_total_segundos BIGINT,
  horas_recompensadas INTEGER,
  horas_pagas_agora INTEGER,
  online BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_seg INTEGER;
  v_total BIGINT;
  v_horas_completas INTEGER;
  v_row cidadela_tempo;
  v_novas INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  -- Trava anti-manipulação: o cliente nunca pode reportar mais de 2 min por
  -- chamada; valores negativos/ausentes são descartados.
  v_seg := GREATEST(0, LEAST(COALESCE(p_segundos, 0), 120));

  INSERT INTO cidadela_tempo (user_id, tempo_total_segundos, ultima_atividade)
  VALUES (v_uid, v_seg, now())
  ON CONFLICT (user_id) DO UPDATE SET
    tempo_total_segundos = cidadela_tempo.tempo_total_segundos + v_seg,
    ultima_atividade = now()
  RETURNING * INTO v_row;

  -- Presença: o heartbeat também mantém o status online (reuso da tabela de
  -- presença existente — sem sistema paralelo).
  PERFORM cidadela_atualizar_status('online');

  v_total := v_row.tempo_total_segundos;
  v_horas_completas := FLOOR(v_total / 3600.0)::INTEGER;
  v_novas := GREATEST(0, v_horas_completas - v_row.horas_recompensadas);

  IF v_novas > 0 THEN
    -- Uma transação por hora recém-completada, chave tempo:{user}:{hora}.
    FOR i IN (v_row.horas_recompensadas + 1)..v_horas_completas LOOP
      BEGIN
        PERFORM sov_bank_registrar(
          v_uid, 10, 'reward',
          'Recompensa por Tempo de Cidadão',
          'system', 'tempo_cidadao',
          'tempo:' || v_uid::TEXT || ':' || i::TEXT,
          jsonb_build_object('hora_numero', i, 'tempo_total_segundos', v_total)
        );
      EXCEPTION WHEN OTHERS THEN
        -- Teto de emissão atingido ou SOV Bank indisponível: a hora NÃO é
        -- marcada como paga — será tentada de novo no próximo heartbeat.
        RETURN QUERY SELECT v_total, v_row.horas_recompensadas, 0, TRUE;
        RETURN;
      END;
    END LOOP;

    UPDATE cidadela_tempo
    SET horas_recompensadas = v_horas_completas
    WHERE user_id = v_uid
    RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT
    v_row.tempo_total_segundos, v_row.horas_recompensadas, v_novas, TRUE;
END;
$$;

-- =========================================================
-- 4. RPC: perfil público de um cidadão (§9)
-- =========================================================
-- Apenas dados apropriados para exposição pública. Nada de SOV detalhado,
-- histórico ou dados privados.
CREATE OR REPLACE FUNCTION cidadela_perfil_publico(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil cidadela_perfis;
  v_tempo cidadela_tempo;
  v_botao RECORD;
  v_online BOOLEAN;
  v_missoes INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT * INTO v_perfil FROM cidadela_perfis WHERE user_id = p_user_id;
  SELECT * INTO v_tempo FROM cidadela_tempo WHERE user_id = p_user_id;
  SELECT partidas_jogadas, partidas_vencidas, pontos_soberania
    INTO v_botao FROM botao_usuarios WHERE user_id = p_user_id;

  -- Online = heartbeat nos últimos 3 minutos (presença real, não "sessão aberta").
  SELECT EXISTS (
    SELECT 1 FROM cidadela_jogadores_online
    WHERE user_id = p_user_id
      AND status <> 'offline'
      AND ultima_atividade > now() - interval '3 minutes'
  ) INTO v_online;

  SELECT COUNT(*) INTO v_missoes FROM cidadela_missoes_diarias
  WHERE user_id = p_user_id AND status = 'resgatada';

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'nome', COALESCE(v_perfil.nome,
              (SELECT raw_user_meta_data->>'nome' FROM auth.users WHERE id = p_user_id),
              'Cidadão'),
    'bio', v_perfil.bio,
    'profissao_atual', v_perfil.profissao_atual,
    'nivel_cidadela', COALESCE(v_perfil.nivel_cidadela, 1),
    'reputacao_global', COALESCE(v_perfil.reputacao_global, 0),
    'entrou_em', COALESCE(v_tempo.primeira_entrada, v_perfil.created_at),
    'tempo_total_segundos', COALESCE(v_tempo.tempo_total_segundos, 0),
    'online', v_online,
    'partidas', COALESCE(v_botao.partidas_jogadas, 0),
    'vitorias', COALESCE(v_botao.partidas_vencidas, 0),
    'missoes_resgatadas', v_missoes
  );
END;
$$;

-- =========================================================
-- 5. RPC: edição do próprio perfil (somente campos permitidos, §8)
-- =========================================================
-- SOV, tempo de cidadão, decisões e histórico NUNCA são editáveis — são
-- derivados do sistema.
CREATE OR REPLACE FUNCTION cidadela_atualizar_perfil(
  p_nome TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL
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
  IF p_nome IS NOT NULL AND (length(btrim(p_nome)) = 0 OR length(p_nome) > 40) THEN
    RAISE EXCEPTION 'nome invalido (1-40 caracteres)';
  END IF;
  IF p_bio IS NOT NULL AND length(p_bio) > 280 THEN
    RAISE EXCEPTION 'bio invalida (ate 280 caracteres)';
  END IF;

  PERFORM obter_perfil_cidadela();

  UPDATE cidadela_perfis
  SET nome = COALESCE(NULLIF(btrim(p_nome), ''), nome),
      bio = COALESCE(p_bio, bio),
      updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  -- Mantém o nome visível na presença/grupo sincronizado.
  UPDATE cidadela_jogadores_online SET nome = v_row.nome
  WHERE user_id = v_uid AND v_row.nome IS NOT NULL;

  RETURN to_jsonb(v_row);
END;
$$;

-- =========================================================
-- 6. Índices e permissões
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_tempo_ultima_atividade ON cidadela_tempo(ultima_atividade);

GRANT EXECUTE ON FUNCTION tempo_cidadao_heartbeat(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cidadela_perfil_publico(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cidadela_atualizar_perfil(TEXT, TEXT) TO authenticated;

-- =========================================================
-- 7. Grupo Cidadela — lista de MEMBROS (fictício, 100% interno)
-- =========================================================
-- A RPC legada cidadela_listar_jogadores filtra 30 minutos — quem sai da aba
-- some da lista em vez de aparecer como ○ OFFLINE. Esta RPC lista TODOS os
-- cidadãos registrados (a comunidade fictícia), computando presença real
-- (heartbeat ≤3min = ● ONLINE) e ordenando online primeiro.
CREATE OR REPLACE FUNCTION cidadela_listar_membros()
RETURNS TABLE (
  user_id UUID,
  nome TEXT,
  profissao_atual TEXT,
  ultima_atividade TIMESTAMPTZ,
  status TEXT,
  online BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    j.user_id,
    j.nome,
    j.profissao_atual,
    j.ultima_atividade,
    CASE WHEN j.ultima_atividade > now() - interval '3 minutes' THEN 'online'
         ELSE 'offline' END AS status,
    (j.ultima_atividade > now() - interval '3 minutes') AS online
  FROM cidadela_jogadores_online j
  ORDER BY online DESC, j.ultima_atividade DESC;
$$;

GRANT EXECUTE ON FUNCTION cidadela_listar_membros() TO authenticated;
