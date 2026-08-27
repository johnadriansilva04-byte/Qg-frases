-- SQL PARA RESETAR O BANCO INTEIRO
-- ATENÇÃO: ISSO VAI APAGAR TODOS OS DADOS E ESTRUTURAS
-- Execute apenas se tiver certeza que quer começar do zero

-- Dropar todas as funções do schema public (CASCADE remove dependências)
DROP FUNCTION IF EXISTS public.abandonar_partida_trilha(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.atualizar_timestamp_mesa_trilha() CASCADE;
DROP FUNCTION IF EXISTS public.criar_mesa_trilha(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.criar_mesa_trilha(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.entrar_mesa_trilha(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.finalizar_partida_trilha(TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.limpar_mesas_trilha_antigas() CASCADE;
DROP FUNCTION IF EXISTS public.listar_mesas_trilha_disponive(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.registrar_heartbeat_mesa_trilha(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.registrar_jogada_trilha(TEXT, INTEGER, INTEGER, INTEGER, INTEGER[], INTEGER, INTEGER, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.tempo_restante_mesa_trilha(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.tick_mesas_trilha() CASCADE;
DROP FUNCTION IF EXISTS public.record_transaction(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.sov_bank_registrar(UUID, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_wallet(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.obter_saldo_soberania(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.sov_bank_bonus_cadastro(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.obter_perfil_cidadela(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.escolher_profissao(UUID, TEXT) CASCADE;

-- Dropar todas as tabelas do schema public (IF EXISTS evita erro se não existir)
DROP TABLE IF EXISTS public.mesas_trilha CASCADE;
DROP TABLE IF EXISTS public.mesas_futebol CASCADE;
DROP TABLE IF EXISTS public.botao_campeonatos_online CASCADE;
DROP TABLE IF EXISTS public.botao_usuarios CASCADE;
DROP TABLE IF EXISTS public.user_wallets CASCADE;
DROP TABLE IF EXISTS public.sov_transactions CASCADE;
DROP TABLE IF EXISTS public.cidadela_chat_messages CASCADE;
DROP TABLE IF EXISTS public.cidadela_perfil CASCADE;
DROP TABLE IF EXISTS public.campus_fabrica CASCADE;
DROP TABLE IF EXISTS public.campus_biblioteca CASCADE;
DROP TABLE IF EXISTS public.laboratorio_produtos CASCADE;
DROP TABLE IF EXISTS public.comercial_produtos CASCADE;
DROP TABLE IF EXISTS public.feira_ofertas CASCADE;
DROP TABLE IF EXISTS public.botao_times CASCADE;
DROP TABLE IF EXISTS public.career_snapshots CASCADE;
DROP TABLE IF EXISTS public.botao_clubes CASCADE;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Banco resetado com sucesso. Agora pode rodar as migrations do zero.';
END $$;
