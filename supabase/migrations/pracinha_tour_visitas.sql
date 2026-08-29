-- Coluna para persistir módulos visitados pelo Pracinha (tour onboarding).
-- Array de strings ex: ["futebol", "carreira", "clube"]
ALTER TABLE public.botao_usuarios
  ADD COLUMN IF NOT EXISTS tour_modulos_visitados TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- RLS: usuário só lê/escreve seus próprios dados (já coberto por policy existente).
