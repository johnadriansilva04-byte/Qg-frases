import type { Difficulty, Tournament } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { registrarTransacaoSov } from "@/lib/financial/sovApi";

export type Progress = {
  titles: Record<Difficulty, number>;
  trophies: { difficulty: Difficulty; teamId: string; date: string }[];
  friendlies: { w: number; d: number; l: number };
  tournament?: Tournament;
  gols_feitos: number;
  gols_sofridos: number;
};

const EMPTY: Progress = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
  gols_feitos: 0,
  gols_sofridos: 0,
};

export function loadProgress(): Progress {
  // Isolamento: estado de jogo não usa cache compartilhado do navegador.
  return EMPTY;
}

export function saveProgress(_p: Progress) {
  // Persistência é feita apenas no Supabase.
}

export type ProgressPatch = Omit<Partial<Progress>, "tournament"> & {
  tournament?: Tournament | null;
  career?: unknown;
  [key: string]: unknown;
};

const writeQueues = new Map<string, Promise<void>>();

function enqueueProgressWrite(userId: string, operacao: () => Promise<void>): Promise<void> {
  const anterior = writeQueues.get(userId) ?? Promise.resolve();
  const atual = anterior.catch(() => {}).then(operacao);
  writeQueues.set(userId, atual);
  try {
    return atual;
  } finally {
    void atual.finally(() => {
      if (writeQueues.get(userId) === atual) writeQueues.delete(userId);
    });
  }
}

/** Atualiza o JSONB de campanha sem apagar chaves que outras telas acabaram de salvar. */
export async function mergeProgressInSupabase(
  userId: string,
  patch: ProgressPatch,
  extraColumns?: Record<string, unknown>,
): Promise<void> {
  await enqueueProgressWrite(userId, async () => {
    const { data, error } = await supabase
      .from("botao_usuarios")
      .select("progresso_caminpanha")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const current = (data?.progresso_caminpanha ?? {}) as Record<string, unknown>;
    const merged = { ...current, ...patch };
    const { error: updateError } = await supabase
      .from("botao_usuarios")
      .update({ progresso_caminpanha: merged as never, ...(extraColumns ?? {}) })
      .eq("user_id", userId);
    if (updateError) throw updateError;
  });
}

export type ProgressMutation = {
  patch: ProgressPatch;
  extraColumns?: Record<string, unknown>;
};

/**
 * Read-modify-write serializado: a leitura acontece DENTRO da fila de escrita,
 * ou seja, depois que todas as gravações anteriores aterrissaram. Sem isso,
 * qualquer mutação baseada numa leitura solta (fora da fila) podia regravar um
 * snapshot VELHO da carreira por cima de dados novos — a interface mostrava o
 * estado novo na sessão e o F5 revelava o estado antigo (ex.: cotas da Bolsa).
 */
export async function mutateProgressInSupabase(
  userId: string,
  mutator: (prog: Record<string, unknown>, row: Record<string, unknown>) => ProgressMutation | null,
): Promise<void> {
  await enqueueProgressWrite(userId, async () => {
    const { data, error } = await supabase
      .from("botao_usuarios")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const row = (data ?? {}) as Record<string, unknown>;
    const current = (row["progresso_caminpanha"] ?? {}) as Record<string, unknown>;
    const mutacao = mutator(current, row);
    if (!mutacao) return;
    const merged = { ...current, ...mutacao.patch };
    const { error: updateError } = await supabase
      .from("botao_usuarios")
      .update({ progresso_caminpanha: merged as never, ...(mutacao.extraColumns ?? {}) })
      .eq("user_id", userId);
    if (updateError) throw updateError;
  });
}

export async function saveProgressToSupabase(userId: string, p: Progress) {
  try {
    const { tournament: _tournament, ...patch } = p;
    await mergeProgressInSupabase(userId, patch);
  } catch (error) {
    console.error("Erro ao salvar progresso no Supabase:", error);
  }
}

export async function loadProgressFromSupabase(userId: string): Promise<Progress> {
  try {
    const { data, error } = await supabase
      .from("botao_usuarios")
      .select("progresso_caminpanha")
      .eq("user_id", userId)
      .single();

    if (error || !data?.progresso_caminpanha) return EMPTY;

    return { ...EMPTY, ...(data.progresso_caminpanha as Progress) };
  } catch (error) {
    console.error("Erro ao carregar progresso do Supabase:", error);
    return EMPTY;
  }
}

export async function deleteProgressFromSupabase(userId: string) {
  try {
    await supabase
      .from("botao_usuarios")
      .update({ progresso_caminpanha: EMPTY })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Erro ao excluir progresso do Supabase:", error);
  }
}

export function deleteProgressLocal() {
  // Dados da campanha não ficam em cache do navegador.
}

export function loadTournament(): Tournament | null {
  return null;
}

export function saveTournament(_t: Tournament) {
  // Persistência é feita apenas no Supabase.
}

export function deleteTournamentLocal() {
  // Dados da campanha não ficam em cache do navegador.
}

export async function saveTournamentToSupabase(userId: string, t: Tournament | null) {
  try {
    await mergeProgressInSupabase(userId, { tournament: t });
  } catch (error) {
    console.error("Erro ao salvar torneio no Supabase:", error);
  }
}

export async function loadTournamentFromSupabase(userId: string): Promise<Tournament | null> {
  try {
    const { data, error } = await supabase
      .from("botao_usuarios")
      .select("progresso_caminpanha")
      .eq("user_id", userId)
      .single();

    if (error || !data?.progresso_caminpanha) return null;

    const progress = data.progresso_caminpanha as Progress;
    return progress.tournament || null;
  } catch (error) {
    console.error("Erro ao carregar torneio do Supabase:", error);
    return null;
  }
}

export async function atualizarPontosSoberania(
  userId: string,
  golsFeitos: number,
  golsSofridos: number,
  vitoria: boolean,
) {
  try {
    // Calcular pontos: +1 por gol feito, -2 por gol sofrido, +3 por vitória, -4 por derrota
    const pontosGols = golsFeitos * 1 + golsSofridos * -2;
    const pontosResultado = vitoria ? 3 : -4;
    const pontosTotais = pontosGols + pontosResultado;

    // Fonte de verdade: Banco Central SOV (user_wallets + bank_ledger).
    // O saldo retornado vira o novo cache em botao_usuarios.pontos_soberania.
    const saldoSov = await registrarTransacaoSov(
      userId,
      pontosTotais,
      pontosTotais >= 0 ? "reward" : "penalty",
      vitoria
        ? `Partida de carreira: ${golsFeitos}x${golsSofridos} (vitória)`
        : `Partida de carreira: ${golsFeitos}x${golsSofridos} (derrota)`,
      "career",
      { golsFeitos, golsSofridos, vitoria },
    );

    const { data: currentData } = await supabase
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_jogadas, partidas_vencidas, progresso_caminpanha")
      .eq("user_id", userId)
      .single();

    if (!currentData) return;

    // Fallback: se o Banco Central não respondeu (migration pendente), usa o
    // cálculo local — nunca deixa o jogo travar por causa do ledger.
    const novosPontos =
      saldoSov ?? Math.max(0, (currentData.pontos_soberania || 0) + pontosTotais);
    const novasPartidas = (currentData.partidas_jogadas || 0) + 1;
    const novasVitorias = vitoria
      ? (currentData.partidas_vencidas || 0) + 1
      : currentData.partidas_vencidas || 0;
    // Gols vão dentro do JSONB (a coluna real não existe no schema atual)
    const prog = (currentData.progresso_caminpanha ?? {}) as ProgressPatch;
    const golsFeitosTotal = (prog.gols_feitos ?? 0) + golsFeitos;
    const golsSofridosTotal = (prog.gols_sofridos ?? 0) + golsSofridos;

    await mergeProgressInSupabase(
      userId,
      { gols_feitos: golsFeitosTotal, gols_sofridos: golsSofridosTotal },
      {
        pontos_soberania: novosPontos,
        partidas_jogadas: novasPartidas,
        partidas_vencidas: novasVitorias,
      },
    );

    console.log("[Pontos] Atualizados:", {
      pontosTotais,
      novosPontos,
      golsFeitos,
      golsSofridos,
      vitoria,
    });
  } catch (error) {
    console.error("Erro ao atualizar pontos de soberania:", error);
  }
}

export async function atualizarEstatisticasOnline(
  userId: string,
  resultado: "vitoria" | "derrota" | "empate",
  golsFeitos: number,
  golsSofridos: number,
  _campeonatoGanho: boolean = false,
) {
  try {
    // Pontuação escassa alinhada com carreira: V=+3, E=+1, D=-3
    let pontosTotais = 0;
    if (resultado === "vitoria") pontosTotais = 3;
    else if (resultado === "empate") pontosTotais = 1;
    else pontosTotais = -3;

    // Fonte de verdade: Banco Central SOV — módulo 'online'.
    const saldoSov = await registrarTransacaoSov(
      userId,
      pontosTotais,
      pontosTotais >= 0 ? "reward" : "penalty",
      `Partida online: ${golsFeitos}x${golsSofridos} (${resultado})`,
      "online",
      { resultado, golsFeitos, golsSofridos },
    );

    const { data: currentData } = await supabase
      .from("botao_usuarios")
      .select("pontos_soberania, partidas_jogadas, partidas_vencidas, progresso_caminpanha")
      .eq("user_id", userId)
      .single();

    if (!currentData) return;

    // Fallback local quando o ledger não responde (cache ainda é atualizado).
    const novosPontos =
      saldoSov ?? Math.max(0, (currentData.pontos_soberania || 0) + pontosTotais);
    const novasPartidas = (currentData.partidas_jogadas || 0) + 1;
    const novasVitorias =
      resultado === "vitoria"
        ? (currentData.partidas_vencidas || 0) + 1
        : currentData.partidas_vencidas || 0;

    const prog = (currentData.progresso_caminpanha ?? {}) as ProgressPatch;
    const golsFeitosTotal = (prog.gols_feitos ?? 0) + golsFeitos;
    const golsSofridosTotal = (prog.gols_sofridos ?? 0) + golsSofridos;

    await mergeProgressInSupabase(
      userId,
      { gols_feitos: golsFeitosTotal, gols_sofridos: golsSofridosTotal },
      {
        pontos_soberania: novosPontos,
        partidas_jogadas: novasPartidas,
        partidas_vencidas: novasVitorias,
      },
    );

    console.log("[Estatísticas Online] Atualizadas:", {
      resultado,
      pontosTotais,
      novosPontos,
      golsFeitos,
      golsSofridos,
    });
  } catch (error) {
    console.error("Erro ao atualizar estatísticas online:", error);
  }
}

export async function adicionarPontosVideo(userId: string, pontos: number = 5) {
  try {
    // Fonte de verdade: Banco Central SOV — recompensa de publicidade ('market').
    const saldoSov = await registrarTransacaoSov(
      userId,
      pontos,
      "reward",
      "Vídeo de publicidade assistido",
      "market",
      { pontos },
    );

    const { data: currentData } = await supabase
      .from("botao_usuarios")
      .select("pontos_soberania")
      .eq("user_id", userId)
      .single();

    if (!currentData) return null;

    // Fallback local quando o ledger não responde.
    const novosPontos = saldoSov ?? (currentData.pontos_soberania || 0) + pontos;

    const { error } = await supabase
      .from("botao_usuarios")
      .update({ pontos_soberania: novosPontos })
      .eq("user_id", userId);

    if (error) throw error;

    console.log("[Pontos] Vídeo assistido:", { pontos, novosPontos });
    return novosPontos;
  } catch (error) {
    console.error("Erro ao adicionar pontos por vídeo:", error);
    return null;
  }
}

export function isUnlocked(p: Progress, d: Difficulty) {
  if (d === "amador") return true;
  if (d === "profissional") return p.titles.amador >= 3;
  return p.titles.profissional >= 3;
}
