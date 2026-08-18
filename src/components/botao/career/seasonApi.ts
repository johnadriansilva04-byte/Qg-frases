/**
 * API para Sistema de Seasons e Campeonatos Integrados
 * Integração com Supabase para controle autoritativo
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Season,
  SeasonParticipant,
  Competition,
  SeasonMatch,
  CampaignEconomy,
  SeasonState,
  CompetitionType,
  TableData,
  MatchData,
} from "./seasonTypes";

/**
 * Buscar ou criar season atual (ano civil) via RPC
 */
export async function getOrCreateCurrentSeason(): Promise<Season> {
  const currentYear = new Date().getFullYear();
  
  // Usar RPC para criar/obter season
  const { data, error } = await (supabase as any)
    .rpc("criar_season", { p_ano: currentYear });
  
  if (error) throw error;
  
  // Buscar a season criada/existente
  const { data: season } = await (supabase as any)
    .from("botao_seasons")
    .select("*")
    .eq("ano", currentYear)
    .single();
  
  return season as Season;
}

/**
 * Inscrever usuário na season atual via RPC
 */
export async function inscreverSeason(
  userId: string,
  seasonId: number,
  timeId: string,
  timeNome: string,
  timeAbrev: string,
  timeCores: string[]
): Promise<SeasonParticipant> {
  const { data, error } = await (supabase as any)
    .rpc("inscrever_season", {
      p_user_id: userId,
      p_season_id: seasonId,
      p_time_id: timeId,
      p_time_nome: timeNome,
      p_time_abrev: timeAbrev,
      p_time_cores: JSON.stringify(timeCores),
    });
  
  if (error) throw error;
  
  // Buscar o participante criado
  const { data: participante } = await (supabase as any)
    .from("botao_season_participantes")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .single();
  
  return participante as SeasonParticipant;
}

/**
 * Buscar participante do usuário na season
 */
export async function getParticipante(
  userId: string,
  seasonId: number
): Promise<SeasonParticipant | null> {
  const { data } = await (supabase as any)
    .from("botao_season_participantes")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .maybeSingle();
  
  return data as SeasonParticipant | null;
}

/**
 * Criar competição via RPC
 */
export async function criarCompeticao(
  seasonId: number,
  tipo: CompetitionType,
  nome: string
): Promise<Competition> {
  const { data, error } = await (supabase as any)
    .rpc("criar_competicao", {
      p_season_id: seasonId,
      p_tipo: tipo,
      p_nome: nome,
    });
  
  if (error) throw error;
  
  // Buscar a competição criada
  const { data: competicao } = await (supabase as any)
    .from("botao_competicoes")
    .select("*")
    .eq("id", data)
    .single();
  
  return competicao as Competition;
}

/**
 * Buscar competições da season
 */
export async function getCompeticoes(seasonId: number): Promise<Competition[]> {
  const { data } = await (supabase as any)
    .from("botao_competicoes")
    .select("*")
    .eq("season_id", seasonId);
  
  return (data || []) as Competition[];
}

/**
 * Gerar Brasileirão via RPC (20 times, 38 rodadas, round-robin completo)
 */
export async function gerarBrasileirao(
  competicaoId: number,
  seasonId: number,
  times: string[]
): Promise<void> {
  const { error } = await (supabase as any)
    .rpc("gerar_brasileirao", {
      p_comp_id: competicaoId,
      p_season_id: seasonId,
      p_times: times,
    });
  
  if (error) throw error;
}

/**
 * Gerar Copa do Brasil via RPC (64 times, mata-mata)
 */
export async function gerarCopaBrasil(
  competicaoId: number,
  seasonId: number,
  times: string[]
): Promise<void> {
  const { error } = await (supabase as any)
    .rpc("gerar_copa_brasil", {
      p_comp_id: competicaoId,
      p_season_id: seasonId,
      p_times: times,
    });
  
  if (error) throw error;
}

/**
 * Gerar Libertadores via RPC (32 times, 8 grupos de 4)
 */
export async function gerarLibertadores(
  competicaoId: number,
  seasonId: number,
  times: string[]
): Promise<void> {
  const { error } = await (supabase as any)
    .rpc("gerar_libertadores", {
      p_comp_id: competicaoId,
      p_season_id: seasonId,
      p_times: times,
    });
  
  if (error) throw error;
}

/**
 * Registrar resultado de partida via RPC
 */
export async function registrarPartida(
  partidaId: number,
  golsCasa: number,
  golsFora: number,
  userId: string
): Promise<{ pontos_soberania: number }> {
  const { data, error } = await (supabase as any)
    .rpc("registrar_partida", {
      p_partida_id: partidaId,
      p_gols_casa: golsCasa,
      p_gols_fora: golsFora,
      p_user_id: userId,
    });
  
  if (error) throw error;
  
  return data as { pontos_soberania: number };
}

/**
 * Buscar economia da campanha
 */
export async function getEconomia(
  userId: string,
  seasonId: number
): Promise<CampaignEconomy | null> {
  const { data } = await (supabase as any)
    .from("botao_economia_campanha")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .maybeSingle();
  
  return data as CampaignEconomy | null;
}

/**
 * Processar custo mensal via RPC (debitar soberania)
 */
export async function processarCustoMensal(
  userId: string,
  seasonId: number
): Promise<CampaignEconomy> {
  const { data, error } = await (supabase as any)
    .rpc("processar_custo_mensal", {
      p_user_id: userId,
      p_season_id: seasonId,
    });
  
  if (error) throw error;
  
  // Buscar economia atualizada
  const economia = await getEconomia(userId, seasonId);
  return economia as CampaignEconomy;
}

/**
 * Buscar estado completo da season do usuário via RPC
 */
export async function getSeasonState(userId: string): Promise<SeasonState> {
  const { data, error } = await (supabase as any)
    .rpc("get_season_state", { p_user_id: userId });
  
  if (error) throw error;
  
  // Parsear o JSONB retornado
  const parsed = data as any;
  
  return {
    season: parsed.season as Season,
    participante: parsed.participante as SeasonParticipant | null,
    competicoes: (parsed.competicoes || []) as Competition[],
    economia: parsed.economia as CampaignEconomy | null,
    partidas: [],
    rodada_atual: parsed.rodada_atual || 1,
    mes_atual: parsed.mes_atual || 1,
  };
}
