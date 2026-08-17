import { supabase } from "@/integrations/supabase/client";
import type { CareerState, Headline } from "./types";
import { EMPTY_CAREER } from "./careerStorage";

/**
 * Fonte-da-verdade: Supabase (tabela botao_usuarios + botao_manchetes).
 * localStorage é usado apenas como cache offline / usuário deslogado.
 */

type UsuarioRow = {
  user_id: string;
  coach_nome: string | null;
  coach_apelido: string | null;
  coach_cidade: string | null;
  coach_estilo: "ataque" | "equilibrado" | "defesa" | null;
  coach_bio: string | null;
  pontos_soberania: number;
  campanhas_jogadas: number;
  titulos_treinador: number;
  moral_time: number;
  bonus_proxima_partida: number;
  penalties_proxima_partida: number;
  evento_pendente_id: string | null;
  ultimas_escolhas: string[] | null;
  ultima_rodada_processada: number;
  dificuldade_atual: "amador" | "profissional" | "lenda" | null;
  created_at: string;
};

type MancheteRow = {
  id: string;
  manchete: string;
  subtitulo: string | null;
  tag: Headline["tag"];
  rodada: number;
  created_at: string;
};

/** Carrega o estado da carreira do Supabase (perfil + últimas manchetes). */
export async function loadCareerFromSupabase(userId: string): Promise<CareerState | null> {
  const { data: u, error } = await (supabase as any)
    .from("botao_usuarios")
    .select(
      "user_id, coach_nome, coach_apelido, coach_cidade, coach_estilo, coach_bio, pontos_soberania, campanhas_jogadas, titulos_treinador, moral_time, bonus_proxima_partida, penalties_proxima_partida, evento_pendente_id, ultimas_escolhas, ultima_rodada_processada, dificuldade_atual, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !u) return null;
  const row = u as UsuarioRow;

  const { data: manchetes } = await (supabase as any)
    .from("botao_manchetes")
    .select("id, manchete, subtitulo, tag, rodada, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const headlines: Headline[] = ((manchetes ?? []) as MancheteRow[]).map((m) => ({
    id: m.id,
    manchete: m.manchete,
    subtitulo: m.subtitulo ?? undefined,
    tag: m.tag,
    rodada: m.rodada,
  }));

  return {
    ...EMPTY_CAREER,
    coach: {
      nome: row.coach_nome ?? "",
      apelido: row.coach_apelido ?? "",
      cidade: row.coach_cidade ?? "",
      estilo: row.coach_estilo ?? "equilibrado",
      bio: row.coach_bio ?? "",
      soberania: row.pontos_soberania ?? 0,
      campanhasJogadas: row.campanhas_jogadas ?? 0,
      titulos: row.titulos_treinador ?? 0,
      criadoEm: row.created_at ?? new Date().toISOString(),
    },
    dificuldadeAtual: row.dificuldade_atual,
    bonusProximaPartida: row.bonus_proxima_partida ?? 0,
    penaltiesProximaPartida: row.penalties_proxima_partida ?? 0,
    moralTime: row.moral_time ?? 65,
    ultimasEscolhas: row.ultimas_escolhas ?? [],
    ultimaRodadaProcessada: row.ultima_rodada_processada ?? -1,
    eventoPendenteId: row.evento_pendente_id,
    headlines,
  };
}

/** Sincroniza o perfil do treinador + estado de campanha. */
export async function saveCareerToSupabase(userId: string, c: CareerState): Promise<void> {
  await (supabase as any)
    .from("botao_usuarios")
    .update({
      coach_nome: c.coach.nome,
      coach_apelido: c.coach.apelido,
      coach_cidade: c.coach.cidade,
      coach_estilo: c.coach.estilo,
      coach_bio: c.coach.bio,
      pontos_soberania: c.coach.soberania,
      campanhas_jogadas: c.coach.campanhasJogadas,
      titulos_treinador: c.coach.titulos,
      moral_time: c.moralTime,
      bonus_proxima_partida: c.bonusProximaPartida,
      penalties_proxima_partida: c.penaltiesProximaPartida,
      evento_pendente_id: c.eventoPendenteId,
      ultimas_escolhas: c.ultimasEscolhas,
      ultima_rodada_processada: c.ultimaRodadaProcessada,
      dificuldade_atual: c.dificuldadeAtual,
    })
    .eq("user_id", userId);
}

/** Insere manchetes novas no Supabase e devolve com ids gerados. */
export async function inserirManchetesRemotas(
  userId: string,
  novas: Omit<Headline, "id">[],
): Promise<Headline[]> {
  if (novas.length === 0) return [];
  const payload = novas.map((h) => ({
    user_id: userId,
    manchete: h.manchete,
    subtitulo: h.subtitulo ?? null,
    tag: h.tag,
    rodada: h.rodada,
  }));
  const { data, error } = await (supabase as any)
    .from("botao_manchetes")
    .insert(payload)
    .select("id, manchete, subtitulo, tag, rodada");
  if (error || !data) return [];
  return (data as MancheteRow[]).map((m) => ({
    id: m.id,
    manchete: m.manchete,
    subtitulo: m.subtitulo ?? undefined,
    tag: m.tag,
    rodada: m.rodada,
  }));
}

/** Aplica resultado da partida via RPC (autoritativo). Retorna soberania e moral atualizados. */
export async function aplicarResultadoRemoto(
  golsPro: number,
  golsContra: number,
  ultimaEscolha: string | null,
): Promise<{ soberania: number; moralTime: number; titulos: number } | null> {
  const { data, error } = await (supabase as any).rpc("aplicar_resultado_carreira", {
    p_gols_pro: golsPro,
    p_gols_contra: golsContra,
    p_ultima_escolha: ultimaEscolha,
  });
  if (error || !data) return null;
  return {
    soberania: data.pontos_soberania ?? 0,
    moralTime: data.moral_time ?? 65,
    titulos: data.titulos_treinador ?? 0,
  };
}

/** Aplica fim de campanha (posição final + bônus por dificuldade). */
export async function aplicarFimCampanhaRemoto(
  posicao: "campeao" | "vice" | "terceiro" | "quarto" | "fora",
  dificuldade: "amador" | "profissional" | "lenda",
): Promise<{ soberania: number; titulos: number } | null> {
  const { data, error } = await (supabase as any).rpc("aplicar_fim_de_campanha", {
    p_posicao: posicao,
    p_dificuldade: dificuldade,
  });
  if (error || !data) return null;
  return {
    soberania: data.pontos_soberania ?? 0,
    titulos: data.titulos_treinador ?? 0,
  };
}

/** Aplica escolha do treinador via RPC. */
export async function aplicarEscolhaRemoto(
  choiceId: string,
  deltaPoder: number,
  deltaMoral: number,
): Promise<void> {
  await (supabase as any).rpc("aplicar_escolha_treinador", {
    p_choice_id: choiceId,
    p_delta_poder: deltaPoder,
    p_delta_moral: deltaMoral,
  });
}

/** Inicia nova campanha remota (limpa manchetes antigas). */
export async function iniciarCampanhaRemota(
  dificuldade: "amador" | "profissional" | "lenda",
): Promise<void> {
  await (supabase as any).rpc("iniciar_campanha", { p_dificuldade: dificuldade });
}
