import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

export interface TimeDB {
  id: string;
  nome: string;
  abreviacao: string;
  cores: string[];
  pais: string;
  liga: string;
  is_personalizado: boolean;
  usuario_id?: string;
  created_at: string;
}

export async function buscarTodosTimes(): Promise<TimeDB[]> {
  if (!supabaseUrl || !supabaseAnonKey) return [];
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('botao_times')
      .select('*')
      .order('pais, liga, nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar times:', error);
    return [];
  }
}

export async function buscarTimePorId(id: string): Promise<TimeDB | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('botao_times')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar time:', error);
    return null;
  }
}

export async function salvarTimePersonalizado(
  usuarioId: string,
  nome: string,
  abreviacao: string,
  cores: string[]
): Promise<TimeDB | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const id = `custom-${usuarioId}`;
    
    const { data, error } = await supabase
      .from('botao_times')
      .upsert({
        id,
        nome,
        abreviacao,
        cores,
        pais: 'Brasil',
        liga: 'Personalizado',
        is_personalizado: true,
        usuario_id: usuarioId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao salvar time personalizado:', error);
    return null;
  }
}

export async function buscarTimesPorPais(pais: string): Promise<TimeDB[]> {
  if (!supabaseUrl || !supabaseAnonKey) return [];
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('botao_times')
      .select('*')
      .eq('pais', pais)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar times por país:', error);
    return [];
  }
}
