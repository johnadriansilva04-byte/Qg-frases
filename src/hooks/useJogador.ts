import { useQuery } from "@tanstack/react-query";
import { getUsuarioAtual } from "@/lib/botao/api";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";

/** Jogador logado já conhecido a partir de botao_usuarios. */
export function useJogador() {
  const { perfil } = useBotaoAuth();
  
  return useQuery({
    queryKey: ["botao_usuarios", "atual"],
    queryFn: () => perfil?.user_id ? getUsuarioAtual(perfil.user_id) : Promise.resolve(null),
    enabled: !!perfil?.user_id,
    staleTime: 30_000,
  });
}
