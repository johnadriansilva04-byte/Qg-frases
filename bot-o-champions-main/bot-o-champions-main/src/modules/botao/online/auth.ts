import { supabase } from "@/integrations/supabase/client";
import { registerCustomTeam, unregisterCustomTeam } from "../data/teams";

export type Perfil = {
  id: string;
  user_id: string;
  telefone: string;
  nome: string;
  cores: string[];
  time_personalizado: string;
  abreviacao_time: string;
  numero_jogador: number;
  pontos_soberania: number;
  partidas_jogadas: number;
  partidas_vencidas: number;
};

export const CORES_PADRAO = ["#c8102e", "#111111", "#ffd65a"];

export const STORAGE_KEYS = {
  LOGGED_IN: "botao_online_logged_in",
  PERFIL_ID: "botao_online_usuario_id",
  TELEFONE: "botao_online_telefone",
  NOME: "botao_online_nome",
  TIME: "botao_online_time_personalizado",
  ABREVIACAO: "botao_online_abreviacao_time",
  NUMERO: "botao_online_numero_jogador",
  CORES: "botao_online_cores",
  LOBBY_ID: "botao_online_lobby_id",
  BLOCO_ID: "botao_online_bloco_id",
} as const;

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

/** Telefone vira um e-mail sintético interno; o login do usuário é telefone + senha. */
export const telefoneParaEmail = (telefone: string) => `botao${somenteDigitos(telefone)}@botao.app`;

export function validarCadastro(input: {
  telefone: string;
  senha: string;
  nome: string;
  time: string;
  abreviacao: string;
  numero: number;
  cores: string[];
}): string | null {
  const tel = somenteDigitos(input.telefone);
  if (tel.length < 10 || tel.length > 13) return "Telefone inválido (use DDD + número).";
  if (input.senha.length < 6 || input.senha.length > 72) return "A senha precisa ter entre 6 e 72 caracteres.";
  if (!input.nome.trim() || input.nome.trim().length > 40) return "Informe um nome de até 40 caracteres.";
  if (!input.time.trim() || input.time.trim().length > 30) return "Informe um nome de time de até 30 caracteres.";
  if (!/^[A-Za-z]{2,4}$/.test(input.abreviacao.trim())) return "A abreviação deve ter de 2 a 4 letras.";
  if (!Number.isInteger(input.numero) || input.numero < 1 || input.numero > 99) return "Número do jogador: 1 a 99.";
  if (input.cores.length !== 3 || input.cores.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c)))
    return "Escolha três cores válidas.";
  return null;
}

export function cachePerfil(p: Perfil) {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  ls.setItem(STORAGE_KEYS.LOGGED_IN, "true");
  ls.setItem(STORAGE_KEYS.PERFIL_ID, p.id);
  ls.setItem(STORAGE_KEYS.TELEFONE, p.telefone);
  ls.setItem(STORAGE_KEYS.NOME, p.nome);
  ls.setItem(STORAGE_KEYS.TIME, p.time_personalizado);
  ls.setItem(STORAGE_KEYS.ABREVIACAO, p.abreviacao_time);
  ls.setItem(STORAGE_KEYS.NUMERO, String(p.numero_jogador));
  ls.setItem(STORAGE_KEYS.CORES, JSON.stringify(p.cores));
  registerCustomTeam({
    name: p.time_personalizado,
    short: p.abreviacao_time.toUpperCase(),
    city: p.nome,
    primary: p.cores[0] ?? CORES_PADRAO[0]!,
    secondary: p.cores[1] ?? CORES_PADRAO[1]!,
    power: 80,
  });
}

export function limparCache() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
  unregisterCustomTeam();
}

export async function buscarPerfil(userId: string): Promise<Perfil | null> {
  const { data } = await supabase.from("botao_perfis").select("*").eq("user_id", userId).maybeSingle();
  return (data as Perfil | null) ?? null;
}

export async function entrar(telefone: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: telefoneParaEmail(telefone),
    password: senha,
  });
  if (error) throw new Error("Telefone ou senha incorretos.");
}

export async function cadastrar(input: {
  telefone: string;
  senha: string;
  nome: string;
  time: string;
  abreviacao: string;
  numero: number;
  cores: string[];
}) {
  const erro = validarCadastro(input);
  if (erro) throw new Error(erro);

  const { data, error } = await supabase.auth.signUp({
    email: telefoneParaEmail(input.telefone),
    password: input.senha,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("already")
        ? "Já existe uma conta com esse telefone. Faça login."
        : "Não foi possível criar a conta. Tente de novo.",
    );
  }
  const user = data.user;
  if (!user) throw new Error("Não foi possível criar a conta.");

  const { data: perfil, error: perr } = await supabase
    .from("botao_perfis")
    .insert({
      user_id: user.id,
      telefone: somenteDigitos(input.telefone),
      nome: input.nome.trim(),
      cores: input.cores,
      time_personalizado: input.time.trim(),
      abreviacao_time: input.abreviacao.trim().toUpperCase(),
      numero_jogador: input.numero,
    })
    .select("*")
    .maybeSingle();
  if (perr || !perfil) throw new Error("Conta criada, mas o perfil falhou. Faça login novamente.");
  return perfil as Perfil;
}

export async function sair() {
  await supabase.auth.signOut();
  limparCache();
}
