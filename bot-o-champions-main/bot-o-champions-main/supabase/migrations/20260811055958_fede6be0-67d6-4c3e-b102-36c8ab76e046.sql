REVOKE ALL ON FUNCTION public.botao_meu_perfil_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.botao_meu_perfil_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.botao_meu_perfil_id() TO authenticated;
REVOKE ALL ON FUNCTION public.botao_touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.botao_touch_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.botao_touch_updated_at() FROM authenticated;