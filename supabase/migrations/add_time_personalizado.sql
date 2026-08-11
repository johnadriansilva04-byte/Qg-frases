-- Adicionar campos para time personalizado do usuário
ALTER TABLE public.botao_usuarios 
ADD COLUMN IF NOT EXISTS time_personalizado TEXT NOT NULL DEFAULT 'Meu Time',
ADD COLUMN IF NOT EXISTS numero_jogador INTEGER NOT NULL DEFAULT 10;

-- Constraint para garantir que as 3 cores sejam únicas por usuário
ALTER TABLE public.botao_usuarios 
ADD CONSTRAINT check_cores_unicas 
CHECK (array_length(cores, 1) = 3 AND cores[1] IS DISTINCT FROM cores[2] AND cores[2] IS DISTINCT FROM cores[3] AND cores[1] IS DISTINCT FROM cores[3]);

-- Constraint para garantir que a combinação de 3 cores seja única entre usuários
CREATE UNIQUE INDEX IF NOT EXISTS idx_botao_usuarios_cores_unicas ON public.botao_usuarios (
  (sort(cores))
);

-- Notificar para recarregar schema
NOTIFY pgrst, 'reload schema';
