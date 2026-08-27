/**
 * API functions para o modo Campeonato Online (tabela botao_campeonatos_online).
 * Reaproveita mesas_futebol (1 mesa = 1 partida) e orquestra as rodadas
 * round-robin via RPCs autoritativas do Supabase.
 */
import { supabase } from "@/integrations/supabase/client";

export type ParticipanteCampeonato = {
  user_id: string;
  nome: string;
  time_id: string;
  abreviacao: string;
  pontos: number;
  gols_pro: number;
  gols_contra: number;
  /** Bot = clube existente do universo controlado pelo motor do jogo. */
  bot?: boolean;
  /** Força do clube (bots) — usada na simulação bot × bot. */
  power?: number;
};

/** Bot do campeonato: SEMPRE um clube que já existe no universo (TEAMS). */
export type BotCampeonato = {
  nome: string;
  time_id: string;
  abreviacao: string;
  power: number;
};

/** Formato do campeonato: 'pontos' (todos vs todos) ou 'mata-mata' (eliminação). */
export type FormatoCampeonato = "pontos" | "mata-mata";

export type ConfrontoCampeonato = {
  rodada: number;
  mesa_id: string | null;
  j1_id: string | null;
  j2_id: string | null;
  pl_j1: number;
  pl_j2: number;
  status: "pendente" | "finalizado";
  bye: boolean;
};

export type CampeonatoOnline = {
  id: number;
  codigo: string;
  nome: string;
  criador_id: string;
  status: "aguardando" | "em_andamento" | "finalizado" | "cancelado";
  max_jogadores: number;
  /** Formato: 'pontos' (default antigo) ou 'mata-mata'. */
  formato?: FormatoCampeonato;
  fase: number;
  participantes: ParticipanteCampeonato[];
  confrontos: ConfrontoCampeonato[];
  rodada_atual: number;
  vencedor_id: string | null;
  /** Prêmio do campeão em SOV (informativo — a premiação é registrada no SOV Bank). */
  premio_sov?: number;
  criado_em: string;
  atualizado_em: string;
};

/** Link direto para a sala do campeonato: cai direto na sala (§link). */
export function linkConviteCampeonato(codigo: string, formato?: FormatoCampeonato): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://pracinha.online";
  const fmt = formato ?? "pontos";
  return `${base}/cidadela?camp=${encodeURIComponent(codigo)}&formato=${fmt}`;
}

/** Cria uma nova sala de campeonato (criador é o 1º participante).
 *
 * formato="pontos" (default) ou "mata-mata". Na RPC atual o formato fica
 * informado pela UI; quando a migration persistir, virá do banco.
 */
export async function criarCampeonato(
  nome: string,
  maxJogadores = 4,
  premioSov = 0,
  formato: FormatoCampeonato = "pontos",
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("criar_campeonato_online", {
    p_nome: nome,
    p_max: maxJogadores,
    p_premio_sov: premioSov,
  });
  if (error) {
    // Produção sem a migration v2 (função antiga de 2 args): degrada para a
    // assinatura antiga — salas grandes (9+) e regra dos 50 SOV exigem a v2.
    if (error.code === "PGRST202" || error.code === "42883") {
      if (maxJogadores > 8) {
        throw new Error(
          "Salas com mais de 8 jogadores precisam da migration campeonato_online_v2 aplicada no banco.",
        );
      }
      const legacy = await supabase.rpc("criar_campeonato_online", {
        p_nome: nome,
        p_max: maxJogadores,
      });
      if (legacy.error) throw legacy.error;
      return legacy.data as CampeonatoOnline;
    }
    throw error;
  }
  const camp = data as CampeonatoOnline;
  // Formato capturado pela UI (quando a migration persistir, virá do banco).
  camp.formato = formato;
  return camp;
}

/** Entra em uma sala de campeonato pelo código. */
export async function entrarCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("entrar_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Sai de uma sala de campeonato aberta. */
export async function sairCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("sair_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** O criador inicia o campeonato (sorteia confrontos). */
export async function iniciarCampeonato(codigo: string): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("iniciar_campeonato_online", { p_codigo: codigo });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Busca um campeonato pelo código. */
export async function buscarCampeonato(codigo: string): Promise<CampeonatoOnline | null> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return (data as CampeonatoOnline | null) ?? null;
}

/** Busca um campeonato pelo id. */
export async function buscarCampeonatoPorId(id: number): Promise<CampeonatoOnline | null> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CampeonatoOnline | null) ?? null;
}

/** Lista campeonatos abertos (aguardando jogadores) para a sala pública. */
export async function buscarCampeonatosAbertos(): Promise<CampeonatoOnline[]> {
  const { data, error } = await supabase
    .from("botao_campeonatos_online")
    .select("*")
    .eq("status", "aguardando")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampeonatoOnline[];
}

/** Vincula a mesa recém-criada ao confronto da rodada atual. */
export async function vincularMesaCampeonato(
  campeonatoId: number,
  rodada: number,
  mesaId: string,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("vincular_mesa_campeonato", {
    p_campeonato_id: campeonatoId,
    p_rodada: rodada,
    p_mesa_id: mesaId,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Registra o resultado de um confronto e computa pontos/SOV. */
export async function registrarResultadoCampeonato(
  campeonatoId: number,
  mesaId: string,
  golsJ1: number,
  golsJ2: number,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("registrar_resultado_campeonato", {
    p_campeonato_id: campeonatoId,
    p_mesa_id: mesaId,
    p_gols_j1: golsJ1,
    p_gols_j2: golsJ2,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/**
 * Preencher com Bots (SÓ o dono da sala): completa as vagas restantes com
 * clubes que JÁ existem no universo do jogo. Nenhum usuário novo é criado.
 */
export async function preencherCampeonatoComBots(
  codigo: string,
  bots: BotCampeonato[],
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("preencher_campeonato_bots", {
    p_codigo: codigo,
    p_bots: bots,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/**
 * Resolve um confronto bot × bot com o placar da simulação do motor
 * existente (SÓ o dono da sala; o servidor rejeita confronto com humano).
 */
export async function resolverConfrontoBots(
  campeonatoId: number,
  rodada: number,
  j1: string,
  j2: string,
  golsJ1: number,
  golsJ2: number,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("resolver_confronto_bots", {
    p_campeonato_id: campeonatoId,
    p_rodada: rodada,
    p_j1: j1,
    p_j2: j2,
    p_gols_j1: golsJ1,
    p_gols_j2: golsJ2,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Registra o resultado de um confronto HUMANO × BOT jogado localmente
 *  (sem mesa realtime — o bot não é usuário real). */
export async function registrarResultadoVsBot(
  campeonatoId: number,
  rodada: number,
  golsHumano: number,
  golsBot: number,
): Promise<CampeonatoOnline> {
  const { data, error } = await supabase.rpc("registrar_resultado_vs_bot", {
    p_campeonato_id: campeonatoId,
    p_rodada: rodada,
    p_gols_humano: golsHumano,
    p_gols_bot: golsBot,
  });
  if (error) throw error;
  return data as CampeonatoOnline;
}

/** Simulação determinística de um confronto bot × bot pela força (power)
 *  dos clubes — o mesmo critério do motor de temporada. */
export function simularConfrontoBots(
  powerJ1: number,
  powerJ2: number,
  chave: string,
): { golsJ1: number; golsJ2: number } {
  // Hash determinístico da chave (campeonato+rodada+j1xj2) — F5/retry não
  // muda o placar.
  let h = 2166136261;
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const diff = powerJ1 - powerJ2;
  const base = (n: number) => (h >>> n) % 3;
  let golsJ1 = base(3);
  let golsJ2 = base(11);
  if (diff > 6 && golsJ1 <= golsJ2) golsJ1 = golsJ2 + 1;
  else if (diff < -6 && golsJ2 <= golsJ1) golsJ2 = golsJ1 + 1;
  else if (diff > 0 && golsJ1 < golsJ2) [golsJ1, golsJ2] = [golsJ2, golsJ1];
  return { golsJ1, golsJ2 };
}
