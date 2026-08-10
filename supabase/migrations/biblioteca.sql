-- SQL COMPLETO PARA BIBLIOTECA DE LIVROS
-- Sistema de indicação de livros com links de afiliado
-- Execute este SQL único no Supabase

-- Tabela de livros
CREATE TABLE IF NOT EXISTS public.livros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Informações do livro
  titulo TEXT NOT NULL,
  autor TEXT,
  categoria TEXT NOT NULL,
  descricao TEXT,
  
  -- Imagem e links
  imagem_url TEXT,
  link_afiliado TEXT NOT NULL,
  preco TEXT,
  
  -- Controle de exibição
  destaque BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_livros_categoria ON public.livros(categoria);
CREATE INDEX IF NOT EXISTS idx_livros_ativo ON public.livros(ativo);
CREATE INDEX IF NOT EXISTS idx_livros_destaque ON public.livros(destaque);
CREATE INDEX IF NOT EXISTS idx_livros_ordem ON public.livros(ordem);

-- Permissões
GRANT SELECT ON public.livros TO anon;
GRANT SELECT ON public.livros TO authenticated;
GRANT ALL ON public.livros TO service_role;

-- RLS
ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Todos podem ver livros" ON public.livros;
CREATE POLICY "Todos podem ver livros" ON public.livros FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Autenticados podem gerenciar livros" ON public.livros;
CREATE POLICY "Autenticados podem gerenciar livros" ON public.livros FOR ALL USING (true) WITH CHECK (true);

-- Limpar cache do schema ao final
NOTIFY pgrst, 'reload schema';
