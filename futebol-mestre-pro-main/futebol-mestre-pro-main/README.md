# Futebol Mestre Pro

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

Ok, então agora eu quero que você use esse SQL 100%, entendeu? O usuário ele já vai tá logado, então quando ele clicar no botão online, que eu já tenho lá na minha página, ele vai cair nessa, nesse módulo que cê vai criar, entendeu? Aí v-- o, a, ele já-- você já tem que conhecer o usuário todos os dados que você precisa, ele já tem que ser conhecido, entendeu? Porque ele já vai ter logado antes de chegar nessa página. Então por isso que você tem que focar 100% no SQL do Supabase ali, entendeu? Cê se ligou? Naquela nomenclatura, e usa só aquela no-nomenclatura. Fechou? E agora foca 100% no meu prompt aqui

Só pra você ficar claro, a gente tá falando sobre futebol de botão, entendeu? Futebol de botão, a gente tá falando sobre futebol de botão, entendeu? E n-não tem que ser s-- o jeito tradicional. Pense tanto pra celular quanto pra computador Objetivo: Desenvolver uma aplicação web interativa em estilo portal de jogos históricos e simulador de partidas, totalmente integrada à nossa base de dados no Supabase.
​⚠️ INSTRUÇÃO CRÍTICA DE DADOS:
Todo o fluxo de lógica, seleção de times, jogadores, dados de partidas e anos deve focar estritamente na estrutura da nossa tabela do Supabase que vou enviar em anexo/código a seguir. Não invente colunas ou tabelas genéricas; utilize os campos exatos do banco.
​🎮 MODALIDADES DO JOGO
​A aplicação deve conter 2 modalidades principais selecionáveis no menu:
​1️⃣ Modalidade 1: Amistoso Lendário
​Conceito: O usuário entra, navega pelo catálogo e escolhe livremente os times/jogadores para montar um confronto épico.
​Fluxo do Usuário:
​Seleção de Confraria: Escolha do time/lado A e time/lado B a partir dos dados do Supabase.
​Configuração da Partida: Definição dos parâmetros do jogo baseado nas estatísticas da tabela.
​Execução: Exibição da simulação/transmissão do Amistoso Lendário na tela principal.
​2️⃣ Modalidade 2: Seminário / Retro Challenge (1940 a XVIII)
​Conceito: Uma modalidade temática de desafio retro/histórico que simula a era de ouro e confrontos lendários clássicos (abrangendo a linha do tempo de 1940 até o século XVIII / eras clássicas).
​Ambientação:
​Conceito visual focado na atmosfera clássica/histórica (Rendukuoso, REN Negro, Sanetzinganshen).
​Filtro automático na tabela do Supabase para puxar apenas atributos, estatísticas e registros correspondentes a este período histórico/categoria especial.
​Sistema de desafios por etapas (Challenge) onde o usuário avança conforme cumpre os requisitos do seminário/partida.
​🛠️ ARQUITETURA TÉCNICA E REQUISITOS
​Integração com Supabase:
​Conexão via @supabase/supabase-js.
​Consultas otimizadas para ler os dados da nossa tabela (Lendo times, estatísticas, histórico de confrontos e atributos).
​Atualização de status/histórico do usuário diretamente no banco ao finalizar uma modalidade.
​Interface e UX (Front-end):
​Design System: Estilo escuro (Dark Theme), moderno e esportivo, com transições suaves para a troca de modalidades.
​Painel Interativo: Tela de seleção dinâmica onde o usuário vê os cards dos times/desafios carregados diretamente do banco.
​Responsividade: Deve rodar perfeitamente tanto em desktop quanto em dispositivos móveis.
​Instruções de Código:
​Escreva um código modular, limpo e bem comentado.
​Deixe as funções de chamada ao Supabase isoladas (ex: getLendarios(), getDesafiosRetro()) para facilitar a manutenção.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19bc8488-2c43-4fb3-85b5-833e4de48dc1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
