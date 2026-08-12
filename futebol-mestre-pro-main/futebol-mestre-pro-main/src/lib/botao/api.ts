/**
 * Camada de acesso ao banco (Lovable Cloud).
 * Todas as consultas usam exclusivamente as tabelas botao_usuarios,
 * botao_times, botao_lobbies e botao_blocos.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TimeBotao = Tables<"botao_times">;
export type UsuarioBotao = Tables<"botao_usuarios">;
export type Lobby = Tables<"botao_lobbies">;
export type Bloco = Tables<"botao_blocos">;

export type ProgressoCampanha = {
  titles: { amador: number; profissional: number; lenda: number };
  trophies: string[];
  friendlies: { w: number; d: number; l: number };
};

export const PROGRESSO_PADRAO: ProgressoCampanha = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
};

export function lerProgresso(valor: unknown): ProgressoCampanha {
  const bruto = (valor ?? {}) as Partial<ProgressoCampanha>;
  return {
    titles: { ...PROGRESSO_PADRAO.titles, ...(bruto.titles ?? {}) },
    trophies: Array.isArray(bruto.trophies) ? bruto.trophies : [],
    friendlies: { ...PROGRESSO_PADRAO.friendlies, ...(bruto.friendlies ?? {}) },
  };
}

/* ---------------------------------- Times --------------------------------- */

/** Catálogo completo do Amistoso Lendário (todos os times do banco). */
export async function getLendarios(): Promise<TimeBotao[]> {
  const { data, error } = await supabase
    .from("botao_times")
    .select("*")
    .order("pais", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Times do usuário logado (inclui o time personalizado criado no cadastro). */
export async function getMeusTimes(userId: string): Promise<TimeBotao[]> {
  const { data, error } = await supabase
    .from("botao_times")
    .select("*")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Etapas retro: cada etapa filtra o banco por país/liga da era histórica. */
export type EtapaRetro = {
  id: string;
  era: string;
  titulo: string;
  ambiente: string;
  paises: string[];
  dificuldade: number;
};

export const ETAPAS_RETRO: EtapaRetro[] = [
  {
    id: "ren-xviii",
    era: "Século XVIII",
    titulo: "Rendukuoso — a origem das confrarias",
    ambiente: "Salões de madeira, luz de vela e botões de osso.",
    paises: ["Portugal", "Holanda"],
    dificuldade: 0.45,
  },
  {
    id: "ren-negro",
    era: "1940",
    titulo: "REN Negro — a era de ouro do tabuleiro",
    ambiente: "Feltro escuro, rádio de válvula e pontas de giz.",
    paises: ["Brasil"],
    dificuldade: 0.58,
  },
  {
    id: "sanetzin",
    era: "1960",
    titulo: "Sanetzinganshen — o desafio continental",
    ambiente: "Mesas de mármore, taças de prata e árbitros de cartola.",
    paises: ["Itália", "Espanha"],
    dificuldade: 0.68,
  },
  {
    id: "seminario-central",
    era: "1980",
    titulo: "Seminário Central — a escola europeia",
    ambiente: "Ginásios de concreto e cronômetros mecânicos.",
    paises: ["Alemanha", "França"],
    dificuldade: 0.78,
  },
  {
    id: "seminario-ilhas",
    era: "2000",
    titulo: "Seminário das Ilhas — a prova final",
    ambiente: "Refletores brancos e feltro azul das ilhas.",
    paises: ["Inglaterra"],
    dificuldade: 0.88,
  },
];

/** Times elegíveis para uma etapa do Seminário / Retro Challenge. */
export async function getDesafiosRetro(etapa: EtapaRetro): Promise<TimeBotao[]> {
  const { data, error } = await supabase
    .from("botao_times")
    .select("*")
    .in("pais", etapa.paises)
    .eq("is_personalizado", false)
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------- Usuário -------------------------------- */

export async function getUsuarioAtual(): Promise<UsuarioBotao | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("botao_usuarios")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Fallback: perfil ainda não existe (conta criada antes do trigger).
  const { data: criado, error: erroCriar } = await supabase
    .from("botao_usuarios")
    .insert({
      user_id: user.id,
      email: user.email ?? `${user.id}@sem-email.local`,
      nome: (user.user_metadata?.["nome"] as string) ?? user.email?.split("@")[0] ?? "Jogador",
    })
    .select("*")
    .single();
  if (erroCriar) throw erroCriar;
  return criado;
}

/** Salva o resultado de uma partida no perfil do jogador. */
export async function salvarResultado(params: {
  usuario: UsuarioBotao;
  resultado: "v" | "e" | "d";
  pontos: number;
  trofeu?: string | undefined;
  titulo?: "amador" | "profissional" | "lenda" | undefined;
}): Promise<UsuarioBotao> {
  const progresso = lerProgresso(params.usuario.progresso_caminpanha);
  if (params.resultado === "v") progresso.friendlies.w += 1;
  else if (params.resultado === "e") progresso.friendlies.d += 1;
  else progresso.friendlies.l += 1;

  if (params.trofeu && !progresso.trophies.includes(params.trofeu)) {
    progresso.trophies.push(params.trofeu);
  }
  if (params.titulo) progresso.titles[params.titulo] += 1;

  const { data, error } = await supabase
    .from("botao_usuarios")
    .update({
      partidas_jogadas: params.usuario.partidas_jogadas + 1,
      partidas_vencidas: params.usuario.partidas_vencidas + (params.resultado === "v" ? 1 : 0),
      pontos_soberania: Math.max(0, params.usuario.pontos_soberania + params.pontos),
      progresso_caminpanha: progresso as unknown as never,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.usuario.user_id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* --------------------------- Lobbies e blocos ---------------------------- */

export async function getLobbiesAtivos(): Promise<Lobby[]> {
  const { data, error } = await supabase
    .from("botao_lobbies")
    .select("*")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarLobby(params: {
  nome: string;
  criadorSession: string;
  criadorNome: string;
  formato: string;
}): Promise<Lobby> {
  const { data, error } = await supabase
    .from("botao_lobbies")
    .insert({
      nome: params.nome,
      criador_session: params.criadorSession,
      criador_nome: params.criadorNome,
      formato: params.formato,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function encerrarLobby(lobbyId: string): Promise<void> {
  const { error } = await supabase
    .from("botao_lobbies")
    .update({ status: "encerrado" })
    .eq("id", lobbyId);
  if (error) throw error;
}

export async function getBlocos(lobbyId: string): Promise<Bloco[]> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .select("*")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function criarBloco(params: {
  lobbyId: string;
  session: string;
  nome: string;
  timeId: string;
  jogadas: number;
  tempoTurno: number;
}): Promise<Bloco> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .insert({
      lobby_id: params.lobbyId,
      jogador1_session: params.session,
      jogador1_nome: params.nome,
      jogador1_time: params.timeId,
      jogadas_restantes: params.jogadas,
      tempo_maximo_turno: params.tempoTurno,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function entrarNoBloco(params: {
  blocoId: string;
  session: string;
  nome: string;
  timeId: string;
}): Promise<Bloco> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .update({
      jogador2_session: params.session,
      jogador2_nome: params.nome,
      jogador2_time: params.timeId,
      status: "em_jogo",
      turno: "jogador1",
      timestamp_inicio_turno: new Date().toISOString(),
    })
    .eq("id", params.blocoId)
    .is("jogador2_session", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getBloco(blocoId: string): Promise<Bloco | null> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .select("*")
    .eq("id", blocoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Registra um gol usando a função do banco. */
export async function registrarGolBloco(blocoId: string, jogador: "jogador1" | "jogador2") {
  const { error } = await supabase.rpc("registrar_gol_bloco", {
    p_bloco_id: blocoId,
    p_jogador: jogador,
  });
  if (error) throw error;
}

/** Consome uma jogada (decrementa, alterna turno e finaliza no zero). */
export async function registrarJogadaBloco(blocoId: string) {
  const { error } = await supabase.rpc("registrar_jogada_bloco", { p_bloco_id: blocoId });
  if (error) throw error;
}

export async function forcarTrocaTurnoBloco(blocoId: string) {
  const { error } = await supabase.rpc("forcar_troca_turno_bloco", { p_bloco_id: blocoId });
  if (error) throw error;
}

export async function finalizarBloco(blocoId: string, vencedor: string) {
  const { error } = await supabase.rpc("finalizar_bloco", {
    p_bloco_id: blocoId,
    p_vencedor: vencedor,
  });
  if (error) throw error;
}

export async function sairDoBloco(blocoId: string) {
  const { error } = await supabase.from("botao_blocos").delete().eq("id", blocoId);
  if (error) throw error;
}
