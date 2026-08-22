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
  pontos_soberania INTEGER NOT NULL DEFAULT 50,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  progresso_caminpanha JSONB NOT NULL DEFAULT '{"titles":{"amador":0,"profissional":0,"lenda":0},"trophies":[],"friendlies":{"w":0,"d":0,"l":0}}',
  campeonatos_ganhos INTEGER NOT NULL DEFAULT 0,
  gols_feitos INTEGER NOT NULL DEFAULT 0,
  gols_sofridos INTEGER NOT NULL DEFAULT 0,
  vitorias INTEGER NOT NULL DEFAULT 0,
  derrotas INTEGER NOT NULL DEFAULT 0,
  empates INTEGER NOT NULL DEFAULT 0,
  -- Perfil da Cidadela vive em `cidadela_perfis` (cidadela_rpg.sql) — NÃO
  -- reintroduzir colunas duplicadas aqui (profissao/estado/reputacao/bio).
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraint para garantir que as 3 cores sejam únicas por usuário
  CONSTRAINT check_cores_unicas CHECK (array_length(cores, 1) = 3 AND cores[1] IS DISTINCT FROM cores[2] AND cores[2] IS DISTINCT FROM cores[3] AND cores[1] IS DISTINCT FROM cores[3])
);

-- Bônus de boas-vindas para perfis novos. Idempotente e não altera contas existentes.
ALTER TABLE public.botao_usuarios
  ALTER COLUMN pontos_soberania SET DEFAULT 50;


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

COMMIT;

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
    INSERT INTO public.botao_usuarios (user_id, email, nome, cores, time_personalizado, abreviacao_time, numero_jogador, pontos_soberania)
    VALUES (
      v_usuario_id,
      NEW.email,
      v_nome,
      v_cores,
      v_time_personalizado,
      v_abreviacao_time,
      v_numero_jogador,
      50
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

  -- Banco Central SOV: a carteira e o bônus de cadastro (50 SOV) nascem no
  -- ledger junto com o perfil — o SOV do usuário novo nasce na fonte
  -- financeira oficial (bank_ledger → user_wallets), nunca só no cache
  -- pontos_soberania. sov_bank_bonus_cadastro cria a carteira e credita o
  -- bônus de forma idempotente (chave signup:{user}). Se o sistema
  -- financeiro ainda não estiver aplicado, o cadastro não quebra: o
  -- frontend refaz a tentativa (idempotente) no primeiro login.
  IF v_usuario_criado THEN
    BEGIN
      PERFORM sov_bank_bonus_cadastro(v_usuario_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Bônus de cadastro não creditado para %: %', v_usuario_id, SQLERRM;
    END;
  END IF;

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

COMMIT;

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

COMMIT;

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

COMMIT;

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
DROP POLICY IF EXISTS "Dono pode criar proprio perfil" ON public.botao_usuarios;
CREATE POLICY "Dono pode criar proprio perfil" ON public.botao_usuarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Autenticados podem atualizar usuarios" ON public.botao_usuarios;
DROP POLICY IF EXISTS "Dono pode atualizar proprio perfil" ON public.botao_usuarios;
CREATE POLICY "Dono pode atualizar proprio perfil" ON public.botao_usuarios
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Excluir a própria conta (personalização/excluir conta). Só o dono.
DROP POLICY IF EXISTS "Dono pode excluir propria conta" ON public.botao_usuarios;
CREATE POLICY "Dono pode excluir propria conta" ON public.botao_usuarios
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

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

COMMIT;

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
  -- Buscar formato do lobby antes do update
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
  
  -- Decrementar jogadas E alternar turno em um único UPDATE atômico
  UPDATE public.botao_blocos
  SET jogadas_restantes = jogadas_restantes - 1,
      turno = CASE 
        WHEN turno = 'jogador1' THEN 'jogador2'
        ELSE 'jogador1'
      END,
      timestamp_inicio_turno = now()
  WHERE id = p_bloco_id
  RETURNING jogadas_restantes INTO jogadas;
  
  -- Verificar se acabaram as jogadas
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

-- Função para limpar mesas de futebol antigas (mais de 5 minutos após início)
CREATE OR REPLACE FUNCTION limpar_mesas_antigas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Finalizar mesas em andamento há mais de 5 minutos
    UPDATE public.mesas_futebol
    SET status = 'finalizado',
        motivo_finalizacao = 'tempo_esgotado',
        turno_atual_id = NULL,
        vencedor_id = CASE
            WHEN placar_j1 > placar_j2 THEN jogador_1_id
            WHEN placar_j2 > placar_j1 THEN jogador_2_id
            ELSE NULL
        END
    WHERE status = 'em_andamento'
      AND iniciado_em IS NOT NULL
      AND iniciado_em < now() - interval '5 minutes';

    -- Deletar mesas finalizadas há mais de 10 minutos (para não poluir banco)
    DELETE FROM public.mesas_futebol
    WHERE status = 'finalizado'
      AND (atualizado_em < now() - interval '10 minutes' OR 
           (atualizado_em IS NULL AND criado_em < now() - interval '10 minutes'));
END;
$$;

COMMIT;

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
  time_j2                  TEXT NOT NULL DEFAULT 'MTI',

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

-- Corrigir constraint time_j2 para permitir NULL (já existente)
ALTER TABLE public.mesas_futebol ALTER COLUMN time_j2 DROP NOT NULL;
ALTER TABLE public.mesas_futebol ALTER COLUMN time_j2 SET DEFAULT NULL;

COMMIT;

-- Índices para mesas_futebol
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_mesa_id ON public.mesas_futebol(mesa_id);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_status ON public.mesas_futebol(status);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_j1 ON public.mesas_futebol(jogador_1_id);
CREATE INDEX IF NOT EXISTS idx_mesas_futebol_j2 ON public.mesas_futebol(jogador_2_id);

-- Permissões para mesas_futebol
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas_futebol TO authenticated;
GRANT SELECT ON public.mesas_futebol TO anon;
GRANT ALL ON public.mesas_futebol TO service_role;

COMMIT;

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

COMMIT;

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

COMMIT;

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

-- Reinicia a mesa para a próxima partida de uma série (melhor de 3).
-- Idempotente: se já estiver resetada (status=em_andamento, seq=0), apenas retorna.
-- Usada por ambos os clientes após o fim de um jogo da série.
CREATE OR REPLACE FUNCTION public.reiniciar_mesa(p_mesa_id TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_futebol;
BEGIN
  SELECT m.* INTO v_mesa
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id
    AND (m.jogador_1_id = v_uid OR m.jogador_2_id = v_uid)
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN
    RAISE EXCEPTION 'mesa inexistente ou usuario nao e participante';
  END IF;

  -- Se a partida já está em andamento e sem jogadas, não faz nada (idempotente)
  IF v_mesa.status = 'em_andamento' AND v_mesa.seq_jogada = 0 THEN
    RETURN v_mesa;
  END IF;

  -- Só reinicia se estiver finalizada (fim de um jogo da série)
  IF v_mesa.status <> 'finalizado' THEN
    RAISE EXCEPTION 'mesa nao esta finalizada para reiniciar';
  END IF;

  UPDATE public.mesas_futebol m
     SET status                  = 'em_andamento',
         turno_atual_id          = m.jogador_1_id,
         iniciado_em             = now(),
         tempo_restante_segundos = m.duracao_segundos,
         placar_j1               = 0,
         placar_j2               = 0,
         seq_jogada              = 0,
         vencedor_id              = NULL,
         motivo_finalizacao       = NULL
   WHERE m.mesa_id = p_mesa_id
  RETURNING m.* INTO v_mesa;

  RETURN v_mesa;
END; $$;

-- Função para iniciar partida manualmente (usada quando 2 jogadores estão conectados)
DROP FUNCTION IF EXISTS public.iniciar_partida_mesa(TEXT);
CREATE OR REPLACE FUNCTION public.iniciar_partida_mesa(p_mesa_id TEXT)
RETURNS public.mesas_futebol
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_mesa public.mesas_futebol;
BEGIN
  -- Verificar se o usuário é participante da mesa
  SELECT m.* INTO v_mesa
  FROM public.mesas_futebol m
  WHERE m.mesa_id = p_mesa_id
    AND (m.jogador_1_id = v_uid OR m.jogador_2_id = v_uid)
  FOR UPDATE;

  IF v_mesa.id IS NULL THEN
    RAISE EXCEPTION 'mesa inexistente ou usuario nao e participante';
  END IF;

  IF v_mesa.status <> 'aguardando' THEN
    RAISE EXCEPTION 'mesa ja esta em andamento ou finalizada';
  END IF;

  IF v_mesa.jogador_2_id IS NULL THEN
    RAISE EXCEPTION 'mesa precisa de 2 jogadores para iniciar';
  END IF;

  -- Iniciar partida: mudar status, definir turno do criador (jogador_1), iniciar relógio
  UPDATE public.mesas_futebol m
     SET status                  = 'em_andamento',
         turno_atual_id          = m.jogador_1_id,  -- Criador começa
         iniciado_em             = now(),
         tempo_restante_segundos = m.duracao_segundos,
         jogador_1_online        = true,
         jogador_2_online        = true
   WHERE m.mesa_id = p_mesa_id
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
GRANT EXECUTE ON FUNCTION public.reiniciar_mesa(TEXT)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_partida_mesa(TEXT)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.tempo_restante_mesa(TEXT)                      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tick_mesas_futebol()                           TO service_role;

COMMIT;

-- ============================================================================
-- REALTIME (Postgres Changes na mesa) + CRON do relógio
-- ============================================================================

ALTER TABLE public.mesas_futebol REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas_futebol;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cron: reconcilia o relógio, finaliza partidas expiradas e limpa mesas antigas a cada 5s.
-- (o countdown visual é local e derivado; o cron é a autoridade)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('tick_mesas_futebol') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tick_mesas_futebol');
SELECT cron.schedule('tick_mesas_futebol', '5 seconds', $$SELECT public.tick_mesas_futebol(); SELECT public.limpar_mesas_antigas();$$);

COMMIT;

-- ============================================================================
-- MODO CARREIRA / TREINADOR (v3)
-- Persistência de coach, estado de campanha, escolhas e manchetes
-- ============================================================================

-- Colunas de perfil do treinador (aditivas em botao_usuarios)
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS coach_nome TEXT;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS coach_apelido TEXT;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS coach_cidade TEXT;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS coach_estilo TEXT NOT NULL DEFAULT 'equilibrado'
  CHECK (coach_estilo IN ('ataque','equilibrado','defesa'));
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS coach_bio TEXT;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS campanhas_jogadas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS titulos_treinador INTEGER NOT NULL DEFAULT 0;

-- Estado da campanha atual (efêmero por campanha, mas persistido pra continuar depois)
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS moral_time INTEGER NOT NULL DEFAULT 65;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS bonus_proxima_partida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS penalties_proxima_partida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS evento_pendente_id TEXT;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS ultimas_escolhas JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS ultima_rodada_processada INTEGER NOT NULL DEFAULT -1;
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS dificuldade_atual TEXT
  CHECK (dificuldade_atual IN ('amador','profissional','lenda'));

COMMIT;

-- ============================================================================
-- PERSONALIZAÇÃO PS2: tática/formação + nomes individuais dos botões
-- Aditivo (ADD COLUMN IF NOT EXISTS). Executa idempotente em re-aplicações.
-- ============================================================================
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS tatica TEXT NOT NULL DEFAULT '1-2-2'
  CHECK (tatica IN ('1-2-2','1-3-1','1-1-3','1-2-1-1','2-2-1'));

-- Nomes personalizados dos 5 botões de linha (índice 0..4). JSONB array de texto.
-- Ex.: ["Zagueiro","Volante","Meia","Ponta","Atacante"]
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS botoes_nomes JSONB NOT NULL DEFAULT
  '["Zagueiro","Volante","Meia","Ponta","Centroavante"]'::JSONB;

-- Escudo personalizado do time (emoji ou texto)
ALTER TABLE public.botao_usuarios ADD COLUMN IF NOT EXISTS escudo TEXT DEFAULT '⚽';

-- Garante que botoes_nomes tenha exatamente 5 entradas de texto não-vazias.
ALTER TABLE public.botao_usuarios DROP CONSTRAINT IF EXISTS check_botoes_nomes;
ALTER TABLE public.botao_usuarios ADD CONSTRAINT check_botoes_nomes CHECK (
  jsonb_array_length(botoes_nomes) = 5
  AND jsonb_typeof(botoes_nomes) = 'array'
);

-- Função para atualizar a personalização do clube (nome/time/cores/tática/botões/escudo).
-- Usuário só pode editar o próprio perfil (auth.uid() = p_uid).
DROP FUNCTION IF EXISTS public.atualizar_perfil_clube(UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB);
DROP FUNCTION IF EXISTS public.atualizar_perfil_clube(UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.atualizar_perfil_clube(
  p_uid         UUID,
  p_nome        TEXT DEFAULT NULL,
  p_time        TEXT DEFAULT NULL,
  p_abreviacao  TEXT DEFAULT NULL,
  p_cores       TEXT[] DEFAULT NULL,
  p_tatica      TEXT DEFAULT NULL,
  p_botoes      JSONB DEFAULT NULL,
  p_escudo      TEXT DEFAULT NULL
) RETURNS public.botao_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.botao_usuarios;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_uid THEN
    RAISE EXCEPTION 'Sem permissão: você só pode editar seu próprio perfil.';
  END IF;

  UPDATE public.botao_usuarios SET
    nome              = COALESCE(p_nome, nome),
    time_personalizado = COALESCE(p_time, time_personalizado),
    abreviacao_time   = UPPER(COALESCE(p_abreviacao, abreviacao_time)),
    cores             = COALESCE(p_cores, cores),
    tatica            = COALESCE(p_tatica, tatica),
    botoes_nomes      = COALESCE(p_botoes, botoes_nomes),
    escudo            = COALESCE(p_escudo, escudo),
    updated_at        = now()
  WHERE user_id = p_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

GRANT EXECUTE ON FUNCTION public.atualizar_perfil_clube(UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT) TO authenticated;

COMMIT;

-- Tabela de manchetes (jornal do torneio)
CREATE TABLE IF NOT EXISTS public.botao_manchetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.botao_usuarios(user_id) ON DELETE CASCADE,
  manchete TEXT NOT NULL,
  subtitulo TEXT,
  tag TEXT NOT NULL DEFAULT 'geral'
    CHECK (tag IN ('seu-time','geral','polemica','zebra','coletiva')),
  rodada INTEGER NOT NULL DEFAULT 0,
  campanha_iniciada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botao_manchetes_user ON public.botao_manchetes(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_manchetes TO authenticated;
GRANT SELECT ON public.botao_manchetes TO anon;
GRANT ALL ON public.botao_manchetes TO service_role;

ALTER TABLE public.botao_manchetes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manchetes_select_dono" ON public.botao_manchetes;
CREATE POLICY "manchetes_select_dono" ON public.botao_manchetes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "manchetes_insert_dono" ON public.botao_manchetes;
CREATE POLICY "manchetes_insert_dono" ON public.botao_manchetes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "manchetes_delete_dono" ON public.botao_manchetes;
CREATE POLICY "manchetes_delete_dono" ON public.botao_manchetes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMIT;

-- Função para aplicar resultado da partida em modo carreira (pontos escassos + moral)
-- V=+3 · E=+1 · D=-3 · Campeão +20 · Vice +15 · 3º +10 · 4º +5
-- Título por dificuldade: Amador +100 · Prof +250 · Lenda +500
CREATE OR REPLACE FUNCTION public.aplicar_resultado_carreira(
  p_gols_pro INTEGER,
  p_gols_contra INTEGER,
  p_ultima_escolha TEXT DEFAULT NULL
)
RETURNS public.botao_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_row       public.botao_usuarios;
  v_delta_sob INTEGER := 0;
  v_delta_mor INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  IF p_gols_pro > p_gols_contra THEN
    v_delta_sob := 3;  v_delta_mor := 4;
  ELSIF p_gols_pro < p_gols_contra THEN
    v_delta_sob := -3; v_delta_mor := -6;
  ELSE
    v_delta_sob := 1;  v_delta_mor := -1;
  END IF;

  -- Bônus condicionais de coletiva
  IF p_ultima_escolha = 'goleada' THEN
    IF (p_gols_pro - p_gols_contra) >= 2 THEN v_delta_sob := v_delta_sob + 5;
    ELSIF p_gols_pro < p_gols_contra THEN v_delta_sob := v_delta_sob - 3;
    END IF;
  ELSIF p_ultima_escolha = 'respeito' AND p_gols_pro > p_gols_contra THEN
    v_delta_sob := v_delta_sob + 2;
  END IF;

  UPDATE public.botao_usuarios u
     SET pontos_soberania      = GREATEST(0, u.pontos_soberania + v_delta_sob),
         moral_time            = GREATEST(0, LEAST(100, u.moral_time + v_delta_mor)),
         gols_feitos           = u.gols_feitos + p_gols_pro,
         gols_sofridos         = u.gols_sofridos + p_gols_contra,
         partidas_jogadas      = u.partidas_jogadas + 1,
         vitorias              = u.vitorias + CASE WHEN p_gols_pro > p_gols_contra THEN 1 ELSE 0 END,
         empates               = u.empates + CASE WHEN p_gols_pro = p_gols_contra THEN 1 ELSE 0 END,
         derrotas              = u.derrotas + CASE WHEN p_gols_pro < p_gols_contra THEN 1 ELSE 0 END,
         bonus_proxima_partida = 0,
         penalties_proxima_partida = 0,
         updated_at            = now()
   WHERE u.user_id = v_uid
  RETURNING u.* INTO v_row;

  RETURN v_row;
END; $$;

-- Função para aplicar bônus/penalidade de posição final na campanha
CREATE OR REPLACE FUNCTION public.aplicar_fim_de_campanha(
  p_posicao TEXT,          -- 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'fora'
  p_dificuldade TEXT       -- 'amador' | 'profissional' | 'lenda'
)
RETURNS public.botao_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_row    public.botao_usuarios;
  v_bonus  INTEGER := 0;
  v_titulo INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  v_bonus := CASE p_posicao
    WHEN 'campeao'   THEN 20
    WHEN 'vice'      THEN 15
    WHEN 'terceiro'  THEN 10
    WHEN 'quarto'    THEN 5
    ELSE 0
  END;

  IF p_posicao = 'campeao' THEN
    v_bonus := v_bonus + CASE p_dificuldade
      WHEN 'amador'        THEN 100
      WHEN 'profissional'  THEN 250
      WHEN 'lenda'         THEN 500
      ELSE 0
    END;
    v_titulo := 1;
  END IF;

  UPDATE public.botao_usuarios u
     SET pontos_soberania    = GREATEST(0, u.pontos_soberania + v_bonus),
         titulos_treinador   = u.titulos_treinador + v_titulo,
         campeonatos_ganhos  = u.campeonatos_ganhos + v_titulo,
         dificuldade_atual   = NULL,
         evento_pendente_id  = NULL,
         moral_time          = 65,
         ultimas_escolhas    = '[]'::JSONB,
         ultima_rodada_processada = -1,
         updated_at          = now()
   WHERE u.user_id = v_uid
  RETURNING u.* INTO v_row;

  RETURN v_row;
END; $$;

-- Função para aplicar efeito de escolha imediata (bonus_proxima_partida, moral, etc.)
CREATE OR REPLACE FUNCTION public.aplicar_escolha_treinador(
  p_choice_id TEXT,
  p_delta_poder INTEGER DEFAULT 0,
  p_delta_moral INTEGER DEFAULT 0
)
RETURNS public.botao_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_usuarios;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  UPDATE public.botao_usuarios u
     SET bonus_proxima_partida = u.bonus_proxima_partida + p_delta_poder,
         moral_time            = GREATEST(0, LEAST(100, u.moral_time + p_delta_moral)),
         ultimas_escolhas      = COALESCE(
           (u.ultimas_escolhas::JSONB) || to_jsonb(p_choice_id),
           to_jsonb(ARRAY[p_choice_id])
         ),
         evento_pendente_id    = NULL,
         updated_at            = now()
   WHERE u.user_id = v_uid
  RETURNING u.* INTO v_row;

  RETURN v_row;
END; $$;

-- Iniciar nova campanha (reseta o estado de carreira mas mantém coach e soberania)
CREATE OR REPLACE FUNCTION public.iniciar_campanha(p_dificuldade TEXT)
RETURNS public.botao_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_usuarios;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  UPDATE public.botao_usuarios u
     SET dificuldade_atual         = p_dificuldade,
         moral_time                = 65,
         bonus_proxima_partida     = 0,
         penalties_proxima_partida = 0,
         evento_pendente_id        = NULL,
         ultimas_escolhas          = '[]'::JSONB,
         ultima_rodada_processada  = -1,
         campanhas_jogadas         = u.campanhas_jogadas + 1,
         updated_at                = now()
   WHERE u.user_id = v_uid
  RETURNING u.* INTO v_row;

  -- Limpar manchetes de campanhas anteriores
  DELETE FROM public.botao_manchetes WHERE user_id = v_uid;

  RETURN v_row;
END; $$;

GRANT EXECUTE ON FUNCTION public.aplicar_resultado_carreira(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_fim_de_campanha(TEXT, TEXT)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_escolha_treinador(TEXT, INTEGER, INTEGER)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_campanha(TEXT)                              TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- EXTENSÃO: MODO CAMPEONATO ONLINE
-- As instruções desta extensão foram separadas em:
--   supabase/migrations/futebol_campeonato_online.sql
-- (tabela botao_campeonatos_online + RPCs criar/entrar/sair/iniciar/
--  vincular_mesa/registrar_resultado + colunas modalidade/campeonato_id
--  em mesas_futebol). Execute-as logo após este arquivo.
-- ============================================================================


-- ============================================================================
-- MODO CAMPEONATO ONLINE (multi-jogador) — consolidado em futebol.sql
-- ============================================================================

COMMIT;

-- MODO CAMPEONATO ONLINE (multi-jogador) — extensão aditiva
-- Reaproveita mesas_futebol (1 mesa = 1 partida) e adiciona um campeonato
-- que agrupa N partidas entre os jogadores de uma sala.
--
-- Este bloco é complementar a futebol.sql e pode ser executado depois dele.
-- ============================================================================

-- Tabela de campeonatos online
CREATE TABLE IF NOT EXISTS public.botao_campeonatos_online (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo          TEXT NOT NULL UNIQUE,                       -- código curto de sala
  nome            TEXT NOT NULL DEFAULT 'Campeonato Online',
  criador_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'aguardando'
                  CHECK (status IN ('aguardando','em_andamento','finalizado','cancelado')),
  max_jogadores   INTEGER NOT NULL DEFAULT 4 CHECK (max_jogadores BETWEEN 2 AND 8),
  fase            INTEGER NOT NULL DEFAULT 0,                 -- 0=espera · 1..n=rodadas · -1=fim
  participantes   JSONB NOT NULL DEFAULT '[]'::JSONB,         -- [{user_id, nome, time_id, abreviacao, pontos, gols_pro, gols_contra}]
  confrontos      JSONB NOT NULL DEFAULT '[]'::JSONB,         -- [{rodada, mesa_id, j1_id, j2_id, pl_j1, pl_j2, status, bye}]
  rodada_atual    INTEGER NOT NULL DEFAULT 0,
  vencedor_id     UUID REFERENCES auth.users(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_codigo ON public.botao_campeonatos_online(codigo);
CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_status ON public.botao_campeonatos_online(status);
CREATE INDEX IF NOT EXISTS idx_botao_campeonatos_criador ON public.botao_campeonatos_online(criador_id);

COMMIT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_campeonatos_online TO authenticated;
GRANT SELECT ON public.botao_campeonatos_online TO anon;
GRANT ALL ON public.botao_campeonatos_online TO service_role;

ALTER TABLE public.botao_campeonatos_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campeonato_select_publico" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_select_publico" ON public.botao_campeonatos_online
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campeonato_insert_criador" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_insert_criador" ON public.botao_campeonatos_online
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criador_id);

DROP POLICY IF EXISTS "campeonato_update_participantes" ON public.botao_campeonatos_online;
CREATE POLICY "campeonato_update_participantes" ON public.botao_campeonatos_online
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

COMMIT;

-- Trigger de atualizado_em
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_campeonato()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_atualizar_campeonato ON public.botao_campeonatos_online;
CREATE TRIGGER trigger_atualizar_campeonato
BEFORE UPDATE ON public.botao_campeonatos_online
FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_campeonato();

COMMIT;

-- Realtime para campeonatos
ALTER TABLE public.botao_campeonatos_online REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.botao_campeonatos_online;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Modo da mesa (amistoso | campeonato) — coluna aditiva em mesas_futebol
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT 'amistoso'
  CHECK (modalidade IN ('amistoso','campeonato'));
ALTER TABLE public.mesas_futebol
  ADD COLUMN IF NOT EXISTS campeonato_id BIGINT REFERENCES public.botao_campeonatos_online(id) ON DELETE CASCADE;

COMMIT;

-- ---------------------------------------------------------------------------
-- Campeonato Online ao Vivo — campos de evento (aditivos, retro-compatíveis).
-- A arquitetura (participantes/confrontos JSONB, mesas, ledger) já existe;
-- aqui só entram os metadados de calendário/formato que nenhuma coluna atual
-- representa. max_jogadores sobe para 32 (era 8).
-- ---------------------------------------------------------------------------
ALTER TABLE public.botao_campeonatos_online
  DROP CONSTRAINT IF EXISTS botao_campeonatos_online_max_jogadores_check;
ALTER TABLE public.botao_campeonatos_online
  ADD CONSTRAINT botao_campeonatos_online_max_jogadores_check CHECK (max_jogadores BETWEEN 2 AND 32);

ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS formato TEXT NOT NULL DEFAULT 'liga'
  CHECK (formato IN ('liga','grupos'));
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS agendado_em TIMESTAMPTZ;             -- início do evento
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS duracao_partida_min INTEGER NOT NULL DEFAULT 6;
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS intervalo_min INTEGER NOT NULL DEFAULT 4;
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS tolerancia_min INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.botao_campeonatos_online
  ADD COLUMN IF NOT EXISTS premio_sov INTEGER NOT NULL DEFAULT 50;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: criar_campeonato_online(p_nome TEXT, p_max INTEGER DEFAULT 4)
-- Cria a sala, insere o criador como primeiro participante e devolve a row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_campeonato_online(
  p_nome TEXT DEFAULT 'Campeonato Online',
  p_max INTEGER DEFAULT 4
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_row   public.botao_campeonatos_online;
  v_part  JSONB;
  v_codigo TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF p_max NOT BETWEEN 2 AND 8 THEN RAISE EXCEPTION 'max_jogadores precisa estar entre 2 e 8'; END IF;

  v_codigo := 'CAMP-' || to_char(now(), 'YYMMDDHH24MISSMS') || '-'
              || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 6);

  v_part := jsonb_build_array(jsonb_build_object(
    'user_id', v_uid,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'time_id', COALESCE((SELECT time_personalizado FROM public.botao_usuarios WHERE user_id = v_uid), 'Meu Time'),
    'abreviacao', COALESCE((SELECT abreviacao_time FROM public.botao_usuarios WHERE user_id = v_uid), 'MTI'),
    'pontos', 0,
    'gols_pro', 0,
    'gols_contra', 0
  ));

  INSERT INTO public.botao_campeonatos_online (codigo, nome, criador_id, max_jogadores, participantes)
  VALUES (v_codigo, p_nome, v_uid, p_max, v_part)
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: entrar_campeonato_online(p_codigo TEXT)
-- Adiciona o usuário como participante se houver vaga e a sala ainda aguarda.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.entrar_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
  v_novo JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aberto'; END IF;
  IF jsonb_array_length(v_row.participantes) >= v_row.max_jogadores THEN
    RAISE EXCEPTION 'campeonato cheio';
  END IF;

  v_part := v_row.participantes;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_part) el WHERE el->>'user_id' = v_uid::TEXT) THEN
    RETURN v_row;  -- já é participante
  END IF;

  v_novo := jsonb_build_object(
    'user_id', v_uid,
    'nome', COALESCE((SELECT nome FROM public.botao_usuarios WHERE user_id = v_uid), 'Jogador'),
    'time_id', COALESCE((SELECT time_personalizado FROM public.botao_usuarios WHERE user_id = v_uid), 'Meu Time'),
    'abreviacao', COALESCE((SELECT abreviacao_time FROM public.botao_usuarios WHERE user_id = v_uid), 'MTI'),
    'pontos', 0,
    'gols_pro', 0,
    'gols_contra', 0
  );

  UPDATE public.botao_campeonatos_online
     SET participantes = v_part || jsonb_build_array(v_novo)
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: sair_campeonato_online(p_codigo TEXT)
-- Remove o usuário da sala se ainda não começou.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sair_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_part JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato ja comecou'; END IF;

  v_part := (
    SELECT COALESCE(jsonb_agg(el), '[]'::JSONB)
    FROM jsonb_array_elements(v_row.participantes) el
    WHERE el->>'user_id' <> v_uid::TEXT
  );

  UPDATE public.botao_campeonatos_online
     SET participantes = v_part
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Helper: gerar confrontos round-robin (circle method) em JS puro no cliente.
-- A versão SQL abaixo só é usada pelo iniciar_campeonato_online.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gerar_confrontos_campeonato(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_n INTEGER := array_length(p_ids, 1);
  v_ids UUID[] := p_ids;
  v_fixo UUID;
  v_rodadas JSONB := '[]'::JSONB;
  v_rodada JSONB;
  v_round INTEGER;
  v_i INTEGER;
  v_half INTEGER;
  v_arr UUID[];
  v_tmp UUID;
  v_pares JSONB;
  v_p JSONB;
  v_home UUID;
  v_away UUID;
BEGIN
  IF v_n IS NULL OR v_n < 2 THEN RETURN '[]'::JSONB; END IF;
  IF v_n % 2 = 1 THEN
    v_ids := v_ids || ARRAY[NULL::UUID];
    v_n := v_n + 1;
  END IF;

  v_fixo := v_ids[1];
  v_arr := v_ids[2:v_n];

  FOR v_round IN 1..(v_n - 1) LOOP
    v_pares := '[]'::JSONB;
    v_half := v_n / 2;
    FOR v_i IN 1..v_half LOOP
      IF v_i = 1 THEN
        v_home := v_fixo;
        v_away := v_arr[v_half];
      ELSE
        v_home := v_arr[v_i - 1];
        v_away := v_arr[v_n - v_i + 1];
      END IF;
      v_p := jsonb_build_object('j1_id', v_home, 'j2_id', v_away, 'bye', v_home IS NULL OR v_away IS NULL);
      v_pares := v_pares || jsonb_build_array(v_p);
    END LOOP;

    v_rodada := jsonb_build_object('rodada', v_round, 'pares', v_pares);
    v_rodadas := v_rodadas || jsonb_build_array(v_rodada);

    -- rotaciona v_arr à esquerda
    v_tmp := v_arr[1];
    v_arr := v_arr[2:array_length(v_arr,1)] || ARRAY[v_tmp];
  END LOOP;

  RETURN v_rodadas;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC auxiliar: gera a fase de grupos (formato "grupos") como JSONB de
-- confrontos. Espelha o motor puro campeonatoEngine.ts (serpente + circle
-- method). Cada grupo ocupa sua própria mesa (rótulo A, B, C...); cada
-- confronto carrega grupo/fase/mesa. Não toca em SOV.
--   p_ids: array de UUIDs dos participantes (tamanho par).
-- Retorna: [{rodada, grupo, fase, mesa, j1_id, j2_id, pl_j1, pl_j2, status, bye}]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gerar_fase_grupos_campeonato(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_n INTEGER := array_length(p_ids, 1);
  v_num_grupos INTEGER;
  v_por_grupo INTEGER;
  v_grupos UUID[][];
  v_g INTEGER;
  v_i INTEGER;
  v_r INTEGER;
  v_grupo UUID[];
  v_rodadas JSONB;
  v_pares JSONB;
  v_par JSONB;
  v_confrontos JSONB := '[]'::JSONB;
  v_idx INTEGER;
  v_dir INTEGER;
  v_half INTEGER;
  v_fixo UUID;
  v_rot UUID[];
  v_home UUID;
  v_away UUID;
  v_tmp UUID;
  v_gn TEXT;
BEGIN
  IF v_n IS NULL OR v_n < 2 THEN RETURN '[]'::JSONB; END IF;

  -- numGrupos = maior potência de 2 (2..8) com grupos de 2..8 (alvo ~4).
  v_num_grupos := 2;
  FOREACH v_g IN ARRAY ARRAY[8, 4, 2] LOOP
    IF v_n % v_g = 0 AND (v_n / v_g) BETWEEN 2 AND 8 THEN
      -- prefere o que deixa o grupo mais próximo de 4
      IF abs((v_n / v_g) - 4) < abs((v_n / v_num_grupos) - 4) THEN
        v_num_grupos := v_g;
      END IF;
    END IF;
  END LOOP;
  v_por_grupo := v_n / v_num_grupos;

  -- Distribuição serpente (equilibra força entre grupos).
  v_grupos := (SELECT array_agg(ARRAY[]::UUID[]) FROM generate_series(1, v_num_grupos));
  FOR v_i IN 1..v_n LOOP
    v_idx := ((v_i - 1) % v_num_grupos);
    v_dir := CASE WHEN (((v_i - 1) / v_num_grupos) % 2) = 0 THEN 1 ELSE -1 END;
    v_g := CASE WHEN v_dir = 1 THEN v_idx + 1 ELSE v_num_grupos - v_idx END;
    v_grupos[v_g] := v_grupos[v_g] || p_ids[v_i];
  END LOOP;

  -- Circle-method dentro de cada grupo; mesa = letra do grupo.
  FOR v_g IN 1..v_num_grupos LOOP
    v_grupo := v_grupos[v_g];
    v_gn := chr(64 + v_g); -- A, B, C...
    -- round-robin
    DECLARE
      v_m INTEGER := array_length(v_grupo, 1);
    BEGIN
      IF v_m % 2 = 1 THEN v_grupo := v_grupo || NULL::UUID; v_m := v_m + 1; END IF;
      v_fixo := v_grupo[1];
      v_rot := v_grupo[2:v_m];
      FOR v_r IN 1..(v_m - 1) LOOP
        v_half := v_m / 2;
        FOR v_i IN 1..v_half LOOP
          IF v_i = 1 THEN v_home := v_fixo; v_away := v_rot[v_half];
          ELSE v_home := v_rot[v_i - 1]; v_away := v_rot[v_m - v_i]; END IF;
          v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
            'rodada', v_r, 'grupo', v_gn, 'fase', 'grupos', 'mesa', v_gn,
            'j1_id', v_home, 'j2_id', v_away, 'pl_j1', NULL, 'pl_j2', NULL,
            'status', CASE WHEN v_home IS NULL OR v_away IS NULL THEN 'finalizado' ELSE 'pendente' END,
            'bye', v_home IS NULL OR v_away IS NULL));
        END LOOP;
        v_tmp := v_rot[1];
        v_rot := v_rot[2:array_length(v_rot,1)] || ARRAY[v_tmp];
      END LOOP;
    END;
  END LOOP;

  RETURN v_confrontos;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: iniciar_campeonato_online(p_codigo TEXT)
-- Sorteia confrontos (round-robin), marca status em_andamento e devolve a row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iniciar_campeonato_online(p_codigo TEXT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_ids UUID[];
  v_id UUID;
  v_rodadas JSONB;
  v_confrontos JSONB := '[]'::JSONB;
  v_r RECORD;
  v_p RECORD;
  v_c JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.codigo = p_codigo FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.criador_id <> v_uid THEN RAISE EXCEPTION 'so o criador pode iniciar'; END IF;
  IF v_row.status <> 'aguardando' THEN RAISE EXCEPTION 'campeonato nao esta aguardando'; END IF;
  IF jsonb_array_length(v_row.participantes) < 2 THEN RAISE EXCEPTION 'minimo de 2 jogadores'; END IF;

  v_ids := ARRAY[]::UUID[];
  FOR v_id IN SELECT (el->>'user_id')::UUID FROM jsonb_array_elements(v_row.participantes) el LOOP
    v_ids := v_ids || ARRAY[v_id];
  END LOOP;

  IF COALESCE(v_row.formato, 'liga') = 'grupos' THEN
    -- Formato GRUPOS: a RPC gera os confrontos completos (grupo/fase/mesa).
    -- Byes já vêm marcados como finalizados. Mata-mata é gerado ao completar.
    v_confrontos := public._gerar_fase_grupos_campeonato(v_ids);
  ELSE
    -- Formato LIGA (padrão): round-robin único (comportamento legado).
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
          'status', 'pendente',
          'bye', COALESCE((v_p.par->>'bye')::BOOLEAN, false)
        );
        v_confrontos := v_confrontos || jsonb_build_array(v_c);
      END LOOP;
    END LOOP;
  END IF;

  UPDATE public.botao_campeonatos_online
     SET status = 'em_andamento',
         fase = 1,
         rodada_atual = 1,
         confrontos = v_confrontos,
         agendado_em = COALESCE(agendado_em, now())
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: vincular_mesa_campeonato(p_campeonato_id BIGINT, p_rodada INTEGER, p_mesa_id TEXT)
-- Marca a mesa recém-criada no confronto correspondente (jogador é participante).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vincular_mesa_campeonato(
  p_campeonato_id BIGINT,
  p_rodada INTEGER,
  p_mesa_id TEXT
)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.botao_campeonatos_online;
  v_confrontos JSONB;
  v_idx INTEGER;
  v_total INTEGER;
  v_item JSONB;
  v_j1 UUID;
  v_j2 UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx + 1];
    IF (v_item->>'rodada')::INT = p_rodada
       AND v_item->>'mesa_id' IS NULL
       AND v_item->>'status' = 'pendente'
       AND COALESCE((v_item->>'bye')::BOOLEAN, false) = false THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      IF v_uid = v_j1 OR v_uid = v_j2 THEN
        v_item := jsonb_set(v_item, '{mesa_id}', to_jsonb(p_mesa_id));
        v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx + 1], v_item);
        UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos
         WHERE id = v_row.id RETURNING * INTO v_row;
        RETURN v_row;
      END IF;
    END IF;
  END LOOP;

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: abrir_mesa_campeonato(p_campeonato_id BIGINT, p_rodada INTEGER)
-- Idempotente: cria UMA mesa compartilhada para o confronto (jogador_1=j1_id,
-- jogador_2=j2_id) ou devolve a mesa já existente. Ambos os jogadores chamam
-- esta mesma função e caem na mesma mesa — elimina mesas duplicadas e a race
-- condition de quem clica primeiro. O mesa_id é gravado no confronto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abrir_mesa_campeonato(
  p_campeonato_id BIGINT,
  p_rodada INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_row        public.botao_campeonatos_online;
  v_confrontos JSONB;
  v_total      INTEGER;
  v_idx        BIGINT := -1;
  v_item       JSONB;
  v_j1         TEXT;
  v_j2         TEXT;
  v_time1      TEXT;
  v_time2      TEXT;
  v_mesa_id    TEXT;
  v_existe     INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado (id=%)', p_campeonato_id; END IF;
  IF v_row.status <> 'em_andamento' THEN RAISE EXCEPTION 'campeonato nao esta em andamento (status=%)', v_row.status; END IF;

  v_confrontos := v_row.confrontos;
  v_total := COALESCE(jsonb_array_length(v_confrontos), 0);
  IF v_total = 0 THEN RAISE EXCEPTION 'campeonato sem confrontos'; END IF;

  -- Localiza o confronto do usuário nesta rodada (busca set-based, robusta).
  -- Usa comparação por TEXTO (v_uid::TEXT), mesmo padrão comprovado em
  -- entrar_campeonato_online, evitando falhas de casamento por cast de UUID.
  SELECT ord INTO v_idx
  FROM jsonb_array_elements(v_confrontos) WITH ORDINALITY AS t(item, ord)
  WHERE COALESCE((t.item->>'rodada')::INT, -1) = p_rodada
    AND COALESCE((t.item->>'bye')::BOOLEAN, false) = false
    AND t.item->>'status' = 'pendente'
    AND (t.item->>'j1_id' = v_uid::TEXT OR t.item->>'j2_id' = v_uid::TEXT)
  LIMIT 1;

  IF v_idx IS NULL OR v_idx < 1 THEN
    RAISE EXCEPTION 'nenhum confronto pendente encontrado para voce na rodada % (uid=%, total_confrontos=%)',
      p_rodada, v_uid, v_total;
  END IF;

  v_item := v_confrontos[v_idx::int];
  v_j1 := v_item->>'j1_id';
  v_j2 := v_item->>'j2_id';

  -- Idempotente: se o confronto já tem mesa vinculada e a mesa existe, devolve
  IF v_item->>'mesa_id' IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existe FROM public.mesas_futebol m WHERE m.mesa_id = (v_item->>'mesa_id');
    IF v_existe > 0 THEN
      RETURN v_item->>'mesa_id';
    END IF;
  END IF;

  -- Times dos participantes (do JSONB participantes)
  SELECT
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j1), 'Meu Time'),
    COALESCE((SELECT el->>'time_id' FROM jsonb_array_elements(v_row.participantes) el WHERE el->>'user_id' = v_j2), 'Meu Time')
  INTO v_time1, v_time2;

  -- Cria UMA mesa compartilhada com ambos os jogadores já definidos
  v_mesa_id := 'camp_' || substring(encode(gen_random_uuid()::text::bytea, 'hex'), 1, 12);

  INSERT INTO public.mesas_futebol
    (mesa_id, jogador_1_id, jogador_2_id, time_j1, time_j2,
     status, turno_atual_id, iniciado_em, tempo_restante_segundos,
     modalidade, campeonato_id, jogador_1_online, jogador_2_online,
     ultimo_heartbeat_j1, ultimo_heartbeat_j2)
  VALUES
    (v_mesa_id, v_j1::UUID, v_j2::UUID, v_time1, v_time2,
     'em_andamento', v_j1::UUID, now(), 300,
     'campeonato', p_campeonato_id, true, false,
     now(), NULL);

  -- Vincula a mesa ao confronto (mesa_id gravado)
  v_item := jsonb_set(v_item, '{mesa_id}', to_jsonb(v_mesa_id));
  v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx::text], v_item);
  UPDATE public.botao_campeonatos_online SET confrontos = v_confrontos WHERE id = v_row.id;

  RETURN v_mesa_id;
END; $$;

COMMIT;

GRANT EXECUTE ON FUNCTION public.abrir_mesa_campeonato(BIGINT, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: registrar_resultado_campeonato(
--   p_campeonato_id BIGINT, p_mesa_id TEXT, p_gols_j1 INTEGER, p_gols_j2 INTEGER
-- )
-- Atualiza o confronto correspondente, computa pontos (V=3/E=1/D=0) e soberania.
-- Finaliza o campeonato quando todas as rodadas estiverem concluídas.
-- ---------------------------------------------------------------------------
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
  v_campeao TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;

  v_part := v_row.participantes;
  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);
  v_finalizados := 0;

  FOR v_idx IN 0..(v_total - 1) LOOP
    v_item := v_confrontos[v_idx + 1];
    IF v_item->>'mesa_id' = p_mesa_id AND v_item->>'status' <> 'finalizado' THEN
      v_j1 := (v_item->>'j1_id')::UUID;
      v_j2 := (v_item->>'j2_id')::UUID;
      v_item := jsonb_set(v_item, '{pl_j1}', to_jsonb(p_gols_j1));
      v_item := jsonb_set(v_item, '{pl_j2}', to_jsonb(p_gols_j2));
      v_item := jsonb_set(v_item, '{status}', '"finalizado"');
      v_confrontos := jsonb_set(v_confrontos, ARRAY[v_idx + 1], v_item);

      -- Atualiza participantes (pontos 3/1/0 + gols)
      v_el := (
        SELECT jsonb_agg(
          CASE
            WHEN el->>'user_id' = v_j1::TEXT THEN
              el
                || jsonb_build_object(
                  'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE 0 END,
                  'gols_pro', (el->>'gols_pro')::INT + p_gols_j1,
                  'gols_contra', (el->>'gols_contra')::INT + p_gols_j2
                )
            WHEN el->>'user_id' = v_j2::TEXT THEN
              el
                || jsonb_build_object(
                  'pontos', (el->>'pontos')::INT + CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE 0 END,
                  'gols_pro', (el->>'gols_pro')::INT + p_gols_j2,
                  'gols_contra', (el->>'gols_contra')::INT + p_gols_j1
                )
            ELSE el
          END
        )
        FROM jsonb_array_elements(v_part) el
      );
      v_part := COALESCE(v_el, v_part);

      -- Estatísticas de partida (não econômicas) nos perfis. A SOV é movida
      -- EXCLUSIVAMENTE via sov_bank_registrar (ledger) — nunca UPDATE direto
      -- em pontos_soberania, que é apenas cache denormalizado.
      IF p_gols_j1 > p_gols_j2 THEN
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, partidas_vencidas = partidas_vencidas + 1,
          vitorias = vitorias + 1, gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, derrotas = derrotas + 1,
          gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
      ELSIF p_gols_j2 > p_gols_j1 THEN
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, partidas_vencidas = partidas_vencidas + 1,
          vitorias = vitorias + 1, gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, derrotas = derrotas + 1,
          gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
      ELSE
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, empates = empates + 1,
          gols_feitos = gols_feitos + p_gols_j1, gols_sofridos = gols_sofridos + p_gols_j2
        WHERE user_id = v_j1;
        UPDATE public.botao_usuarios SET
          partidas_jogadas = partidas_jogadas + 1, empates = empates + 1,
          gols_feitos = gols_feitos + p_gols_j2, gols_sofridos = gols_sofridos + p_gols_j1
        WHERE user_id = v_j2;
      END IF;

      -- SOV via ledger (idempotente por confronto). V=+3, E=+1, D=-3.
      -- A chave usa campeonato+mesa+jogador: re-chamada não duplica.
      DECLARE
        v_delta_j1 INT := CASE WHEN p_gols_j1 > p_gols_j2 THEN 3 WHEN p_gols_j1 = p_gols_j2 THEN 1 ELSE -3 END;
        v_delta_j2 INT := CASE WHEN p_gols_j2 > p_gols_j1 THEN 3 WHEN p_gols_j2 = p_gols_j1 THEN 1 ELSE -3 END;
      BEGIN
        PERFORM public.sov_bank_registrar(
          v_j1, v_delta_j1, 'reward',
          format('Campeonato online: resultado %s x %s', p_gols_j1, p_gols_j2),
          'online', 'campeonato_resultado',
          'campeonato:' || p_campeonato_id::TEXT || ':partida:' || p_mesa_id || ':' || v_j1::TEXT,
          jsonb_build_object('campeonato_id', p_campeonato_id, 'mesa_id', p_mesa_id, 'gols', p_gols_j1));
        PERFORM public.sov_bank_registrar(
          v_j2, v_delta_j2, 'reward',
          format('Campeonato online: resultado %s x %s', p_gols_j2, p_gols_j1),
          'online', 'campeonato_resultado',
          'campeonato:' || p_campeonato_id::TEXT || ':partida:' || p_mesa_id || ':' || v_j2::TEXT,
          jsonb_build_object('campeonato_id', p_campeonato_id, 'mesa_id', p_mesa_id, 'gols', p_gols_j2));
        -- Espelha o saldo autoritativo no cache denormalizado do perfil.
        UPDATE public.botao_usuarios u
           SET pontos_soberania = COALESCE((SELECT w.balance FROM public.user_wallets w WHERE w.user_id = u.user_id), u.pontos_soberania)
         WHERE u.user_id IN (v_j1, v_j2);
      EXCEPTION WHEN OTHERS THEN
        -- Campeonato nunca pode travar por falha econômica: loga e segue. O
        -- confronto/pontos já foram persistidos; a SOV é reconciliável.
        RAISE WARNING 'registrar_resultado_campeonato: ledger falhou: %', SQLERRM;
      END;
    END IF;
    IF v_item->>'status' = 'finalizado' THEN v_finalizados := v_finalizados + 1; END IF;
  END LOOP;

  SELECT max((c->>'rodada')::INT) INTO v_ultima_rodada
  FROM jsonb_array_elements(v_confrontos) c;

  IF v_finalizados = v_total THEN
    -- Campeão = maior pontuação (desempate por saldo de gols)
    SELECT el->>'user_id' INTO v_campeao
    FROM jsonb_array_elements(v_part) el
    ORDER BY (el->>'pontos')::INT DESC, ((el->>'gols_pro')::INT - (el->>'gols_contra')::INT) DESC
    LIMIT 1;

    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado',
           fase = -1,
           participantes = v_part,
           confrontos = v_confrontos,
           vencedor_id = v_campeao::UUID
     WHERE id = v_row.id
    RETURNING * INTO v_row;

    -- Título: incrementa contador não-econômico e credita a premiação via
    -- ledger (idempotente por campeonato+campeão). Nunca UPDATE seco.
    UPDATE public.botao_usuarios
       SET campeonatos_ganhos = campeonatos_ganhos + 1
     WHERE user_id = v_campeao::UUID;
    BEGIN
      PERFORM public.sov_bank_registrar(
        v_campeao::UUID, 50, 'reward',
        'Campeonato online: título de campeão',
        'online', 'campeonato_titulo',
        'campeonato:' || p_campeonato_id::TEXT || ':titulo:' || v_campeao,
        jsonb_build_object('campeonato_id', p_campeonato_id));
      UPDATE public.botao_usuarios u
         SET pontos_soberania = COALESCE((SELECT w.balance FROM public.user_wallets w WHERE w.user_id = u.user_id), u.pontos_soberania)
       WHERE u.user_id = v_campeao::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'registrar_resultado_campeonato: premio titulo falhou: %', SQLERRM;
    END;
  ELSE
    -- Avança rodada_atual quando a rodada atual estiver completa
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

  RETURN v_row;
END; $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: avancar_fase_campeonato(p_campeonato_id BIGINT)
-- Formato GRUPOS: quando a fase de grupos está completa, classifica os
-- participantes de cada grupo, seleciona os classificados e gera a fase de
-- mata-mata (oitavas/quartas/semifinal) em mesa Principal sequencial. Quando
-- uma fase mata-mata está completa, avança para a próxima. Quando a final
-- termina, define o campeão e premia via ledger. Idempotente (FOR UPDATE +
-- só age se a fase estiver completa e a próxima ainda não existir).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.avancar_fase_campeonato(p_campeonato_id BIGINT)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.botao_campeonatos_online;
  v_confrontos JSONB;
  v_grupos JSONB;
  v_num_grupos INT;
  v_por_grupo INT;
  v_classif_por_grupo INT;
  v_total_classif INT;
  v_g INT;
  v_gn TEXT;
  v_grupo_ids UUID[];
  v_ordem UUID[];
  v_classificados JSONB := '[]'::JSONB;
  v_pos INT;
  v_total INT;
  v_primeira_fase TEXT;
  v_metade INT;
  v_rodada_base INT;
  v_j INT;
  v_a TEXT;
  v_b TEXT;
  v_fases TEXT[] := ARRAY['oitavas','quartas','semifinal','final'];
  v_fase_atual TEXT;
  v_proxima_fase TEXT;
  v_vencedores UUID[];
  v_idx INT;
  v_campeao TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c
  WHERE c.id = p_campeonato_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF COALESCE(v_row.formato,'liga') <> 'grupos' THEN RETURN v_row; END IF;
  IF v_row.status <> 'em_andamento' THEN RETURN v_row; END IF;

  v_confrontos := v_row.confrontos;
  v_total := jsonb_array_length(v_confrontos);

  -- Determina a fase mais avançada presente e se está completa.
  v_fase_atual := NULL;
  FOREACH v_gn IN ARRAY v_fases LOOP
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_confrontos) c WHERE c->>'fase' = v_gn) THEN
      v_fase_atual := v_gn;
    END IF;
  END LOOP;

  IF v_fase_atual IS NULL THEN
    -- Ainda na fase de grupos: completa?
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_confrontos) c
               WHERE c->>'fase' = 'grupos' AND c->>'status' <> 'finalizado') THEN
      RETURN v_row; -- grupos incompletos
    END IF;

    -- Classifica cada grupo e seleciona classificados (1ºs, depois 2ºs...).
    SELECT COUNT(DISTINCT c->>'grupo') INTO v_num_grupos
    FROM jsonb_array_elements(v_confrontos) c WHERE c->>'grupo' IS NOT NULL;
    v_por_grupo := jsonb_array_length(v_row.participantes) / v_num_grupos;
    v_classif_por_grupo := CASE WHEN v_por_grupo >= 4 THEN 2 ELSE 1 END;
    v_total_classif := v_num_grupos * v_classif_por_grupo;

    -- Extrai ids por grupo (na ordem de inscrição) e classifica.
    FOR v_pos IN 1..v_classif_por_grupo LOOP
      FOR v_g IN 1..v_num_grupos LOOP
        v_gn := chr(64 + v_g);
        -- ids do grupo (participantes cujos confrontos são desse grupo)
        SELECT array_agg(DISTINCT uid) INTO v_grupo_ids FROM (
          SELECT c->>'j1_id' AS uid FROM jsonb_array_elements(v_confrontos) c WHERE c->>'grupo' = v_gn AND NOT COALESCE((c->>'bye')::BOOLEAN,false)
          UNION
          SELECT c->>'j2_id' FROM jsonb_array_elements(v_confrontos) c WHERE c->>'grupo' = v_gn AND NOT COALESCE((c->>'bye')::BOOLEAN,false)
        ) t;
        -- Ordena por pontos (3/1/0), saldo, gols pró — cálculo set-based.
        SELECT array_agg(uid ORDER BY pontos DESC, sg DESC, gp DESC) INTO v_ordem FROM (
          SELECT uid,
            SUM(CASE WHEN (uid = c->>'j1_id' AND (c->>'pl_j1')::INT > (c->>'pl_j2')::INT)
                   OR (uid = c->>'j2_id' AND (c->>'pl_j2')::INT > (c->>'pl_j1')::INT) THEN 3
                  WHEN (c->>'pl_j1')::INT = (c->>'pl_j2')::INT THEN 1 ELSE 0 END) AS pontos,
            SUM(CASE WHEN uid = c->>'j1_id' THEN (c->>'pl_j1')::INT - (c->>'pl_j2')::INT
                     ELSE (c->>'pl_j2')::INT - (c->>'pl_j1')::INT END) AS sg,
            SUM(CASE WHEN uid = c->>'j1_id' THEN (c->>'pl_j1')::INT ELSE (c->>'pl_j2')::INT END) AS gp
          FROM (
            SELECT c->>'j1_id' AS uid, c.* FROM jsonb_array_elements(v_confrontos) c WHERE c->>'grupo' = v_gn AND c->>'status'='finalizado'
            UNION ALL SELECT c->>'j2_id', c.* FROM jsonb_array_elements(v_confrontos) c WHERE c->>'grupo' = v_gn AND c->>'status'='finalizado'
          ) s GROUP BY uid
        ) r;
        IF v_ordem IS NOT NULL AND array_length(v_ordem,1) >= v_pos THEN
          v_classificados := v_classificados || jsonb_build_array(
            jsonb_build_object('uid', v_ordem[v_pos], 'grupo', v_gn, 'pos', v_pos));
        END IF;
      END LOOP;
    END LOOP;

    -- Primeira fase mata-mata pelo total de classificados.
    v_primeira_fase := CASE WHEN v_total_classif >= 16 THEN 'oitavas'
                            WHEN v_total_classif >= 8 THEN 'quartas'
                            WHEN v_total_classif >= 4 THEN 'semifinal' ELSE 'final' END;
    v_rodada_base := (SELECT COALESCE(MAX((c->>'rodada')::INT),0) FROM jsonb_array_elements(v_confrontos) c) + 1;
    v_metade := v_total_classif / 2;

    FOR v_j IN 0..(v_metade - 1) LOOP
      v_a := v_classificados->v_j->>'uid';
      v_b := v_classificados->(v_total_classif - 1 - v_j)->>'uid';
      v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
        'rodada', v_rodada_base + v_j, 'grupo', NULL, 'fase', v_primeira_fase,
        'mesa', 'Principal', 'mesa_id', NULL, 'j1_id', v_a, 'j2_id', v_b,
        'pl_j1', NULL, 'pl_j2', NULL, 'status', 'pendente', 'bye', false));
    END LOOP;

    UPDATE public.botao_campeonatos_online
       SET confrontos = v_confrontos, rodada_atual = v_rodada_base
     WHERE id = v_row.id RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- Fase mata-mata: completa?
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_confrontos) c
             WHERE c->>'fase' = v_fase_atual AND c->>'status' <> 'finalizado') THEN
    RETURN v_row;
  END IF;

  IF v_fase_atual = 'final' THEN
    -- Campeão = vencedor da final.
    SELECT CASE WHEN (c->>'pl_j1')::INT > (c->>'pl_j2')::INT THEN c->>'j1_id' ELSE c->>'j2_id' END
      INTO v_campeao
    FROM jsonb_array_elements(v_confrontos) c WHERE c->>'fase' = 'final' LIMIT 1;

    UPDATE public.botao_campeonatos_online
       SET status = 'finalizado', fase = -1, vencedor_id = v_campeao::UUID
     WHERE id = v_row.id RETURNING * INTO v_row;

    UPDATE public.botao_usuarios SET campeonatos_ganhos = campeonatos_ganhos + 1 WHERE user_id = v_campeao::UUID;
    BEGIN
      PERFORM public.sov_bank_registrar(
        v_campeao::UUID, v_row.premio_sov, 'reward',
        'Campeonato online: título de campeão', 'online', 'campeonato_titulo',
        'campeonato:' || p_campeonato_id::TEXT || ':titulo:' || v_campeao,
        jsonb_build_object('campeonato_id', p_campeonato_id));
      UPDATE public.botao_usuarios u SET pontos_soberania =
        COALESCE((SELECT w.balance FROM public.user_wallets w WHERE w.user_id = u.user_id), u.pontos_soberania)
      WHERE u.user_id = v_campeao::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'avancar_fase: premio titulo falhou: %', SQLERRM;
    END;
    RETURN v_row;
  END IF;

  -- Avança para a próxima fase mata-mata (mesa Principal sequencial).
  v_proxima_fase := v_fases[array_position(v_fases, v_fase_atual) + 1];
  SELECT array_agg(vencedor ORDER BY rodada) INTO v_vencedores FROM (
    SELECT (c->>'rodada')::INT AS rodada,
      CASE WHEN (c->>'pl_j1')::INT > (c->>'pl_j2')::INT THEN (c->>'j1_id')::UUID ELSE (c->>'j2_id')::UUID END AS vencedor
    FROM jsonb_array_elements(v_confrontos) c WHERE c->>'fase' = v_fase_atual
  ) t;
  v_rodada_base := (SELECT COALESCE(MAX((c->>'rodada')::INT),0) FROM jsonb_array_elements(v_confrontos) c) + 1;
  FOR v_idx IN 1..(array_length(v_vencedores,1)) BY 2 LOOP
    v_confrontos := v_confrontos || jsonb_build_array(jsonb_build_object(
      'rodada', v_rodada_base + (v_idx - 1) / 2, 'grupo', NULL, 'fase', v_proxima_fase,
      'mesa', 'Principal', 'mesa_id', NULL, 'j1_id', v_vencedores[v_idx]::TEXT,
      'j2_id', v_vencedores[v_idx + 1]::TEXT, 'pl_j1', NULL, 'pl_j2', NULL,
      'status', 'pendente', 'bye', false));
  END LOOP;

  UPDATE public.botao_campeonatos_online
     SET confrontos = v_confrontos, rodada_atual = v_rodada_base
   WHERE id = v_row.id RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

COMMIT;

GRANT EXECUTE ON FUNCTION public.avancar_fase_campeonato(BIGINT) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: aplicar_wo_campeonato(p_campeonato_id BIGINT, p_rodada INTEGER)
-- Regra de ausência (§8): após a tolerância, se um confronto da rodada está
-- pendente e SEM mesa aberta (nenhum dos dois entrou), registra W.O.
-- determinístico (1×0 para o presente; se ambos ausentes, 0×0 sem pontos de
-- vitória — contabilizado como empate 0-0). Não inventa penalidade de SOV.
-- Idempotente (só age em confronto 'pendente' sem mesa_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_wo_campeonato(p_campeonato_id BIGINT, p_rodada INTEGER)
RETURNS public.botao_campeonatos_online
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.botao_campeonatos_online;
  v_item JSONB;
  v_idx INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c WHERE c.id = p_campeonato_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campeonato nao encontrado'; END IF;
  IF v_row.status <> 'em_andamento' THEN RETURN v_row; END IF;

  -- Confrontos pendentes da rodada, sem mesa aberta, não-bye: W.O. 0x0 (empate
  -- sem vencedor). O W.O. com presente é registrado pelo jogador presente via
  -- registrar_resultado_campeonato na mesa — aqui só cobrimos dupla ausência.
  FOR v_idx IN 0..(jsonb_array_length(v_row.confrontos) - 1) LOOP
    v_item := v_row.confrontos->v_idx;
    IF (v_item->>'rodada')::INT = p_rodada
       AND v_item->>'status' = 'pendente'
       AND v_item->>'mesa_id' IS NULL
       AND NOT COALESCE((v_item->>'bye')::BOOLEAN, false) THEN
      PERFORM public.registrar_resultado_campeonato(p_campeonato_id, 'wo_' || v_idx::TEXT, 0, 0);
    END IF;
  END LOOP;

  SELECT c.* INTO v_row FROM public.botao_campeonatos_online c WHERE c.id = p_campeonato_id;
  RETURN v_row;
END; $$;

COMMIT;

GRANT EXECUTE ON FUNCTION public.aplicar_wo_campeonato(BIGINT, INTEGER) TO authenticated;

-- ===========================================================================
-- BANCO DE FRASES DA IA (templates procedurais — fallback on-device)
-- ===========================================================================
-- Quando o aparelho do jogador não roda WebLLM (celular fraco), o AIService
-- cai neste banco de frases no Supabase para montar textos procedurais com
-- variáveis reais do jogo (nomes de times, placares, treinador). Custo ZERO
-- de API e garante que o jogo rode liso em qualquer aparelho.
CREATE TABLE IF NOT EXISTS public.botao_frases_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Tipo de prompt: a "voz" do jogo reaproveitada em vários contextos.
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('comentarista','coletiva','medico','redes_sociais','noticia')),
  -- Categoria livre dentro do prompt_type (ex.: 'vitoria', 'derrota', 'goleada').
  categoria TEXT NOT NULL DEFAULT 'geral',
  -- Texto com placeholders {T}, {coach}, {W}, {L}, {gH}, {gA}, {diff}, etc.
  template_text TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Unicidade por (prompt_type, categoria, ordem) para permitir seed idempotente
-- (ON CONFLICT DO NOTHING evita duplicar frases ao re-rodar a migração).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_botao_frases_ia_seed
  ON public.botao_frases_ia(prompt_type, categoria, ordem);

CREATE INDEX IF NOT EXISTS idx_botao_frases_ia_tipo ON public.botao_frases_ia(prompt_type, categoria, ativo);

GRANT SELECT ON public.botao_frases_ia TO authenticated;
GRANT SELECT ON public.botao_frases_ia TO anon;
GRANT ALL ON public.botao_frases_ia TO service_role;

ALTER TABLE public.botao_frases_ia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "frases_ia_read_all" ON public.botao_frases_ia;
CREATE POLICY "frases_ia_read_all" ON public.botao_frases_ia
  FOR SELECT TO anon, authenticated USING (ativo = true);

COMMIT;

-- Seed inicial de frases (idempotente: ON CONFLICT DO NOTHING na unicidade).
INSERT INTO public.botao_frases_ia (prompt_type, categoria, template_text, ordem) VALUES
-- COMENTARISTA sarcástica (Galvão Bueno debochado)
('comentarista', 'vitoria',     'E OLHE O FOGUETE! {T} sai de campo encantando a galera, {coach} fazendo pose de gênio no banco!', 1),
('comentarista', 'vitoria',     'HÉEEE... {coach} acerta a tática e o {T} passeia! Será genética ou foi sorte? Você decide!', 2),
('comentarista', 'derrota',     'GENTEEE, que vexame! {T} leva de {gA} e {coach} faz cara de quem caiu da chaleira. Coitado!', 3),
('comentarista', 'derrota',     'O {T} fez o quê? Perdeu de {gA}? {coach} já deve estar arrumando as malas, né não?', 4),
('comentarista', 'goleada',     'DESTRUIÇÃO TOTAL! {W} goleia e o {L} some do mapa. Que noite esquecível pra {coachL}!', 5),
('comentarista', 'empate',      'EMPATOU! {coach} sai de campo com aquela cara de quem não entendeu se é bom ou ruim. Patético!', 6),
('comentarista', 'suborno',     'Olha o detalhe: dizem que rolou envelope no vestiário do {T}. Coincidência? Eu duvido!', 7),
('comentarista', 'crise',       'Crise financeira no {T}? Se {coach} não vencer logo, a diretoria vai vender até o botão goleador!', 8),
-- COLETIVA pós-jogo (imprensa ácida)
('coletiva', 'vitoria',         '— {coach}, essa goleada de {gH} a {gA} foi planejada ou o adversário entregou de bandeja?', 1),
('coletiva', 'derrota',         '— {coach}, o {T} foi humilhado hoje. O senhor continua afirmando que o time tá pronto pra grande coisa?', 2),
('coletiva', 'empate',          '— {coach}, empate em casa contra o lanterna. Como o senhor explica isso pro torcedor que paga seu salário?', 3),
-- MÉDICO irônico
('medico', 'lesao',             '— Treinador, aqui é o Dr. Maurício. Seu craque reclamou de cãibra. Pode ser lesão, pode ser preguiça. Pode escalar?', 1),
('medico', 'preparo',           '— O departamento médico alerta: o elenco tá em risco de lesão muscular. Dizem que treino é coisa de amador, né {coach}?', 2),
-- REDES SOCIAIS (torcedores)
('redes_sociais', 'vitoria',    '@TorcedorFiel: {coach} é o REI! {T} é CAMPEÃO! Quem duvidou peça desculpa!', 1),
('redes_sociais', 'derrota',    '@DesesperadoFC: {coach} FORA! Que vergonha alheia perder pro {L} em casa!', 2),
('redes_sociais', 'goleada',    '@BotaoEC: {W} {gH} x {gA} {L}! QUEMassacre! Futebol de botão não pra frangote!', 3),
('redes_sociais', 'polemica',   '@BastidorFC: ouviram? Envelope rolando no {T}. Tá tudo comprado, eu hein!', 4),
-- NOTICIA (portal de bastidores)
('noticia', 'escandalo',        'Vazou! Bastidores do {T} em ebulição após reunião secreta da diretoria com empresário', 1),
('noticia', 'suborno',          'Imprensa apura: esquema de propina ronda o {T} e {coach} é citado nos bastidores', 2),
('noticia', 'crise',            'Crise no {T}: salário atrasado e torcida cobra cabeça de {coach}', 3)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Prompts universais do Pracinha (núcleo guia da Cidadela).
ALTER TABLE public.botao_frases_ia
  DROP CONSTRAINT IF EXISTS botao_frases_ia_prompt_type_check;
ALTER TABLE public.botao_frases_ia
  ADD CONSTRAINT botao_frases_ia_prompt_type_check
  CHECK (prompt_type IN ('comentarista','coletiva','medico','redes_sociais','noticia','pracinha'));

INSERT INTO public.botao_frases_ia (prompt_type, categoria, template_text, ordem) VALUES
('pracinha', 'boas_vindas', 'Saudações, {coach}. Eu sou o Pracinha. Complete as 5 missões do dia, procure oponentes online e siga o rastro dos Pergaminhos.', 1),
('pracinha', 'missoes', 'Ordem do dia: cinco missões, recompensa limitada e economia protegida. Quem joga em grupo avança mais rápido.', 2),
('pracinha', 'geral', 'Pracinha na escuta: explore a Cidadela, convide rivais e procure a verdade nos Pergaminhos.', 3)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Reconstrução da carreira infinita — divisões + histórico (2026-08-18)
-- =====================================================

ALTER TABLE public.botao_times
  ADD COLUMN IF NOT EXISTS forca INTEGER DEFAULT 70 CHECK (forca BETWEEN 1 AND 100);
ALTER TABLE public.botao_times
  ADD COLUMN IF NOT EXISTS divisao TEXT DEFAULT NULL CHECK (divisao IN ('serie-a','serie-b','serie-c'));

-- Seed canônico da base futebol de botão: 60 clubes ficcionais, deduplicados,
-- 20 por divisão. Idempotente para integrações existentes.
INSERT INTO public.botao_times (id, nome, abreviacao, cores, pais, liga, forca, divisao, is_personalizado)
VALUES
('fla', 'Rubro-Negro do Rio (RJ)', 'RNR', ARRAY['#c8102e', '#111111'], 'Rio de Janeiro', 'Brasil', 88, 'serie-a', true),
  ('pal', 'Alviverde Paulista (SP)', 'ALP', ARRAY['#0b7a3b', '#f2f2f2'], 'São Paulo', 'Brasil', 87, 'serie-a', true),
  ('atl', 'Galo das Minas (MG)', 'GAL', ARRAY['#181818', '#ededed'], 'Belo Horizonte', 'Brasil', 85, 'serie-a', true),
  ('cor', 'Alvinegro do Parque (SP)', 'ADP', ARRAY['#1a1a1a', '#ffffff'], 'São Paulo', 'Brasil', 84, 'serie-a', true),
  ('gre', 'Imortal Gaúcho (RS)', 'IMT', ARRAY['#0d6bb0', '#111111'], 'Porto Alegre', 'Brasil', 84, 'serie-a', true),
  ('spf', 'Tricolor do Morumbi (SP)', 'TDM', ARRAY['#e21c21', '#111111'], 'São Paulo', 'Brasil', 83, 'serie-a', true),
  ('intb', 'Colorado Gaúcho (RS)', 'COG', ARRAY['#d10a11', '#ffffff'], 'Porto Alegre', 'Brasil', 82, 'serie-a', true),
  ('flu', 'Tricolor das Laranjeiras (RJ)', 'TDL', ARRAY['#7a1b3a', '#0d6b3f'], 'Rio de Janeiro', 'Brasil', 81, 'serie-a', true),
  ('cru', 'Raposa Celeste (MG)', 'RAC', ARRAY['#1b3f95', '#ffffff'], 'Belo Horizonte', 'Brasil', 80, 'serie-a', true),
  ('bot', 'Estrela Carioca (RJ)', 'ESO', ARRAY['#222222', '#f5f5f5'], 'Rio de Janeiro', 'Brasil', 79, 'serie-a', true),
  ('cap', 'Furacão Paranaense (PR)', 'FUR', ARRAY['#c8102e', '#111111'], 'Curitiba', 'Brasil', 79, 'serie-a', true),
  ('for', 'Leão do Pici (CE)', 'LDP', ARRAY['#0b3f8f', '#e2231a'], 'Fortaleza', 'Brasil', 78, 'serie-a', true),
  ('bah', 'Tricolor de Aço (BA)', 'TDA', ARRAY['#1e64c8', '#e2231a'], 'Salvador', 'Brasil', 77, 'serie-a', true),
  ('vas', 'Cruzmaltino do Rio (RJ)', 'CRM', ARRAY['#111111', '#ffffff'], 'Rio de Janeiro', 'Brasil', 76, 'serie-a', true),
  ('san', 'Peixe da Vila (SP)', 'PXV', ARRAY['#f4f4f4', '#111111'], 'Santos', 'Brasil', 75, 'serie-a', true),
  ('cax', 'Imperial Serrano (RS)', 'IMP', ARRAY['#1b3f95', '#f7d117'], 'Caxias do Sul', 'Brasil', 74, 'serie-a', true),
  ('cea', 'Vozão de Fortaleza (CE)', 'VOZ', ARRAY['#1a1a1a', '#ffffff'], 'Fortaleza', 'Brasil', 73, 'serie-a', true),
  ('vit', 'Leão da Barra (BA)', 'LDB', ARRAY['#c8102e', '#111111'], 'Salvador', 'Brasil', 72, 'serie-a', true),
  ('spo', 'Leão da Ilha (PE)', 'LDI', ARRAY['#c8102e', '#111111'], 'Recife', 'Brasil', 71, 'serie-a', true),
  ('fig', 'Figueira de Floripa (SC)', 'FIG', ARRAY['#111111', '#ffffff'], 'Florianópolis', 'Brasil', 70, 'serie-a', true),
  ('cha', 'Verdão do Oeste (SC)', 'VDO', ARRAY['#0b7a3b', '#f7d117'], 'Chapecó', 'Brasil', 70, 'serie-b', true),
  ('bru', 'Auriverde de Bauru (SP)', 'AUR', ARRAY['#0e5ba6', '#f2c500'], 'Bauru', 'Brasil', 70, 'serie-b', true),
  ('cor2', 'Coxa Alviverde (PR)', 'COX', ARRAY['#0b6b3a', '#ffffff'], 'Curitiba', 'Brasil', 69, 'serie-b', true),
  ('goi', 'Esmeraldino de Goiás (GO)', 'ESM', ARRAY['#0a7d43', '#ffffff'], 'Goiânia', 'Brasil', 69, 'serie-b', true),
  ('nau', 'Timbu Alvirrubro (PE)', 'TAR', ARRAY['#e2231a', '#ffffff'], 'Recife', 'Brasil', 68, 'serie-b', true),
  ('par', 'Domínio Paraense (PA)', 'DPR', ARRAY['#0b3f8f', '#ffffff'], 'Belém', 'Brasil', 67, 'serie-b', true),
  ('vil', 'Tigre Colorada (MG)', 'TIC', ARRAY['#e2231a', '#ffe500'], 'Nova Lima', 'Brasil', 67, 'serie-b', true),
  ('ame', 'Coelho Mineiro (MG)', 'COE', ARRAY['#0b6b3a', '#e2231a'], 'Belo Horizonte', 'Brasil', 67, 'serie-b', true),
  ('lon', 'Tubarão do Norte (PR)', 'TUB', ARRAY['#0e5ba6', '#ffffff'], 'Londrina', 'Brasil', 66, 'serie-b', true),
  ('gua', 'Bugre Campineiro (SP)', 'BUG', ARRAY['#0b7a3b', '#ffffff'], 'Campinas', 'Brasil', 66, 'serie-b', true),
  ('itu', 'Galo de Itu (SP)', 'GIN', ARRAY['#e2231a', '#111111'], 'Itu', 'Brasil', 65, 'serie-b', true),
  ('cui', 'Dourado de Cuiabá (MT)', 'DOU', ARRAY['#0f9b4c', '#f7d117'], 'Cuiabá', 'Brasil', 64, 'serie-b', true),
  ('mir', 'Leão Preto (SP)', 'LEA', ARRAY['#111111', '#f2c500'], 'Mogi Mirim', 'Brasil', 64, 'serie-b', true),
  ('juvbr', 'Jaconero Serrano (RS)', 'JAC', ARRAY['#1a7a3f', '#111111'], 'Caxias do Sul', 'Brasil', 63, 'serie-b', true),
  ('cri', 'Tigre Catarinense (SC)', 'TIG', ARRAY['#f2c500', '#111111'], 'Criciúma', 'Brasil', 62, 'serie-b', true),
  ('ava', 'Leão da Ilha Sul (SC)', 'LIS', ARRAY['#0e5ba6', '#ffffff'], 'Florianópolis', 'Brasil', 61, 'serie-b', true),
  ('rem', 'Leão Azul do Pará (PA)', 'LAZ', ARRAY['#0b3f8f', '#ffffff'], 'Belém', 'Brasil', 60, 'serie-b', true),
  ('pay', 'Papão da Curuzu (PA)', 'PAP', ARRAY['#1a1a1a', '#0b7a3b'], 'Belém', 'Brasil', 60, 'serie-b', true),
  ('abc', 'Alvinegro Potiguar (RN)', 'ALP2', ARRAY['#111111', '#ffffff'], 'Natal', 'Brasil', 58, 'serie-b', true),
  ('sam', 'Azulino do Maranhão (MA)', 'AZS', ARRAY['#0e5ba6', '#ffffff'], 'São Luís', 'Brasil', 58, 'serie-b', true),
  ('pon', 'Macaca Campineira (SP)', 'MAC', ARRAY['#1a1a1a', '#ffffff'], 'Campinas', 'Brasil', 65, 'serie-c', true),
  ('joi', 'Jec de Joinville (SC)', 'JEC', ARRAY['#0b7a3b', '#ffffff'], 'Joinville', 'Brasil', 62, 'serie-c', true),
  ('fer', 'Ferroviária de Araraquara (SP)', 'MFE', ARRAY['#8b1a1a', '#ffffff'], 'Araraquara', 'Brasil', 61, 'serie-c', true),
  ('nov', 'Tigre do Vale (SP)', 'TIV', ARRAY['#f2c500', '#111111'], 'Novo Horizonte', 'Brasil', 60, 'serie-c', true),
  ('tup', 'Azul Carvoeiro (SC)', 'AZL', ARRAY['#0e5ba6', '#ffffff'], 'Criciúma', 'Brasil', 59, 'serie-c', true),
  ('opo', 'Fantasma de Ouro Preto (MG)', 'FAN', ARRAY['#111111', '#ffffff'], 'Ouro Preto', 'Brasil', 58, 'serie-c', true),
  ('cal', 'Calanga do Cariri (CE)', 'CLD', ARRAY['#0b7a3b', '#f7d117'], 'Juazeiro do Norte', 'Brasil', 58, 'serie-c', true),
  ('tom', 'Gavião de Feira (BA)', 'GAV', ARRAY['#e2231a', '#111111'], 'Feira de Santana', 'Brasil', 57, 'serie-c', true),
  ('mot', 'Moto de São Luís (MA)', 'MRN', ARRAY['#c8102e', '#111111'], 'São Luís', 'Brasil', 57, 'serie-c', true),
  ('csa', 'Azulão de Maceió (AL)', 'AZM', ARRAY['#0e5ba6', '#ffffff'], 'Maceió', 'Brasil', 56, 'serie-c', true),
  ('crb', 'Galício de Pajuçara (AL)', 'GPA', ARRAY['#d10a11', '#ffffff'], 'Maceió', 'Brasil', 56, 'serie-c', true),
  ('ser', 'Corno do Sertão (PE)', 'CSR', ARRAY['#e2231a', '#111111'], 'Petrolina', 'Brasil', 55, 'serie-c', true),
  ('cam', 'Aymoré de Campo Grande (MS)', 'AYS', ARRAY['#0b3f8f', '#f7d117'], 'Campo Grande', 'Brasil', 55, 'serie-c', true),
  ('tre', 'Trevo de Palmas (TO)', 'TRP', ARRAY['#0b7a3b', '#111111'], 'Palmas', 'Brasil', 54, 'serie-c', true),
  ('nor', 'Nortuno do Amapá (AP)', 'NAP', ARRAY['#0e5ba6', '#f7d117'], 'Macapá', 'Brasil', 54, 'serie-c', true),
  ('asa', 'Aurico de Arapiraca (AL)', 'AUR2', ARRAY['#f2c500', '#111111'], 'Arapiraca', 'Brasil', 53, 'serie-c', true),
  ('jacu', 'Jacu do Norte (RN)', 'JDN', ARRAY['#111111', '#ffffff'], 'Natal', 'Brasil', 52, 'serie-c', true),
  ('riv', 'Palomino de Aracaju (SE)', 'PLI', ARRAY['#7a1b3a', '#0b3f8f'], 'Aracaju', 'Brasil', 52, 'serie-c', true),
  ('alt', 'Alta Colina (MG)', 'ALC', ARRAY['#0b6b3a', '#ffffff'], 'Poços de Caldas', 'Brasil', 51, 'serie-c', true),
  ('botpb', 'Beltrão Paraibano (PB)', 'BTP', ARRAY['#c8102e', '#111111'], 'João Pessoa', 'Brasil', 51, 'serie-c', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  abreviacao = EXCLUDED.abreviacao,
  cores = EXCLUDED.cores,
  pais = EXCLUDED.pais,
  liga = EXCLUDED.liga,
  forca = EXCLUDED.forca,
  divisao = EXCLUDED.divisao;

CREATE TABLE IF NOT EXISTS public.botao_temporadas_carreira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada INTEGER NOT NULL,
  dificuldade TEXT NOT NULL DEFAULT 'amador',
  divisao_usuario TEXT NOT NULL DEFAULT 'serie-c' CHECK (divisao_usuario IN ('serie-a','serie-b','serie-c')),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','finalizada')),
  estado JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizada_em TIMESTAMPTZ,
  UNIQUE (user_id, temporada)
);

CREATE TABLE IF NOT EXISTS public.botao_partidas_carreira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada INTEGER NOT NULL,
  competicao TEXT NOT NULL CHECK (competicao IN ('brasileirao','copa-brasil')),
  divisao TEXT CHECK (divisao IN ('serie-a','serie-b','serie-c')),
  rodada TEXT NOT NULL,
  home_id TEXT NOT NULL,
  away_id TEXT NOT NULL,
  home_goals INTEGER NOT NULL,
  away_goals INTEGER NOT NULL,
  pen_home INTEGER,
  pen_away INTEGER,
  resultado_usuario TEXT NOT NULL CHECK (resultado_usuario IN ('vitoria','empate','derrota')),
  detalhes JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.botao_tabelas_carreira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada INTEGER NOT NULL,
  competicao TEXT NOT NULL CHECK (competicao IN ('brasileirao','copa-brasil')),
  divisao TEXT CHECK (divisao IN ('serie-a','serie-b','serie-c')),
  team_id TEXT NOT NULL,
  team_nome TEXT NOT NULL,
  posicao INTEGER NOT NULL,
  p INTEGER NOT NULL DEFAULT 0,
  j INTEGER NOT NULL DEFAULT 0,
  v INTEGER NOT NULL DEFAULT 0,
  e INTEGER NOT NULL DEFAULT 0,
  d INTEGER NOT NULL DEFAULT 0,
  gp INTEGER NOT NULL DEFAULT 0,
  gc INTEGER NOT NULL DEFAULT 0,
  sg INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, temporada, competicao, divisao, team_id)
);

CREATE TABLE IF NOT EXISTS public.botao_eventos_carreira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada INTEGER,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_botao_temporadas_carreira_user
  ON public.botao_temporadas_carreira(user_id, temporada DESC);
CREATE INDEX IF NOT EXISTS idx_botao_partidas_carreira_user
  ON public.botao_partidas_carreira(user_id, temporada, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_botao_tabelas_carreira_user
  ON public.botao_tabelas_carreira(user_id, temporada, divisao);
CREATE INDEX IF NOT EXISTS idx_botao_eventos_carreira_user
  ON public.botao_eventos_carreira(user_id, temporada, created_at DESC);

ALTER TABLE public.botao_temporadas_carreira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_partidas_carreira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_tabelas_carreira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_eventos_carreira ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono le proprias temporadas" ON public.botao_temporadas_carreira;
CREATE POLICY "dono le proprias temporadas" ON public.botao_temporadas_carreira
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dono le proprias partidas carreira" ON public.botao_partidas_carreira;
CREATE POLICY "dono le proprias partidas carreira" ON public.botao_partidas_carreira
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dono le proprias tabelas carreira" ON public.botao_tabelas_carreira;
CREATE POLICY "dono le proprias tabelas carreira" ON public.botao_tabelas_carreira
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dono le proprios eventos carreira" ON public.botao_eventos_carreira;
CREATE POLICY "dono le proprios eventos carreira" ON public.botao_eventos_carreira
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.registrar_temporada_carreira(
  p_user_id UUID,
  p_temporada INTEGER,
  p_dificuldade TEXT,
  p_divisao TEXT,
  p_estado JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Só o dono da carreira pode gravar a temporada';
  END IF;

  INSERT INTO public.botao_temporadas_carreira (
    user_id, temporada, dificuldade, divisao_usuario, estado, status
  ) VALUES (
    p_user_id, p_temporada, p_dificuldade, p_divisao, p_estado, 'ativa'
  )
  ON CONFLICT (user_id, temporada) DO UPDATE SET
    dificuldade = EXCLUDED.dificuldade,
    divisao_usuario = EXCLUDED.divisao_usuario,
    estado = EXCLUDED.estado,
    status = 'ativa',
    finalizada_em = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_partida_carreira(
  p_user_id UUID,
  p_partida JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Só o dono da carreira pode registrar partidas';
  END IF;

  INSERT INTO public.botao_partidas_carreira (
    user_id, temporada, competicao, divisao, rodada,
    home_id, away_id, home_goals, away_goals,
    pen_home, pen_away, resultado_usuario, detalhes
  ) VALUES (
    p_user_id,
    COALESCE((p_partida->>'temporada')::INTEGER, 1),
    COALESCE(p_partida->>'competicao', 'brasileirao'),
    NULLIF(p_partida->>'divisao', ''),
    COALESCE(p_partida->>'rodada', 'Rodada'),
    p_partida->>'home_id',
    p_partida->>'away_id',
    COALESCE((p_partida->>'home_goals')::INTEGER, 0),
    COALESCE((p_partida->>'away_goals')::INTEGER, 0),
    (p_partida->>'pen_home')::INTEGER,
    (p_partida->>'pen_away')::INTEGER,
    CASE
      WHEN COALESCE((p_partida->>'home_goals')::INTEGER, 0) > COALESCE((p_partida->>'away_goals')::INTEGER, 0)
        THEN CASE WHEN p_partida->>'user_home' = 'true' THEN 'vitoria' ELSE 'derrota' END
      WHEN COALESCE((p_partida->>'home_goals')::INTEGER, 0) < COALESCE((p_partida->>'away_goals')::INTEGER, 0)
        THEN CASE WHEN p_partida->>'user_home' = 'true' THEN 'derrota' ELSE 'vitoria' END
      ELSE 'empate'
    END,
    COALESCE(p_partida->'detalhes', '{}'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalizar_temporada_carreira(
  p_user_id UUID,
  p_temporada INTEGER,
  p_tabelas JSONB,
  p_estado JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Só o dono da carreira pode finalizar a temporada';
  END IF;

  INSERT INTO public.botao_temporadas_carreira (
    user_id, temporada, estado, status, finalizada_em
  ) VALUES (
    p_user_id, p_temporada, p_estado, 'finalizada', NOW()
  )
  ON CONFLICT (user_id, temporada) DO UPDATE SET
    estado = EXCLUDED.estado,
    status = 'finalizada',
    finalizada_em = NOW();

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_tabelas, '[]'::JSONB))
  LOOP
    INSERT INTO public.botao_tabelas_carreira (
      user_id, temporada, competicao, divisao, team_id, team_nome, posicao,
      p, j, v, e, d, gp, gc, sg
    ) VALUES (
      p_user_id,
      p_temporada,
      COALESCE(v_item->>'competicao', 'brasileirao'),
      NULLIF(v_item->>'divisao', ''),
      v_item->>'team_id',
      COALESCE(v_item->>'team_nome', v_item->>'team_id'),
      COALESCE((v_item->>'posicao')::INTEGER, 0),
      COALESCE((v_item->>'p')::INTEGER, 0),
      COALESCE((v_item->>'j')::INTEGER, 0),
      COALESCE((v_item->>'v')::INTEGER, 0),
      COALESCE((v_item->>'e')::INTEGER, 0),
      COALESCE((v_item->>'d')::INTEGER, 0),
      COALESCE((v_item->>'gp')::INTEGER, 0),
      COALESCE((v_item->>'gc')::INTEGER, 0),
      COALESCE((v_item->>'sg')::INTEGER, COALESCE((v_item->>'gp')::INTEGER,0) - COALESCE((v_item->>'gc')::INTEGER,0))
    )
    ON CONFLICT (user_id, temporada, competicao, divisao, team_id) DO UPDATE SET
      team_nome = EXCLUDED.team_nome,
      posicao = EXCLUDED.posicao,
      p = EXCLUDED.p,
      j = EXCLUDED.j,
      v = EXCLUDED.v,
      e = EXCLUDED.e,
      d = EXCLUDED.d,
      gp = EXCLUDED.gp,
      gc = EXCLUDED.gc,
      sg = EXCLUDED.sg;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_evento_carreira(
  p_user_id UUID,
  p_evento JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Só o dono da carreira pode registrar eventos';
  END IF;

  INSERT INTO public.botao_eventos_carreira (
    user_id, temporada, tipo, titulo, texto, payload
  ) VALUES (
    p_user_id,
    (p_evento->>'temporada')::INTEGER,
    COALESCE(p_evento->>'tipo', 'evento'),
    COALESCE(p_evento->>'titulo', 'Evento de carreira'),
    COALESCE(p_evento->>'texto', ''),
    COALESCE(p_evento->'payload', '{}'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_temporada_carreira(UUID, INTEGER, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_partida_carreira(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_temporada_carreira(UUID, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_evento_carreira(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Frases contextuais da reconstrução de temporada (placeholders novos).
INSERT INTO public.botao_frases_ia (prompt_type, categoria, template_text, ativo, ordem)
VALUES
  ('comentarista','vitoria','{T} vence na {divisao}, sobe para {posicao}º e {coach} sai acreditando na temporada {temporada}!', true, 210),
  ('comentarista','derrota','{T} tropeça na {divisao}, fica {posicao}º e a moral do elenco cai para {moral}/100. Que vexame!', true, 211),
  ('comentarista','goleada','Goleada na {divisao}! {W} encerra a temporada {temporada} com crise geral no {L}.', true, 212),
  ('coletiva','vitoria','— {coach}, com {T} na {divisao} e {posicao}º na tabela, dá pra prometer acesso e até a Copa?', true, 213),
  ('coletiva','derrota','— {coach}, {T} teve moral só {moral}/100 e {soberania} de soberania. Como explica esse placar na {divisao}?', true, 214),
  ('medico','preparo','— Dr. Maurício: a rotação do elenco deve aliviar depois de {restantes} rodadas restantes na {divisao}.', true, 215),
  ('redes_sociais','vitoria','@TorcedorFiel: {T} na {divisao}, {posicao}º na tabela e {coach} no banco! Agora dá pra sonhar!', true, 216),
  ('redes_sociais','derrota','@TorcedorIndignado: {T} caiu para {posicao}º na {divisao}. {moral}/100 de moral é crise Vesteira!', true, 217),
  ('noticia','crise','Crise no {T}: {coach} tem {soberania} de soberania comentada com silêncio e {restantes} rodadas restantes.', true, 218),
  ('noticia','geral','Futebol de Botão, temporada {temporada}: {T} no comando da {divisao} com bastidores em 1ª pessoa.', true, 219)
ON CONFLICT (prompt_type, categoria, ordem) DO NOTHING;

-- =========================================================
-- PROPRIEDADE DE CLUBES — dono visível para toda a Cidadela
-- =========================================================
-- Quando um jogador compra 100% de um clube na carreira, o dono é registrado
-- aqui (botao_times é a tabela canônica de clubes — sem tabela paralela).
-- Qualquer cidadão consegue ver de quem é cada clube.

ALTER TABLE public.botao_times
  ADD COLUMN IF NOT EXISTS dono_user_id UUID REFERENCES public.botao_usuarios(user_id) ON DELETE SET NULL;

-- Registra o dono de um clube. Idempotente para o MESMO dono; falha se o
-- clube já pertencer a outro jogador (nunca sobrescreve em silêncio).
CREATE OR REPLACE FUNCTION public.cidadela_registrar_dono_clube(p_clube_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_dono UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT dono_user_id INTO v_dono FROM public.botao_times WHERE id = p_clube_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clube nao encontrado: %', p_clube_id;
  END IF;

  IF v_dono IS NOT NULL AND v_dono <> v_uid THEN
    RAISE EXCEPTION 'clube ja tem outro dono';
  END IF;

  UPDATE public.botao_times SET dono_user_id = v_uid WHERE id = p_clube_id;
  RETURN jsonb_build_object('clube_id', p_clube_id, 'dono_user_id', v_uid);
END;
$$;

-- Mapa de proprietários: toda a Cidadela vê de quem é cada clube.
CREATE OR REPLACE FUNCTION public.cidadela_mapa_clubes()
RETURNS TABLE (clube_id TEXT, nome TEXT, dono_user_id UUID, dono_nome TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- botao_usuarios.nome (sempre existe desde a migration #1); o rótulo RPG
  -- (cidadela_perfis.nome) é adicionado em migration posterior e não pode
  -- ser referenciado aqui sem criar dependência de ordem.
  SELECT t.id,
         t.nome,
         t.dono_user_id,
         bu.nome AS dono_nome
  FROM public.botao_times t
  LEFT JOIN public.botao_usuarios bu ON bu.user_id = t.dono_user_id
  ORDER BY t.forca DESC NULLS LAST, t.nome;
$$;

-- =========================================================
-- PROPOSTAS ENTRE JOGADORES — compra de clube / contratação
-- de treinador. Só quem é proprietário negocia como dono.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cidadela_propostas_clubes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  de_user_id UUID NOT NULL REFERENCES public.botao_usuarios(user_id) ON DELETE CASCADE,
  para_user_id UUID NOT NULL REFERENCES public.botao_usuarios(user_id) ON DELETE CASCADE,
  clube_id TEXT NOT NULL REFERENCES public.botao_times(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'treinador')),
  valor_sov INTEGER NOT NULL DEFAULT 0 CHECK (valor_sov >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondida_em TIMESTAMPTZ
);

ALTER TABLE public.cidadela_propostas_clubes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "propostas_select_partes" ON public.cidadela_propostas_clubes;
CREATE POLICY "propostas_select_partes" ON public.cidadela_propostas_clubes
  FOR SELECT USING (auth.uid() = de_user_id OR auth.uid() = para_user_id);

DROP POLICY IF EXISTS "propostas_insert_remetente" ON public.cidadela_propostas_clubes;
CREATE POLICY "propostas_insert_remetente" ON public.cidadela_propostas_clubes
  FOR INSERT WITH CHECK (auth.uid() = de_user_id);

-- Resposta/cancelamento SÓ via RPC (validações + transferência no ledger).

CREATE OR REPLACE FUNCTION public.cidadela_enviar_proposta_clube(
  p_para UUID,
  p_clube_id TEXT,
  p_tipo TEXT,
  p_valor INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_dono UUID;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  IF p_para = v_uid THEN
    RAISE EXCEPTION 'nao e possivel enviar proposta para si mesmo';
  END IF;
  IF p_tipo NOT IN ('compra', 'treinador') THEN
    RAISE EXCEPTION 'tipo de proposta invalido';
  END IF;

  SELECT dono_user_id INTO v_dono FROM public.botao_times WHERE id = p_clube_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clube nao encontrado: %', p_clube_id;
  END IF;

  -- Compra: só se compra de quem é dono. Treinador: só o dono contrata.
  IF p_tipo = 'compra' AND v_dono IS DISTINCT FROM p_para THEN
    RAISE EXCEPTION 'o clube nao pertence ao destinatario';
  END IF;
  IF p_tipo = 'treinador' AND v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'somente o dono do clube pode contratar treinador';
  END IF;

  -- Idempotência: a mesma proposta pendente não duplica.
  SELECT id INTO v_id FROM public.cidadela_propostas_clubes
  WHERE de_user_id = v_uid AND para_user_id = p_para AND clube_id = p_clube_id
    AND tipo = p_tipo AND status = 'pendente'
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.cidadela_propostas_clubes (de_user_id, para_user_id, clube_id, tipo, valor_sov)
  VALUES (v_uid, p_para, p_clube_id, p_tipo, GREATEST(p_valor, 0))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cidadela_responder_proposta_clube(
  p_id UUID,
  p_aceitar BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  p public.cidadela_propostas_clubes;
  v_comprador UUID;
  v_vendedor UUID;
  v_saldo DECIMAL;
  v_tx UUID;
  v_nome TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;

  SELECT * INTO p FROM public.cidadela_propostas_clubes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposta nao encontrada';
  END IF;
  IF p.para_user_id <> v_uid THEN
    RAISE EXCEPTION 'somente o destinatario responde a proposta';
  END IF;
  IF p.status <> 'pendente' THEN
    RETURN jsonb_build_object('id', p.id, 'status', p.status, 'duplicated', TRUE);
  END IF;

  IF NOT p_aceitar THEN
    UPDATE public.cidadela_propostas_clubes
    SET status = 'recusada', respondida_em = now()
    WHERE id = p.id;
    RETURN jsonb_build_object('id', p.id, 'status', 'recusada');
  END IF;

  SELECT nome INTO v_nome FROM public.botao_times WHERE id = p.clube_id;

  IF p.tipo = 'compra' THEN
    v_comprador := p.de_user_id;
    v_vendedor := p.para_user_id;
    -- O vendedor ainda precisa ser o dono.
    IF NOT EXISTS (SELECT 1 FROM public.botao_times WHERE id = p.clube_id AND dono_user_id = v_vendedor) THEN
      RAISE EXCEPTION 'voce nao e mais o dono deste clube';
    END IF;
    -- Saldo do comprador precisa cobrir o valor (erro nunca vira zero).
    SELECT balance INTO v_saldo FROM public.user_wallets WHERE user_id = v_comprador FOR UPDATE;
    IF COALESCE(v_saldo, 0) < p.valor_sov THEN
      RAISE EXCEPTION 'saldo insuficiente do comprador';
    END IF;

    -- Transferência: nasce no ledger dos DOIS lados (moeda existente, sem
    -- emissão nova — por isso record_transaction direto, não o emissor).
    IF NOT EXISTS (SELECT 1 FROM public.bank_ledger WHERE user_id = v_comprador AND idempotency_key = 'proposta:' || p.id || ':compra') THEN
      v_tx := record_transaction(v_comprador, 'transfer', -p.valor_sov,
        'Compra do clube ' || COALESCE(v_nome, p.clube_id) || ' (proposta)', 'market', jsonb_build_object('proposta_id', p.id));
      UPDATE public.bank_ledger SET idempotency_key = 'proposta:' || p.id || ':compra',
        source_event = 'proposta-compra-clube', balance_before = balance_after + p.valor_sov
      WHERE id = v_tx;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bank_ledger WHERE user_id = v_vendedor AND idempotency_key = 'proposta:' || p.id || ':venda') THEN
      v_tx := record_transaction(v_vendedor, 'transfer', p.valor_sov,
        'Venda do clube ' || COALESCE(v_nome, p.clube_id) || ' (proposta)', 'market', jsonb_build_object('proposta_id', p.id));
      UPDATE public.bank_ledger SET idempotency_key = 'proposta:' || p.id || ':venda',
        source_event = 'proposta-venda-clube', balance_before = balance_after - p.valor_sov
      WHERE id = v_tx;
    END IF;

    UPDATE public.botao_times SET dono_user_id = v_comprador WHERE id = p.clube_id;
  ELSE
    -- Contratação de treinador: o dono (remetente) paga o valor ao treinador.
    IF NOT EXISTS (SELECT 1 FROM public.botao_times WHERE id = p.clube_id AND dono_user_id = p.de_user_id) THEN
      RAISE EXCEPTION 'o remetente nao e mais o dono deste clube';
    END IF;
    SELECT balance INTO v_saldo FROM public.user_wallets WHERE user_id = p.de_user_id FOR UPDATE;
    IF COALESCE(v_saldo, 0) < p.valor_sov THEN
      RAISE EXCEPTION 'saldo insuficiente do dono do clube';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bank_ledger WHERE user_id = p.de_user_id AND idempotency_key = 'proposta:' || p.id || ':salario-dono') THEN
      v_tx := record_transaction(p.de_user_id, 'transfer', -p.valor_sov,
        'Contratacao de treinador para ' || COALESCE(v_nome, p.clube_id), 'market', jsonb_build_object('proposta_id', p.id));
      UPDATE public.bank_ledger SET idempotency_key = 'proposta:' || p.id || ':salario-dono',
        source_event = 'proposta-treinador-dono', balance_before = balance_after + p.valor_sov
      WHERE id = v_tx;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bank_ledger WHERE user_id = v_uid AND idempotency_key = 'proposta:' || p.id || ':salario-treinador') THEN
      v_tx := record_transaction(v_uid, 'transfer', p.valor_sov,
        'Contrato de treinador do ' || COALESCE(v_nome, p.clube_id), 'market', jsonb_build_object('proposta_id', p.id));
      UPDATE public.bank_ledger SET idempotency_key = 'proposta:' || p.id || ':salario-treinador',
        source_event = 'proposta-treinador-salario', balance_before = balance_after - p.valor_sov
      WHERE id = v_tx;
    END IF;
  END IF;

  UPDATE public.cidadela_propostas_clubes
  SET status = 'aceita', respondida_em = now()
  WHERE id = p.id;
  RETURN jsonb_build_object('id', p.id, 'status', 'aceita');
END;
$$;

CREATE OR REPLACE FUNCTION public.cidadela_listar_propostas_clubes()
RETURNS TABLE (
  id UUID,
  de_user_id UUID,
  de_nome TEXT,
  para_user_id UUID,
  para_nome TEXT,
  clube_id TEXT,
  clube_nome TEXT,
  tipo TEXT,
  valor_sov INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.de_user_id, bd.nome AS de_nome,
         p.para_user_id, bp.nome AS para_nome,
         p.clube_id, t.nome AS clube_nome,
         p.tipo, p.valor_sov, p.status, p.created_at
  FROM public.cidadela_propostas_clubes p
  JOIN public.botao_times t ON t.id = p.clube_id
  LEFT JOIN public.botao_usuarios bd ON bd.user_id = p.de_user_id
  LEFT JOIN public.botao_usuarios bp ON bp.user_id = p.para_user_id
  WHERE p.de_user_id = auth.uid() OR p.para_user_id = auth.uid()
  ORDER BY p.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.cidadela_registrar_dono_clube(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_mapa_clubes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_enviar_proposta_clube(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_responder_proposta_clube(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cidadela_listar_propostas_clubes() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Libera o dono de um clube (venda de cotas abaixo de 100% na carreira ou
-- venda local). Só o próprio dono pode liberar; idempotente.
CREATE OR REPLACE FUNCTION public.cidadela_liberar_dono_clube(p_clube_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'usuario nao autenticado';
  END IF;
  UPDATE public.botao_times
  SET dono_user_id = NULL
  WHERE id = p_clube_id AND dono_user_id = v_uid;
  RETURN jsonb_build_object('clube_id', p_clube_id, 'dono_user_id', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cidadela_liberar_dono_clube(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
