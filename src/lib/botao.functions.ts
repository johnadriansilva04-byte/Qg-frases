import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type Usuario = Database["public"]["Tables"]["botao_usuarios"]["Row"];
export type Lobby = Database["public"]["Tables"]["botao_lobbies"]["Row"];
export type Bloco = Database["public"]["Tables"]["botao_blocos"]["Row"];

export const listarLobbies = createServerFn({ method: "GET" }).handler(async (): Promise<Lobby[]> => {
  const supabase = supabaseAdmin;
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
  .handler(async ({ data: { nome, formato, criador_session, criador_nome } }): Promise<Lobby> => {
    const supabase = supabaseAdmin;
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
  .handler(async ({ data: { lobbyId } }): Promise<Lobby> => {
    const supabase = supabaseAdmin;
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
  .handler(async ({ data: { lobbyId } }): Promise<Bloco[]> => {
    const supabase = supabaseAdmin;
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
  .handler(async ({ data: { lobby_id, jogador1_session, jogador1_nome, jogador1_time } }): Promise<Bloco> => {
    const supabase = supabaseAdmin;
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
  .handler(async ({ data: { blocoId, jogador2_session, jogador2_nome, jogador2_time } }): Promise<Bloco> => {
    const supabase = supabaseAdmin;
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
  .validator((data: { user_id: string; nome: string; time_personalizado?: string; numero_jogador?: number; cores?: string[] }) => data)
  .handler(async ({ data: { user_id, nome, time_personalizado, numero_jogador, cores } }): Promise<Usuario> => {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("botao_usuarios")
      .upsert({
        user_id,
        email: user_id, // Usando user_id como email temporariamente
        nome,
        time_personalizado: time_personalizado || "Meu Time",
        numero_jogador: numero_jogador || 10,
        cores: cores || ['#FF0000', '#00FF00', '#0000FF']
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const registrarJogada = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string }) => data)
  .handler(async ({ data: { blocoId } }) => {
    const supabase = supabaseAdmin;
    const { error } = await supabase.rpc("registrar_jogada_bloco", { p_bloco_id: blocoId });
    if (error) throw new Error(error.message);
  });

export const registrarGol = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string; jogador: string }) => data)
  .handler(async ({ data: { blocoId, jogador } }) => {
    const supabase = supabaseAdmin;
    const { error } = await supabase.rpc("registrar_gol_bloco", { p_bloco_id: blocoId, p_jogador: jogador });
    if (error) throw new Error(error.message);
  });

export const forcarTrocaTurno = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string }) => data)
  .handler(async ({ data: { blocoId } }) => {
    const supabase = supabaseAdmin;
    const { error } = await supabase.rpc("forcar_troca_turno_bloco", { p_bloco_id: blocoId });
    if (error) throw new Error(error.message);
  });

export const finalizarBloco = createServerFn({ method: "POST" })
  .validator((data: { blocoId: string; vencedor: string }) => data)
  .handler(async ({ data: { blocoId, vencedor } }) => {
    const supabase = supabaseAdmin;
    const { error } = await supabase.rpc("finalizar_bloco", { p_bloco_id: blocoId, p_vencedor: vencedor });
    if (error) throw new Error(error.message);
  });
