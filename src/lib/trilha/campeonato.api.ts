/**
 * API functions para o modo Campeonato Online de Trilha (tabela campeonatos_trilha_online).
 * Sistema de grupos A, B, C, D com 8, 12, 16 ou 32 jogadores.
 */
import { supabase } from "@/integrations/supabase/client";

export type ParticipanteTrilha = {
  user_id: string;
  nome: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
};

export type GrupoTrilha = {
  nome: string;
  participantes: string[];
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  pontos: number;
};

export type ConfrontoTrilha = {
  grupo?: string;
  fase?: string;
  rodada: number;
  j1_id: string;
  j2_id: string;
  pl_j1: number;
  pl_j2: number;
  status: "pendente" | "finalizado";
  vencedor_id?: string;
};

export type CampeonatoTrilha = {
  id: number;
  codigo: string;
  nome: string;
  criador_id: string;
  status: "aguardando" | "em_andamento" | "finalizado" | "cancelado";
  max_jogadores: number;
  formato: "grupos" | "eliminacao";
  fase: number;
  participantes: ParticipanteTrilha[];
  grupos: GrupoTrilha[];
  confrontos: ConfrontoTrilha[];
  rodada_atual: number;
  vencedor_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

/** Link direto para a sala do campeonato de trilha. */
export function linkConviteCampeonatoTrilha(codigo: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://pracinha.online";
  return `${base}/cidadela?campTrilha=${encodeURIComponent(codigo)}`;
}

/** Cria uma nova sala de campeonato de trilha. */
export async function criarCampeonatoTrilha(
  nome: string,
  maxJogadores = 8,
  formato: "grupos" | "eliminacao" = "grupos",
): Promise<CampeonatoTrilha> {
  const { data, error } = await supabase.rpc("criar_campeonato_trilha_online", {
    p_nome: nome,
    p_max: maxJogadores,
    p_formato: formato,
  });
  if (error) {
    // Se a RPC não existe (migration não aplicada), lança erro amigável
    if (error.code === '42883' || error.code === 'PGRST202') {
      throw new Error("A migration do campeonato de trilha não foi aplicada no banco. Execute o SQL do arquivo trilha.sql no Supabase.");
    }
    throw error;
  }
  return data as CampeonatoTrilha;
}

/** Entra em uma sala de campeonato de trilha pelo código. */
export async function entrarCampeonatoTrilha(codigo: string): Promise<CampeonatoTrilha> {
  const { data, error } = await supabase.rpc("entrar_campeonato_trilha_online", { p_codigo: codigo });
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') {
      throw new Error("A migration do campeonato de trilha não foi aplicada no banco. Execute o SQL do arquivo trilha.sql no Supabase.");
    }
    throw error;
  }
  return data as CampeonatoTrilha;
}

/** O criador inicia o campeonato (gera grupos e confrontos). */
export async function iniciarCampeonatoTrilha(codigo: string): Promise<CampeonatoTrilha> {
  const { data, error } = await supabase.rpc("iniciar_campeonato_trilha_online", { p_codigo: codigo });
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') {
      throw new Error("A migration do campeonato de trilha não foi aplicada no banco. Execute o SQL do arquivo trilha.sql no Supabase.");
    }
    throw error;
  }
  return data as CampeonatoTrilha;
}

/** Busca um campeonato de trilha pelo código. */
export async function buscarCampeonatoTrilha(codigo: string): Promise<CampeonatoTrilha | null> {
  const { data, error } = await supabase
    .from("campeonatos_trilha_online")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return (data as CampeonatoTrilha | null) ?? null;
}

/** Lista campeonatos de trilha abertos (aguardando jogadores). */
export async function buscarCampeonatosTrilhaAbertos(): Promise<CampeonatoTrilha[]> {
  try {
    const { data, error } = await supabase
      .from("campeonatos_trilha_online")
      .select("*")
      .eq("status", "aguardando")
      .order("criado_em", { ascending: false });
    if (error) {
      // Se a tabela não existe (migration não aplicada), retorna array vazio
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data ?? []) as CampeonatoTrilha[];
  } catch (error) {
    // Fallback silencioso se migration não foi aplicada
    return [];
  }
}

/** Registra o resultado de um confronto de trilha. */
export async function registrarResultadoTrilha(
  campeonatoId: number,
  j1Id: string,
  j2Id: string,
  vencedorId: string | null,
  grupo?: string,
  fase?: string,
): Promise<CampeonatoTrilha> {
  const { data, error } = await supabase.rpc("registrar_resultado_trilha", {
    p_campeonato_id: campeonatoId,
    p_j1_id: j1Id,
    p_j2_id: j2Id,
    p_vencedor_id: vencedorId,
    p_grupo: grupo,
    p_fase: fase,
  });
  if (error) throw error;
  return data as CampeonatoTrilha;
}
