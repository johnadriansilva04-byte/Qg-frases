/**
 * API functions para o modo Campeonato Online (tabela botao_campeonatos_online).
 * Reaproveita mesas_futebol (1 mesa = 1 partida) e orquestra as rodadas
 * round-robin via RPCs autoritativas do Supabase.
 */
import { supabase } from "@/integrations/supabase/client";

export type ParticipanteCampeonato = {
  user_id: string;
  nome: string;
  time_id: string;
  abreviacao: string;
  pontos: number;
  gols_pro: number;
  gols_contra: number;
};

export type ConfrontoCampeonato = {
  rodada: number;
  mesa_id: string | null;
  j1_id: string | null;
  j2_id: string | null;
  pl_j1: number;
  pl_j2: number;
  status: "pendente" | "finalizado";
  bye: boolean;
};

export type CampeonatoOnline = {
  id: number;
  codigo: string;
  nome: string;
  criador_id: string;
  status: "aguardando" | "em_andamento" | "finalizado" | "cancelado";
  max_jogadores: number;
  fase: number;
  participantes: ParticipanteCampeonato[];
  confrontos: ConfrontoCampeonato[];
  rodada_atual: number;
  vencedor_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

/** Cria uma nova sala de campeonato (criador é o 1º participante). */
export async function criarCampeonato(nome: string, maxJogadores = 4): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("criar_campeonato_online", {
    p_nome: nome,
    p_max: maxJogadores,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Entra em uma sala de campeonato pelo código. */
export async function entrarCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("entrar_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Sai de uma sala de campeonato aberta. */
export async function sairCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("sair_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** O criador inicia o campeonato (sorteia confrontos). */
export async function iniciarCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("iniciar_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Busca um campeonato pelo código. */
export async function buscarCampeonato(codigo: string): Promise<CampeonatoOnline | null> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return (data as CampeonatoOnline | null) ?? null;
}

/** Busca um campeonato pelo id. */
export async function buscarCampeonatoPorId(id: number): Promise<CampeonatoOnline | null> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CampeonatoOnline | null) ?? null;
}

/** Lista campeonatos abertos (aguardando jogadores) para a sala pública. */
export async function buscarCampeonatosAbertos(): Promise<CampeonatoOnline[]> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("status", "aguardando")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampeonatoOnline[];
}

/** Vincula a mesa recém-criada ao confronto da rodada atual. */
export async function vincularMesaCampeonato(
  campeonatoId: number,
  rodada: number,
  mesaId: string,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("vincular_mesa_campeonato", {
    p_campeonato_id: campeonatoId,
    p_rodada: rodada,
    p_mesa_id: mesaId,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Registra o resultado de um confronto e computa pontos/soberania. */
export async function registrarResultadoCampeonato(
  campeonatoId: number,
  mesaId: string,
  golsJ1: number,
  golsJ2: number,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("registrar_resultado_campeonato", {
    p_campeonato_id: campeonatoId,
    p_mesa_id: mesaId,
    p_gols_j1: golsJ1,
    p_gols_j2: golsJ2,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}
