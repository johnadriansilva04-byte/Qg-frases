-- Atualizar tabela botao_usuarios para usar Supabase Auth
-- Execute isso no SQL Editor do Supabase

-- Adicionar coluna abreviacao_time se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='botao_usuarios' 
        AND column_name='abreviacao_time'
    ) THEN
        ALTER TABLE public.botao_usuarios 
        ADD COLUMN abreviacao_time TEXT NOT NULL DEFAULT 'MTI';
    END IF;
END $$;

-- Notificar para recarregar o schema
NOTIFY pgrst, 'reload schema';
