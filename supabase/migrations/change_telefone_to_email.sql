-- Mudar coluna telefone para email na tabela botao_usuarios
-- Execute isso no SQL Editor do Supabase

-- Adicionar coluna email se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='botao_usuarios' 
        AND column_name='email'
    ) THEN
        ALTER TABLE public.botao_usuarios 
        ADD COLUMN email TEXT;
    END IF;
END $$;

-- Migrar dados de telefone para email (se houver dados)
UPDATE public.botao_usuarios 
SET email = 'botao' || telefone || '@botao.app'
WHERE email IS NULL AND telefone IS NOT NULL;

-- Tornar email NOT NULL após migrar
ALTER TABLE public.botao_usuarios 
ALTER COLUMN email SET NOT NULL;

-- Opcional: remover coluna telefone após verificar que a migração funcionou
-- ALTER TABLE public.botao_usuarios DROP COLUMN telefone;

-- Notificar para recarregar o schema
NOTIFY pgrst, 'reload schema';
