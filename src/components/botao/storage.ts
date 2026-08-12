import type { Difficulty, Tournament } from "./types";
import { supabase } from "@/integrations/supabase/client";

const KEY = "botao:progress:v1";
const TOURNAMENT_KEY = "botao:tournament:v1";

export type Progress = {
  titles: Record<Difficulty, number>;
  trophies: { difficulty: Difficulty; teamId: string; date: string }[];
  friendlies: { w: number; d: number; l: number };
  tournament?: Tournament;
  gols_feitos: number;
  gols_sofridos: number;
};

const EMPTY: Progress = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
  gols_feitos: 0,
  gols_sofridos: 0,
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Progress) };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export async function saveProgressToSupabase(userId: string, p: Progress) {
  try {
    await supabase
      .from('botao_usuarios')
      .update({ progresso_caminpanha: p })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Erro ao salvar progresso no Supabase:', error);
  }
}

export async function loadProgressFromSupabase(userId: string): Promise<Progress> {
  try {
    const { data, error } = await supabase
      .from('botao_usuarios')
      .select('progresso_caminpanha')
      .eq('user_id', userId)
      .single();
    
    if (error || !data?.progresso_caminpanha) return EMPTY;
    
    return { ...EMPTY, ...(data.progresso_caminpanha as Progress) };
  } catch (error) {
    console.error('Erro ao carregar progresso do Supabase:', error);
    return EMPTY;
  }
}

export async function deleteProgressFromSupabase(userId: string) {
  try {
    await supabase
      .from('botao_usuarios')
      .update({ progresso_caminpanha: EMPTY })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Erro ao excluir progresso do Supabase:', error);
  }
}

export function deleteProgressLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function loadTournament(): Tournament | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Tournament;
  } catch {
    return null;
  }
}

export function saveTournament(t: Tournament) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(t));
}

export async function saveTournamentToSupabase(userId: string, t: Tournament) {
  try {
    // Salvar o torneio dentro do progresso_caminpanha
    const { data } = await supabase
      .from('botao_usuarios')
      .select('progresso_caminpanha')
      .eq('user_id', userId)
      .single();
    
    if (data?.progresso_caminpanha) {
      const progress = data.progresso_caminpanha as Progress;
      await supabase
        .from('botao_usuarios')
        .update({ progresso_caminpanha: { ...progress, tournament: t } })
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Erro ao salvar torneio no Supabase:', error);
  }
}

export async function loadTournamentFromSupabase(userId: string): Promise<Tournament | null> {
  try {
    const { data, error } = await supabase
      .from('botao_usuarios')
      .select('progresso_caminpanha')
      .eq('user_id', userId)
      .single();
    
    if (error || !data?.progresso_caminpanha) return null;
    
    const progress = data.progresso_caminpanha as Progress;
    return progress.tournament || null;
  } catch (error) {
    console.error('Erro ao carregar torneio do Supabase:', error);
    return null;
  }
}

export async function atualizarPontosSoberania(userId: string, golsFeitos: number, golsSofridos: number, vitoria: boolean) {
  try {
    // Calcular pontos: +1 por gol feito, -2 por gol sofrido, +3 por vitória, -4 por derrota
    const pontosGols = golsFeitos * 1 + golsSofridos * (-2);
    const pontosResultado = vitoria ? 3 : -4;
    const pontosTotais = pontosGols + pontosResultado;

    const { data: currentData } = await supabase
      .from('botao_usuarios')
      .select('pontos_soberania, partidas_jogadas, partidas_vencidas, gols_feitos, gols_sofridos, vitorias, derrotas, empates')
      .eq('user_id', userId)
      .single();

    if (!currentData) return;

    const novosPontos = (currentData.pontos_soberania || 0) + pontosTotais;
    const novasPartidas = (currentData.partidas_jogadas || 0) + 1;
    const novasVitorias = vitoria ? (currentData.partidas_vencidas || 0) + 1 : (currentData.partidas_vencidas || 0);
    const novosGolsFeitos = (currentData.gols_feitos || 0) + golsFeitos;
    const novosGolsSofridos = (currentData.gols_sofridos || 0) + golsSofridos;
    const novasVitoriasCount = vitoria ? (currentData.vitorias || 0) + 1 : (currentData.vitorias || 0);
    const novasDerrotasCount = !vitoria ? (currentData.derrotas || 0) + 1 : (currentData.derrotas || 0);

    const { error } = await supabase
      .from('botao_usuarios')
      .update({
        pontos_soberania: novosPontos,
        partidas_jogadas: novasPartidas,
        partidas_vencidas: novasVitorias,
        gols_feitos: novosGolsFeitos,
        gols_sofridos: novosGolsSofridos,
        vitorias: novasVitoriasCount,
        derrotas: novasDerrotasCount
      })
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[Pontos] Atualizados:', { pontosTotais, novosPontos, golsFeitos, golsSofridos, vitoria });
  } catch (error) {
    console.error('Erro ao atualizar pontos de soberania:', error);
  }
}

export async function atualizarEstatisticasOnline(userId: string, resultado: 'vitoria' | 'derrota' | 'empate', golsFeitos: number, golsSofridos: number, campeonatoGanho: boolean = false) {
  try {
    const { data: currentData } = await supabase
      .from('botao_usuarios')
      .select('pontos_soberania, partidas_jogadas, partidas_vencidas, campeonatos_ganhos, gols_feitos, gols_sofridos, vitorias, derrotas, empates')
      .eq('user_id', userId)
      .single();

    if (!currentData) return;

    // Calcular pontos baseados no resultado
    let pontosTotais = 0;
    if (resultado === 'vitoria') {
      pontosTotais = 10; // +10 pontos por vitória online
    } else if (resultado === 'empate') {
      pontosTotais = 0; // 0 pontos por empate
    } else {
      pontosTotais = -5; // -5 pontos por derrota
    }

    // Adicionar pontos pelos gols
    pontosTotais += golsFeitos * 1;
    pontosTotais -= golsSofridos * 2;

    const novosPontos = (currentData.pontos_soberania || 0) + pontosTotais;
    const novasPartidas = (currentData.partidas_jogadas || 0) + 1;
    const novasVitorias = resultado === 'vitoria' ? (currentData.partidas_vencidas || 0) + 1 : (currentData.partidas_vencidas || 0);
    const novosCampeonatos = campeonatoGanho ? (currentData.campeonatos_ganhos || 0) + 1 : (currentData.campeonatos_ganhos || 0);
    const novosGolsFeitos = (currentData.gols_feitos || 0) + golsFeitos;
    const novosGolsSofridos = (currentData.gols_sofridos || 0) + golsSofridos;
    const novasVitoriasCount = resultado === 'vitoria' ? (currentData.vitorias || 0) + 1 : (currentData.vitorias || 0);
    const novasDerrotasCount = resultado === 'derrota' ? (currentData.derrotas || 0) + 1 : (currentData.derrotas || 0);
    const novosEmpatesCount = resultado === 'empate' ? (currentData.empates || 0) + 1 : (currentData.empates || 0);

    const { error } = await supabase
      .from('botao_usuarios')
      .update({
        pontos_soberania: novosPontos,
        partidas_jogadas: novasPartidas,
        partidas_vencidas: novasVitorias,
        campeonatos_ganhos: novosCampeonatos,
        gols_feitos: novosGolsFeitos,
        gols_sofridos: novosGolsSofridos,
        vitorias: novasVitoriasCount,
        derrotas: novasDerrotasCount,
        empates: novosEmpatesCount
      })
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[Estatísticas Online] Atualizadas:', { resultado, pontosTotais, novosPontos, golsFeitos, golsSofridos, campeonatoGanho });
  } catch (error) {
    console.error('Erro ao atualizar estatísticas online:', error);
  }
}

export async function adicionarPontosVideo(userId: string, pontos: number = 5) {
  try {
    const { data: currentData } = await supabase
      .from('botao_usuarios')
      .select('pontos_soberania')
      .eq('user_id', userId)
      .single();

    if (!currentData) return;

    const novosPontos = (currentData.pontos_soberania || 0) + pontos;

    const { error } = await supabase
      .from('botao_usuarios')
      .update({ pontos_soberania: novosPontos })
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[Pontos] Vídeo assistido:', { pontos, novosPontos });
    return novosPontos;
  } catch (error) {
    console.error('Erro ao adicionar pontos por vídeo:', error);
    return null;
  }
}

export function isUnlocked(p: Progress, d: Difficulty) {
  if (d === "amador") return true;
  if (d === "profissional") return p.titles.amador >= 3;
  return p.titles.profissional >= 3;
}
