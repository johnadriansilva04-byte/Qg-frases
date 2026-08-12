-- SQL para Chat da Pracinha do Brasileirão
-- Sistema de chat em tempo real para transmissões ao vivo

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS public.pracinha_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usuario TEXT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para garantir que o usuário existe no auth
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pracinha_chat_criado_em ON public.pracinha_chat(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pracinha_chat_user_id ON public.pracinha_chat(user_id);

-- Tabela de canais/configurações da pracinha
CREATE TABLE IF NOT EXISTS public.pracinha_canais (
  id TEXT NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL,
  canal_youtube TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ao_vivo', -- ao_vivo, offline
  video_fallback TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Inserir canais padrão
INSERT INTO public.pracinha_canais (id, nome, canal_youtube, descricao, status, video_fallback, ordem, ativo) VALUES
('cazetv', 'CazéTV', 'UCZ6yq8QqQqQqQqQqQqQqQqQ', 'Transmissão oficial do Brasileirão', 'ao_vivo', 'dQw4w9WgXcQ', 1, true),
('premiere', 'Premiere / GE', 'UCZ6yq8QqQqQqQqQqQqQqQqQ', 'Narração oficial Premiere', 'ao_vivo', 'dQw4w9WgXcQ', 2, true),
('narracao', 'Narração Ao Vivo', 'UCZ6yq8QqQqQqQqQqQqQqQqQ', 'Narração em tempo real', 'ao_vivo', 'dQw4w9WgXcQ', 3, true),
('posjogo', 'Pós-Jogo', 'UCZ6yq8QqQqQqQqQqQqQqQqQ', 'Análise pós-jogo', 'offline', 'dQw4w9WgXcQ', 4, true)
ON CONFLICT (id) DO NOTHING;

-- Permissões
GRANT SELECT, INSERT ON public.pracinha_chat TO authenticated;
GRANT SELECT ON public.pracinha_chat TO anon;
GRANT ALL ON public.pracinha_chat TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.pracinha_canais TO authenticated;
GRANT SELECT ON public.pracinha_canais TO anon;
GRANT ALL ON public.pracinha_canais TO service_role;

-- RLS
ALTER TABLE public.pracinha_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pracinha_canais ENABLE ROW LEVEL SECURITY;

-- Políticas para chat
DROP POLICY IF EXISTS "Todos podem ver mensagens do chat" ON public.pracinha_chat;
CREATE POLICY "Todos podem ver mensagens do chat" ON public.pracinha_chat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem enviar mensagens" ON public.pracinha_chat;
CREATE POLICY "Autenticados podem enviar mensagens" ON public.pracinha_chat FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem deletar suas mensagens" ON public.pracinha_chat;
CREATE POLICY "Usuarios podem deletar suas mensagens" ON public.pracinha_chat FOR DELETE USING (auth.uid() = user_id);

-- Políticas para canais
DROP POLICY IF EXISTS "Todos podem ver canais" ON public.pracinha_canais;
CREATE POLICY "Todos podem ver canais" ON public.pracinha_canais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar canais" ON public.pracinha_canais;
CREATE POLICY "Autenticados podem atualizar canais" ON public.pracinha_canais FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir canais" ON public.pracinha_canais;
CREATE POLICY "Autenticados podem inserir canais" ON public.pracinha_canais FOR INSERT WITH CHECK (true);

-- Função para limpar mensagens antigas (manter apenas últimas 24h)
CREATE OR REPLACE FUNCTION public.limpar_chat_antigo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pracinha_chat
  WHERE criado_em < now() - interval '24 hours';
END;
$$;

-- Limpar cache do schema
NOTIFY pgrst, 'reload schema';
