-- Sistema Online para Futebol de Botão
-- Amistoso online melhor de 3 com sistema de fila e pontos

-- Tabela de usuários (login opcional por email)
CREATE TABLE public.botao_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  nome TEXT,
  pontos_soberania INTEGER NOT NULL DEFAULT 0,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de fila de espera (matchmaking)
CREATE TABLE public.botao_fila (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.botao_usuarios(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL, -- Para jogadores sem login
  time_escolhido TEXT NOT NULL, -- ID do time escolhido
  status TEXT NOT NULL DEFAULT 'esperando', -- esperando, em_partida, cancelado
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Tabela de partidas online
CREATE TABLE public.botao_partidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jogador1_id UUID REFERENCES public.botao_usuarios(id) ON DELETE SET NULL,
  jogador1_session TEXT NOT NULL,
  jogador1_time TEXT NOT NULL,
  jogador1_tempo_restante INTEGER NOT NULL DEFAULT 180, -- 3 minutos em segundos
  jogador1_gols INTEGER NOT NULL DEFAULT 0,
  
  jogador2_id UUID REFERENCES public.botao_usuarios(id) ON DELETE SET NULL,
  jogador2_session TEXT NOT NULL,
  jogador2_time TEXT NOT NULL,
  jogador2_tempo_restante INTEGER NOT NULL DEFAULT 180, -- 3 minutos em segundos
  jogador2_gols INTEGER NOT NULL DEFAULT 0,
  
  turno TEXT NOT NULL DEFAULT 'jogador1', -- jogador1 ou jogador2
  rodada INTEGER NOT NULL DEFAULT 1, -- 1, 2, ou 3 (melhor de 3)
  status TEXT NOT NULL DEFAULT 'em_andamento', -- em_andamento, finalizada, abandonada
  vencedor TEXT, -- jogador1, jogador2, ou empate
  criada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalizada_em TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_botao_fila_status ON public.botao_fila(status);
CREATE INDEX idx_botao_fila_expira ON public.botao_fila(expira_em);
CREATE INDEX idx_botao_partidas_status ON public.botao_partidas(status);
CREATE INDEX idx_botao_partidas_jogador1 ON public.botao_partidas(jogador1_session);
CREATE INDEX idx_botao_partidas_jogador2 ON public.botao_partidas(jogador2_session);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_usuarios TO authenticated;
GRANT SELECT ON public.botao_usuarios TO anon;
GRANT ALL ON public.botao_usuarios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_fila TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.botao_fila TO anon;
GRANT ALL ON public.botao_fila TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.botao_partidas TO authenticated;
GRANT SELECT ON public.botao_partidas TO anon;
GRANT ALL ON public.botao_partidas TO service_role;

-- RLS
ALTER TABLE public.botao_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_fila ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_partidas ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários
CREATE POLICY "Usuários podem ver todos" ON public.botao_usuarios FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar próprio" ON public.botao_usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar próprio" ON public.botao_usuarios FOR UPDATE USING (true);

-- Políticas para fila
CREATE POLICY "Todos podem ver fila" ON public.botao_fila FOR SELECT USING (true);
CREATE POLICY "Autenticados podem entrar na fila" ON public.botao_fila FOR INSERT WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar fila" ON public.botao_fila FOR UPDATE USING (true);

-- Políticas para partidas
CREATE POLICY "Todos podem ver partidas" ON public.botao_partidas FOR SELECT USING (true);
CREATE POLICY "Autenticados podem criar partidas" ON public.botao_partidas FOR INSERT WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar partidas" ON public.botao_partidas FOR UPDATE USING (true);

-- Função para limpar fila expirada
CREATE OR REPLACE FUNCTION public.limpar_fila_expirada()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.botao_fila 
  WHERE expira_em < now() 
  OR status = 'cancelado';
END;
$$;

-- Trigger para limpar fila periodicamente
CREATE OR REPLACE FUNCTION public.trigger_limpar_fila()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.limpar_fila_expirada();
  RETURN NEW;
END;
$$;

-- Função para matchmaking automático
CREATE OR REPLACE FUNCTION public.matchmaking_botao()
RETURNS TABLE(partida_id UUID, jogador1_session TEXT, jogador2_session TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  fila RECORD;
  partida_id UUID;
BEGIN
  -- Busca dois jogadores na fila
  FOR fila IN 
    SELECT id, session_id, time_escolhido, usuario_id
    FROM public.botao_fila
    WHERE status = 'esperando' AND expira_em > now()
    ORDER BY criado_em ASC
    LIMIT 2
  LOOP
    -- Se encontrou 2 jogadores, cria partida
    IF (SELECT COUNT(*) FROM (SELECT 1 FROM public.botao_fila WHERE status = 'esperando' AND expira_em > now() LIMIT 2) sub) >= 2 THEN
      -- Cria partida
      INSERT INTO public.botao_partidas (
        jogador1_session, jogador1_time,
        jogador2_session, jogador2_time
      )
      SELECT 
        (SELECT session_id FROM public.botao_fila WHERE status = 'esperando' ORDER BY criado_em ASC LIMIT 1),
        (SELECT time_escolhido FROM public.botao_fila WHERE status = 'esperando' ORDER BY criado_em ASC LIMIT 1),
        (SELECT session_id FROM public.botao_fila WHERE status = 'esperando' ORDER BY criado_em ASC OFFSET 1 LIMIT 1),
        (SELECT time_escolhido FROM public.botao_fila WHERE status = 'esperando' ORDER BY criado_em ASC OFFSET 1 LIMIT 1)
      RETURNING id INTO partida_id;
      
      -- Atualiza status dos jogadores na fila
      UPDATE public.botao_fila
      SET status = 'em_partida'
      WHERE id IN (
        SELECT id FROM public.botao_fila 
        WHERE status = 'esperando' 
        ORDER BY criado_em ASC 
        LIMIT 2
      );
      
      RETURN QUERY SELECT partida_id, 
        (SELECT session_id FROM public.botao_fila WHERE id = (SELECT id FROM public.botao_fila WHERE status = 'em_partida' ORDER BY criado_em ASC LIMIT 1)),
        (SELECT session_id FROM public.botao_fila WHERE id = (SELECT id FROM public.botao_fila WHERE status = 'em_partida' ORDER BY criado_em ASC OFFSET 1 LIMIT 1));
    END IF;
  END LOOP;
  RETURN;
END;
$$;

-- Função para atualizar tempo de jogador
CREATE OR REPLACE FUNCTION public.atualizar_tempo_jogador(
  p_partida_id UUID,
  p_session TEXT,
  p_tempo_gasto INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_session = (SELECT jogador1_session FROM public.botao_partidas WHERE id = p_partida_id) THEN
    UPDATE public.botao_partidas
    SET jogador1_tempo_restante = GREATEST(0, jogador1_tempo_restante - p_tempo_gasto),
        atualizada_em = now()
    WHERE id = p_partida_id;
  ELSE
    UPDATE public.botao_partidas
    SET jogador2_tempo_restante = GREATEST(0, jogador2_tempo_restante - p_tempo_gasto),
        atualizada_em = now()
    WHERE id = p_partida_id;
  END IF;
  
  -- Verifica se algum jogador zerou o tempo
  UPDATE public.botao_partidas
  SET status = 'finalizada',
      vencedor = CASE 
        WHEN jogador1_tempo_restante <= 0 THEN 'jogador2'
        WHEN jogador2_tempo_restante <= 0 THEN 'jogador1'
        ELSE vencedor
      END,
      finalizada_em = now()
  WHERE id = p_partida_id
  AND (jogador1_tempo_restante <= 0 OR jogador2_tempo_restante <= 0);
END;
$$;

-- Função para registrar gol
CREATE OR REPLACE FUNCTION public.registrar_gol(
  p_partida_id UUID,
  p_session TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_session = (SELECT jogador1_session FROM public.botao_partidas WHERE id = p_partida_id) THEN
    UPDATE public.botao_partidas
    SET jogador1_gols = jogador1_gols + 1,
        atualizada_em = now()
    WHERE id = p_partida_id;
  ELSE
    UPDATE public.botao_partidas
    SET jogador2_gols = jogador2_gols + 1,
        atualizada_em = now()
    WHERE id = p_partida_id;
  END IF;
END;
$$;

-- Função para finalizar partida e atualizar pontos
CREATE OR REPLACE FUNCTION public.finalizar_partida(
  p_partida_id UUID,
  p_vencedor TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_partidas
  SET status = 'finalizada',
      vencedor = p_vencedor,
      finalizada_em = now()
  WHERE id = p_partida_id;
  
  -- Atualiza pontos dos usuários
  IF p_vencedor = 'jogador1' THEN
    UPDATE public.botao_usuarios
    SET pontos_soberania = pontos_soberania + 10,
        partidas_jogadas = partidas_jogadas + 1,
        partidas_vencidas = partidas_vencidas + 1,
        updated_at = now()
    WHERE id = (SELECT jogador1_id FROM public.botao_partidas WHERE id = p_partida_id);
    
    UPDATE public.botao_usuarios
    SET pontos_soberania = pontos_soberania - 5,
        partidas_jogadas = partidas_jogadas + 1,
        updated_at = now()
    WHERE id = (SELECT jogador2_id FROM public.botao_partidas WHERE id = p_partida_id);
  ELSIF p_vencedor = 'jogador2' THEN

    UPDATE public.botao_usuarios
    SET pontos_soberania = pontos_soberania + 10,
        partidas_jogadas = partidas_jogadas + 1,
        partidas_vencidas = partidas_vencidas + 1,
        updated_at = now()
    WHERE id = (SELECT jogador2_id FROM public.botao_partidas WHERE id = p_partida_id);
    
    UPDATE public.botao_usuarios
    SET pontos_soberania = pontos_soberania - 5,
        partidas_jogadas = partidas_jogadas + 1,
        updated_at = now()
    WHERE id = (SELECT jogador1_id FROM public.botao_partidas WHERE id = p_partida_id);
  END IF;
END;
$$;
