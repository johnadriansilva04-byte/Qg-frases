-- SQL COMPLETO PARA JOGO DE FUTEBOL ONLINE
-- Sistema de Lobbies com Múltiplos Blocos
-- Execute este SQL único no Supabase

-- Tabela de usuários (login por email obrigatório)
CREATE TABLE IF NOT EXISTS public.botao_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cores TEXT[] NOT NULL DEFAULT ARRAY['#FF0000', '#00FF00', '#0000FF']::TEXT[],
  time_personalizado TEXT NOT NULL DEFAULT 'Meu Time',
  abreviacao_time TEXT NOT NULL DEFAULT 'MTI',
  numero_jogador INTEGER NOT NULL DEFAULT 10,
  pontos_soberania INTEGER NOT NULL DEFAULT 0,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  progresso_caminpanha JSONB NOT NULL DEFAULT '{"titles":{"amador":0,"profissional":0,"lenda":0},"trophies":[],"friendlies":{"w":0,"d":0,"l":0}}',
  campeonatos_ganhos INTEGER NOT NULL DEFAULT 0,
  gols_feitos INTEGER NOT NULL DEFAULT 0,
  gols_sofridos INTEGER NOT NULL DEFAULT 0,
  vitorias INTEGER NOT NULL DEFAULT 0,
  derrotas INTEGER NOT NULL DEFAULT 0,
  empates INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraint para garantir que as 3 cores sejam únicas por usuário
  CONSTRAINT check_cores_unicas CHECK (array_length(cores, 1) = 3 AND cores[1] IS DISTINCT FROM cores[2] AND cores[2] IS DISTINCT FROM cores[3] AND cores[1] IS DISTINCT FROM cores[3])
);

-- Tabela de times
CREATE TABLE IF NOT EXISTS public.botao_times (
  id TEXT NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  abreviacao TEXT NOT NULL,
  cores TEXT[] NOT NULL,
  pais TEXT NOT NULL,
  liga TEXT NOT NULL,
  is_personalizado BOOLEAN NOT NULL DEFAULT false,
  usuario_id UUID REFERENCES public.botao_usuarios(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir times brasileiros
INSERT INTO public.botao_times (id, nome, abreviacao, cores, pais, liga) VALUES
('fla', 'Flamengo', 'FLA', ARRAY['#FF0000', '#000000', '#FF0000']::TEXT[], 'Brasil', 'Brasileirão'),
('flu', 'Fluminense', 'FLU', ARRAY['#800000', '#00FF00', '#FFFFFF']::TEXT[], 'Brasil', 'Brasileirão'),
('vas', 'Vasco', 'VAS', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('bot', 'Botafogo', 'BOT', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('cor', 'Corinthians', 'COR', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('pal', 'Palmeiras', 'PAL', ARRAY['#006400', '#FFFFFF', '#006400']::TEXT[], 'Brasil', 'Brasileirão'),
('sao', 'São Paulo', 'SAO', ARRAY['#FF0000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('san', 'Santos', 'SAN', ARRAY['#FFFFFF', '#000000', '#FFFFFF']::TEXT[], 'Brasil', 'Brasileirão'),
('gre', 'Grêmio', 'GRE', ARRAY['#0066CC', '#000000', '#FFFFFF']::TEXT[], 'Brasil', 'Brasileirão'),
('int', 'Internacional', 'INT', ARRAY['#FF0000', '#FFFFFF', '#FF0000']::TEXT[], 'Brasil', 'Brasileirão'),
('cru', 'Cruzeiro', 'CRU', ARRAY['#0033CC', '#FFFFFF', '#0033CC']::TEXT[], 'Brasil', 'Brasileirão'),
('atl', 'Atlético-MG', 'CAM', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('bah', 'Bahia', 'BAH', ARRAY['#0066CC', '#FFFFFF', '#FF0000']::TEXT[], 'Brasil', 'Brasileirão'),
('for', 'Fortaleza', 'FOR', ARRAY['#0066CC', '#FF0000', '#FFFFFF']::TEXT[], 'Brasil', 'Brasileirão'),
('cfc', 'Ceará', 'CFC', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Brasil', 'Brasileirão'),
('spo', 'Sport', 'SPO', ARRAY['#FF0000', '#000000', '#FF0000']::TEXT[], 'Brasil', 'Brasileirão'),
('vit', 'Vitória', 'VIT', ARRAY['#FF0000', '#000000', '#FFFFFF']::TEXT[], 'Brasil', 'Brasileirão'),
('cri', 'Criciúma', 'CRI', ARRAY['#FFD700', '#000000', '#FFD700']::TEXT[], 'Brasil', 'Brasileirão'),
('juv', 'Juventude', 'JUV', ARRAY['#006400', '#FFFFFF', '#006400']::TEXT[], 'Brasil', 'Brasileirão'),
('ath', 'Athletico-PR', 'CAP', ARRAY['#FF0000', '#000000', '#FF0000']::TEXT[], 'Brasil', 'Brasileirão')
ON CONFLICT (id) DO NOTHING;

-- Inserir times internacionais
INSERT INTO public.botao_times (id, nome, abreviacao, cores, pais, liga) VALUES
('bar', 'Barcelona', 'BAR', ARRAY['#A50044', '#004D98', '#EDBB00']::TEXT[], 'Espanha', 'La Liga'),
('rma', 'Real Madrid', 'RMA', ARRAY['#FFFFFF', '#000000', '#FEBE10']::TEXT[], 'Espanha', 'La Liga'),
('atm', 'Atlético Madrid', 'ATM', ARRAY['#CB3524', '#FFFFFF', '#000000']::TEXT[], 'Espanha', 'La Liga'),
('sev', 'Sevilla', 'SEV', ARRAY['#FFFFFF', '#D40E2A', '#000000']::TEXT[], 'Espanha', 'La Liga'),
('val', 'Valencia', 'VAL', ARRAY['#FFFFFF', '#000000', '#FFFFFF']::TEXT[], 'Espanha', 'La Liga'),
('liv', 'Liverpool', 'LIV', ARRAY['#C8102E', '#00B2A9', '#FBE112']::TEXT[], 'Inglaterra', 'Premier League'),
('mci', 'Manchester City', 'MCI', ARRAY['#6CABDD', '#1C2C5B', '#FFFFFF']::TEXT[], 'Inglaterra', 'Premier League'),
('mun', 'Manchester United', 'MUN', ARRAY['#DA291C', '#000000', '#FFFFFF']::TEXT[], 'Inglaterra', 'Premier League'),
('che', 'Chelsea', 'CHE', ARRAY['#034694', '#DBA111', '#FFFFFF']::TEXT[], 'Inglaterra', 'Premier League'),
('ars', 'Arsenal', 'ARS', ARRAY['#EF0107', '#FFFFFF', '#000000']::TEXT[], 'Inglaterra', 'Premier League'),
('tot', 'Tottenham', 'TOT', ARRAY['#132257', '#FFFFFF', '#000000']::TEXT[], 'Inglaterra', 'Premier League'),
('new', 'Newcastle', 'NEW', ARRAY['#241F20', '#FFFFFF', '#000000']::TEXT[], 'Inglaterra', 'Premier League'),
('bay', 'Bayern Munich', 'BAY', ARRAY['#DC052D', '#FFFFFF', '#000000']::TEXT[], 'Alemanha', 'Bundesliga'),
('dor', 'Borussia Dortmund', 'BVB', ARRAY['#FDE100', '#000000', '#FFFFFF']::TEXT[], 'Alemanha', 'Bundesliga'),
('lei', 'RB Leipzig', 'RBL', ARRAY['#DD0741', '#FFFFFF', '#000000']::TEXT[], 'Alemanha', 'Bundesliga'),
('juv', 'Juventus', 'JUV', ARRAY['#000000', '#FFFFFF', '#000000']::TEXT[], 'Itália', 'Serie A'),
('mil', 'AC Milan', 'MIL', ARRAY['#FB090B', '#000000', '#FFFFFF']::TEXT[], 'Itália', 'Serie A'),
('int', 'Inter Milan', 'INT', ARRAY['#0068A8', '#000000', '#FFFFFF']::TEXT[], 'Itália', 'Serie A'),
('nap', 'Napoli', 'NAP', ARRAY['#12A0D7', '#FFFFFF', '#000000']::TEXT[], 'Itália', 'Serie A'),
('rom', 'Roma', 'ROM', ARRAY['#8E1F2F', '#FFD700', '#000000']::TEXT[], 'Itália', 'Serie A'),
('psg', 'PSG', 'PSG', ARRAY['#004170', '#D3133A', '#FFD700']::TEXT[], 'França', 'Ligue 1'),
('oly', 'Olympique Marseille', 'OM', ARRAY['#0093D5', '#FFFFFF', '#000000']::TEXT[], 'França', 'Ligue 1'),
('mon', 'Monaco', 'MON', ARRAY['#E6173D', '#FFFFFF', '#000000']::TEXT[], 'França', 'Ligue 1'),
('lyo', 'Lyon', 'LYO', ARRAY['#004170', '#D3133A', '#FFFFFF']::TEXT[], 'França', 'Ligue 1'),
('aja', 'Ajax', 'AJA', ARRAY['#AC102B', '#FFFFFF', '#000000']::TEXT[], 'Holanda', 'Eredivisie'),
('psv', 'PSV', 'PSV', ARRAY['#FF0000', '#FFFFFF', '#000000']::TEXT[], 'Holanda', 'Eredivisie'),
('ben', 'Benfica', 'BEN', ARRAY['#FF0000', '#FFFFFF', '#000000']::TEXT[], 'Portugal', 'Primeira Liga'),
('spo', 'Sporting CP', 'SCP', ARRAY['#1B6D3F', '#FFFFFF', '#000000']::TEXT[], 'Portugal', 'Primeira Liga'),
('por', 'Porto', 'POR', ARRAY['#003893', '#FFFFFF', '#000000']::TEXT[], 'Portugal', 'Primeira Liga')
ON CONFLICT (id) DO NOTHING;

-- Trigger para criar perfil automaticamente quando usuário é criado no auth
-- Corrigido para garantir que o time só seja criado se o usuário foi inserido com sucesso
-- E para evitar duplicatas usando ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_cores TEXT[];
  v_time_personalizado TEXT;
  v_abreviacao_time TEXT;
  v_numero_jogador INTEGER;
  v_usuario_id UUID;
  v_usuario_criado BOOLEAN := FALSE;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', 'Jogador');
  
  -- Parse cores corretamente do JSON com tratamento de erro
  BEGIN
    v_cores := COALESCE(NEW.raw_user_meta_data->>'cores', '["#FF0000", "#00FF00", "#0000FF"]')::TEXT[];
  EXCEPTION WHEN OTHERS THEN
    v_cores := ARRAY['#FF0000', '#00FF00', '#0000FF']::TEXT[];
  END;
  
  v_time_personalizado := COALESCE(NEW.raw_user_meta_data->>'time_personalizado', 'Meu Time');
  v_abreviacao_time := COALESCE(NEW.raw_user_meta_data->>'abreviacao_time', 'MTI');
  v_numero_jogador := COALESCE((NEW.raw_user_meta_data->>'numero_jogador')::INTEGER, 10);
  v_usuario_id := NEW.id;

  -- Criar usuário com ON CONFLICT para evitar duplicatas
  BEGIN
    INSERT INTO public.botao_usuarios (user_id, email, nome, cores, time_personalizado, abreviacao_time, numero_jogador)
    VALUES (
      v_usuario_id,
      NEW.email,
      v_nome,
      v_cores,
      v_time_personalizado,
      v_abreviacao_time,
      v_numero_jogador
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      nome = EXCLUDED.nome,
      cores = EXCLUDED.cores,
      time_personalizado = EXCLUDED.time_personalizado,
      abreviacao_time = EXCLUDED.abreviacao_time,
      numero_jogador = EXCLUDED.numero_jogador,
      updated_at = now();
    
    v_usuario_criado := TRUE;
    RAISE LOG 'Usuário criado/atualizado com sucesso: %', v_usuario_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar usuário %: %', v_usuario_id, SQLERRM;
    -- Se falhar, retorna NEW sem tentar criar o time
    RETURN NEW;
  END;

  -- Criar time personalizado automaticamente APENAS se o usuário foi criado com sucesso
  -- Usar ON CONFLICT para evitar duplicatas
  IF v_usuario_criado THEN
    BEGIN
      INSERT INTO public.botao_times (id, nome, abreviacao, cores, pais, liga, is_personalizado, usuario_id)
      VALUES (
        'custom-' || v_usuario_id::TEXT,
        v_time_personalizado,
        v_abreviacao_time,
        v_cores,
        'Brasil',
        'Personalizado',
        true,
        v_usuario_id
      )
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        abreviacao = EXCLUDED.abreviacao,
        cores = EXCLUDED.cores;
      
      RAISE LOG 'Time personalizado criado/atualizado com sucesso para usuário: %', v_usuario_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao criar time personalizado para usuário %: %', v_usuario_id, SQLERRM;
      -- Não falha o trigger se o time não for criado, mas o usuário já existe
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
CREATE INDEX IF NOT EXISTS idx_botao_times_pais ON public.botao_times(pais);
CREATE INDEX IF NOT EXISTS idx_botao_times_liga ON public.botao_times(liga);
CREATE INDEX IF NOT EXISTS idx_botao_times_usuario ON public.botao_times(usuario_id);
CREATE INDEX IF NOT EXISTS idx_botao_usuarios_email ON public.botao_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_botao_lobbies_status ON public.botao_lobbies(status);
CREATE INDEX IF NOT EXISTS idx_botao_lobbies_criador ON public.botao_lobbies(criador_session);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_lobby ON public.botao_blocos(lobby_id);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_status ON public.botao_blocos(status);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_jogador1 ON public.botao_blocos(jogador1_session);
CREATE INDEX IF NOT EXISTS idx_botao_blocos_jogador2 ON public.botao_blocos(jogador2_session);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_times TO authenticated;
GRANT SELECT ON public.botao_times TO anon;
GRANT ALL ON public.botao_times TO service_role;

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
ALTER TABLE public.botao_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_blocos ENABLE ROW LEVEL SECURITY;

-- Políticas para times
DROP POLICY IF EXISTS "Todos podem ver times" ON public.botao_times;
CREATE POLICY "Todos podem ver times" ON public.botao_times FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem criar times personalizados" ON public.botao_times;
CREATE POLICY "Autenticados podem criar times personalizados" ON public.botao_times FOR INSERT WITH CHECK (is_personalizado = true);

DROP POLICY IF EXISTS "Usuarios podem atualizar seus times" ON public.botao_times;
CREATE POLICY "Usuarios podem atualizar seus times" ON public.botao_times FOR UPDATE USING (is_personalizado = true AND auth.uid() = usuario_id);

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
  v_formato TEXT;
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
  SELECT l.formato INTO v_formato
  FROM public.botao_lobbies l
  JOIN public.botao_blocos b ON b.lobby_id = l.id
  WHERE b.id = p_bloco_id;
  
  -- Calcular máximo de rodadas baseado no formato
  max_rodadas = CASE 
    WHEN v_formato = 'melhor_de_3' THEN 3
    WHEN v_formato = 'melhor_de_6' THEN 6
    WHEN v_formato = 'melhor_de_9' THEN 9
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

-- Função para limpar blocos e lobbies antigos (mais de 4 minutos)
CREATE OR REPLACE FUNCTION limpar_salas_antigas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Finalizar blocos em jogo há mais de 4 minutos
    UPDATE botao_blocos
    SET status = 'finalizado',
        vencedor = CASE
            WHEN jogador1_gols > jogador2_gols THEN 'jogador1'
            WHEN jogador2_gols > jogador1_gols THEN 'jogador2'
            ELSE 'empate'
        END,
        finalizada_em = now()
    WHERE status = 'em_jogo'
      AND created_at < now() - interval '4 minutes';

    -- Encerrar lobbies sem blocos ativos há mais de 4 minutos
    UPDATE botao_lobbies
    SET status = 'encerrado'
    WHERE status = 'ativo'
      AND id NOT IN (
        SELECT DISTINCT lobby_id
        FROM botao_blocos
        WHERE status IN ('aguardando', 'em_jogo')
      )
      AND created_at < now() - interval '4 minutes';
END;
$$;

-- ============================================================================
-- SISTEMA DE MESAS DE FUTEBOL ONLINE COM SINCRONIZAÇÃO EM TEMPO REAL (v2)
-- ============================================================================

-- Tabela principal de mesas de futebol para jogos online
CREATE TABLE IF NOT EXISTS public.mesas_futebol (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id                  TEXT NOT NULL UNIQUE,

  jogador_1_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jogador_2_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  time_j1                  TEXT NOT NULL DEFAULT 'MTI',
  time_j2                  TEXT,

  placar_j1                INTEGER NOT NULL DEFAULT 0,
  placar_j2                INTEGER NOT NULL DEFAULT 0,

  turno_atual_id           UUID REFERENCES auth.users(id),
  status                   TEXT NOT NULL DEFAULT 'aguardando'
                             CHECK (status IN ('aguardando','em_andamento','finalizado')),

  -- Relógio autoritativo do servidor (5 min)
  duracao_segundos         INTEGER NOT NULL DEFAULT 300,
  iniciado_em              TIMESTAMPTZ,               -- setado ao virar em_andamento
  tempo_restante_segundos  INTEGER NOT NULL DEFAULT 300,

  -- Anti-reset / ordenação de jogadas
  seq_jogada               BIGINT NOT NULL DEFAULT 0,
  estado_fisico            JSONB,                     -- snapshot opcional da mesa

  vencedor_id              UUID REFERENCES auth.users(id),
  motivo_finalizacao       TEXT,                      -- tempo_esgotado | abandono | desistencia

  jogador_1_online         BOOLEAN NOT NULL DEFAULT false,
  jogador_2_online         BOOLEAN NOT NULL DEFAULT false,
  ultimo_heartbeat_j1      TIMESTAMPTZ,
  ultimo_heartbeat_j2      TIMESTAMPTZ,

  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colunas novas em bases já existentes
ALTER TABLE public.mesas_futebol ADD COLUMN IF NOT EXISTS duracao_segundos INTEGER NOT NULL DEFAULT 300;
ALTER TABLE public.mesas_futebol ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ;
ALTER TABLE public.mesas_futebol ADD COLUMN IF NOT EXISTS seq_jogada BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.mesas_futebol ADD COLUMN IF NOT EXISTS estado_fisico JSONB;

-- Índices para mesas_futebol
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_mesa_id ON public.mesas_futebol(mesa_id);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_status ON public.mesas_futebol(status);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_j1 ON public.mesas_futebol(jogador_1_id);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_j2 ON public.mesas_futebol(jogador_2_id);

-- Permissões para mesas_futebol
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas_futebol TO authenticated;
GRANT SELECT ON public.mesas_futebol TO anon;
GRANT ALL ON public.mesas_futebol TO service_role;

-- RLS para mesas_futebol
ALTER TABLE public.mesas_futebol ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mesas_futebol
DROP POLICY IF EXISTS "mesas_select_publico" ON public.mesas_futebol;
CREATE POLICY "mesas_select_publico" ON public.mesas_futebol
  FOR SELECT USING (true);   -- lobby precisa listar mesas aguardando

DROP POLICY IF EXISTS "mesas_insert_dono" ON public.mesas_futebol;
CREATE POLICY "mesas_insert_dono" ON public.mesas_futebol
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = jogador_1_id);

DROP POLICY IF EXISTS "mesas_update_participante" ON public.mesas_futebol;
CREATE POLICY "mesas_update_participante" ON public.mesas_futebol
  FOR UPDATE TO authenticated
  USING (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id)
  WITH CHECK (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id);

DROP POLICY IF EXISTS "mesas_delete_participante" ON public.mesas_futebol;
CREATE POLICY "mesas_delete_participante" ON public.mesas_futebol
  FOR DELETE TO authenticated
  USING (auth.uid() = jogador_1_id OR auth.uid() = jogador_2_id);

-- ============================================================================
-- FUNÇÕES PARA CONTROLE DE PRESENÇA E INÍCIO DE PARTIDA
-- ============================================================================

-- Trigger de atualizado_em
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_mesa()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_atualizar_mesa ON public.mesas_futebol;
CREATE TRIGGER trigger_atualizar_mesa
BEFORE UPDATE ON public.mesas_futebol
FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_mesa();

-- Função para criar mesa
CREATE OR REPLACE FUNCTION public.criar_mesa_futebol(p_time TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mesa_id TEXT;
  v_uid     UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  -- Usar gen_random_uuid() em vez de gen_random_bytes
  v_mesa_id := 'mesa_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  INSERT INTO public.mesas_futebol AS m
    (mesa_id, jogador_1_id, time_j1, status, jogador_1_online, ultimo_heartbeat_j1)
  VALUES (v_mesa_id, v_uid, p_time, 'aguardando', true, now());

  RETURN v_mesa_id;
END; $$;

-- Entra como jogador 2 e já inicia a partida (atômico, sem corrida).
CREATE OR REPLACE FUNCTION public.entrar_mesa_futebol(p_mesa_id TEXT, p_time TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_mesa  public.mesas_futebol;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT m.* INTO v_mesa
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN RAISE EXCEPTION 'mesa inexistente'; END IF;

  -- Reconexão: já sou participante, apenas devolvo o estado atual.
  IF v_uid = v_mesa.jogador_1_id OR v_uid = v_mesa.jogador_2_id THEN
    RETURN public.registrar_heartbeat_mesa(p_mesa_id);
  END IF;

  IF v_mesa.jogador_2_id IS NOT NULL THEN RAISE EXCEPTION 'mesa cheia'; END IF;
  IF v_mesa.status <> 'aguardando' THEN RAISE EXCEPTION 'mesa indisponivel'; END IF;

  UPDATE public.mesas_futebol m
     SET jogador_2_id            = v_uid,
         time_j2                 = p_time,
         jogador_2_online        = true,
         ultimo_heartbeat_j2     = now(),
         jogador_1_online        = true,
         status                  = 'em_andamento',
         turno_atual_id          = m.jogador_1_id,   -- 1º turno: dono da mesa
         iniciado_em             = now(),
         tempo_restante_segundos = m.duracao_segundos
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para registrar heartbeat de jogador (manter presença)
CREATE OR REPLACE FUNCTION public.registrar_heartbeat_mesa(p_mesa_id TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_futebol;
BEGIN
  UPDATE public.mesas_futebol m
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

-- Relógio autoritativo (derivado de iniciado_em — não depende de tick)
CREATE OR REPLACE FUNCTION public.tempo_restante_mesa(p_mesa_id TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
           0,
           m.duracao_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(m.iniciado_em, now()))))::INT
         )
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id;
$$;

-- Sincroniza a coluna e finaliza quem chegou a 00:00. Chamada pelo cron/Edge Function.
CREATE OR REPLACE FUNCTION public.tick_mesas_futebol()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_afetadas INTEGER := 0;
BEGIN
  UPDATE public.mesas_futebol m
     SET tempo_restante_segundos = GREATEST(
           0, m.duracao_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - m.iniciado_em)))::INT)
   WHERE m.status = 'em_andamento' AND m.iniciado_em IS NOT NULL;

  UPDATE public.mesas_futebol m
     SET status             = 'finalizado',
         motivo_finalizacao = 'tempo_esgotado',
         turno_atual_id     = NULL,
         vencedor_id        = CASE
                                WHEN m.placar_j1 > m.placar_j2 THEN m.jogador_1_id
                                WHEN m.placar_j2 > m.placar_j1 THEN m.jogador_2_id
                                ELSE NULL
                              END
   WHERE m.status = 'em_andamento'
     AND m.tempo_restante_segundos <= 0;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  RETURN v_afetadas;
END; $$;

-- JOGADA + TROCA DE TURNO (versão sem ambiguidade)
-- Valida turno no servidor: quem não é da vez recebe exceção.
CREATE OR REPLACE FUNCTION public.registrar_jogada_mesa(
  p_mesa_id       TEXT,
  p_estado_fisico JSONB DEFAULT NULL,
  p_trocar_turno  BOOLEAN DEFAULT true
)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_mesa       public.mesas_futebol;
  v_proximo_id UUID;
  v_restante   INTEGER;
BEGIN
  SELECT m.* INTO v_mesa
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id
  FOR UPDATE;

  IF v_mesa.id IS NULL           THEN RAISE EXCEPTION 'mesa inexistente'; END IF;
  IF v_mesa.status <> 'em_andamento' THEN RAISE EXCEPTION 'partida nao esta em andamento'; END IF;
  IF v_uid IS DISTINCT FROM v_mesa.turno_atual_id THEN RAISE EXCEPTION 'nao e seu turno'; END IF;

  v_restante := GREATEST(0, v_mesa.duracao_segundos
                  - FLOOR(EXTRACT(EPOCH FROM (now() - v_mesa.iniciado_em)))::INT);
  IF v_restante <= 0 THEN
    PERFORM public.tick_mesas_futebol();
    RAISE EXCEPTION 'tempo esgotado';
  END IF;

  v_proximo_id := CASE
    WHEN NOT p_trocar_turno THEN v_mesa.turno_atual_id
    WHEN v_mesa.turno_atual_id = v_mesa.jogador_1_id THEN v_mesa.jogador_2_id
    ELSE v_mesa.jogador_1_id
  END;

  UPDATE public.mesas_futebol m
     SET turno_atual_id          = v_proximo_id,
         seq_jogada              = m.seq_jogada + 1,
         estado_fisico           = COALESCE(p_estado_fisico, m.estado_fisico),
         tempo_restante_segundos = v_restante
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para registrar gol
DROP FUNCTION IF EXISTS public.registrar_gol_mesa(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.registrar_gol_mesa(p_mesa_id TEXT, p_jogador_id UUID DEFAULT NULL)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alvo UUID := COALESCE(p_jogador_id, auth.uid());
  v_mesa public.mesas_futebol;
BEGIN
  UPDATE public.mesas_futebol m
     SET placar_j1 = m.placar_j1 + CASE WHEN m.jogador_1_id = v_alvo THEN 1 ELSE 0 END,
         placar_j2 = m.placar_j2 + CASE WHEN m.jogador_2_id = v_alvo THEN 1 ELSE 0 END
   WHERE m.mesa_id = p_mesa_id AND m.status = 'em_andamento'
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para abandonar partida
CREATE OR REPLACE FUNCTION public.abandonar_partida_mesa(p_mesa_id TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_futebol;
BEGIN
  UPDATE public.mesas_futebol m
     SET status             = 'finalizado',
         motivo_finalizacao = 'abandono',
         turno_atual_id     = NULL,
         vencedor_id        = CASE WHEN v_uid = m.jogador_1_id THEN m.jogador_2_id ELSE m.jogador_1_id END
   WHERE m.mesa_id = p_mesa_id AND m.status = 'em_andamento'
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- ============================================================================
-- GRANTS PARA AS RPCs
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.criar_mesa_futebol(TEXT)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.entrar_mesa_futebol(TEXT, TEXT)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_jogada_mesa(TEXT, JSONB, BOOLEAN)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_gol_mesa(TEXT, UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_heartbeat_mesa(TEXT)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandonar_partida_mesa(TEXT)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.tempo_restante_mesa(TEXT)                      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tick_mesas_futebol()                           TO service_role;

-- ============================================================================
-- REALTIME (Postgres Changes na mesa) + CRON do relógio
-- ============================================================================

ALTER TABLE public.mesas_futebol REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas_futebol;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cron: reconcilia o relógio e finaliza partidas expiradas a cada 5s.
-- (o countdown visual é local e derivado; o cron é a autoridade)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('tick_mesas_futebol') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tick_mesas_futebol');
SELECT cron.schedule('tick_mesas_futebol', '5 seconds', $$SELECT public.tick_mesas_futebol();$$);

NOTIFY pgrst, 'reload schema';
