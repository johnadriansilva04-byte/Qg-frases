import { supabase } from "@/integrations/supabase/client";

export interface TimeDB {
  id: string;
  nome: string;
  abreviacao: string;
  cores: string[];
  pais: string;
  liga: string;
  is_personalizado: boolean;
  usuario_id: string | null;
  created_at: string;
}

export async function buscarTodosTimes(): Promise<TimeDB[]> {
  try {
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
  try {
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

// Função removida - o time personalizado é criado automaticamente pelo trigger do banco
// quando o usuário é cadastrado no Supabase Auth

export async function buscarTimesPorPais(pais: string): Promise<TimeDB[]> {
  try {
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
