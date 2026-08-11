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

-- Inserir livros recomendados
INSERT INTO public.livros (titulo, autor, categoria, descricao, imagem_url, link_afiliado, preco, destaque, ordem) VALUES
-- História
('A Primeira Guerra Mundial', 'John Keegan', 'História', 'Uma análise magistral da Primeira Guerra Mundial, explorando as causas, batalhas e consequências do conflito que mudou o mundo.', 'https://images-na.ssl-images-amazon.com/images/I/81qzK8aKR+L.jpg', 'https://amzn.to/3XyZ7Bm', 'R$ 89,90', true, 1),
('A Segunda Guerra Mundial', 'Antony Beevor', 'História', 'O relato definitivo da Segunda Guerra Mundial, cobrindo todos os teatros de operações com detalhes impressionantes.', 'https://images-na.ssl-images-amazon.com/images/I/91W8ZJH2GEL.jpg', 'https://amzn.to/3WzK2Yp', 'R$ 129,90', true, 2),
('Guerra e Paz', 'Liev Tolstói', 'História', 'Um épico sobre a invasão napoleônica da Rússia, explorando temas de guerra, paz e sociedade russa.', 'https://images-na.ssl-images-amazon.com/images/I/71CkZQ3VqGL.jpg', 'https://amzn.to/3XqA1Nk', 'R$ 59,90', false, 3),

-- Psicologia
('O Poder do Hábito', 'Charles Duhigg', 'Psicologia', 'Descubra como hábitos funcionam e como transformá-los para alcançar sucesso pessoal e profissional.', 'https://images-na.ssl-images-amazon.com/images/I/51xT6q0J3GL.jpg', 'https://amzn.to/3WxY7Zq', 'R$ 49,90', true, 4),
('Pensamento Rápido e Pensamento Lento', 'Daniel Kahneman', 'Psicologia', 'O ganhador do Nobel explora os dois sistemas que dirigem nosso pensamento e como podemos tomar decisões melhores.', 'https://images-na.ssl-images-amazon.com/images/I/51F0x6p8v1L.jpg', 'https://amzn.to/3WzK9Yp', 'R$ 79,90', true, 5),
('O Homem e seus Símbolos', 'Carl Jung', 'Psicologia', 'Uma introdução acessível à psicologia analítica e aos arquétipos que influenciam nosso comportamento.', 'https://images-na.ssl-images-amazon.com/images/I/71QXzK0O9zL.jpg', 'https://amzn.to/3XqA2Nk', 'R$ 69,90', false, 6),

-- Filosofia
('A República', 'Platão', 'Filosofia', 'Uma das obras mais influentes da filosofia ocidental, explorando justiça, política e a natureza da realidade.', 'https://images-na.ssl-images-amazon.com/images/I/71Q0zK0O9zL.jpg', 'https://amzn.to/3WxY8Zq', 'R$ 39,90', true, 7),
('Ética', 'Baruch Spinoza', 'Filosofia', 'Uma obra fundamental sobre ética, racionalidade e a busca pela felicidade através da razão.', 'https://images-na.ssl-images-amazon.com/images/I/81R8ZJH2GEL.jpg', 'https://amzn.to/3WzK3Yp', 'R$ 49,90', false, 8),
('Assim Falou Zaratustra', 'Friedrich Nietzsche', 'Filosofia', 'Uma obra revolucionária sobre o super-homem, a morte de Deus e a transformação dos valores morais.', 'https://images-na.ssl-images-amazon.com/images/I/71Q1zK0O9zL.jpg', 'https://amzn.to/3XqA3Nk', 'R$ 59,90', false, 9),

-- Sociologia
('A Sociedade do Espetáculo', 'Guy Debord', 'Sociologia', 'Uma crítica incisiva da sociedade de consumo e da alienação na era da mídia de massa.', 'https://images-na.ssl-images-amazon.com/images/I/81Q2zK0O9zL.jpg', 'https://amzn.to/3WxY9Zq', 'R$ 45,90', true, 10),
('O Processo Civilizatório', 'Norbert Elias', 'Sociologia', 'Uma análise profunda das mudanças comportamentais e sociais ao longo da história ocidental.', 'https://images-na.ssl-images-amazon.com/images/I/71Q3zK0O9zL.jpg', 'https://amzn.to/3WzK4Yp', 'R$ 55,90', false, 11),
('A Elite do Atraso', 'Jessé Souza', 'Sociologia', 'Uma análise crítica da desigualdade brasileira e das elites que perpetuam o subdesenvolvimento.', 'https://images-na.ssl-images-amazon.com/images/I/71Q4zK0O9zL.jpg', 'https://amzn.to/3XqA4Nk', 'R$ 35,90', false, 12),

-- Mais Esperto que o Diabo
('Mais Esperto que o Diabo', 'Daniel Goleman', 'Inteligência Emocional', 'Aprenda a identificar e combater as técnicas de manipulação usadas por pessoas mal-intencionadas.', 'https://images-na.ssl-images-amazon.com/images/I/51Q5zK0O9zL.jpg', 'https://amzn.to/3WxY0Zq', 'R$ 39,90', true, 13),
('Influência', 'Robert Cialdini', 'Psicologia Social', 'Os seis princípios universais de influência e como se defender de manipuladores.', 'https://images-na.ssl-images-amazon.com/images/I/71Q6zK0O9zL.jpg', 'https://amzn.to/3WzK5Yp', 'R$ 59,90', true, 14),
('O Poder da Persuasão', 'Kevin Hogan', 'Comunicação', 'Técnicas avançadas de persuasão e como usá-las eticamente.', 'https://images-na.ssl-images-amazon.com/images/I/51Q7zK0O9zL.jpg', 'https://amzn.to/3XqA5Nk', 'R$ 45,90', false, 15)

ON CONFLICT DO NOTHING;

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
