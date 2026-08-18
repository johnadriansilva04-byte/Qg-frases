import { supabase } from "@/integrations/supabase/client";
import type { CareerState, Headline } from "./types";
import { EMPTY_CAREER } from "./careerStorage";
import type { Progress } from "../storage";

/**
 * Persistência 100% dentro da coluna JSONB `progresso_caminpanha` da tabela
 * `botao_usuarios` — que já existe no Supabase. Sem depender de migração nova.
 *
 * Layout do JSONB:
 * {
 *   ...Progress (titles, trophies, friendlies, tournament),
 *   career: CareerState,
 *   gols_feitos: number,
 *   gols_sofridos: number,
 * }
 *
 * A coluna real `pontos_soberania` é a fonte para o leaderboard.
 * `partidas_jogadas` / `partidas_vencidas` também são colunas reais.
 */

type ExtendedProgress = Partial<Progress> & {
  career?: CareerState;
  gols_feitos?: number;
  gols_sofridos?: number;
};

async function readProgress(userId: string): Promise<ExtendedProgress> {
  const { data } = await (supabase as any)
    .from("botao_usuarios")
    .select("progresso_caminpanha")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.progresso_caminpanha ?? {}) as ExtendedProgress;
}

async function writeProgress(userId: string, patch: ExtendedProgress, extra?: Record<string, any>) {
  const current = await readProgress(userId);
  const merged: ExtendedProgress = { ...current, ...patch };
  await (supabase as any)
    .from("botao_usuarios")
    .update({ progresso_caminpanha: merged, ...(extra ?? {}) })
    .eq("user_id", userId);
}

export async function loadCareerFromSupabase(userId: string): Promise<CareerState | null> {
  try {
    const prog = await readProgress(userId);
    // Ler tb pontos_soberania real da coluna (autoritativo)
    const { data: u } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_vencidas, partidas_jogadas")
      .eq("user_id", userId)
      .maybeSingle();
    if (!prog.career?.coach?.nome) return null;
    return {
      ...EMPTY_CAREER,
      ...prog.career,
      coach: {
        ...EMPTY_CAREER.coach,
        ...prog.career.coach,
        // pontos_soberania real sempre ganha sobre o JSONB (fonte da verdade)
        soberania: u?.pontos_soberania ?? prog.career.coach.soberania ?? 0,
      },
    };
  } catch (e) {
    console.error("[careerRemote] loadCareer error:", e);
    return null;
  }
}

export async function saveCareerToSupabase(userId: string, c: CareerState): Promise<void> {
  try {
    // Salva o snapshot completo no JSONB E atualiza pontos_soberania real
    await writeProgress(userId, { career: c }, { pontos_soberania: Math.max(0, c.coach.soberania) });
  } catch (e) {
    console.error("[careerRemote] saveCareer error:", e);
  }
}

export async function inserirManchetesRemotas(
  userId: string,
  novas: Omit<Headline, "id">[],
): Promise<Headline[]> {
  if (novas.length === 0) return [];
  try {
    const prog = await readProgress(userId);
    const existing = prog.career?.headlines ?? [];
    const withIds: Headline[] = novas.map((h) => ({
      ...h,
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    const nextCareer: CareerState = {
      ...EMPTY_CAREER,
      ...(prog.career ?? {}),
      headlines: [...withIds, ...existing].slice(0, 60),
    };
    await writeProgress(userId, { career: nextCareer });
    return withIds;
  } catch (e) {
    console.error("[careerRemote] inserirManchetes error:", e);
    return [];
  }
}

/** Regras de pontuação escassa (as mesmas de carreira offline). */
function computeSovereigntyDelta(golsPro: number, golsContra: number, ultimaEscolha: string | null) {
  let delta = 0;
  let moralDelta = 0;
  if (golsPro > golsContra) { delta = 3; moralDelta = 4; }
  else if (golsPro < golsContra) { delta = -3; moralDelta = -6; }
  else { delta = 1; moralDelta = -1; }
  if (ultimaEscolha === "goleada") {
    if (golsPro - golsContra >= 2) delta += 5;
    else if (golsPro < golsContra) delta -= 3;
  } else if (ultimaEscolha === "respeito" && golsPro > golsContra) {
    delta += 2;
  }
  return { delta, moralDelta };
}

/** Aplica resultado da partida diretamente (sem RPC). */
export async function aplicarResultadoRemoto(
  golsPro: number,
  golsContra: number,
  ultimaEscolha: string | null,
): Promise<{ soberania: number; moralTime: number; titulos: number } | null> {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return null;

    const { data: current } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_jogadas, partidas_vencidas, progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!current) return null;

    const { delta, moralDelta } = computeSovereigntyDelta(golsPro, golsContra, ultimaEscolha);
    const novaSob = Math.max(0, (current.pontos_soberania ?? 0) + delta);
    const partidasJog = (current.partidas_jogadas ?? 0) + 1;
    const partidasVen = (current.partidas_vencidas ?? 0) + (golsPro > golsContra ? 1 : 0);

    const prog: ExtendedProgress = (current.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const nextMoral = Math.max(0, Math.min(100, (career.moralTime ?? 65) + moralDelta));

    const nextProg: ExtendedProgress = {
      ...prog,
      gols_feitos: (prog.gols_feitos ?? 0) + golsPro,
      gols_sofridos: (prog.gols_sofridos ?? 0) + golsContra,
      career: {
        ...career,
        moralTime: nextMoral,
        bonusProximaPartida: 0,
        penaltiesProximaPartida: 0,
        coach: { ...career.coach, soberania: novaSob },
      },
    };

    await (supabase as any).from("botao_usuarios").update({
      pontos_soberania: novaSob,
      partidas_jogadas: partidasJog,
      partidas_vencidas: partidasVen,
      progresso_caminpanha: nextProg,
    }).eq("user_id", uid);

    return { soberania: novaSob, moralTime: nextMoral, titulos: career.coach.titulos ?? 0 };
  } catch (e) {
    console.error("[careerRemote] aplicarResultado error:", e);
    return null;
  }
}

/** Bônus por posição final na campanha. */
export async function aplicarFimCampanhaRemoto(
  posicao: "campeao" | "vice" | "terceiro" | "quarto" | "fora",
  dificuldade: "amador" | "profissional" | "lenda",
): Promise<{ soberania: number; titulos: number } | null> {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return null;

    const bonusPos = { campeao: 20, vice: 15, terceiro: 10, quarto: 5, fora: 0 }[posicao];
    const bonusTit = posicao === "campeao"
      ? ({ amador: 100, profissional: 250, lenda: 500 }[dificuldade])
      : 0;
    const totalBonus = bonusPos + bonusTit;

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return null;

    const novaSob = Math.max(0, (cur.pontos_soberania ?? 0) + totalBonus);
    const prog: ExtendedProgress = (cur.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const novoTit = (career.coach.titulos ?? 0) + (posicao === "campeao" ? 1 : 0);

    const nextProg: ExtendedProgress = {
      ...prog,
      career: {
        ...career,
        dificuldadeAtual: null,
        eventoPendenteId: null,
        moralTime: 65,
        ultimasEscolhas: [],
        ultimaRodadaProcessada: -1,
        coach: { ...career.coach, soberania: novaSob, titulos: novoTit },
      },
    };

    await (supabase as any).from("botao_usuarios").update({
      pontos_soberania: novaSob,
      progresso_caminpanha: nextProg,
    }).eq("user_id", uid);

    return { soberania: novaSob, titulos: novoTit };
  } catch (e) {
    console.error("[careerRemote] aplicarFimCampanha error:", e);
    return null;
  }
}

/** Aplica escolha do treinador (delta poder + moral). */
export async function aplicarEscolhaRemoto(
  choiceId: string,
  deltaPoder: number,
  deltaMoral: number,
): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return;

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return;

    const prog: ExtendedProgress = (cur.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const nextProg: ExtendedProgress = {
      ...prog,
      career: {
        ...career,
        bonusProximaPartida: (career.bonusProximaPartida ?? 0) + deltaPoder,
        moralTime: Math.max(0, Math.min(100, (career.moralTime ?? 65) + deltaMoral)),
        ultimasEscolhas: [...(career.ultimasEscolhas ?? []), choiceId].slice(-8),
        eventoPendenteId: null,
      },
    };

    await (supabase as any).from("botao_usuarios")
      .update({ progresso_caminpanha: nextProg })
      .eq("user_id", uid);
  } catch (e) {
    console.error("[careerRemote] aplicarEscolha error:", e);
  }
}

/** Inicia nova campanha (limpa manchetes e reseta estado). */
export async function iniciarCampanhaRemota(
  dificuldade: "amador" | "profissional" | "lenda",
): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return;

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return;

    const prog: ExtendedProgress = (cur.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const nextProg: ExtendedProgress = {
      ...prog,
      career: {
        ...career,
        dificuldadeAtual: dificuldade,
        moralTime: 65,
        bonusProximaPartida: 0,
        penaltiesProximaPartida: 0,
        eventoPendenteId: null,
        ultimasEscolhas: [],
        ultimaRodadaProcessada: -1,
        headlines: [],
        coach: { ...career.coach, campanhasJogadas: (career.coach.campanhasJogadas ?? 0) + 1 },
      },
    };

    await (supabase as any).from("botao_usuarios")
      .update({ progresso_caminpanha: nextProg })
      .eq("user_id", uid);
  } catch (e) {
    console.error("[careerRemote] iniciarCampanha error:", e);
  }
}

/**
 * Aplica uma aposta de soberania em partida online. O usuário arrisca parte da
 * soberania: venceu = recebe o dobro da aposta; perdeu = perde a aposta;
 * empate = recebe a aposta de volta (0 a perder). Retorna o novo saldo.
 */
export async function aplicarApostaSoberania(
  aposta: number,
  venceu: boolean,
  empate: boolean,
): Promise<number | null> {
  try {
    if (aposta <= 0) return null;
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return null;

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return null;

    const atual = cur.pontos_soberania ?? 0;
    // Nunca arrisca mais do que o saldo disponível.
    const risco = Math.min(aposta, atual);
    let delta = 0;
    if (empate) delta = 0;
    else if (venceu) delta = risco; // ganha o equivalente à aposta (dobro)
    else delta = -risco;

    const novoSaldo = Math.max(0, atual + delta);
    await (supabase as any).from("botao_usuarios")
      .update({ pontos_soberania: novoSaldo })
      .eq("user_id", uid);
    return novoSaldo;
  } catch (e) {
    console.error("[careerRemote] aplicarApostaSoberania error:", e);
    return null;
  }
}
