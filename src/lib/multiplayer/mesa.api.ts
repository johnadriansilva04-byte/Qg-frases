/**
 * API functions para mesas_futebol (sistema v2 de persistência online)
 */
import { supabase } from "@/integrations/supabase/client";

export type MesaFutebol = {
  id: string;
  mesa_id: string;
  jogador_1_id: string;
  jogador_2_id: string | null;
  time_j1: string;
  time_j2: string | null;
  placar_j1: number;
  placar_j2: number;
  turno_atual_id: string | null;
  status: "aguardando" | "em_andamento" | "finalizado";
  duracao_segundos: number;
  iniciado_em: string | null;
  tempo_restante_segundos: number;
  seq_jogada: number;
  estado_fisico: unknown;
  vencedor_id: string | null;
  motivo_finalizacao: string | null;
  jogador_1_online: boolean;
  jogador_2_online: boolean;
  ultimo_heartbeat_j1: string | null;
  ultimo_heartbeat_j2: string | null;
  criado_em: string;
  atualizado_em: string;
  modalidade: "amistoso" | "campeonato";
  campeonato_id: number | null;
};

/** Criar uma nova mesa de futebol (amistoso). */
export async function criarMesa(time: string): Promise<string> {
  const { data, error } = await supabase.rpc("criar_mesa_futebol", {
    p_time: time,
  });

  if (error) throw error;
  return data as string;
}

/** Abrir a mesa compartilhada de um confronto de campeonato (idempotente).
 *  Ambos os jogadores chamam esta função com (campeonatoId, rodada) e caem na
 *  mesma mesa (jogador_1=j1_id, jogador_2=j2_id). Cria na 1ª chamada; devolve
 *  a mesa existente nas chamadas seguintes. */
export async function abrirMesaCampeonato(campeonatoId: number, rodada: number): Promise<string> {
  const { data, error } = await supabase.rpc("abrir_mesa_campeonato", {
    p_campeonato_id: campeonatoId,
    p_rodada: rodada,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Entrar em uma mesa existente (como jogador 2)
 */
export async function entrarMesa(mesaId: string, time: string): Promise<MesaFutebol> {
  const { data, error } = await supabase.rpc("entrar_mesa_futebol", {
    p_mesa_id: mesaId,
    p_time: time,
  });

  if (error) throw error;
  return data as MesaFutebol;
}

/**
 * Buscar uma mesa pelo mesa_id
 */
export async function buscarMesa(mesaId: string): Promise<MesaFutebol | null> {
  const { data, error } = await supabase
    .from("mesas_futebol")
    .select("*")
    .eq("mesa_id", mesaId)
    .maybeSingle();

  if (error) throw error;
  return data as MesaFutebol | null;
}

/**
 * Buscar todas as mesas aguardando jogadores
 */
export async function buscarMesasAguardando(): Promise<MesaFutebol[]> {
  const { data, error } = await supabase
    .from("mesas_futebol")
    .select("*")
    .eq("status", "aguardando")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MesaFutebol[];
}

/**
 * Registrar uma jogada na mesa
 */
export async function registrarJogadaMesa(
  mesaId: string,
  estadoFisico?: unknown,
  trocarTurno = true,
): Promise<MesaFutebol> {
  const { data, error } = await supabase.rpc("registrar_jogada_mesa", {
    p_mesa_id: mesaId,
    p_estado_fisico: estadoFisico as never,
    p_trocar_turno: trocarTurno,
  });

  if (error) throw error;
  return data as MesaFutebol;
}

/**
 * Registrar um gol na mesa
 */
export async function registrarGolMesa(mesaId: string, jogadorId?: string): Promise<MesaFutebol> {
  const { data, error } = await supabase.rpc("registrar_gol_mesa", {
    p_mesa_id: mesaId,
    p_jogador_id: jogadorId,
  });

  if (error) throw error;
  return data as MesaFutebol;
}

/**
 * Abandonar a partida atual
 */
export async function abandonarMesa(mesaId: string): Promise<MesaFutebol> {
  const { data, error } = await supabase.rpc("abandonar_partida_mesa", {
    p_mesa_id: mesaId,
  });

  if (error) throw error;
  return data as MesaFutebol;
}

/**
 * Registrar heartbeat (presença)
 */
export async function registrarHeartbeatMesa(mesaId: string): Promise<MesaFutebol> {
  const { data, error } = await supabase.rpc("registrar_heartbeat_mesa", {
    p_mesa_id: mesaId,
  });

  if (error) throw error;
  return data as MesaFutebol;
}

/**
 * Obter tempo restante da mesa
 */
export async function tempoRestanteMesa(mesaId: string): Promise<number> {
  const { data, error } = await supabase.rpc("tempo_restante_mesa", {
    p_mesa_id: mesaId,
  });

  if (error) throw error;
  return data as number;
}

/**
 * Finalizar a mesa com vencedor explícito (quando o jogo termina por jogadas).
 * Marca status=finalizado, vencedor_id e motivo_finalizacao='jogadas'.
 */
export async function finalizarMesa(
  mesaId: string,
  vencedorId: string,
): Promise<MesaFutebol | null> {
  const { data, error } = await supabase
    .from("mesas_futebol")
    .update({
      status: "finalizado",
      vencedor_id: vencedorId,
      motivo_finalizacao: "jogadas",
      turno_atual_id: null,
    })
    .eq("mesa_id", mesaId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as MesaFutebol | null;
}

/**
 * Trocar o turno da mesa no servidor (RPC autoritativa de troca de turno).
 */
export async function trocarTurnoMesa(mesaId: string): Promise<MesaFutebol | null> {
  const { data, error } = await supabase.rpc("registrar_jogada_mesa", {
    p_mesa_id: mesaId,
    p_estado_fisico: null,
    p_trocar_turno: true,
  });

  if (error) throw error;
  return data as MesaFutebol | null;
}
