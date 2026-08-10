-- Adicionar trigger de matchmaking automático
-- Esta migration adiciona o trigger que cria partidas automaticamente quando 2 jogadores estão na fila

-- Função para matchmaking automático (atualizada)
CREATE OR REPLACE FUNCTION public.matchmaking_botao()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  partida_id UUID;
  jogador1_id UUID;
  jogador2_id UUID;
BEGIN
  -- Verifica se há pelo menos 2 jogadores na fila
  IF (SELECT COUNT(*) FROM public.botao_fila WHERE status = 'esperando' AND expira_em > now()) >= 2 THEN
    -- Pega os 2 primeiros jogadores
    SELECT id INTO jogador1_id FROM public.botao_fila WHERE status = 'esperando' AND expira_em > now() ORDER BY criado_em ASC LIMIT 1;
    SELECT id INTO jogador2_id FROM public.botao_fila WHERE status = 'esperando' AND expira_em > now() ORDER BY criado_em ASC OFFSET 1 LIMIT 1;
    
    -- Cria partida
    INSERT INTO public.botao_partidas (
      jogador1_id, jogador1_session, jogador1_time,
      jogador2_id, jogador2_session, jogador2_time
    )
    SELECT 
      f1.usuario_id, f1.session_id, f1.time_escolhido,
      f2.usuario_id, f2.session_id, f2.time_escolhido
    FROM public.botao_fila f1, public.botao_fila f2
    WHERE f1.id = jogador1_id AND f2.id = jogador2_id
    RETURNING id INTO partida_id;
    
    -- Atualiza status dos jogadores na fila
    UPDATE public.botao_fila
    SET status = 'em_partida'
    WHERE id IN (jogador1_id, jogador2_id);
    
    RETURN partida_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Função para trigger de matchmaking
CREATE OR REPLACE FUNCTION public.trigger_matchmaking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.matchmaking_botao();
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela fila (se não existir)
DROP TRIGGER IF EXISTS on_fila_insert_trigger ON public.botao_fila;
CREATE TRIGGER on_fila_insert_trigger
AFTER INSERT ON public.botao_fila
FOR EACH ROW
EXECUTE FUNCTION public.trigger_matchmaking();
