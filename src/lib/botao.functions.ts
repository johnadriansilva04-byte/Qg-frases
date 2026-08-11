import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Usuario = Database["public"]["Tables"]["botao_usuarios"]["Row"];
export type Lobby = Database["public"]["Tables"]["botao_lobbies"]["Row"];
export type Bloco = Database["public"]["Tables"]["botao_blocos"]["Row"];

const getSupabaseClient = () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
};

export const listarLobbies = createServerFn({ method: "GET" }).handler(async (): Promise<Lobby[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("botao_lobbies")
    .select("*")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarLobby = createServerFn({ method: "POST" })
  .validator((data: { nome: string; formato: string; criador_session: string; criador_nome: string }) => data)
  .handler(async ({ nome, formato, criador_session, criador_nome }): Promise<Lobby> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_lobbies")
      .insert({ nome, formato, criador_session, criador_nome, status: "ativo" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const entrarLobby = createServerFn({ method: "GET" })
  .validator((data: { lobbyId: string }) => data)
  .handler(async ({ lobbyId }): Promise<Lobby> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_lobbies")
      .select("*")
      .eq("id", lobbyId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const listarBlocos = createServerFn({ method: "GET" })
  .validator((data: { lobbyId: string }) => data)
  .handler(async ({ lobbyId }): Promise<Bloco[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_blocos")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarBloco = createServerFn({ method: "POST" })
  .validator((data: { 
    lobby_id: string; 
    jogador1_session: string; 
    jogador1_nome: string; 
    jogador1_time: string 
  }) => data)
  .handler(async ({ lobby_id, jogador1_session, jogador1_nome, jogador1_time }): Promise<Bloco> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_blocos")
      .insert({ lobby_id, jogador1_session, jogador1_nome, jogador1_time, status: "aguardando" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const entrarBloco = createServerFn({ method: "POST" })
  .validator((data: { 
    blocoId: string; 
    jogador2_session: string; 
    jogador2_nome: string; 
    jogador2_time: string 
  }) => data)
  .handler(async ({ blocoId, jogador2_session, jogador2_nome, jogador2_time }): Promise<Bloco> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_blocos")
      .update({
        jogador2_session,
        jogador2_nome,
        jogador2_time,
        status: "em_jogo",
        turno: "jogador1",
        timestamp_inicio_turno: new Date().toISOString()
      })
      .eq("id", blocoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const loginUsuario = createServerFn({ method: "POST" })
  .validator((data: { telefone: string; nome: string }) => data)
  .handler(async ({ telefone, nome }): Promise<Usuario> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("botao_usuarios")
      .upsert({ telefone, nome })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const registrarJogada = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string }) => data)
  .handler(async ({ blocoId }) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("registrar_jogada_bloco", { p_bloco_id: blocoId });
    if (error) throw new Error(error.message);
  });

export const registrarGol = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string; jogador: string }) => data)
  .handler(async ({ blocoId, jogador }) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("registrar_gol_bloco", { p_bloco_id: blocoId, p_jogador: jogador });
    if (error) throw new Error(error.message);
  });

export const forcarTrocaTurno = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string }) => data)
  .handler(async ({ blocoId }) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("forcar_troca_turno_bloco", { p_bloco_id: blocoId });
    if (error) throw new Error(error.message);
  });

export const finalizarBloco = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string; vencedor: string }) => data)
  .handler(async ({ blocoId, vencedor }) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("finalizar_bloco", { p_bloco_id: blocoId, p_vencedor: vencedor });
    if (error) throw new Error(error.message);
  });
