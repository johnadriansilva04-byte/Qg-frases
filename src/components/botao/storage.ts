import type { Difficulty } from "./types";
import { createClient } from "@supabase/supabase-js";

const KEY = "botao:progress:v1";
const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

export type Progress = {
  titles: Record<Difficulty, number>;
  trophies: { difficulty: Difficulty; teamId: string; date: string }[];
  friendlies: { w: number; d: number; l: number };
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

export async function saveProgressToSupabase(telefone: string, p: Progress) {
  if (!supabaseUrl || !supabaseAnonKey) return;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase
      .from('botao_usuarios')
      .update({ progresso_caminpanha: p })
      .eq('telefone', telefone);
  } catch (error) {
    console.error('Erro ao salvar progresso no Supabase:', error);
  }
}

export async function loadProgressFromSupabase(telefone: string): Promise<Progress> {
  if (!supabaseUrl || !supabaseAnonKey) return EMPTY;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('botao_usuarios')
      .select('progresso_caminpanha')
      .eq('telefone', telefone)
      .single();
    
    if (error || !data?.progresso_caminpanha) return EMPTY;
    
    return { ...EMPTY, ...(data.progresso_caminpanha as Progress) };
  } catch (error) {
    console.error('Erro ao carregar progresso do Supabase:', error);
    return EMPTY;
  }
}

export async function deleteProgressFromSupabase(telefone: string) {
  if (!supabaseUrl || !supabaseAnonKey) return;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase
      .from('botao_usuarios')
      .update({ progresso_caminpanha: EMPTY })
      .eq('telefone', telefone);
  } catch (error) {
    console.error('Erro ao excluir progresso do Supabase:', error);
  }
}

export function deleteProgressLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function isUnlocked(p: Progress, d: Difficulty) {
  if (d === "amador") return true;
  if (d === "profissional") return p.titles.amador >= 3;
  return p.titles.profissional >= 3;
}
