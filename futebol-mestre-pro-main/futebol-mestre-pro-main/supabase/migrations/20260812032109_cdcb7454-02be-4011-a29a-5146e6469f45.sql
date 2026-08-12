ALTER FUNCTION public.alternar_turno_bloco(UUID) SET search_path = public;
ALTER FUNCTION public.registrar_jogada_bloco(UUID) SET search_path = public;
ALTER FUNCTION public.registrar_gol_bloco(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.forcar_troca_turno_bloco(UUID) SET search_path = public;
ALTER FUNCTION public.finalizar_bloco(UUID, TEXT) SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

NOTIFY pgrst, 'reload schema';