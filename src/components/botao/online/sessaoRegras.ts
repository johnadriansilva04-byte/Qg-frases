/**
 * Regra determinística que separa AUTENTICAÇÃO de CONTA DE JOGO.
 *
 * Uma sessão válida em `auth.users` NÃO significa que existe conta de jogo
 * (`botao_usuarios`). Este módulo decide o destino da sessão sem side-effects
 * (PURO — testável em runtime, sem dependência de Supabase nem alias "@/"):
 *
 * - `entrar`                     → perfil existe: conta de jogo válida.
 * - `recuperar-cadastro-recente` → sem perfil, mas o usuário Auth foi criado
 *   há instantes: é o primeiro acesso imediatamente após o signUp e o trigger
 *   `handle_new_user` pode ter falhado — a recuperação do perfil é legítima.
 * - `recusar-conta-sem-cadastro` → sem perfil e conta Auth ANTIGA: o perfil de
 *   jogo foi removido depois. A sessão NÃO pode ressuscitar a conta: nada de
 *   perfil/carteira/bônus automático — recusa + direcionamento ao cadastro.
 */

export type DestinoSessao =
  | "entrar"
  | "recuperar-cadastro-recente"
  | "recusar-conta-sem-cadastro";

/**
 * Janela em que a ausência de perfil ainda é explicável pelo signUp (trigger
 * rodando, falha transitória, confirmação de e-mail recém-concluída). Fora
 * dela, ausência de perfil = conta de jogo inexistente/removida.
 */
export const JANELA_CADASTRO_RECENTE_MS = 10 * 60 * 1000;

export function decidirDestinoSessao(opcoes: {
  temPerfil: boolean;
  /** `auth.users.created_at` (ISO) do usuário da sessão. */
  usuarioCriadoEm: string | null | undefined;
  agora?: number;
}): DestinoSessao {
  if (opcoes.temPerfil) return "entrar";

  const criadoEm = opcoes.usuarioCriadoEm ? Date.parse(opcoes.usuarioCriadoEm) : NaN;
  const idade = (opcoes.agora ?? Date.now()) - criadoEm;

  // Idade negativa = relógio do cliente adiantado em relação ao servidor;
  // ainda assim é um cadastro recém-criado → recuperação legítima.
  if (Number.isFinite(idade) && idade <= JANELA_CADASTRO_RECENTE_MS) {
    return "recuperar-cadastro-recente";
  }
  return "recusar-conta-sem-cadastro";
}
