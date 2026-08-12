import { useQuery } from "@tanstack/react-query";
import { getUsuarioAtual } from "@/lib/botao/api";

/** Jogador logado já conhecido a partir de botao_usuarios. */
export function useJogador() {
  return useQuery({
    queryKey: ["botao_usuarios", "atual"],
    queryFn: getUsuarioAtual,
    staleTime: 30_000,
  });
}
