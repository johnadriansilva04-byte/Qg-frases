import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  obterSaldoSov,
  registrarTransacaoSov,
} from "@/lib/financial/sovApi";
import type { CareerState, Headline } from "./types";
import type { Fixture, MatchResult } from "../types";
import { teamByIdSync } from "../data/teams";
import { EMPTY_CAREER, normalizarCareer } from "./careerStorage";
import { mergeProgressInSupabase, type Progress } from "../storage";
import { sortTable } from "../tournament";

/**
 * Persistência híbrida: `progresso_caminpanha` guarda o snapshot da sessão e
 * RPCs históricas (`botao_temporadas/partidas/tabelas/eventos`) alimentam o
 * histórico relacional da carreira quando a migração está aplicada.
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

async function writeProgress(
  userId: string,
  patch: ExtendedProgress,
  extra?: Record<string, unknown>,
) {
  await mergeProgressInSupabase(userId, patch, extra);
}

export async function loadCareerFromSupabase(
  userId: string,
  fallbackCoach?: CareerState["coach"],
): Promise<CareerState | null> {
  try {
    const prog = await readProgress(userId);
    const { data: u } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_vencidas, partidas_jogadas, nome")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prog.career) return null;
    // Fonte de verdade: user_wallets.balance (SOV). Se o Banco Central não
    // estiver disponível (migration pendente), cai no cache pontos_soberania.
    const saldoSov = await obterSaldoSov(userId);
    // Normaliza antes de usar: JSONB antigo pode ter coleções ausentes ou
    // divisao nula — sem isso, o celular/menu quebravam ao ler o estado salvo.
    const base = normalizarCareer(prog.career as Partial<CareerState>);
    const coachFallback = fallbackCoach ?? EMPTY_CAREER.coach;
    const coachSalvo = base.coach;
    const nomeCoach =
      coachSalvo.nome?.trim() || coachFallback.nome?.trim() || u?.nome?.trim() || "Treinador";

    return {
      ...base,
      coach: {
        ...coachSalvo,
        apelido: coachSalvo.apelido?.trim() || coachFallback.apelido?.trim() || nomeCoach,
        cidade: coachSalvo.cidade?.trim() || coachFallback.cidade?.trim() || "",
        bio: coachSalvo.bio?.trim() || coachFallback.bio?.trim() || "",
        nome: nomeCoach,
        sov: saldoSov ?? u?.pontos_soberania ?? coachSalvo.sov ?? 0,
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
    await writeProgress(
      userId,
      { career: c },
      { pontos_soberania: Math.max(0, c.coach.sov) },
    );
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
function computeSovereigntyDelta(
  golsPro: number,
  golsContra: number,
  ultimaEscolha: string | null,
) {
  let delta = 0;
  let moralDelta = 0;
  if (golsPro > golsContra) {
    delta = 3;
    moralDelta = 4;
  } else if (golsPro < golsContra) {
    delta = 0;
    moralDelta = -6;
  } else {
    delta = 1;
    moralDelta = -1;
  }
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

    const { delta, moralDelta } = computeSovereigntyDelta(golsPro, golsContra, ultimaEscolha);

    const { data: current } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_jogadas, partidas_vencidas, progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!current) return null;

    // Fonte de verdade: Banco Central SOV (module 'career').
    const saldoSov = await registrarTransacaoSov(
      uid,
      delta,
      delta >= 0 ? "reward" : "penalty",
      `Resultado de carreira: ${golsPro}x${golsContra}`,
      "career",
      { golsPro, golsContra, ultimaEscolha },
    );

    // Cache legado + fallback local quando o ledger não responde.
    const novaSob =
      saldoSov ?? Math.max(0, (current.pontos_soberania ?? 0) + delta);
    const partidasJog = (current.partidas_jogadas ?? 0) + 1;
    const partidasVen = (current.partidas_vencidas ?? 0) + (golsPro > golsContra ? 1 : 0);

    const prog: ExtendedProgress = (current.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const nextMoral = Math.max(0, Math.min(100, (career.moralTime ?? 65) + moralDelta));

    const nextCareer: CareerState = {
      ...career,
      moralTime: nextMoral,
      bonusProximaPartida: 0,
      penaltiesProximaPartida: 0,
      coach: { ...career.coach, sov: novaSob },
    };

    await writeProgress(
      uid,
      {
        gols_feitos: (prog.gols_feitos ?? 0) + golsPro,
        gols_sofridos: (prog.gols_sofridos ?? 0) + golsContra,
        career: nextCareer,
      },
      {
        pontos_soberania: novaSob,
        partidas_jogadas: partidasJog,
        partidas_vencidas: partidasVen,
      },
    );

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

    // Campeão ganha entre +100 e +200 de Soberania (base + bônus por dificuldade).
    const bonusPos =
      posicao === "campeao"
        ? 100
        : posicao === "vice"
          ? 15
          : posicao === "terceiro"
            ? 10
            : posicao === "quarto"
              ? 5
              : 0;
    const bonusDif =
      posicao === "campeao"
        ? dificuldade === "lenda"
          ? 100
          : dificuldade === "profissional"
            ? 50
            : 0
        : 0;
    const totalBonus = bonusPos + bonusDif;

    // Fonte de verdade: Banco Central SOV — bônus de posição final ('career').
    const saldoSov = await registrarTransacaoSov(
      uid,
      totalBonus,
      "reward",
      `Fim de campanha: posição ${posicao} (${dificuldade})`,
      "career",
      { posicao, dificuldade, totalBonus },
    );

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return null;

    const novaSob =
      saldoSov ?? Math.max(0, (cur.pontos_soberania ?? 0) + totalBonus);
    const prog: ExtendedProgress = (cur.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = prog.career ?? EMPTY_CAREER;
    const novoTit = (career.coach.titulos ?? 0) + (posicao === "campeao" ? 1 : 0);

    const nextCareer: CareerState = {
      ...career,
      dificuldadeAtual: null,
      eventoPendenteId: null,
      moralTime: 65,
      ultimasEscolhas: [],
      ultimaRodadaProcessada: -1,
      coach: { ...career.coach, sov: novaSob, titulos: novoTit },
    };

    await writeProgress(uid, { career: nextCareer }, { pontos_soberania: novaSob });

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
    const nextCareer: CareerState = {
      ...career,
      bonusProximaPartida: (career.bonusProximaPartida ?? 0) + deltaPoder,
      moralTime: Math.max(0, Math.min(100, (career.moralTime ?? 65) + deltaMoral)),
      ultimasEscolhas: [...(career.ultimasEscolhas ?? []), choiceId].slice(-8),
      eventoPendenteId: null,
    };

    await writeProgress(uid, { career: nextCareer });
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
    const nextCareer: CareerState = {
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
    };

    await writeProgress(uid, { career: nextCareer });
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

    // Saldo vem do Banco Central (fonte de verdade) com fallback no cache.
    const saldoAtual = (await obterSaldoSov(uid));
    const atual =
      saldoAtual ??
      (
        await (supabase as any)
          .from("botao_usuarios")
          .select("pontos_soberania")
          .eq("user_id", uid)
          .maybeSingle()
      )?.data?.pontos_soberania ??
      0;

    // Nunca arrisca mais do que o saldo disponível.
    const risco = Math.min(aposta, atual);
    let delta = 0;
    if (empate) delta = 0;
    else if (venceu)
      delta = risco; // ganha o equivalente à aposta (dobro)
    else delta = -risco;

    if (delta !== 0) {
      // Registra no ledger: bet_win (crédito) ou bet_loss (débito).
      await registrarTransacaoSov(
        uid,
        delta,
        delta > 0 ? "bet_win" : "bet_loss",
        `Aposta de soberania online (${venceu ? "venceu" : "perdeu"})`,
        "online",
        { aposta: risco, empate, venceu },
      );
    }

    const novoSaldo = Math.max(0, atual + delta);
    await (supabase as any)
      .from("botao_usuarios")
      .update({ pontos_soberania: novoSaldo })
      .eq("user_id", uid);
    return novoSaldo;
  } catch (e) {
    console.error("[careerRemote] aplicarApostaSoberania error:", e);
    return null;
  }
}

/** Inicia/atualiza a temporada no histórico relacional. Falha silenciosa mantém o snapshot JSONB. */
export async function registrarTemporadaRemota(
  userId: string,
  career: CareerState,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("registrar_temporada_carreira", {
      p_user_id: userId,
      p_temporada: career.temporada ?? 1,
      p_dificuldade: career.dificuldadeAtual ?? "amador",
      p_divisao: career.divisao,
      p_estado: career as unknown as Json,
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[careerRemote] histórico de temporada indisponível:", e);
  }
}

/** Registra cada resultado real do usuário no histórico relacional. */
export async function registrarPartidaRemota(
  userId: string,
  career: CareerState,
  userTeamId: string,
  fixture: Fixture,
  result: MatchResult,
  competicao: "brasileirao" | "copa-brasil",
): Promise<void> {
  try {
    const { error } = await supabase.rpc("registrar_partida_carreira", {
      p_user_id: userId,
      p_partida: {
        temporada: career.temporada ?? 1,
        competicao,
        divisao: competicao === "brasileirao" ? career.divisao : null,
        rodada: fixture.stage,
        home_id: result.homeId,
        away_id: result.awayId,
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        pen_home: result.penHome ?? null,
        pen_away: result.penAway ?? null,
        user_home: fixture.homeId === userTeamId,
        detalhes: {
          fixture_id: fixture.id,
          user_team: userTeamId,
          home_nome: teamByIdSync(result.homeId).name,
          away_nome: teamByIdSync(result.awayId).name,
        },
      },
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[careerRemote] histórico de partida indisponível:", e);
  }
}

/** Finaliza a temporada e grava as três tabelas em formato relacional. */
export async function finalizarTemporadaRemota(
  userId: string,
  career: CareerState,
): Promise<void> {
  try {
    const tabelas = Object.entries(career.ligas ?? {}).flatMap(([divisao, liga]) =>
      sortTable(liga.groups[0]?.table ?? []).map((row, index) => ({
        competicao: "brasileirao",
        divisao,
        team_id: row.teamId,
        team_nome: liga.userTeamId === row.teamId ? career.coach.nome : teamByIdSync(row.teamId).name,
        posicao: index + 1,
        p: row.p,
        j: row.j,
        v: row.v,
        e: row.e,
        d: row.d,
        gp: row.gp,
        gc: row.gc,
        sg: row.gp - row.gc,
      })),
    );
    const { error } = await supabase.rpc("finalizar_temporada_carreira", {
      p_user_id: userId,
      p_temporada: career.temporada ?? 1,
      p_tabelas: tabelas,
      p_estado: career as unknown as Json,
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[careerRemote] finalização de temporada indisponível:", e);
  }
}

/** Registra decisão/narrativa no histórico de eventos. */
export async function registrarEventoCarreiraRemoto(
  userId: string,
  career: CareerState,
  tipo: string,
  titulo: string,
  texto: string,
  payload: Json,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("registrar_evento_carreira", {
      p_user_id: userId,
      p_evento: {
        temporada: career.temporada ?? null,
        tipo,
        titulo,
        texto,
        payload,
      },
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[careerRemote] evento histórico indisponível:", e);
  }
}

