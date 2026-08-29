import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type Livro = Database["public"]["Tables"]["livros"]["Row"];

export const listarLivros = createServerFn({ method: "GET" }).handler(async (): Promise<Livro[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("livros")
      .select("*")
      .eq("ativo", true)
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true });

    if (error) {
      console.error("[livros.functions] Erro ao buscar livros:", error);
      return []; // Retorna array vazio em vez de lançar erro
    }
    return data ?? [];
  } catch (e) {
    console.error("[livros.functions] Erro inesperado ao buscar livros:", e);
    return []; // Retorna array vazio em caso de erro de fetch
  }
});
