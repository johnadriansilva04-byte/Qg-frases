-- SQL COMPLETO PARA JOGO DE FUTEBOL ONLINE
-- Sistema de Lobbies com Múltiplos Blocos
-- Execute este SQL único no Supabase

-- Tabela de usuários (login por telefone obrigatório)
CREATE TABLE IF NOT EXISTS public.botao_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cores TEXT[] NOT NULL DEFAULT ARRAY['#FF0000', '#00FF00', '#0000FF']::TEXT[],
  pontos_soberania INTEGER NOT NULL DEFAULT 0,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Lobbies (salas principais)
CREATE TABLE IF NOT EXISTS public.botao_lobbies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  criador_session TEXT NOT NULL,
  criador_nome TEXT NOT NULL,
  formato TEXT NOT NULL DEFAULT 'melhor_de_3', -- melhor_de_3, melhor_de_6, melhor_de_9
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, encerrado
  max_blocos INTEGER NOT NULL DEFAULT 10
);

-- Tabela de Blocos (slots dentro de lobbies)
CREATE TABLE IF NOT EXISTS public.botao_blocos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lobby_id UUID NOT NULL REFERENCES public.botao_lobbies(id) ON DELETE CASCADE,
  
  -- Jogador 1 (criador do bloco)
  jogador1_session TEXT NOT NULL,
  jogador1_nome TEXT NOT NULL,
  jogador1_time TEXT NOT NULL,
  
  -- Jogador 2 (oponente, nullable até entrar)
  jogador2_session TEXT,
  jogador2_nome TEXT,
  jogador2_time TEXT,
  
  -- Status do bloco
  status TEXT NOT NULL DEFAULT 'aguardando', -- aguardando, em_jogo, finalizado
  
  -- Lógica de jogo
  turno TEXT NOT NULL DEFAULT 'jogador1',
  jogadas_restantes INTEGER NOT NULL DEFAULT 20,
  timestamp_inicio_turno TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tempo_maximo_turno INTEGER NOT NULL DEFAULT 30,
  
  -- Placar
  jogador1_gols INTEGER NOT NULL DEFAULT 0,
  jogador2_gols INTEGER NOT NULL DEFAULT 0,
  rodada INTEGER NOT NULL DEFAULT 1,
  
  -- Finalização
  vencedor TEXT,
  finalizada_em TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_botao_usuarios_telefone ON public.botao_usuarios(telefone);
CREATE INDEX IF NOT EXISTS idx_botao_lobbies_status ON public.botao_lobbies(status);
CREATE INDEX IF NOT EXISTS idx_botao_lobbies_criador ON public.botao_lobbies(criador_session);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_lobby ON public.botao_blocos(lobby_id);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_status ON public.botao_blocos(status);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_jogador1 ON public.botao_blocos(jogador1_session);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_jogador2 ON public.botao_blocos(jogador2_session);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.botao_usuarios TO anon;
GRANT ALL ON public.botao_usuarios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_lobbies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.botao_lobbies TO anon;
GRANT ALL ON public.botao_lobbies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_blocos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.botao_blocos TO anon;
GRANT ALL ON public.botao_blocos TO service_role;

-- RLS
ALTER TABLE public.botao_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_blocos ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários
DROP POLICY IF EXISTS "Todos podem ver usuarios" ON public.botao_usuarios;
CREATE POLICY "Todos podem ver usuarios" ON public.botao_usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem criar usuarios" ON public.botao_usuarios;
CREATE POLICY "Autenticados podem criar usuarios" ON public.botao_usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar usuarios" ON public.botao_usuarios;
CREATE POLICY "Autenticados podem atualizar usuarios" ON public.botao_usuarios FOR UPDATE USING (true);

-- Políticas para lobbies
DROP POLICY IF EXISTS "Todos podem ver lobbies" ON public.botao_lobbies;
CREATE POLICY "Todos podem ver lobbies" ON public.botao_lobbies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem criar lobbies" ON public.botao_lobbies;
CREATE POLICY "Autenticados podem criar lobbies" ON public.botao_lobbies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar lobbies" ON public.botao_lobbies;
CREATE POLICY "Autenticados podem atualizar lobbies" ON public.botao_lobbies FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Autenticados podem deletar lobbies" ON public.botao_lobbies;
CREATE POLICY "Autenticados podem deletar lobbies" ON public.botao_lobbies FOR DELETE USING (true);

-- Políticas para blocos
DROP POLICY IF EXISTS "Todos podem ver blocos" ON public.botao_blocos;
CREATE POLICY "Todos podem ver blocos" ON public.botao_blocos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem criar blocos" ON public.botao_blocos;
CREATE POLICY "Autenticados podem criar blocos" ON public.botao_blocos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar blocos" ON public.botao_blocos;
CREATE POLICY "Autenticados podem atualizar blocos" ON public.botao_blocos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Autenticados podem deletar blocos" ON public.botao_blocos;
CREATE POLICY "Autenticados podem deletar blocos" ON public.botao_blocos FOR DELETE USING (true);

-- Função para alternar turno em bloco
DROP FUNCTION IF EXISTS public.alternar_turno_bloco(UUID);
CREATE OR REPLACE FUNCTION public.alternar_turno_bloco(p_bloco_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_blocos
  SET turno = CASE 
      WHEN turno = 'jogador1' THEN 'jogador2'
      ELSE 'jogador1'
    END,
    timestamp_inicio_turno = now()
  WHERE id = p_bloco_id;
END;
$$;

-- Função para registrar jogada em bloco
DROP FUNCTION IF EXISTS public.registrar_jogada_bloco(UUID);
CREATE OR REPLACE FUNCTION public.registrar_jogada_bloco(p_bloco_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  jogadas INTEGER;
  formato TEXT;
  max_rodadas INTEGER;
BEGIN
  -- Decrementar jogadas
  UPDATE public.botao_blocos
  SET jogadas_restantes = jogadas_restantes - 1
  WHERE id = p_bloco_id
  RETURNING jogadas_restantes INTO jogadas;
  
  -- Alternar turno
  PERFORM public.alternar_turno_bloco(p_bloco_id);
  
  -- Buscar formato do lobby
  SELECT formato INTO formato
  FROM public.botao_lobbies l
  JOIN public.botao_blocos b ON b.lobby_id = l.id
  WHERE b.id = p_bloco_id;
  
  -- Calcular máximo de rodadas baseado no formato
  max_rodadas = CASE 
    WHEN formato = 'melhor_de_3' THEN 3
    WHEN formato = 'melhor_de_6' THEN 6
    WHEN formato = 'melhor_de_9' THEN 9
    ELSE 3
  END;
  
  -- Verificar se acabaram as jogadas ou se alguém venceu por rodadas
  IF jogadas <= 0 THEN
    UPDATE public.botao_blocos
    SET status = 'finalizado',
        vencedor = CASE 
          WHEN jogador1_gols > jogador2_gols THEN 'jogador1'
          WHEN jogador2_gols > jogador1_gols THEN 'jogador2'
          ELSE 'empate'
        END,
        finalizada_em = now()
    WHERE id = p_bloco_id;
  END IF;
END;
$$;

-- Função para registrar gol em bloco
DROP FUNCTION IF EXISTS public.registrar_gol_bloco(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.registrar_gol_bloco(p_bloco_id UUID, p_jogador TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_jogador = 'jogador1' THEN
    UPDATE public.botao_blocos
    SET jogador1_gols = jogador1_gols + 1
    WHERE id = p_bloco_id;
  ELSE
    UPDATE public.botao_blocos
    SET jogador2_gols = jogador2_gols + 1
    WHERE id = p_bloco_id;
  END IF;
END;
$$;

-- Função para forçar troca de turno em bloco
DROP FUNCTION IF EXISTS public.forcar_troca_turno_bloco(UUID);
CREATE OR REPLACE FUNCTION public.forcar_troca_turno_bloco(p_bloco_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_blocos
  SET turno = CASE 
      WHEN turno = 'jogador1' THEN 'jogador2'
      ELSE 'jogador1'
    END,
    timestamp_inicio_turno = now()
  WHERE id = p_bloco_id;
END;
$$;

-- Função para finalizar bloco manualmente
DROP FUNCTION IF EXISTS public.finalizar_bloco(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.finalizar_bloco(p_bloco_id UUID, p_vencedor TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.botao_blocos
  SET status = 'finalizado',
      vencedor = p_vencedor,
      finalizada_em = now()
  WHERE id = p_bloco_id;
END;
$$;

-- Limpar cache do schema ao final
NOTIFY pgrst, 'reload schema';
