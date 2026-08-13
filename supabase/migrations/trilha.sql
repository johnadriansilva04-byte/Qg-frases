-- SQL COMPLETO PARA JOGO DE TRILHA ONLINE
-- Sistema de Mesas com Sincronização em Tempo Real
-- Execute este SQL único no Supabase

-- Tabela principal de mesas de trilha para jogos online
CREATE TABLE IF NOT EXISTS public.mesas_trilha (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id                  TEXT NOT NULL UNIQUE,

  jogador_1_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jogador_2_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  dificuldade              TEXT NOT NULL DEFAULT 'recruta',
  
  -- Estado do jogo
  board                    INTEGER[] NOT NULL DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  hand_p1                  INTEGER NOT NULL DEFAULT 9,
  hand_p2                  INTEGER NOT NULL DEFAULT 9,
  phase                    TEXT NOT NULL DEFAULT 'placing',
  turn                     INTEGER NOT NULL DEFAULT 1,
  
  -- Último movimento
  last_move_from           INTEGER,
  last_move_to             INTEGER,
  last_move_remove         INTEGER,
  
  -- Captura pendente
  pending_capture          BOOLEAN NOT NULL DEFAULT false,
  
  -- Status da partida
  status                   TEXT NOT NULL DEFAULT 'aguardando'
                             CHECK (status IN ('aguardando','em_andamento','finalizado')),
  
  -- Relógio autoritativo do servidor (10 min por partida)
  duracao_segundos         INTEGER NOT NULL DEFAULT 600,
  iniciado_em              TIMESTAMPTZ,
  tempo_restante_segundos  INTEGER NOT NULL DEFAULT 600,
  
  -- Anti-reset / ordenação de jogadas
  seq_jogada               BIGINT NOT NULL DEFAULT 0,
  
  -- Finalização
  vencedor_id              UUID REFERENCES auth.users(id),
  motivo_finalizacao       TEXT,
  
  -- Presença online
  jogador_1_online         BOOLEAN NOT NULL DEFAULT false,
  jogador_2_online         BOOLEAN NOT NULL DEFAULT false,
  ultimo_heartbeat_j1      TIMESTAMPTZ,
  ultimo_heartbeat_j2      TIMESTAMPTZ,
  
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mesas_trilha
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_mesa_id ON public.mesas_trilha(mesa_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_status ON public.mesas_trilha(status);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_j1 ON public.mesas_trilha(jogador_1_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_j2 ON public.mesas_trilha(jogador_2_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_dificuldade ON public.mesas_trilha(dificuldade);

-- Permissões para mesas_trilha
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas_trilha TO authenticated;
GRANT SELECT ON public.mesas_trilha TO anon;
GRANT ALL ON public.mesas_trilha TO service_role;

-- RLS para mesas_trilha
ALTER TABLE public.mesas_trilha ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mesas_trilha
DROP POLICY IF EXISTS "mesas_trilha_select_publico" ON public.mesas_trilha;
CREATE POLICY "mesas_trilha_select_publico" ON public.mesas_trilha
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "mesas_trilha_insert_dono" ON public.mesas_trilha;
CREATE POLICY "mesas_trilha_insert_dono" ON public.mesas_trilha
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = jogador_1_id);

DROP POLICY IF EXISTS "mesas_trilha_update_participante" ON public.mesas_trilha;
CREATE POLICY "mesas_trilha_update_participante" ON public.mesas_trilha
  FOR UPDATE TO authenticated
  USING (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id)
  WITH CHECK (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id);

DROP POLICY IF EXISTS "mesas_trilha_delete_participante" ON public.mesas_trilha;
CREATE POLICY "mesas_trilha_delete_participante" ON public.mesas_trilha
  FOR DELETE TO authenticated
  USING (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id);

-- ============================================================================
-- FUNÇÕES PARA CONTROLE DE PRESENÇA E INÍCIO DE PARTIDA
-- ============================================================================

-- Trigger de atualizado_em
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_mesa_trilha()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_atualizar_mesa_trilha ON public.mesas_trilha;
CREATE TRIGGER trigger_atualizar_mesa_trilha
BEFORE UPDATE ON public.mesas_trilha
FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_mesa_trilha();

-- Função para criar mesa
CREATE OR REPLACE FUNCTION public.criar_mesa_trilha(p_dificuldade TEXT DEFAULT 'recruta')
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mesa_id TEXT;
  v_uid     UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  v_mesa_id := 'trilha_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  INSERT INTO public.mesas_trilha AS m
    (mesa_id, jogador_1_id, dificuldade, status, jogador_1_online, ultimo_heartbeat_j1)
  VALUES (v_mesa_id, v_uid, p_dificuldade, 'aguardando', true, now());

  RETURN v_mesa_id;
END; $$;

-- Entra como jogador 2 e já inicia a partida (atômico, sem corrida).
CREATE OR REPLACE FUNCTION public.entrar_mesa_trilha(p_mesa_id TEXT)
RETURNS public.mesas_trilha
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_mesa  public.mesas_trilha;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT m.* INTO v_mesa
  FROM public.mesas_trilha m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;

  -- Reconexão: já sou participante, apenas devolvo o estado atual.
  IF v_uid = v_mesa.jogador_1_id OR v_uid = v_mesa.jogador_2_id THEN
    RETURN public.registrar_heartbeat_mesa_trilha(p_mesa_id);
  END IF;

  IF v_mesa.jogador_2_id IS NOT NULL THEN RAISE EXCEPTION 'mesa cheia'; END IF;
  IF v_mesa.status <> 'aguardando' THEN RAISE EXCEPTION 'mesa indisponivel'; END IF;

  UPDATE public.mesas_trilha m
     SET jogador_2_id            = v_uid,
         jogador_2_online        = true,
         ultimo_heartbeat_j2     = now(),
         jogador_1_online        = true,
         status                  = 'em_andamento',
         iniciado_em             = now(),
         tempo_restante_segundos = m.duracao_segundos
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para registrar heartbeat de jogador (manter presença)
CREATE OR REPLACE FUNCTION public.registrar_heartbeat_mesa_trilha(p_mesa_id TEXT)
RETURNS public.mesas_trilha
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_trilha;
BEGIN
  UPDATE public.mesas_trilha m
     SET jogador_1_online    = CASE WHEN m.jogador_1_id = v_uid THEN true ELSE m.jogador_1_online END,
         jogador_2_online    = CASE WHEN m.jogador_2_id = v_uid THEN true ELSE m.jogador_2_online END,
         ultimo_heartbeat_j1 = CASE WHEN m.jogador_1_id = v_uid THEN now() ELSE m.ultimo_heartbeat_j1 END,
         ultimo_heartbeat_j2 = CASE WHEN m.jogador_2_id = v_uid THEN now() ELSE m.ultimo_heartbeat_j2 END
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- ============================================================================
-- FUNÇÕES PARA CONTROLE DE TURNOS E JOGADAS
-- ============================================================================

-- Relógio autoritativo (derivado de iniciado_em)
CREATE OR REPLACE FUNCTION public.tempo_restante_mesa_trilha(p_mesa_id TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
           0,
           m.duracao_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(m.iniciado_em, now()))))::INT
         )
  FROM public.mesas_trilha m
  WHERE m.mesa_id = p_mesa_id;
$$;

-- Sincroniza a coluna e finaliza quem chegou a 00:00
CREATE OR REPLACE FUNCTION public.tick_mesas_trilha()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_afetadas INTEGER := 0;
BEGIN
  UPDATE public.mesas_trilha m
     SET tempo_restante_segundos = GREATEST(
           0, m.duracao_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - m.iniciado_em)))::INT)
   WHERE m.status = 'em_andamento' AND m.iniciado_em IS NOT NULL;

  UPDATE public.mesas_trilha m
     SET status             = 'finalizado',
         motivo_finalizacao = 'tempo_esgotado',
         vencedor_id        = CASE
                                WHEN m.turn = 2 THEN m.jogador_1_id
                                WHEN m.turn = 1 THEN m.jogador_2_id
                                ELSE NULL
                              END
   WHERE m.status = 'em_andamento'
     AND m.tempo_restante_segundos <= 0;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  RETURN v_afetadas;
END; $$;

-- JOGADA + TROCA DE TURNO
CREATE OR REPLACE FUNCTION public.registrar_jogada_trilha(
  p_mesa_id       TEXT,
  p_from          INTEGER,
  p_to            INTEGER,
  p_remove        INTEGER DEFAULT NULL,
  p_board         INTEGER[] DEFAULT NULL,
  p_hand_p1       INTEGER DEFAULT NULL,
  p_hand_p2       INTEGER DEFAULT NULL,
  p_phase         TEXT DEFAULT NULL,
  p_pending_capture BOOLEAN DEFAULT NULL
)
RETURNS public.mesas_trilha
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_mesa       public.mesas_trilha;
  v_proximo_id UUID;
  v_restante   INTEGER;
  v_player_num INTEGER;
BEGIN
  SELECT m.* INTO v_mesa
  FROM public.mesas_trilha m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL           THEN RAISE EXCEPTION 'mesa inexistente'; END IF;
  IF v_mesa.status <> 'em_andamento' THEN RAISE EXCEPTION 'partida nao esta em andamento'; END IF;
  
  -- Determinar número do jogador
  v_player_num := CASE WHEN v_uid = v_mesa.jogador_1_id THEN 1 WHEN v_uid = v_mesa.jogador_2_id THEN 2 ELSE NULL END;
  IF v_player_num IS NULL THEN RAISE EXCEPTION 'nao e participante'; END IF;
  IF v_player_num <> v_mesa.turn THEN RAISE EXCEPTION 'nao e seu turno'; END IF;

  v_restante := GREATEST(0, v_mesa.duracao_segundos
                  - FLOOR(EXTRACT(EPOCH FROM (now() - v_mesa.iniciado_em)))::INT);
  IF v_restante <= 0 THEN
    PERFORM public.tick_mesas_trilha();
    RAISE EXCEPTION 'tempo esgotado';
  END IF;

  v_proximo_id := CASE
    WHEN v_mesa.turn = 1 THEN v_mesa.jogador_2_id
    ELSE v_mesa.jogador_1_id
  END;

  UPDATE public.mesas_trilha m
     SET turn                    = CASE WHEN m.turn = 1 THEN 2 ELSE 1 END,
         seq_jogada              = m.seq_jogada + 1,
         board                   = COALESCE(p_board, m.board),
         hand_p1                 = COALESCE(p_hand_p1, m.hand_p1),
         hand_p2                 = COALESCE(p_hand_p2, m.hand_p2),
         phase                   = COALESCE(p_phase, m.phase),
         pending_capture         = COALESCE(p_pending_capture, m.pending_capture),
         last_move_from          = p_from,
         last_move_to            = p_to,
         last_move_remove        = p_remove,
         tempo_restante_segundos = v_restante
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para finalizar partida por vitória
CREATE OR REPLACE FUNCTION public.finalizar_partida_trilha(p_mesa_id TEXT, p_vencedor_id UUID, p_motivo TEXT)
RETURNS public.mesas_trilha
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_trilha;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  UPDATE public.mesas_trilha m
     SET status             = 'finalizado',
         vencedor_id        = p_vencedor_id,
         motivo_finalizacao = p_motivo,
         turno              = NULL
   WHERE m.mesa_id = p_mesa_id
     AND (m.jogador_1_id = v_uid OR m.jogador_2_id = v_uid)
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para abandonar partida
CREATE OR REPLACE FUNCTION public.abandonar_partida_trilha(p_mesa_id TEXT)
RETURNS public.mesas_trilha
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_trilha;
  v_vencedor_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT m.* INTO v_mesa
  FROM public.mesas_trilha m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;
  IF v_mesa.status = 'finalizado' THEN RAISE EXCEPTION 'partida ja finalizada'; END IF;

  -- O outro jogador vence
  v_vencedor_id := CASE
    WHEN v_uid = v_mesa.jogador_1_id THEN v_mesa.jogador_2_id
    ELSE v_mesa.jogador_1_id
  END;

  UPDATE public.mesas_trilha m
     SET status             = 'finalizado',
         vencedor_id        = v_vencedor_id,
         motivo_finalizacao = 'abandono',
         turno              = NULL
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para listar mesas disponíveis
CREATE OR REPLACE FUNCTION public.listar_mesas_trilha_disponive(p_dificuldade TEXT DEFAULT NULL)
RETURNS TABLE (
  mesa_id TEXT,
  dificuldade TEXT,
  jogador_1_nome TEXT,
  criado_em TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    m.mesa_id,
    m.dificuldade,
    COALESCE(u.nome, 'Anônimo') as jogador_1_nome,
    m.criado_em
  FROM public.mesas_trilha m
  LEFT JOIN public.botao_usuarios u ON u.user_id = m.jogador_1_id
  WHERE m.status = 'aguardando'
    AND (p_dificuldade IS NULL OR m.dificuldade = p_dificuldade)
  ORDER BY m.criado_em DESC
  LIMIT 20;
$$;

-- ============================================================================
-- FUNÇÃO PARA LIMPEZA AUTOMÁTICA
-- ============================================================================

-- Função para limpar mesas antigas (mais de 1 hora)
CREATE OR REPLACE FUNCTION limpar_mesas_trilha_antigas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Finalizar mesas em jogo há mais de 1 hora
    UPDATE mesas_trilha
    SET status = 'finalizado',
        motivo_finalizacao = 'tempo_esgotado',
        vencedor_id = CASE
            WHEN turn = 2 THEN jogador_1_id
            WHEN turn = 1 THEN jogador_2_id
            ELSE NULL
        END,
        turno = NULL
    WHERE status = 'em_andamento'
      AND criado_em < now() - interval '1 hour';

    -- Remover mesas aguardando há mais de 2 horas
    DELETE FROM mesas_trilha
    WHERE status = 'aguardando'
      AND criado_em < now() - interval '2 hours';
END;
$$;
