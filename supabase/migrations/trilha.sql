-- SQL COMPLETO PARA JOGO DE TRILHA ONLINE
-- Sistema de Mesas com Sincronização em Tempo Real
-- Execute este SQL único no Supabase

-- Tabela principal de mesas de trilha para jogos online
CREATE TABLE IF NOT EXISTS public.mesas_trilha (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id                  TEXT NOT NULL UNIQUE,

  jogador_1_id             UUID NOT NULL,
  jogador_2_id             UUID,

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
  
  -- Relógio autoritativo do servidor (20 min por partida)
  duracao_segundos         INTEGER NOT NULL DEFAULT 1200,
  iniciado_em              TIMESTAMPTZ,
  tempo_restante_segundos  INTEGER NOT NULL DEFAULT 600,
  
  -- Anti-reset / ordenação de jogadas
  seq_jogada               BIGINT NOT NULL DEFAULT 0,
  
  -- Finalização
  vencedor_id              UUID,
  motivo_finalizacao       TEXT,
  
  -- Presença online
  jogador_1_online         BOOLEAN NOT NULL DEFAULT false,
  jogador_2_online         BOOLEAN NOT NULL DEFAULT false,
  ultimo_heartbeat_j1      TIMESTAMPTZ,
  ultimo_heartbeat_j2      TIMESTAMPTZ,

  -- Estatísticas de captura
  captured_p1              INTEGER NOT NULL DEFAULT 0,
  captured_p2              INTEGER NOT NULL DEFAULT 0,

  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mesas_trilha
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_mesa_id ON public.mesas_trilha(mesa_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_status ON public.mesas_trilha(status);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_j1 ON public.mesas_trilha(jogador_1_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_j2 ON public.mesas_trilha(jogador_2_id);
CREATE INDEX IF NOT EXISTS idx_mesas_trilha_dificuldade ON public.mesas_trilha(dificuldade);

-- Adicionar FKs com referência correta para auth.users
ALTER TABLE public.mesas_trilha
  DROP CONSTRAINT IF EXISTS mesas_trilha_jogador_1_id_fkey,
  ADD CONSTRAINT mesas_trilha_jogador_1_id_fkey
    FOREIGN KEY (jogador_1_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mesas_trilha
  DROP CONSTRAINT IF EXISTS mesas_trilha_jogador_2_id_fkey,
  ADD CONSTRAINT mesas_trilha_jogador_2_id_fkey
    FOREIGN KEY (jogador_2_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.mesas_trilha
  DROP CONSTRAINT IF EXISTS mesas_trilha_vencedor_id_fkey,
  ADD CONSTRAINT mesas_trilha_vencedor_id_fkey
    FOREIGN KEY (vencedor_id) REFERENCES auth.users(id);

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

  -- Reconexão: já sou participante, apenas devolvo o estado atual atualizado.
  IF v_uid = v_mesa.jogador_1_id OR v_uid = v_mesa.jogador_2_id THEN
    UPDATE public.mesas_trilha m
       SET jogador_1_online    = CASE WHEN m.jogador_1_id = v_uid THEN true ELSE m.jogador_1_online END,
           jogador_2_online    = CASE WHEN m.jogador_2_id = v_uid THEN true ELSE m.jogador_2_online END,
           ultimo_heartbeat_j1 = CASE WHEN m.jogador_1_id = v_uid THEN now() ELSE m.ultimo_heartbeat_j1 END,
           ultimo_heartbeat_j2 = CASE WHEN m.jogador_2_id = v_uid THEN now() ELSE m.ultimo_heartbeat_j2 END
     WHERE m.mesa_id = p_mesa_id
    RETURNING m.* INTO v_mesa;
    RETURN v_mesa;
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
         tempo_restante_segundos = m.duracao_segundos,
         turn                    = 1,
         seq_jogada              = 0
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

-- ============================================================================
-- REGRAS AUTORITATIVAS DA TRILHA (servidor)
-- As funções abaixo validam jogadas contra o estado real da mesa:
--  * turno estrito (a captura pendente mantém o turno de quem fechou a trilha);
--  * nunca capturar a própria peça;
--  * máximo de 9 peças por jogador (reserva não pode ficar negativa nem subir);
--  * fim de jogo quando o adversário fica com 2 peças (aniquilação) ou sem
--    movimentos (bloqueio); com exatamente 3 peças ainda há "voo" livre.
-- ============================================================================

-- O nó fecha uma trilha (moinho) do jogador?
CREATE OR REPLACE FUNCTION public._trilha_mill_em(p_board INTEGER[], p_node INT, p_player INT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM (VALUES
      (0,1,2),(2,3,4),(4,5,6),(6,7,0),
      (8,9,10),(10,11,12),(12,13,14),(14,15,8),
      (16,17,18),(18,19,20),(20,21,22),(22,23,16),
      (1,9,17),(3,11,19),(5,13,21),(7,15,23)
    ) AS m(a,b,c)
    WHERE p_node IN (m.a, m.b, m.c)
      AND p_board[m.a + 1] = p_player
      AND p_board[m.b + 1] = p_player
      AND p_board[m.c + 1] = p_player
  );
$$;

-- Vizinhos (adjacências) de um nó — segue ADJACENCY em src/lib/trilha/board.ts
CREATE OR REPLACE FUNCTION public._trilha_vizinhos(p INT)
RETURNS INT[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT (CASE p
    WHEN 0 THEN ARRAY[1,7]
    WHEN 1 THEN ARRAY[0,2,9]
    WHEN 2 THEN ARRAY[1,3]
    WHEN 3 THEN ARRAY[2,4,11]
    WHEN 4 THEN ARRAY[3,5]
    WHEN 5 THEN ARRAY[4,6,13]
    WHEN 6 THEN ARRAY[5,7]
    WHEN 7 THEN ARRAY[6,0,15]
    WHEN 8 THEN ARRAY[9,15]
    WHEN 9 THEN ARRAY[8,10,1]
    WHEN 10 THEN ARRAY[9,11]
    WHEN 11 THEN ARRAY[10,12,3]
    WHEN 12 THEN ARRAY[11,13]
    WHEN 13 THEN ARRAY[12,14,5]
    WHEN 14 THEN ARRAY[13,15]
    WHEN 15 THEN ARRAY[14,8,7]
    WHEN 16 THEN ARRAY[17,23]
    WHEN 17 THEN ARRAY[16,18,9]
    WHEN 18 THEN ARRAY[17,19]
    WHEN 19 THEN ARRAY[18,20,11]
    WHEN 20 THEN ARRAY[19,21]
    WHEN 21 THEN ARRAY[20,22,13]
    WHEN 22 THEN ARRAY[21,23]
    WHEN 23 THEN ARRAY[22,16,15]
    ELSE ARRAY[]::INT[]
  END)::INT[];
$$;

-- Captura permitida? (peça inimiga fora de trilha; se todas estiverem em
-- trilha, qualquer peça inimiga pode ser removida)
CREATE OR REPLACE FUNCTION public._trilha_remove_valido(p_board INTEGER[], p_vitima INT, p_node INT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_livres INT := 0;
  v_i      INT;
BEGIN
  IF p_board[p_node + 1] IS DISTINCT FROM p_vitima THEN
    RETURN FALSE;
  END IF;
  FOR v_i IN 0..23 LOOP
    IF p_board[v_i + 1] = p_vitima AND NOT public._trilha_mill_em(p_board, v_i, p_vitima) THEN
      v_livres := v_livres + 1;
    END IF;
  END LOOP;
  IF v_livres > 0 THEN
    RETURN NOT public._trilha_mill_em(p_board, p_node, p_vitima);
  END IF;
  RETURN TRUE;
END;
$$;

-- O jogador ainda tem alguma jogada legal?
CREATE OR REPLACE FUNCTION public._trilha_tem_movimento(p_board INTEGER[], p_player INT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_count INT := 0;
  v_i     INT;
  v_j     INT;
  v_adj   INT[];
BEGIN
  SELECT count(*) INTO v_count
  FROM generate_series(0, 23) AS g
  WHERE p_board[g + 1] = p_player;

  -- Com 3 peças (ou menos) o jogador voa para qualquer casa vazia.
  IF v_count <= 3 THEN
    RETURN EXISTS (SELECT 1 FROM generate_series(0, 23) AS g WHERE p_board[g + 1] = 0);
  END IF;

  FOR v_i IN 0..23 LOOP
    IF p_board[v_i + 1] = p_player THEN
      v_adj := public._trilha_vizinhos(v_i);
      FOREACH v_j IN ARRAY v_adj LOOP
        IF p_board[v_j + 1] = 0 THEN RETURN TRUE; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

-- JOGADA + TROCA DE TURNO (autoritativo)
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
  v_uid          UUID := auth.uid();
  v_mesa         public.mesas_trilha;
  v_restante     INTEGER;
  v_player_num   INTEGER;
  v_novo_turn    INTEGER;
  v_foe          INTEGER;
  v_final        INTEGER[];
  v_com_mov      INTEGER[];
  v_mill         BOOLEAN;
  v_novo_pending BOOLEAN;
  v_phase        TEXT;
  v_hand1        INTEGER;
  v_hand2        INTEGER;
  v_vencedor     UUID;
  v_motivo       TEXT;
  v_count_foe    INTEGER;
  v_count_mover  INTEGER;
BEGIN
  SELECT m.* INTO v_mesa
  FROM public.mesas_trilha m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;
  IF v_mesa.status <> 'em_andamento' THEN RAISE EXCEPTION 'partida nao esta em andamento'; END IF;

  v_player_num := CASE WHEN v_uid = v_mesa.jogador_1_id THEN 1 WHEN v_uid = v_mesa.jogador_2_id THEN 2 ELSE NULL END;
  IF v_player_num IS NULL THEN RAISE EXCEPTION 'nao e participante'; END IF;

  -- Turno estrito. Quando a captura está pendente, o turno permanece com
  -- quem fechou a trilha até a peça inimiga ser removida.
  IF v_player_num <> v_mesa.turn THEN RAISE EXCEPTION 'nao e o seu turno'; END IF;

  v_restante := GREATEST(0, v_mesa.duracao_segundos
                  - FLOOR(EXTRACT(EPOCH FROM (now() - v_mesa.iniciado_em)))::INT);
  IF v_restante <= 0 THEN
    PERFORM public.tick_mesas_trilha();
    RAISE EXCEPTION 'tempo esgotado';
  END IF;

  v_foe := CASE WHEN v_player_num = 1 THEN 2 ELSE 1 END;

  -- O servidor é autoritativo: mãos/fase/tabuleiro são derivados do estado
  -- persistido (os parâmetros vindos do cliente são ignorados como autoridade).
  v_hand1 := v_mesa.hand_p1;
  v_hand2 := v_mesa.hand_p2;
  v_phase := v_mesa.phase;

  IF v_mesa.pending_capture THEN
    -- Completar captura pendente: repete o movimento que fechou a trilha
    -- (que pode ter sido uma colocação, p_from = NULL) e remove UMA peça
    -- inimiga. O servidor usa o tabuleiro JÁ persistido (com a trilha posta)
    -- como fonte da verdade — nunca o board enviado pelo cliente.
    IF p_remove IS NULL THEN
      RAISE EXCEPTION 'trilha fechada: informe a peca inimiga a remover';
    END IF;
    IF p_from IS DISTINCT FROM v_mesa.last_move_from
       OR p_to IS DISTINCT FROM v_mesa.last_move_to THEN
      RAISE EXCEPTION 'captura deve repetir o movimento da trilha pendente';
    END IF;
    -- A reserva NÃO muda na captura: já foi debitada quando a trilha fechou.
    IF p_remove < 0 OR p_remove > 23 THEN
      RAISE EXCEPTION 'captura invalida: casa fora do tabuleiro';
    END IF;

    -- Tabuleiro persistido (trilha formada), sem a remoção: valida o alvo.
    IF NOT public._trilha_remove_valido(v_mesa.board, v_foe, p_remove) THEN
      RAISE EXCEPTION 'captura invalida: peca nao pode ser removida (so inimigas)';
    END IF;

    v_final := v_mesa.board;
    v_final[p_remove + 1] := 0;

    v_novo_pending := false;
    v_novo_turn := v_foe;
  ELSE
    -- Jogada normal (colocação ou movimentação). O servidor reconstrói o
    -- tabuleiro a partir do estado persistido, sem confiar no board do cliente.
    IF v_phase <> 'placing' AND v_phase <> 'moving' THEN
      RAISE EXCEPTION 'fase de jogo invalida';
    END IF;

    IF v_phase = 'placing' THEN
      -- Colocação: reserva obrigatoriamente diminui em 1 (regra das 9 peças)
      IF p_from IS NOT NULL THEN
        RAISE EXCEPTION 'colocacao nao usa origem';
      END IF;
      IF v_player_num = 1 AND v_hand1 <= 0 THEN
        RAISE EXCEPTION 'reserva invalida: jogador 1 nao pode colocar mais pecas';
      END IF;
      IF v_player_num = 2 AND v_hand2 <= 0 THEN
        RAISE EXCEPTION 'reserva invalida: jogador 2 nao pode colocar mais pecas';
      END IF;
      IF p_to < 0 OR p_to > 23 OR v_mesa.board[p_to + 1] <> 0 THEN
        RAISE EXCEPTION 'colocacao invalida: casa ocupada ou fora do tabuleiro';
      END IF;

      IF v_player_num = 1 THEN v_hand1 := v_hand1 - 1; ELSE v_hand2 := v_hand2 - 1; END IF;
      v_final := v_mesa.board;
      v_final[p_to + 1] := v_player_num;
    ELSE
      -- Movimentação: reserva não muda.
      IF p_from IS NULL THEN
        RAISE EXCEPTION 'movimentacao precisa de origem';
      END IF;
      IF v_mesa.board[p_from + 1] <> v_player_num THEN
        RAISE EXCEPTION 'movimentacao invalida: origem nao possui peca sua';
      END IF;
      IF p_to < 0 OR p_to > 23 OR v_mesa.board[p_to + 1] <> 0 THEN
        RAISE EXCEPTION 'movimentacao invalida: destino ocupado ou fora';
      END IF;

      SELECT count(*) INTO v_count_mover
      FROM generate_series(0, 23) AS g
      WHERE v_mesa.board[g + 1] = v_player_num;

      -- Adjacente OU voo livre com exatamente 3 peças.
      IF v_count_mover > 3 AND NOT (p_to = ANY(public._trilha_vizinhos(p_from))) THEN
        RAISE EXCEPTION 'movimentacao invalida: destino nao adjacente';
      END IF;

      v_final := v_mesa.board;
      v_final[p_from + 1] := 0;
      v_final[p_to + 1] := v_player_num;
    END IF;

    -- Tabuleiro após o movimento e ANTES da remoção (para validar moinho/alvo)
    v_com_mov := v_final;

    v_mill := public._trilha_mill_em(v_com_mov, p_to, v_player_num);

    IF p_remove IS NOT NULL THEN
      IF NOT v_mill THEN RAISE EXCEPTION 'captura sem trilha fechada'; END IF;
      IF NOT public._trilha_remove_valido(v_com_mov, v_foe, p_remove) THEN
        RAISE EXCEPTION 'captura invalida: peca nao pode ser removida (so inimigas)';
      END IF;
      v_final[p_remove + 1] := 0;
      v_novo_pending := false;
      v_novo_turn := v_foe;
    ELSIF v_mill THEN
      -- Fechou trilha sem remover: aguarda a captura, o turno NÃO muda.
      v_novo_pending := true;
      v_novo_turn := v_player_num;
    ELSE
      v_novo_pending := false;
      v_novo_turn := v_foe;
    END IF;
  END IF;

  -- Transição de fase
  IF v_phase = 'placing' AND v_hand1 = 0 AND v_hand2 = 0 THEN
    v_phase := 'moving';
  END IF;

  -- Estatísticas de captura
  IF p_remove IS NOT NULL THEN
    IF v_player_num = 1 THEN
      UPDATE public.mesas_trilha m SET captured_p1 = captured_p1 + 1 WHERE m.mesa_id = p_mesa_id;
    ELSE
      UPDATE public.mesas_trilha m SET captured_p2 = captured_p2 + 1 WHERE m.mesa_id = p_mesa_id;
    END IF;
  END IF;

  -- Fim de jogo (apenas na fase de movimentação): adversário com 2 peças ou sem movimento
  IF v_phase = 'moving' THEN
    SELECT count(*) INTO v_count_foe
    FROM generate_series(0, 23) AS g
    WHERE v_final[g + 1] = v_novo_turn;

    IF v_count_foe <= 2 THEN
      v_vencedor := CASE WHEN v_player_num = 1 THEN v_mesa.jogador_1_id ELSE v_mesa.jogador_2_id END;
      v_motivo := 'annihilation';
    ELSIF NOT public._trilha_tem_movimento(v_final, v_novo_turn) THEN
      v_vencedor := CASE WHEN v_player_num = 1 THEN v_mesa.jogador_1_id ELSE v_mesa.jogador_2_id END;
      v_motivo := 'blockade';
    END IF;
  END IF;

  IF v_vencedor IS NOT NULL THEN
    UPDATE public.mesas_trilha m
       SET turn                    = v_novo_turn,
           seq_jogada              = m.seq_jogada + 1,
           board                   = v_final,
           hand_p1                 = v_hand1,
           hand_p2                 = v_hand2,
           phase                   = v_phase,
           pending_capture         = v_novo_pending,
           last_move_from          = p_from,
           last_move_to            = p_to,
           last_move_remove        = p_remove,
           tempo_restante_segundos = v_restante,
           status                  = 'finalizado',
           vencedor_id             = v_vencedor,
           motivo_finalizacao      = v_motivo
     WHERE m.mesa_id = p_mesa_id
    RETURNING m.* INTO v_mesa;
  ELSE
    UPDATE public.mesas_trilha m
       SET turn                    = v_novo_turn,
           seq_jogada              = m.seq_jogada + 1,
           board                   = v_final,
           hand_p1                 = v_hand1,
           hand_p2                 = v_hand2,
           phase                   = v_phase,
           pending_capture         = v_novo_pending,
           last_move_from          = p_from,
           last_move_to            = p_to,
           last_move_remove        = p_remove,
           tempo_restante_segundos = v_restante
     WHERE m.mesa_id = p_mesa_id
    RETURNING m.* INTO v_mesa;
  END IF;

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
         turn               = NULL
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
         turn               = NULL
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para listar mesas disponíveis (removida - versão atualizada abaixo com formato e nome_sala)

-- ============================================================================
-- CAMPEONATO ONLINE DE TRILHA (2026-08-27)
-- Sistema de grupos A, B, C, D com 8, 12, 16, 32 jogadores
-- ============================================================================

-- Tabela de campeonatos de trilha online
CREATE TABLE IF NOT EXISTS public.campeonatos_trilha_online (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo          TEXT NOT NULL UNIQUE,
  nome            TEXT NOT NULL DEFAULT 'Campeonato de Trilha',
  criador_id      UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'aguardando'
                  CHECK (status IN ('aguardando','em_andamento','finalizado','cancelado')),
  max_jogadores   INTEGER NOT NULL DEFAULT 8 CHECK (max_jogadores IN (8, 12, 16, 32)),
  formato         TEXT NOT NULL DEFAULT 'grupos'
                  CHECK (formato IN ('grupos','eliminacao')),
  fase            INTEGER NOT NULL DEFAULT 0,
  participantes   JSONB NOT NULL DEFAULT '[]'::JSONB,
  grupos          JSONB NOT NULL DEFAULT '[]'::JSONB,
  confrontos      JSONB NOT NULL DEFAULT '[]'::JSONB,
  rodada_atual    INTEGER NOT NULL DEFAULT 0,
  vencedor_id     UUID,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para campeonatos_trilha_online
CREATE INDEX IF NOT EXISTS idx_campeonatos_trilha_codigo ON public.campeonatos_trilha_online(codigo);
CREATE INDEX IF NOT EXISTS idx_campeonatos_trilha_status ON public.campeonatos_trilha_online(status);
CREATE INDEX IF NOT EXISTS idx_campeonatos_trilha_criador ON public.campeonatos_trilha_online(criador_id);

-- Permissões para campeonatos_trilha_online
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campeonatos_trilha_online TO authenticated;
GRANT SELECT ON public.campeonatos_trilha_online TO anon;
GRANT ALL ON public.campeonatos_trilha_online TO service_role;

-- RLS para campeonatos_trilha_online
ALTER TABLE public.campeonatos_trilha_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campeonatos_trilha_select_publico" ON public.campeonatos_trilha_online;
CREATE POLICY "campeonatos_trilha_select_publico" ON public.campeonatos_trilha_online
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campeonatos_trilha_insert_authenticated" ON public.campeonatos_trilha_online;
CREATE POLICY "campeonatos_trilha_insert_authenticated" ON public.campeonatos_trilha_online
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "campeonatos_trilha_update_participante" ON public.campeonatos_trilha_online;
CREATE POLICY "campeonatos_trilha_update_participante" ON public.campeonatos_trilha_online
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "campeonatos_trilha_delete_criador" ON public.campeonatos_trilha_online;
CREATE POLICY "campeonatos_trilha_delete_criador" ON public.campeonatos_trilha_online
  FOR DELETE TO authenticated USING (true);

-- FK para criador
ALTER TABLE public.campeonatos_trilha_online
  DROP CONSTRAINT IF EXISTS campeonatos_trilha_criador_fkey,
  ADD CONSTRAINT campeonatos_trilha_criador_fkey
    FOREIGN KEY (criador_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Função auxiliar para gerar grupos (grupos de 4 jogadores)
CREATE OR REPLACE FUNCTION public._gerar_grupos_trilha(p_ids UUID[], p_max INTEGER)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_grupos JSONB := '[]'::JSONB;
  v_grupo JSONB;
  v_grupo_nome TEXT;
  v_num_grupos INTEGER;
  v_grupo_tamanho INTEGER := 4;
  v_idx INTEGER := 0;
  v_grupo_idx INTEGER := 0;
  v_grupo_participantes JSONB := '[]'::JSONB;
BEGIN
  -- Calcula número de grupos (sempre 4 jogadores por grupo)
  v_num_grupos := CASE
    WHEN p_max = 8 THEN 2   -- 2 grupos de 4
    WHEN p_max = 12 THEN 3  -- 3 grupos de 4
    WHEN p_max = 16 THEN 4  -- 4 grupos de 4
    WHEN p_max = 32 THEN 8  -- 8 grupos de 4
    ELSE 2
  END;

  -- Embaralha os IDs
  FOR v_idx IN 0..(array_length(p_ids, 1) - 1) LOOP
    v_grupo_idx := (v_idx / v_grupo_tamanho);
    v_grupo_nome := chr(65 + v_grupo_idx); -- A, B, C, D, E, F, G, H

    -- Cria o grupo se não existir
    IF v_grupo_idx >= jsonb_array_length(v_grupos) THEN
      v_grupo := jsonb_build_object(
        'nome', v_grupo_nome,
        'participantes', '[]'::JSONB,
        'jogos', 0,
        'vitorias', 0,
        'empates', 0,
        'derrotas', 0,
        'pontos', 0
      );
      v_grupos := v_grupos || jsonb_build_array(v_grupo);
    END IF;

    -- Adiciona participante ao grupo
    v_grupo_participantes := (v_grupos[v_grupo_idx]->>'participantes')::JSONB;
    v_grupo_participantes := v_grupo_participantes || jsonb_build_array(p_ids[v_idx + 1]::TEXT);
    v_grupos := jsonb_set(v_grupos, ARRAY[v_grupo_idx]::TEXT[] || ARRAY['participantes'], v_grupo_participantes);
  END LOOP;

  RETURN v_grupos;
END;
$$;

-- Função auxiliar para gerar confrontos dos grupos
CREATE OR REPLACE FUNCTION public._gerar_confrontos_grupos_trilha(p_grupos JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_confrontos JSONB := '[]'::JSONB;
  v_grupo JSONB;
  v_participantes JSONB;
  v_i INTEGER;
  v_j INTEGER;
  v_p1 TEXT;
  v_p2 TEXT;
  v_grupo_nome TEXT;
  v_rodada INTEGER := 1;
BEGIN
  FOR v_grupo_idx IN 0..(jsonb_array_length(p_grupos) - 1) LOOP
    v_grupo := p_grupos[v_grupo_idx];
    v_grupo_nome := v_grupo->>'nome';
    v_participantes := (v_grupo->>'participantes')::JSONB;

    -- Round-robin dentro do grupo (cada um joga contra todos)
    FOR v_i IN 0..(jsonb_array_length(v_participantes) - 1) LOOP
      FOR v_j IN (v_i + 1)..(jsonb_array_length(v_participantes) - 1) LOOP
        v_p1 := v_participantes[v_i];
        v_p2 := v_participantes[v_j];

        v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
          'grupo', v_grupo_nome,
          'rodada', v_rodada,
          'j1_id', v_p1,
          'j2_id', v_p2,
          'pl_j1', 0,
          'pl_j2', 0,
          'status', 'pendente'
        ));

        v_rodada := v_rodada + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_confrontos;
END;
$$;

-- Função auxiliar para gerar eliminatórias (após fase de grupos)
CREATE OR REPLACE FUNCTION public._gerar_eliminatorias_trilha(p_classificados JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eliminitorias JSONB := '[]'::JSONB;
  v_num_participantes INTEGER;
  v_participantes TEXT[];
  v_p1 TEXT;
  v_p2 TEXT;
  v_fase INTEGER := 1;
  v_nome_fase TEXT;
  v_idx INTEGER := 0;
BEGIN
  v_num_participantes := jsonb_array_length(p_classificados);

  -- Se houver pelo menos 2 classificados, gera as eliminatórias
  IF v_num_participantes >= 2 THEN
    -- Extrai IDs dos classificados
    v_participantes := ARRAY[]::TEXT[];
    FOR v_idx IN 0..(v_num_participantes - 1) LOOP
      v_participantes := v_participantes || ARRAY[(p_classificados[v_idx]->>'user_id')];
    END LOOP;

    -- Define nome da fase baseado no número de participantes
    v_nome_fase := CASE
      WHEN v_num_participantes = 2 THEN 'Final'
      WHEN v_num_participantes = 4 THEN 'Semifinal'
      WHEN v_num_participantes = 8 THEN 'Quartas de Final'
      ELSE 'Oitavas de Final'
    END;

    -- Gera confrontos em pares
    FOR v_idx IN 0..(v_num_participantes - 1) BY 2 LOOP
      IF v_idx + 1 < v_num_participantes THEN
        v_p1 := v_participantes[v_idx + 1];
        v_p2 := v_participantes[v_idx + 2];

        v_eliminitorias := v_eliminitorias || jsonb_build_array(jsonb_build_object(
          'fase', v_nome_fase,
          'rodada', v_fase,
          'j1_id', v_p1,
          'j2_id', v_p2,
          'pl_j1', 0,
          'pl_j2', 0,
          'status', 'pendente'
        ));
      END IF;
    END LOOP;
  END IF;

  RETURN v_eliminitorias;
END;
$$;

-- Criar campeonato de trilha online
CREATE OR REPLACE FUNCTION public.criar_campeonato_trilha_online(
  p_nome TEXT DEFAULT 'Campeonato de Trilha',
  p_max INTEGER DEFAULT 8,
  p_formato TEXT DEFAULT 'grupos'
)
RETURNS public.campeonatos_trilha_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_row   public.campeonatos_trilha_online;
  v_part  JSONB;
  v_codigo TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF p_max NOT IN (8, 12, 16, 32) THEN RAISE EXCEPTION 'max_jogadores precisa ser 8, 12, 16 ou 32'; END IF;
  IF p_formato NOT IN ('grupos', 'eliminacao') THEN RAISE EXCEPTION 'formato invalido'; END IF;

  v_codigo := 'TRILHA-' || to_char(now(), 'YYMMDDHH24MISSMS') || '-'
              || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 6);

  v_part := jsonb_build_array(jsonb_build_object(
    'user_id', v_uid::TEXT,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'pontos', 0,
    'jogos', 0,
    'vitorias', 0,
    'empates', 0,
    'derrotas', 0
  ));

  INSERT INTO public.campeonatos_trilha_online
    (codigo, nome, criador_id, max_jogadores, formato, participantes)
  VALUES (v_codigo, p_nome, v_uid, p_max, p_formato, v_part)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Entrar no campeonato de trilha online
CREATE OR REPLACE FUNCTION public.entrar_campeonato_trilha_online(p_codigo TEXT)
RETURNS public.campeonatos_trilha_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.campeonatos_trilha_online;
  v_part JSONB;
  v_novo JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.campeonatos_trilha_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aberto'; END IF;

  v_part := v_row.participantes;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = v_uid::TEXT) THEN
    RETURN v_row;
  END IF;

  IF jsonb_array_length(v_part) >= v_row.max_jogadores THEN
    RAISE EXCEPTION 'campeonato cheio';
  END IF;

  v_novo := jsonb_build_object(
    'user_id', v_uid::TEXT,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'pontos', 0,
    'jogos', 0,
    'vitorias', 0,
    'empates', 0,
    'derrotas', 0
  );

  UPDATE public.campeonatos_trilha_online
     SET participantes = v_part || jsonb_build_array(v_novo)
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Iniciar campeonato de trilha online
CREATE OR REPLACE FUNCTION public.iniciar_campeonato_trilha_online(p_codigo TEXT)
RETURNS public.campeonatos_trilha_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.campeonatos_trilha_online;
  v_ids UUID[];
  v_id UUID;
  v_grupos JSONB;
  v_confrontos JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.campeonatos_trilha_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o criador pode iniciar'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aguardando'; END IF;
  IF jsonb_array_length(v_row.participantes) < 2 THEN RAISE EXCEPTION 'minimo de 2 jogadores'; END IF;

  -- Extrai IDs dos participantes
  v_ids := ARRAY[]::UUID[];
  FOR v_id IN SELECT (el->>'user_id')::UUID FROM jsonb_array_elements(v_row.participantes) el LOOP
    v_ids := v_ids || ARRAY[v_id];
  END LOOP;

  -- Gera grupos (grupos de 4 jogadores)
  v_grupos := public._gerar_grupos_trilha(v_ids, v_row.max_jogadores);

  -- Gera confrontos dos grupos (round-robin: 3 pontos por vitória, 1 por empate)
  v_confrontos := public._gerar_confrontos_grupos_trilha(v_grupos);

  UPDATE public.campeonatos_trilha_online
     SET status = 'em_andamento',
         fase = 1, -- Fase de grupos
         rodada_atual = 1,
         grupos = v_grupos,
         confrontos = v_confrontos
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Registrar resultado de confronto de trilha (grupos ou eliminatórias)
CREATE OR REPLACE FUNCTION public.registrar_resultado_trilha(
  p_campeonato_id BIGINT,
  p_j1_id TEXT,
  p_j2_id TEXT,
  p_vencedor_id TEXT,
  p_grupo TEXT DEFAULT NULL,
  p_fase TEXT DEFAULT NULL
)
RETURNS public.campeonatos_trilha_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.campeonatos_trilha_online;
  v_part JSONB;
  v_grupos JSONB;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_item JSONB;
  v_el JSONB;
  v_total INTEGER;
  v_finalizados INTEGER := 0;
  v_ultima_rodada INTEGER;
  v_campeao JSONB;
  v_classificados JSONB := '[]'::JSONB;
  v_grupo_nome TEXT;
  v_grupo_idx INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.campeonatos_trilha_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_part := v_row.participantes;
  v_grupos := v_row.grupos;
  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  -- Encontra o confronto
  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx];
    IF (p_grupo IS NOT NULL AND v_item->>'grupo' = p_grupo
         AND v_item->>'j1_id' = p_j1_id
         AND v_item->>'j2_id' = p_j2_id
         AND v_item->>'status' = 'pendente')
       OR (p_fase IS NOT NULL AND v_item->>'fase' = p_fase
         AND v_item->>'j1_id' = p_j1_id
         AND v_item->>'j2_id' = p_j2_id
         AND v_item->>'status' = 'pendente') THEN

      -- Atualiza confronto
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_item := jsonb_set(v_item, '{vencedor_id}', to_jsonb(p_vencedor_id));
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx]::TEXT[], v_item);

      -- Atualiza estatísticas dos participantes
      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = p_j1_id THEN
              el || jsonb_build_object(
                'jogos', (el->>'jogos')::INT + 1,
                'vitorias', (el->>'vitorias')::INT + CASE WHEN p_vencedor_id = p_j1_id THEN 1 ELSE 0 END,
                'empates', (el->>'empates')::INT + CASE WHEN p_vencedor_id IS NULL THEN 1 ELSE 0 END,
                'derrotas', (el->>'derrotas')::INT + CASE WHEN p_vencedor_id = p_j2_id THEN 1 ELSE 0 END,
                'pontos', (el->>'pontos')::INT + CASE WHEN p_vencedor_id = p_j1_id THEN 3 WHEN p_vencedor_id IS NULL THEN 1 ELSE 0 END
              )
            WHEN el->>'user_id' = p_j2_id THEN
              el || jsonb_build_object(
                'jogos', (el->>'jogos')::INT + 1,
                'vitorias', (el->>'vitorias')::INT + CASE WHEN p_vencedor_id = p_j2_id THEN 1 ELSE 0 END,
                'empates', (el->>'empates')::INT + CASE WHEN p_vencedor_id IS NULL THEN 1 ELSE 0 END,
                'derrotas', (el->>'derrotas')::INT + CASE WHEN p_vencedor_id = p_j1_id THEN 1 ELSE 0 END,
                'pontos', (el->>'pontos')::INT + CASE WHEN p_vencedor_id = p_j2_id THEN 3 WHEN p_vencedor_id IS NULL THEN 1 ELSE 0 END
              )
            ELSE el
          END)
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);

      -- Atualiza estatísticas do grupo (apenas na fase de grupos)
      IF p_grupo IS NOT NULL THEN
        FOR v_grupo_idx IN 0..(jsonb_array_length(v_grupos) - 1) LOOP
          IF v_grupos[v_grupo_idx]->>'nome' = p_grupo THEN
            v_el := v_grupos[v_grupo_idx];
            v_el := jsonb_set(v_el, '{jogos}', to_jsonb((v_el->>'jogos')::INT + 1));
            IF p_vencedor_id IS NOT NULL THEN
              v_el := jsonb_set(v_el, '{vitorias}', to_jsonb((v_el->>'vitorias')::INT + 1));
            ELSE
              v_el := jsonb_set(v_el, '{empates}', to_jsonb((v_el->>'empates')::INT + 1));
            END IF;
            v_grupos := jsonb_set(v_grupos, ARRAY[v_grupo_idx]::TEXT[], v_el);
          END IF;
        END LOOP;
      END IF;

      EXIT;
    END IF;
  END LOOP;

  -- Verifica se todos os confrontos foram finalizados
  FOR v_idx IN 0..(v_total - 1) LOOP
    IF (v_confrontos[v_idx]->>'status') = 'finalizado' THEN v_finalizados := v_finalizados + 1; END IF;
  END LOOP;

  SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
  FROM jsonb_array_elements(v_confrontos) c;

  IF v_finalizados = v_total THEN
    -- Fase de grupos finalizada - gera classificados
    IF v_row.fase = 1 THEN
      -- Classifica os 2 melhores de cada grupo (ou 1 se grupo de 3)
      FOR v_grupo_idx IN 0..(jsonb_array_length(v_grupos) - 1) LOOP
        v_grupo_nome := v_grupos[v_grupo_idx]->>'nome';
        v_el := (
          SELECT el
          FROM jsonb_array_elements(v_part) el
          WHERE el->>'user_id' IN (
            SELECT unnest((v_grupos[v_grupo_idx]->>'participantes')::TEXT[])
          )
          ORDER BY (el->>'pontos')::INT DESC, (el->>'vitorias')::INT DESC
          LIMIT 2
        );

        IF v_el IS NOT NULL THEN
          v_classificados := v_classificados || jsonb_build_array(v_el);
        END IF;
      END LOOP;

      -- Gera eliminatórias com os classificados
      v_confrontos := public._gerar_eliminatorias_trilha(v_classificados);

      UPDATE public.campeonatos_trilha_online
         SET fase = 2, -- Fase de eliminatórias
             rodada_atual = 1,
             participantes = v_part,
             grupos = v_grupos,
             confrontos = v_confrontos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    ELSE
      -- Eliminatórias finalizada - determina campeão
      SELECT el INTO v_campeao
      FROM jsonb_array_elements(v_part) el
      WHERE el->>'user_id' = p_vencedor_id
      LIMIT 1;

      UPDATE public.campeonatos_trilha_online
         SET status = 'finalizado', fase = -1,
             participantes = v_part, grupos = v_grupos, confrontos = v_confrontos,
             vencedor_id = (v_campeao->>'user_id')::UUID
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;
  ELSE
    -- Avança para próxima rodada se todos da atual foram finalizados
    PERFORM 1
    FROM jsonb_array_elements(v_confrontos) c
    WHERE (c->>'rodada')::INT = v_row.rodada_atual AND c->>'status' <> 'finalizado'
    LIMIT 1;

    IF NOT FOUND AND v_row.rodada_atual < v_ultima_rodada THEN
      UPDATE public.campeonatos_trilha_online
         SET participantes = v_part, grupos = v_grupos, confrontos = v_confrontos,
             rodada_atual = v_row.rodada_atual + 1
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    ELSE
      UPDATE public.campeonatos_trilha_online
         SET participantes = v_part, grupos = v_grupos, confrontos = v_confrontos
       WHERE id = v_row.id
      RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

-- ============================================================================
-- FUNÇÃO PARA LIMPEZA AUTOMÁTICA
-- ============================================================================

-- Função para limpar mesas antigas (mais de 30 minutos de atividade)
CREATE OR REPLACE FUNCTION limpar_mesas_trilha_antigas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Finalizar mesas em jogo há mais de 30 minutos (baseado em iniciado_em)
    UPDATE mesas_trilha
    SET status = 'finalizado',
        motivo_finalizacao = 'tempo_esgotado',
        vencedor_id = CASE
            WHEN turn = 2 THEN jogador_1_id
            WHEN turn = 1 THEN jogador_2_id
            ELSE NULL
        END,
        turn = NULL
    WHERE status = 'em_andamento'
      AND iniciado_em < now() - interval '30 minutes';

    -- Remover mesas aguardando há mais de 30 minutos (baseado em criado_em)
    DELETE FROM mesas_trilha
    WHERE status = 'aguardando'
      AND criado_em < now() - interval '30 minutes';
END;
$$;
-- ============================================================================
-- LOBBY DE TRILHA SEM DIFICULDADE (2026-08-26)
-- Adiciona nome da sala + formato (normal / campeonato eliminatório)
-- ============================================================================

ALTER TABLE public.mesas_trilha
  ADD COLUMN IF NOT EXISTS nome TEXT NULL;
ALTER TABLE public.mesas_trilha
  ADD COLUMN IF NOT EXISTS formato TEXT NOT NULL DEFAULT 'normal';

DROP FUNCTION IF EXISTS public.criar_mesa_trilha(p_dificuldade TEXT);

CREATE OR REPLACE FUNCTION public.criar_mesa_trilha(
  p_nome TEXT DEFAULT NULL,
  p_formato TEXT DEFAULT 'normal',
  p_dificuldade TEXT DEFAULT 'recruta'
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mesa_id TEXT;
  v_uid     UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  IF p_formato NOT IN ('normal','eliminacao') THEN
    RAISE EXCEPTION 'formato invalido';
  END IF;

  v_mesa_id := 'trilha_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  INSERT INTO public.mesas_trilha AS m
    (mesa_id, jogador_1_id, dificuldade, status, jogador_1_online, ultimo_heartbeat_j1, nome, formato)
  VALUES (v_mesa_id, v_uid, p_dificuldade, 'aguardando', true, now(), p_nome, p_formato);

  RETURN v_mesa_id;
END; $$;

DROP FUNCTION IF EXISTS public.listar_mesas_trilha_disponiveis(p_dificuldade TEXT);

CREATE OR REPLACE FUNCTION public.listar_mesas_trilha_disponiveis(p_dificuldade TEXT DEFAULT NULL)
RETURNS TABLE (
  mesa_id TEXT,
  dificuldade TEXT,
  jogador_1_id UUID,
  criado_em TIMESTAMPTZ,
  nome_sala TEXT,
  formato TEXT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.mesa_id,
    m.dificuldade,
    m.jogador_1_id,
    m.criado_em,
    m.nome,
    m.formato
  FROM public.mesas_trilha m
  WHERE m.status = 'aguardando'
    AND (p_dificuldade IS NULL OR m.dificuldade = p_dificuldade)
  ORDER BY m.criado_em DESC
  LIMIT 20;
$$;