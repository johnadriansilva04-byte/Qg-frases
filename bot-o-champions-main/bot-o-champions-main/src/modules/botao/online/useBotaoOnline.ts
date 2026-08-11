import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Perfil } from "./auth";
import type { Shot } from "../components/MatchView";

export type Lobby = {
  id: string;
  nome: string;
  criador_id: string;
  adversario_id: string | null;
  formato: string;
  status: string;
  created_at: string;
};

export type Bloco = {
  id: string;
  lobby_id: string;
  numero: number;
  jogador1_id: string;
  jogador2_id: string;
  time1: string;
  time2: string;
  placar_j1: number;
  placar_j2: number;
  jogadas: Shot[];
  turno: string;
  status: string;
};

export function useLobbies() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("botao_lobbies")
      .select("*")
      .neq("status", "finalizado")
      .order("created_at", { ascending: false })
      .limit(50);
    setLobbies((data as Lobby[] | null) ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
    const channel = supabase
      .channel("botao-lobbies")
      .on("postgres_changes", { event: "*", schema: "public", table: "botao_lobbies" }, () => {
        void carregar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [carregar]);

  return { lobbies, carregando, recarregar: carregar };
}

export function useLobby(lobbyId: string | null, perfil: Perfil | null) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [blocos, setBlocos] = useState<Bloco[]>([]);

  const carregar = useCallback(async () => {
    if (!lobbyId) return;
    const [{ data: l }, { data: b }] = await Promise.all([
      supabase.from("botao_lobbies").select("*").eq("id", lobbyId).maybeSingle(),
      supabase.from("botao_blocos").select("*").eq("lobby_id", lobbyId).order("numero"),
    ]);
    setLobby((l as Lobby | null) ?? null);
    setBlocos((b as Bloco[] | null) ?? []);
  }, [lobbyId]);

  useEffect(() => {
    if (!lobbyId) {
      setLobby(null);
      setBlocos([]);
      return;
    }
    void carregar();
    const channel = supabase
      .channel(`botao-lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "botao_lobbies", filter: `id=eq.${lobbyId}` },
        () => void carregar(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "botao_blocos", filter: `lobby_id=eq.${lobbyId}` },
        () => void carregar(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lobbyId, carregar]);

  const souCriador = !!(lobby && perfil && lobby.criador_id === perfil.id);

  return { lobby, blocos, souCriador, recarregar: carregar };
}

export async function criarLobby(perfil: Perfil, nome: string, timeId: string) {
  const { data, error } = await supabase
    .from("botao_lobbies")
    .insert({ nome: nome.trim().slice(0, 40) || `Sala de ${perfil.nome}`, criador_id: perfil.id })
    .select("*")
    .maybeSingle();
  if (error || !data) throw new Error("Não deu pra criar a sala.");
  localStorage.setItem("botao_online_time_escolhido", timeId);
  return data as Lobby;
}

export async function entrarNoLobby(lobby: Lobby, perfil: Perfil, timeId: string) {
  if (lobby.adversario_id && lobby.adversario_id !== perfil.id && lobby.criador_id !== perfil.id) {
    throw new Error("Essa sala já está cheia.");
  }
  if (lobby.criador_id !== perfil.id && !lobby.adversario_id) {
    const { error } = await supabase
      .from("botao_lobbies")
      .update({ adversario_id: perfil.id, status: "em_jogo" })
      .eq("id", lobby.id)
      .is("adversario_id", null);
    if (error) throw new Error("Alguém entrou primeiro nessa sala.");
  }
  localStorage.setItem("botao_online_time_escolhido", timeId);
}

export async function criarBloco(lobby: Lobby, numero: number, time1: string, time2: string) {
  if (!lobby.adversario_id) return null;
  const { data } = await supabase
    .from("botao_blocos")
    .insert({
      lobby_id: lobby.id,
      numero,
      jogador1_id: lobby.criador_id,
      jogador2_id: lobby.adversario_id,
      time1,
      time2,
    })
    .select("*")
    .maybeSingle();
  return (data as Bloco | null) ?? null;
}

export async function registrarJogada(bloco: Bloco, shot: Shot) {
  const jogadas = [...(bloco.jogadas ?? [])];
  if (jogadas.some((j) => j.i === shot.i)) return;
  jogadas.push(shot);
  await supabase
    .from("botao_blocos")
    .update({ jogadas, turno: shot.i % 2 === 0 ? "jogador2" : "jogador1" })
    .eq("id", bloco.id);
}

export async function finalizarBloco(bloco: Bloco, golsJ1: number, golsJ2: number) {
  await supabase
    .from("botao_blocos")
    .update({ placar_j1: golsJ1, placar_j2: golsJ2, status: "finalizado" })
    .eq("id", bloco.id);
}

export async function finalizarLobby(lobbyId: string) {
  await supabase.from("botao_lobbies").update({ status: "finalizado" }).eq("id", lobbyId);
}

export async function registrarResultadoPerfil(perfil: Perfil, venceu: boolean) {
  await supabase
    .from("botao_perfis")
    .update({
      partidas_jogadas: perfil.partidas_jogadas + 1,
      partidas_vencidas: perfil.partidas_vencidas + (venceu ? 1 : 0),
      pontos_soberania: perfil.pontos_soberania + (venceu ? 3 : 1),
    })
    .eq("id", perfil.id);
}
