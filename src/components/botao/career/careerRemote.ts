import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  obterSaldoSov,
  cacheSoberaniaInteiro,
  registrarTransacaoSov,
  type SovModule,
} from "@/lib/financial/sovApi";
import type { CareerState, Headline } from "./types";
import type { Fixture, MatchResult } from "../types";
import { teamByIdSync } from "../data/teams";
import { EMPTY_CAREER, normalizarCareer } from "./careerStorage";
import {
  mergeProgressInSupabase,
  mutateProgressInSupabase,
  type Progress,
} from "../storage";
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
        // Pós-separação CLUBE×TREINADOR, o ledger guarda o TOTAL (pessoal +
        // caixa do clube) — atribuí-lo ao coach.sov DUPLICAVA o caixa no
        // bolso do treinador a cada F5. O snapshot JSONB é a única fonte da
        // divisão pessoal×caixa; o saldo do ledger e o cache ficam como
        // fallback para carreiras sem snapshot.
        sov: coachSalvo.sov ?? saldoSov ?? u?.pontos_soberania ?? 0,
      },
    };
  } catch (e) {
    console.error("[careerRemote] loadCareer error:", e);
    return null;
  }
}

export async function saveCareerToSupabase(userId: string, c: CareerState): Promise<void> {
  try {
    // Salva o snapshot completo no JSONB E atualiza pontos_soberania real.
    // O cache do leaderboard é o TOTAL (pessoal + caixa do clube) — gravar só
    // o coach.sov aqui DERRUBAVA o cache de 5147 → 288 a cada save, e os
    // módulos que leem o cache (leaderboard, bootstrap da sessão) passavam a
    // exibir o dinheiro do clube como se fosse pessoal (incoerência global).
    await writeProgress(
      userId,
      { career: c },
      { pontos_soberania: cacheSoberaniaInteiro((c.coach.sov ?? 0) + (c.clubeCaixa ?? 0)) },
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
    const withIds: Headline[] = novas.map((h) => ({
      ...h,
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    // Anexa as manchetes à carreira FRESCA (lida dentro da fila serializada) —
    // nunca regrava um snapshot velho por cima do estado atual.
    await mutateProgressInSupabase(userId, (prog) => {
      const career = (prog["career"] ?? {}) as Partial<CareerState>;
      const existing = Array.isArray(career.headlines) ? career.headlines : [];
      return {
        patch: {
          career: {
            ...EMPTY_CAREER,
            ...career,
            headlines: [...withIds, ...existing].slice(0, 60),
          },
        },
      };
    });
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
  /** Id do fixture — torna o crédito/débito da partida idempotente no ledger. */
  partidaId?: string,
  /** Módulo de origem no ledger: 'career' (liga) ou 'online' (mesa). */
  modulo: SovModule = "career",
  /** Valor EXATO que o snapshot aplicou ao caixa do clube nesta partida
   *  (receita esportiva na escala da divisão, com bônus de escolha). Quando
   *  informado, o ledger registra ESTE valor — sem ele o ledger gravava o
   *  delta cru (3/1/0) enquanto o snapshot somava receita×mult (36/12/0 na
   *  série A): a carteira ficava 12× atrás do caixa a cada vitória e a
   *  invariante `wallet == coach.sov + clubeCaixa` quebrava (drift
   *  permanente — o caixa do clube virava dinheiro fantasma no snapshot). */
  valorDelta?: number,
): Promise<{ soberania: number; moralTime: number; titulos: number } | null> {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess?.user?.id;
    if (!uid) return null;

    const { delta: deltaRegra } = computeSovereigntyDelta(golsPro, golsContra, ultimaEscolha);
    const delta =
      typeof valorDelta === "number" && Number.isFinite(valorDelta)
        ? Math.round(valorDelta)
        : deltaRegra;

    // Fonte de verdade: Banco Central SOV. A chave por partida impede crédito
    // duplicado em reprocessamento/F5/retry. Este é o ÚNICO escritor do delta
    // da partida no ledger (o restante — dividendos, desafio, bônus de fim de
    // temporada — tem escritor próprio com chave própria).
    const saldoSov = await registrarTransacaoSov(
      uid,
      delta,
      delta >= 0 ? "reward" : "penalty",
      `Resultado de partida (${modulo}): ${golsPro}x${golsContra}`,
      modulo,
      { golsPro, golsContra, ultimaEscolha },
      partidaId
        ? { sourceEvent: "partida", idempotencyKey: `partida:${uid}:${partidaId}` }
        : undefined,
    );

    // Sincroniza contadores na carreira FRESCA (leitura dentro da fila
    // serializada — o snapshot local da partida já foi persistido pelo
    // chamador e NÃO é reconstruído aqui: moral/bônus/bolsa/conversas ficam
    // intactos). O coach.sov do JSONB NÃO é tocado: o saldo do ledger é o
    // TOTAL (pessoal + caixa do clube) e gravá-lo como dinheiro pessoal
    // duplicava o caixa a cada partida (o F5 revelava a inflação).
    let resultado: { soberania: number; moralTime: number; titulos: number } | null = null;
    await mutateProgressInSupabase(uid, (prog, row) => {
      const career = (prog["career"] ?? EMPTY_CAREER) as CareerState;
      // Saldo TOTAL da carteira (autoritativo no ledger) — usado só para o
      // cache do leaderboard e para o retorno (saldo online), nunca para o
      // coach.sov do snapshot.
      const novaSob =
        saldoSov ??
        ((row["pontos_soberania"] as number | undefined) ?? career.coach.sov ?? 0) + delta;
      resultado = {
        soberania: novaSob,
        moralTime: career.moralTime ?? 65,
        titulos: career.coach.titulos ?? 0,
      };
      return {
        patch: {
          gols_feitos: ((prog["gols_feitos"] as number | undefined) ?? 0) + golsPro,
          gols_sofridos: ((prog["gols_sofridos"] as number | undefined) ?? 0) + golsContra,
        },
        extraColumns: {
          // Cache do leaderboard: nunca negativo (a fonte de verdade é o ledger).
          pontos_soberania: cacheSoberaniaInteiro(novaSob),
          partidas_jogadas: ((row["partidas_jogadas"] as number | undefined) ?? 0) + 1,
          partidas_vencidas:
            ((row["partidas_vencidas"] as number | undefined) ?? 0) + (golsPro > golsContra ? 1 : 0),
        },
      };
    });

    return resultado;
  } catch (e) {
    console.error("[careerRemote] aplicarResultado error:", e);
    return null;
  }
}

/** Bônus por posição final na campanha. */
export async function aplicarFimCampanhaRemoto(
  posicao: "campeao" | "vice" | "terceiro" | "quarto" | "fora",
  dificuldade: "amador" | "profissional" | "lenda",
  opcoes?: {
    /** Carreira LOCAL autoritativa (pós-partida). Sem ela, a função lia o
     * JSONB do banco FORA da fila de escrita serializada — podia regravar o
     * estado PRÉ-promoção por cima das novas ligas/composições (race que
     * desfazia a promoção após F5). */
    careerAtual?: CareerState;
    /** Chaves da temporada encerrada — tornam o bônus idempotente no ledger. */
    temporada?: number;
    divisao?: string;
    /** Valor EXATO que o snapshot aplicou ao caixa do clube como premiação
     *  (`premiacaoDa` — escala da divisão por posição). Sem ele o ledger
     *  pagava a tabela antiga (vice=15/terceiro=10/quarto=5/fora=0) enquanto
     *  o snapshot somava outra (série A: vice=180, top4=120, resto=60) —
     *  drift permanente carteira × caixa. */
    valorBonus?: number;
  },
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
    const totalBonus =
      typeof opcoes?.valorBonus === "number" && Number.isFinite(opcoes.valorBonus)
        ? Math.round(opcoes.valorBonus)
        : bonusPos + bonusDif;

    // Fonte de verdade: Banco Central SOV — bônus de posição final ('career').
    // Chave por temporada+divisão: o encerramento NÃO paga duas vezes (§19).
    const saldoSov = await registrarTransacaoSov(
      uid,
      totalBonus,
      "reward",
      `Fim de campanha: posição ${posicao} (${dificuldade})`,
      "career",
      { posicao, dificuldade, totalBonus },
      opcoes?.temporada != null
        ? {
            sourceEvent: "fim_campanha",
            idempotencyKey: `fim-campanha:${uid}:t${opcoes.temporada}:${opcoes.divisao ?? "div"}`,
          }
        : undefined,
    );

    const { data: cur } = await (supabase as any)
      .from("botao_usuarios")
      .select("pontos_soberania, progresso_caminpanha")
      .eq("user_id", uid)
      .maybeSingle();
    if (!cur) return null;

    const novaSob =
      saldoSov ?? Math.max(0, (cur.pontos_soberania ?? 0) + totalBonus);
    // Base autoritativa: a carreira local pós-partida (com ligas/composições/
    // divisão já atualizadas). O read do banco só é usado como fallback.
    const prog: ExtendedProgress = (cur.progresso_caminpanha ?? {}) as ExtendedProgress;
    const career = opcoes?.careerAtual ?? prog.career ?? EMPTY_CAREER;
    // Com careerAtual (fluxo atual) o título JÁ foi somado localmente no fim da
    // liga — somar de novo dobrava o contador de títulos após F5.
    const novoTit = opcoes?.careerAtual
      ? (career.coach.titulos ?? 0)
      : (career.coach.titulos ?? 0) + (posicao === "campeao" ? 1 : 0);

    const nextCareer: CareerState = {
      ...career,
      dificuldadeAtual: null,
      eventoPendenteId: null,
      moralTime: 65,
      ultimasEscolhas: [],
      ultimaRodadaProcessada: -1,
      // coach.sov do snapshot preservado: novaSob é o TOTAL da carteira
      // (pessoal + caixa) — gravá-lo aqui inflava o bolso do treinador com
      // o caixa do clube a cada fim de temporada.
      coach: { ...career.coach, titulos: novoTit },
    };

    await writeProgress(uid, { career: nextCareer }, { pontos_soberania: cacheSoberaniaInteiro(novaSob) });

    return { soberania: novaSob, titulos: novoTit };
  } catch (e) {
    console.error("[careerRemote] aplicarFimCampanha error:", e);
    return null;
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

    // Saldo devolvido pelo ledger (autoritativo) — única confirmação válida.
    let saldoLedger: number | null = null;
    if (delta !== 0) {
      // Registra no ledger: bet_win (crédito) ou bet_loss (débito).
      saldoLedger = await registrarTransacaoSov(
        uid,
        delta,
        delta > 0 ? "bet_win" : "bet_loss",
        `Aposta de soberania online (${venceu ? "venceu" : "perdeu"})`,
        "online",
        { aposta: risco, empate, venceu },
      );
      // Regra econômica: sem confirmação do ledger a aposta NÃO é concluída
      // — nada de somar/subtrair localmente como se tivesse acontecido.
      if (saldoLedger === null) {
        console.warn("[careerRemote] aposta NÃO confirmada: ledger indisponível — nada alterado.");
        return null;
      }
    }

    // Cache do leaderboard recebe o saldo do ledger (arredondado — INTEGER);
    // empate (delta 0) mantém o atual.
    const novoSaldo = saldoLedger ?? atual;
    await (supabase as any)
      .from("botao_usuarios")
      .update({ pontos_soberania: cacheSoberaniaInteiro(novoSaldo) })
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

