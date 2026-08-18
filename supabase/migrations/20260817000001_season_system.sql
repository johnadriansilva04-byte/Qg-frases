-- Sistema de Seasons e Campeonatos Integrados (Brasileirão + Copa Brasil + Libertadores)
-- Autoritativo no Supabase para controle de classificação ano a ano

-- Tabela de Seasons (anos civis)
CREATE TABLE IF NOT EXISTS public.botao_seasons (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE, -- ex: 2026
  status TEXT NOT NULL DEFAULT 'planejado', -- planejado, em_andamento, finalizado
  data_inicio DATE,
  data_fim DATE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Participações de Time por Season
CREATE TABLE IF NOT EXISTS public.botao_season_participantes (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES public.botao_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_id TEXT NOT NULL, -- ID do time personalizado
  time_nome TEXT NOT NULL,
  time_abreviacao TEXT NOT NULL,
  time_cores JSONB NOT NULL DEFAULT '[]',
  pontos_soberania_inicio INTEGER NOT NULL DEFAULT 0,
  classificacao_libertadores_anterior INTEGER, -- posição no ano anterior (1-4 = classificado)
  UNIQUE(season_id, user_id)
);

-- Tabela de Competições por Season
CREATE TABLE IF NOT EXISTS public.botao_competicoes (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES public.botao_seasons(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'brasileirao', 'copa_brasil', 'libertadores'
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nao_iniciada', -- nao_iniciada, em_andamento, finalizada
  fase_atual TEXT, -- 'fase_grupos', 'oitavas', 'quartas', 'semifinal', 'final'
  dados JSONB NOT NULL DEFAULT '{}', -- tabela, confrontos, grupos, etc
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Partidas (todas as competições)
CREATE TABLE IF NOT EXISTS public.botao_partidas (
  id SERIAL PRIMARY KEY,
  competicao_id INTEGER NOT NULL REFERENCES public.botao_competicoes(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.botao_seasons(id) ON DELETE CASCADE,
  rodada INTEGER NOT NULL, -- rodada do Brasileirão ou fase da Copa/Libertadores
  data_partida DATE,
  time_casa_id TEXT NOT NULL,
  time_casa_nome TEXT NOT NULL,
  time_fora_id TEXT NOT NULL,
  time_fora_nome TEXT NOT NULL,
  gols_casa INTEGER,
  gols_fora INTEGER,
  status TEXT NOT NULL DEFAULT 'agendada', -- agendada, em_andamento, finalizada, cancelada
  jogada_por_user UUID REFERENCES auth.users(id), -- se foi partida do usuário
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Economia da Campanha
CREATE TABLE IF NOT EXISTS public.botao_economia_campanha (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.botao_seasons(id) ON DELETE CASCADE,
  soberania_atual INTEGER NOT NULL DEFAULT 0,
  custo_mensal INTEGER NOT NULL DEFAULT 0, -- baseado em nível do treinador
  meses_negativos INTEGER NOT NULL DEFAULT 0,
  game_over BOOLEAN NOT NULL DEFAULT FALSE,
  transacoes JSONB NOT NULL DEFAULT '[]', -- histórico de entradas/saídas
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_season_participantes_user ON public.botao_season_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_season_participantes_season ON public.botao_season_participantes(season_id);
CREATE INDEX IF NOT EXISTS idx_competicoes_season ON public.botao_competicoes(season_id);
CREATE INDEX IF NOT EXISTS idx_partidas_competicao ON public.botao_partidas(competicao_id);
CREATE INDEX IF NOT EXISTS idx_partidas_season ON public.botao_partidas(season_id);
CREATE INDEX IF NOT EXISTS idx_economia_user_season ON public.botao_economia_campanha(user_id, season_id);

-- RLS
ALTER TABLE public.botao_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_season_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_competicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botao_economia_campanha ENABLE ROW LEVEL SECURITY;

-- Policies (leitura pública para leaderboard, escrita apenas para dono)
CREATE POLICY "Seasons leitura publica" ON public.botao_seasons FOR SELECT USING (true);
CREATE POLICY "Seasons escrita admin" ON public.botao_seasons FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Participantes leitura propria" ON public.botao_season_participantes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Participantes escrita propria" ON public.botao_season_participantes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Competicoes leitura publica" ON public.botao_competicoes FOR SELECT USING (true);
CREATE POLICY "Competicoes escrita admin" ON public.botao_competicoes FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Partidas leitura publica" ON public.botao_partidas FOR SELECT USING (true);
CREATE POLICY "Partidas escrita admin" ON public.botao_partidas FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Economia leitura propria" ON public.botao_economia_campanha FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Economia escrita propria" ON public.botao_economia_campanha FOR ALL USING (auth.uid() = user_id);

-- RPC: Criar nova season (só service_role)
CREATE OR REPLACE FUNCTION public.criar_season(p_ano INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id INTEGER;
BEGIN
  INSERT INTO public.botao_seasons (ano, status, data_inicio, data_fim)
  VALUES (p_ano, 'em_andamento', (p_ano || '-01-01')::DATE, (p_ano || '-12-31')::DATE)
  RETURNING id INTO v_season_id;
  
  RETURN v_season_id;
END;
$$;

-- RPC: Inscrever usuário na season
CREATE OR REPLACE FUNCTION public.inscrever_season(p_user_id UUID, p_season_id INTEGER, p_time_id TEXT, p_time_nome TEXT, p_time_abrev TEXT, p_time_cores JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participante_id INTEGER;
  v_sob_inicial INTEGER;
BEGIN
  -- Buscar soberania atual do usuário
  SELECT pontos_soberania INTO v_sob_inicial
  FROM public.botao_usuarios
  WHERE user_id = p_user_id;
  
  IF v_sob_inicial IS NULL THEN
    v_sob_inicial := 0;
  END IF;
  
  -- Verificar classificação Libertadores do ano anterior (top 4)
  -- (implementação futura: buscar da season anterior)
  
  INSERT INTO public.botao_season_participantes (
    season_id, user_id, time_id, time_nome, time_abreviacao, time_cores, pontos_soberania_inicio
  )
  VALUES (
    p_season_id, p_user_id, p_time_id, p_time_nome, p_time_abrev, p_time_cores, v_sob_inicial
  )
  RETURNING id INTO v_participante_id;
  
  -- Criar economia inicial
  INSERT INTO public.botao_economia_campanha (
    user_id, season_id, soberania_atual, custo_mensal
  )
  VALUES (
    p_user_id, p_season_id, v_sob_inicial, 5 -- custo base: 5 por mês
  );
  
  RETURN v_participante_id;
END;
$$;

-- RPC: Criar Brasileirão para a season (20 times, 38 rodadas)
CREATE OR REPLACE FUNCTION public.criar_brasileirao(p_season_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comp_id INTEGER;
  v_times JSONB;
  v_rodada INTEGER;
  v_casa TEXT;
  v_fora TEXT;
  v_partida_id INTEGER;
BEGIN
  -- Criar competição
  INSERT INTO public.botao_competicoes (season_id, tipo, nome, status, dados)
  VALUES (p_season_id, 'brasileirao', 'Brasileirão ' || (SELECT ano FROM public.botao_seasons WHERE id = p_season_id), 'em_andamento', '{"times": [], "tabela": []}'::JSONB)
  RETURNING id INTO v_comp_id;
  
  -- Buscar participantes da season (limitado a 20 para MVP)
  -- TODO: implementar lógica de 20 times fixos + usuário
  
  -- Gerar 38 rodadas (turno único)
  FOR v_rodada IN 1..38 LOOP
    -- TODO: gerar confrontos round-robin
    NULL;
  END LOOP;
  
  RETURN v_comp_id;
END;
$$;

-- RPC: Registrar resultado de partida
CREATE OR REPLACE FUNCTION public.registrar_partida(
  p_partida_id INTEGER,
  p_gols_casa INTEGER,
  p_gols_fora INTEGER,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partida RECORD;
  v_comp RECORD;
  v_pontos_sob INTEGER;
BEGIN
  -- Buscar partida
  SELECT * INTO v_partida FROM public.botao_partidas WHERE id = p_partida_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;
  
  -- Atualizar resultado
  UPDATE public.botao_partidas
  SET gols_casa = p_gols_casa, gols_fora = p_gols_fora, status = 'finalizada', jogada_por_user = p_user_id
  WHERE id = p_partida_id;
  
  -- Calcular pontos de soberania (V=+3, E=+1, D=-3)
  IF p_gols_casa > p_gols_fora THEN
    v_pontos_sob := 3;
  ELSIF p_gols_casa = p_gols_fora THEN
    v_pontos_sob := 1;
  ELSE
    v_pontos_sob := -3;
  END IF;
  
  -- Atualizar soberania do usuário
  UPDATE public.botao_usuarios
  SET pontos_soberania = GREATEST(0, pontos_soberania + v_pontos_sob),
      partidas_jogadas = partidas_jogadas + 1,
      partidas_vencidas = partidas_vencidas + CASE WHEN p_gols_casa > p_gols_fora THEN 1 ELSE 0 END
  WHERE user_id = p_user_id;
  
  -- Atualizar economia da campanha
  UPDATE public.botao_economia_campanha
  SET soberania_atual = soberania_atual + v_pontos_sob,
      meses_negativos = CASE WHEN soberania_atual + v_pontos_sob < 0 THEN meses_negativos + 1 ELSE 0 END,
      game_over = CASE WHEN meses_negativos >= 2 AND soberania_atual + v_pontos_sob < 0 THEN TRUE ELSE game_over END
  WHERE user_id = p_user_id AND season_id = v_partida.season_id;
  
  RETURN '{"pontos_soberania": ' || v_pontos_sob || '}'::JSONB;
END;
$$;
