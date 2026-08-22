-- =============================================================================
-- RANKING PATRIMÔNIO — sincronização automática carteira → perfil público
-- =============================================================================
-- Depende de: futebol.sql (botao_usuarios), sov_financial_system.sql
-- (user_wallets). Idealmente DEPOIS de sov_bank_invest.sql
-- (user_wallets.invest_balance) — se ainda não estiver aplicada, o trigger é
-- criado na variante "só Bank" e este arquivo deve ser RE-APLICADO depois
-- (idempotente).
--
-- O que resolve:
--   1. `pontos_soberania` (cache público do SOV Bank) ficava sujeito a
--      escritores lembrarem de atualizá-lo. Agora o PRÓPRIO BANCO sincroniza
--      a cada escrita em user_wallets — cache nunca diverge do ledger.
--   2. `patrimonio_sov` (NOVO) = SOV Bank + SOV Invest. É a métrica do
--      Ranking Mundial de Treinadores: mover dinheiro entre as carteiras
--      NÃO derruba a posição do jogador (o patrimônio é o mesmo).
-- =============================================================================

ALTER TABLE public.botao_usuarios
  ADD COLUMN IF NOT EXISTS patrimonio_sov NUMERIC(14,2) NOT NULL DEFAULT 0;

DO $$
DECLARE
  tem_invest BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_wallets' AND column_name = 'invest_balance'
  ) INTO tem_invest;

  IF tem_invest THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.sincronizar_cache_soberania()
      RETURNS TRIGGER LANGUAGE plpgsql AS $body$
      BEGIN
        UPDATE public.botao_usuarios
        SET pontos_soberania = GREATEST(0, NEW.balance),
            patrimonio_sov = GREATEST(0, NEW.balance) + GREATEST(0, COALESCE(NEW.invest_balance, 0))
        WHERE user_id = NEW.user_id;
        RETURN NEW;
      END;
      $body$;
    $fn$;
  ELSE
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.sincronizar_cache_soberania()
      RETURNS TRIGGER LANGUAGE plpgsql AS $body$
      BEGIN
        UPDATE public.botao_usuarios
        SET pontos_soberania = GREATEST(0, NEW.balance),
            patrimonio_sov = GREATEST(0, NEW.balance)
        WHERE user_id = NEW.user_id;
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sync_cache_soberania ON public.user_wallets;
CREATE TRIGGER trg_sync_cache_soberania
  AFTER INSERT OR UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_cache_soberania();

-- Backfill idempotente: alinha o cache de quem já tem carteira.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_wallets' AND column_name = 'invest_balance'
  ) THEN
    UPDATE public.botao_usuarios u
    SET pontos_soberania = GREATEST(0, w.balance),
        patrimonio_sov = GREATEST(0, w.balance) + GREATEST(0, COALESCE(w.invest_balance, 0))
    FROM public.user_wallets w
    WHERE w.user_id = u.user_id;
  ELSE
    UPDATE public.botao_usuarios u
    SET pontos_soberania = GREATEST(0, w.balance),
        patrimonio_sov = GREATEST(0, w.balance)
    FROM public.user_wallets w
    WHERE w.user_id = u.user_id;
  END IF;
END $$;

-- Verificação rápida (SQL Editor):
--   SELECT user_id, pontos_soberania, patrimonio_sov FROM botao_usuarios
--   ORDER BY patrimonio_sov DESC LIMIT 10;
