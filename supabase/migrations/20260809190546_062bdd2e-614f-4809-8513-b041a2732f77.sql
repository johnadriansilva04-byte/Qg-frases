CREATE TABLE public.livros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  autor TEXT,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  imagem_url TEXT,
  link_afiliado TEXT NOT NULL,
  preco TEXT,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.livros TO anon;
GRANT SELECT ON public.livros TO authenticated;
GRANT ALL ON public.livros TO service_role;

ALTER TABLE public.livros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Livros ativos sao publicos" ON public.livros
FOR SELECT USING (ativo = true);

INSERT INTO public.livros (titulo, autor, descricao, categoria, imagem_url, link_afiliado, preco, destaque, ordem) VALUES
('O Poder do Hábito', 'Charles Duhigg', 'Como transformar pequenos hábitos em grandes resultados na sua vida.', 'Motivação', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80', 'https://www.amazon.com.br/dp/8539004119', 'A partir de R$ 39,90', true, 1),
('A Bíblia Sagrada de Estudo', 'Diversos', 'Edição de estudo com notas e referências para aprofundar sua fé.', 'Bíblia', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80', 'https://www.amazon.com.br/s?k=biblia+de+estudo', 'A partir de R$ 59,90', true, 2),
('Mais Esperto que o Diabo', 'Napoleon Hill', 'Um clássico sobre vencer o medo e a procrastinação.', 'Motivação', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', 'https://www.amazon.com.br/dp/8568014011', 'A partir de R$ 29,90', false, 3),
('A Arte da Sedução', 'Robert Greene', 'Entenda a psicologia por trás do carisma e da atração.', 'Relacionamentos', 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&q=80', 'https://www.amazon.com.br/dp/8532517617', 'A partir de R$ 49,90', false, 4),
('Essencialismo', 'Greg McKeown', 'Faça menos, porém melhor: o caminho disciplinado para o essencial.', 'Produtividade', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&q=80', 'https://www.amazon.com.br/dp/8543102146', 'A partir de R$ 44,90', false, 5),
('O Homem Mais Rico da Babilônia', 'George S. Clason', 'Princípios atemporais de prosperidade contados em parábolas.', 'Finanças', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80', 'https://www.amazon.com.br/dp/8595081530', 'A partir de R$ 24,90', false, 6);