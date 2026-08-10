-- Sistema de Lobby de Salas para Futebol de Botão
-- Substitui sistema de fila por arquitetura de salas em tempo real

-- Tabela de salas (lobby)
CREATE TABLE public.botao_salas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Jogador 1 (criador da sala)
  jogador1_session TEXT NOT NULL,
  jogador1_nome TEXT NOT NULL,
  jogador1_time TEXT NOT NULL,
  
  -- Jogador 2 (oponente, nullable até entrar)
  jogador2_session TEXT,
  jogador2_nome TEXT,
  jogador2_time TEXT,
  
  -- Status da sala
  status TEXT NOT NULL DEFAULT 'aguardando', -- aguardando, em_jogo, finalizado
  
  -- Lógica de jogo
  turno TEXT NOT NULL DEFAULT 'jogador1', -- jogador1 ou jogador2
  jogadas_restantes INTEGER NOT NULL DEFAULT 20, -- Limite de 20 jogadas
  timestamp_inicio_turno TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tempo_maximo_turno INTEGER NOT NULL DEFAULT 30, -- 30 segundos por jogada
  
  -- Placar
  jogador1_gols INTEGER NOT NULL DEFAULT 0,
  jogador2_gols INTEGER NOT NULL DEFAULT 0,
  
  -- Rodada (melhor de 3)
  rodada INTEGER NOT NULL DEFAULT 1,
  
  -- Finalização
  vencedor TEXT, -- jogador1, jogador2, ou empate
  finalizada_em TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_botao_salas_status ON public.botao_salas(status);
CREATE INDEX idx_botao_salas_jogador1 ON public.botao_salas(jogador1_session);
CREATE INDEX idx_botao_salas_jogador2 ON public.botao_salas(jogador2_session);
CREATE INDEX idx_botao_salas_created_at ON public.botao_salas(created_at DESC);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_salas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.botao_salas TO anon;
GRANT ALL ON public.botao_salas TO service_role;

-- RLS
ALTER TABLE public.botao_salas ENABLE ROW LEVEL SECURITY;

-- Políticas para salas
CREATE POLICY "Todos podem ver salas" ON public.botao_salas FOR SELECT USING (true);
CREATE POLICY "Autenticados podem criar salas" ON public.botao_salas FOR INSERT WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar salas" ON public.botao_salas FOR UPDATE USING (true);
CREATE POLICY "Autenticados podem deletar salas" ON public.botao_salas FOR DELETE USING (true);

-- Função para limpar salas antigas (mais de 1 hora e não em jogo)
CREATE OR REPLACE FUNCTION public.limpar_salas_antigas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.botao_salas 
  WHERE status = 'aguardando' 
  AND created_at < now() - interval '1 hour';
END;
$$;

-- Função para alternar turno e atualizar timestamp
CREATE OR REPLACE FUNCTION public.alternar_turno(p_sala_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_salas
  SET turno = CASE 
      WHEN turno = 'jogador1' THEN 'jogador2'
      ELSE 'jogador1'
    END,
    timestamp_inicio_turno = now()
  WHERE id = p_sala_id;
END;
$$;

-- Função para decrementar jogadas e alternar turno
CREATE OR REPLACE FUNCTION public.registrar_jogada(p_sala_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  jogadas INTEGER;
BEGIN
  -- Decrementar jogadas
  UPDATE public.botao_salas
  SET jogadas_restantes = jogadas_restantes - 1
  WHERE id = p_sala_id
  RETURNING jogadas_restantes INTO jogadas;
  
  -- Alternar turno
  PERFORM public.alternar_turno(p_sala_id);
  
  -- Se acabaram as jogadas, finalizar partida
  IF jogadas <= 0 THEN
    UPDATE public.botao_salas
    SET status = 'finalizado',
        vencedor = CASE 
          WHEN jogador1_gols > jogador2_gols THEN 'jogador1'
          WHEN jogador2_gols > jogador1_gols THEN 'jogador2'
          ELSE 'empate'
        END,
        finalizada_em = now()
    WHERE id = p_sala_id;
  END IF;
END;
$$;

-- Função para registrar gol
CREATE OR REPLACE FUNCTION public.registrar_gol_sala(p_sala_id UUID, p_jogador TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_jogador = 'jogador1' THEN
    UPDATE public.botao_salas
    SET jogador1_gols = jogador1_gols + 1
    WHERE id = p_sala_id;
  ELSE
    UPDATE public.botao_salas
    SET jogador2_gols = jogador2_gols + 1
    WHERE id = p_sala_id;
  END IF;
END;
$$;

-- Função para forçar troca de turno por timeout
CREATE OR REPLACE FUNCTION public.forcar_troca_turno(p_sala_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Alternar turno sem decrementar jogadas (penalidade de tempo)
  UPDATE public.botao_salas
  SET turno = CASE 
      WHEN turno = 'jogador1' THEN 'jogador2'
      ELSE 'jogador1'
    END,
    timestamp_inicio_turno = now()
  WHERE id = p_sala_id;
END;
$$;

-- Função para finalizar sala manualmente
CREATE OR REPLACE FUNCTION public.finalizar_sala(p_sala_id UUID, p_vencedor TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_salas
  SET status = 'finalizado',
      vencedor = p_vencedor,
      finalizada_em = now()
  WHERE id = p_sala_id;
END;
$$;
