CREATE TABLE public.botao_perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  telefone TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cores TEXT[] NOT NULL DEFAULT ARRAY['#c8102e','#111111','#ffd65a'],
  time_personalizado TEXT NOT NULL DEFAULT 'Meu Time',
  abreviacao_time TEXT NOT NULL DEFAULT 'MTI',
  numero_jogador INTEGER NOT NULL DEFAULT 10,
  pontos_soberania INTEGER NOT NULL DEFAULT 0,
  partidas_jogadas INTEGER NOT NULL DEFAULT 0,
  partidas_vencidas INTEGER NOT NULL DEFAULT 0,
  progresso_campanha JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_perfis TO authenticated;
GRANT ALL ON public.botao_perfis TO service_role;
ALTER TABLE public.botao_perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_select_auth" ON public.botao_perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_insert_own" ON public.botao_perfis FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "perfis_update_own" ON public.botao_perfis FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.botao_meu_perfil_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.botao_perfis WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.botao_meu_perfil_id() TO authenticated;

CREATE TABLE public.botao_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  criador_id UUID NOT NULL REFERENCES public.botao_perfis(id) ON DELETE CASCADE,
  adversario_id UUID REFERENCES public.botao_perfis(id) ON DELETE SET NULL,
  formato TEXT NOT NULL DEFAULT 'melhor_de_3',
  max_jogadores INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'aguardando',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_lobbies TO authenticated;
GRANT ALL ON public.botao_lobbies TO service_role;
ALTER TABLE public.botao_lobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lobbies_select_auth" ON public.botao_lobbies FOR SELECT TO authenticated USING (true);
CREATE POLICY "lobbies_insert_own" ON public.botao_lobbies FOR INSERT TO authenticated WITH CHECK (criador_id = public.botao_meu_perfil_id());
CREATE POLICY "lobbies_update_participante" ON public.botao_lobbies FOR UPDATE TO authenticated
  USING (criador_id = public.botao_meu_perfil_id() OR adversario_id IS NULL OR adversario_id = public.botao_meu_perfil_id())
  WITH CHECK (criador_id = public.botao_meu_perfil_id() OR adversario_id = public.botao_meu_perfil_id());
CREATE POLICY "lobbies_delete_own" ON public.botao_lobbies FOR DELETE TO authenticated USING (criador_id = public.botao_meu_perfil_id());

CREATE TABLE public.botao_blocos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.botao_lobbies(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL DEFAULT 1,
  jogador1_id UUID NOT NULL REFERENCES public.botao_perfis(id) ON DELETE CASCADE,
  jogador2_id UUID NOT NULL REFERENCES public.botao_perfis(id) ON DELETE CASCADE,
  time1 TEXT NOT NULL DEFAULT 'fla',
  time2 TEXT NOT NULL DEFAULT 'pal',
  placar_j1 INTEGER NOT NULL DEFAULT 0,
  placar_j2 INTEGER NOT NULL DEFAULT 0,
  jogadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  turno TEXT NOT NULL DEFAULT 'jogador1',
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.botao_blocos TO authenticated;
GRANT ALL ON public.botao_blocos TO service_role;
ALTER TABLE public.botao_blocos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocos_select_participante" ON public.botao_blocos FOR SELECT TO authenticated
  USING (jogador1_id = public.botao_meu_perfil_id() OR jogador2_id = public.botao_meu_perfil_id());
CREATE POLICY "blocos_insert_participante" ON public.botao_blocos FOR INSERT TO authenticated
  WITH CHECK (jogador1_id = public.botao_meu_perfil_id() OR jogador2_id = public.botao_meu_perfil_id());
CREATE POLICY "blocos_update_participante" ON public.botao_blocos FOR UPDATE TO authenticated
  USING (jogador1_id = public.botao_meu_perfil_id() OR jogador2_id = public.botao_meu_perfil_id())
  WITH CHECK (jogador1_id = public.botao_meu_perfil_id() OR jogador2_id = public.botao_meu_perfil_id());

CREATE INDEX botao_blocos_lobby_idx ON public.botao_blocos(lobby_id);
CREATE INDEX botao_lobbies_status_idx ON public.botao_lobbies(status);

CREATE OR REPLACE FUNCTION public.botao_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER botao_perfis_touch BEFORE UPDATE ON public.botao_perfis
FOR EACH ROW EXECUTE FUNCTION public.botao_touch_updated_at();

ALTER TABLE public.botao_lobbies REPLICA IDENTITY FULL;
ALTER TABLE public.botao_blocos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.botao_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.botao_blocos;