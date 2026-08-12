import type { Difficulty, Tournament } from "./types";
import { supabase } from "@/integrations/supabase/client";

const KEY = "botao:progress:v1";
const TOURNAMENT_KEY = "botao:tournament:v1";

export type Progress = {
  titles: Record<Difficulty, number>;
  trophies: { difficulty: Difficulty; teamId: string; date: string }[];
  friendlies: { w: number; d: number; l: number };
  tournament?: Tournament;
};

const EMPTY: Progress = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
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

export function isUnlocked(p: Progress, d: Difficulty) {
  if (d === "amador") return true;
  if (d === "profissional") return p.titles.amador >= 3;
  return p.titles.profissional >= 3;
}
