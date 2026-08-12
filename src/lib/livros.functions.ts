import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type Livro = Database["public"]["Tables"]["livros"]["Row"];

export const listarLivros = createServerFn({ method: "GET" }).handler(async (): Promise<Livro[]> => {
  const { data, error } = await supabaseAdmin
    .from("livros")
    .select("*")
    .eq("ativo", true)
    .order("destaque", { ascending: false })
    .order("ordem", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});
