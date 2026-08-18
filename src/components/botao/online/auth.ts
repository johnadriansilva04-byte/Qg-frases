import { assertSupabaseConfigured, supabase } from "@/integrations/supabase/client";

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

export const STORAGE_KEYS = {
  LOGGED_IN: "botao_online_logged_in",
  PERFIL_ID: "botao_online_usuario_id",
  EMAIL: "botao_online_email",
  NOME: "botao_online_nome",
  TIME: "botao_online_time_personalizado",
  ABREVIACAO: "botao_online_abreviacao_time",
  NUMERO: "botao_online_numero_jogador",
  CORES: "botao_online_cores",
  TATICA: "botao_online_tatica",
  BOTOES: "botao_online_botoes_nomes",
  LOBBY_ID: "botao_online_lobby_id",
  BLOCO_ID: "botao_online_bloco_id",
} as const;

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

export function cachePerfil(p: Perfil) {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  ls.setItem(STORAGE_KEYS.LOGGED_IN, "true");
  ls.setItem(STORAGE_KEYS.PERFIL_ID, p.id);
  ls.setItem(STORAGE_KEYS.EMAIL, p.email);
  ls.setItem(STORAGE_KEYS.NOME, p.nome);
  ls.setItem(STORAGE_KEYS.TIME, p.time_personalizado);
  ls.setItem(STORAGE_KEYS.ABREVIACAO, p.abreviacao_time);
  ls.setItem(STORAGE_KEYS.NUMERO, String(p.numero_jogador));
  ls.setItem(STORAGE_KEYS.CORES, JSON.stringify(p.cores));
  if (p.tatica) ls.setItem(STORAGE_KEYS.TATICA, p.tatica);
  if (p.botoes_nomes) ls.setItem(STORAGE_KEYS.BOTOES, JSON.stringify(p.botoes_nomes));
}

export function limparCache() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
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

export async function entrar(email: string, senha: string) {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha,
  });
  if (error) throw new Error("Email ou senha incorretos.");
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
    throw new Error(
      error.message.toLowerCase().includes("already")
        ? "Já existe uma conta com esse email. Faça login."
        : `Erro ao criar conta: ${error.message}`,
    );
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
