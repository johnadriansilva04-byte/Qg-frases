import { assertSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { criarPerfilSeNaoExistir } from "@/lib/botao/api";

export type Perfil = {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  cores: string[];
  time_personalizado: string;
  abreviacao_time: string;
  numero_jogador: number;
  pontos_soberania: number;
  partidas_jogadas: number;
  partidas_vencidas: number;
  campeonatos_ganhos: number;
  gols_feitos: number;
  gols_sofridos: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  /** Tática/formação PS2 (1-2-2, 1-3-1, ...). */
  tatica?: string | null;
  /** Nomes personalizados dos 5 botões de linha. */
  botoes_nomes?: string[] | null;
};

export const CORES_PADRAO = ["#FF0000", "#00FF00", "#0000FF"];

/** Validação simples de email */
export const validarEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valido = re.test(email);
  console.log("Validando email:", email, "Resultado:", valido);
  return valido;
};

export function validarCadastro(input: {
  email: string;
  senha: string;
  nome: string;
  time: string;
  abreviacao: string;
  numero: number;
  cores: string[];
}): string | null {
  if (!validarEmail(input.email)) return "Email inválido.";
  if (input.senha.length < 6 || input.senha.length > 72)
    return "A senha precisa ter entre 6 e 72 caracteres.";
  if (!input.nome.trim() || input.nome.trim().length > 40)
    return "Informe um nome de até 40 caracteres.";
  if (!input.time.trim() || input.time.trim().length > 30)
    return "Informe um nome de time de até 30 caracteres.";
  if (!/^[A-Za-z]{2,4}$/.test(input.abreviacao.trim()))
    return "A abreviação deve ter de 2 a 4 letras.";
  if (!Number.isInteger(input.numero) || input.numero < 1 || input.numero > 99)
    return "Número do jogador: 1 a 99.";
  if (input.cores.length !== 3 || input.cores.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c)))
    return "Escolha três cores válidas.";
  return null;
}

export function cachePerfil(_p: Perfil) {
  // Perfil é resolvido do Supabase a cada sessão; não cacheia dados em memória do browser.
}

function limparStorage(storage: Storage | undefined) {
  if (typeof window === "undefined" || !storage) return;
  const prefixos = ["botao", "qgfrases_", "trilha_", "cidadela_"];
  for (let i = storage.length - 1; i >= 0; i--) {
    const chave = storage.key(i);
    if (chave && prefixos.some((p) => chave.startsWith(p))) storage.removeItem(chave);
  }
}

function limparCachesDeJogo() {
  limparStorage(window.localStorage);
  limparStorage(window.sessionStorage);
}

export function limparCache() {
  if (typeof window === "undefined") return;
  limparCachesDeJogo();
}

export async function buscarPerfil(userId: string): Promise<Perfil | null> {
  assertSupabaseConfigured();
  const { data } = await supabase
    .from("botao_usuarios")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Perfil | null) ?? null;
}

export async function entrar(email: string, senha: string): Promise<Perfil | null> {
  assertSupabaseConfigured();
  limparCache();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha,
  });
  if (error) throw new Error("Email ou senha incorretos.");

  const user = data.user;
  if (!user) throw new Error("Não foi possível carregar o usuário.");
  return buscarPerfil(user.id);
}

export async function cadastrar(input: {
  email: string;
  senha: string;
  nome: string;
  time: string;
  abreviacao: string;
  numero: number;
  cores: string[];
}) {
  assertSupabaseConfigured();
  limparCache();
  const erro = validarCadastro(input);
  if (erro) throw new Error(erro);

  console.log("Tentando criar conta:", { email: input.email });

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.senha,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        nome: input.nome.trim(),
        time_personalizado: input.time.trim(),
        abreviacao_time: input.abreviacao.trim().toUpperCase(),
        numero_jogador: input.numero,
        cores: input.cores,
      },
    },
  });

  console.log("Resultado signup:", { data, error });

  if (error) {
    console.error("Erro detalhado do signup:", error);
    if (error.message.toLowerCase().includes("already")) {
      // RE-CADASTRO legítimo: o e-mail existe em auth.users, mas o perfil de
      // jogo pode ter sido removido. A prova de posse é a senha — sem ela
      // NADA é criado (perfil/carteira/bônus). Com ela, o usuário recupera a
      // conta de jogo com os dados informados no formulário de cadastro.
      const { data: sessao, error: erroLogin } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.senha,
      });
      if (erroLogin || !sessao.user) {
        throw new Error(
          "Já existe uma conta com esse email. Faça login com a senha correta.",
        );
      }
      const existente = await buscarPerfil(sessao.user.id);
      if (existente) return existente;
      const recriado = await criarPerfilSeNaoExistir(
        sessao.user.id,
        sessao.user.email ?? input.email,
        {
          nome: input.nome.trim(),
          time: input.time.trim(),
          abreviacao: input.abreviacao.trim().toUpperCase(),
          numero: input.numero,
          cores: input.cores,
        },
      );
      if (!recriado) {
        throw new Error("Conta autenticada, mas o recadastramento falhou. Tente novamente.");
      }
      return recriado;
    }
    throw new Error(`Erro ao criar conta: ${error.message}`);
  }
  const user = data.user;
  if (!user) throw new Error("Não foi possível criar a conta.");

  console.log("Perfil será criado automaticamente pelo trigger");

  // Se a sessão já estiver disponível (auto-confirm enabled), usar ela
  if (data.session) {
    console.log("Sessão criada automaticamente, buscando perfil...");

    // Tentar buscar perfil com retry
    let perfilCriado = await buscarPerfil(user.id);
    let retries = 0;
    const maxRetries = 3;

    while (!perfilCriado && retries < maxRetries) {
      console.log(`Tentativa ${retries + 1} de buscar perfil...`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Esperar 1 segundo
      perfilCriado = await buscarPerfil(user.id);
      retries++;
    }

    console.log("Perfil criado pelo trigger:", perfilCriado);

    if (!perfilCriado) {
      console.error("Perfil não foi criado após trigger. User ID:", user.id);
      // CAUSA RAIZ COMUM: signUp para e-mail já registrado (não confirmado)
      // cria um NOVO auth user, mas o trigger não consegue criar o perfil —
      // `botao_usuarios.email` é UNIQUE e já pertence ao usuário antigo.
      // Detectar e orientar login em vez de deixar um usuário fantasma.
      try {
        const { data: dono } = await supabase
          .from("botao_usuarios")
          .select("user_id")
          .eq("email", input.email.trim().toLowerCase())
          .neq("user_id", user.id)
          .maybeSingle();
        if (dono) {
          await supabase.auth.signOut();
          throw new Error(
            "Já existe uma conta com esse email. Use a tela de login com a senha original.",
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Já existe uma conta")) throw e;
      }
      throw new Error("Conta criada, mas o perfil falhou. Tente fazer login novamente.");
    }

    return perfilCriado;
  }

  // Se não tiver sessão, significa que email confirmation está ativado
  // Não tentar login manual pois vai falhar
  throw new Error("Conta criada com sucesso! Por favor, confirme seu email antes de fazer login.");
}

export async function sair() {
  assertSupabaseConfigured();
  await supabase.auth.signOut();
  limparCache();
}
