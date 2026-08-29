/**
 * Camada de acesso ao Supabase para a SIMULAÇÃO DE TESTE DE QI.
 *
 * Todas as operações usam o MESMO usuário autenticado dos jogos (o client
 * do projeto). Quando a migration `qi_simulacao.sql` ainda não foi aplicada
 * (RPC inexistente), o módulo degrada com segurança para um banco local
 * determinístico (mesmas questões) e avisa que o resultado não persiste.
 *
 * Segurança: a RPC qi_buscar_questoes nunca expõe correct_option; a
 * pontuação final é sempre calculada NO SERVIDOR (qi_finalizar_simulacao);
 * o fallback local só existe porque o banco local não é o servidor.
 */
import { supabase } from "@/integrations/supabase/client";
import { BANCO_EXERCICIO_LOCAL, BANCO_SIMULACAO_LOCAL, GABARITO_EXERCICIO_LOCAL, GABARITO_SIMULACAO_LOCAL } from "./banco-local";
import type {
  QiMode,
  QiQuestionDB,
  ResultadoSimulacao,
  TentativaResumo,
  TentativaSimulacao,
} from "./types";

/** Se alguma RPC qi_* existir, o backend está ativo. */
async function rpcExiste(nome: string): Promise<boolean> {
  try {
    // Tipos do Supabase não conhecem as RPCs qi_* ainda — usa cast p/ evitar
    // erro de tipo; runtime é idêntico. PGRST202 = função não encontrada.
    const res = (supabase as unknown as { rpc: (n: string, a?: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }> }).rpc(nome, {});
    const { error } = await res;
    if (error && (error.code === "PGRST202" || error.message?.includes("Could not find the function"))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

let dbAtivo: boolean | null = null;
export async function backendQiAtivo(): Promise<boolean> {
  if (dbAtivo === null) {
    dbAtivo = await rpcExiste("qi_buscar_questoes");
  }
  return dbAtivo;
}

type RpcResultado<T> = { data: T | null; error: { code?: string; message?: string } | null };

/** Invoca RPC qi_* (tipos do Supabase ainda não as conhecem). */
async function rpcQi<T>(nome: string, args?: Record<string, unknown>): Promise<RpcResultado<T>> {
  const s = supabase as unknown as {
    rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
  };
  const res = await s.rpc(nome, args);
  return { data: res.data as T | null, error: res.error };
}

function dbParaRender(q: QiQuestionDB) {
  return {
    id: q.id,
    difficulty: q.difficulty,
    difficulty_order: q.difficulty_order,
    category: q.category,
    matrix: q.matrix_data.cells,
    options: q.options.map((o) => ({ id: o.id, panel: o.panel })),
  };
}

function ordenarPorDificuldade<T extends { id: string; difficulty_order: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.difficulty_order - b.difficulty_order || a.id.localeCompare(b.id),
  );
}

/** Busca questões puras de um modo (sem gabarito) — ordena por dificuldade. */
export async function buscarQuestoes(mode: QiMode) {
  const ativo = await backendQiAtivo();
  if (ativo) {
    const { data, error } = await rpcQi<QiQuestionDB[]>("qi_buscar_questoes", { p_mode: mode });
    if (!error && Array.isArray(data)) {
      return ordenarPorDificuldade(data.filter((r) => r.mode === mode && r.active)).map(dbParaRender);
    }
  }
  // Fallback local (mesmas questões do seed).
  const banco = mode === "simulation" ? BANCO_SIMULACAO_LOCAL : BANCO_EXERCICIO_LOCAL;
  return ordenarPorDificuldade(banco.filter((r) => r.mode === mode && r.active)).map(dbParaRender);
}

/** Cria uma tentativa de simulação no servidor. */
export async function criarTentativa(): Promise<{ attempt_id: string; total_questions: number } | null> {
  if (!(await backendQiAtivo())) return null;
  const { data, error } = await rpcQi<{ attempt_id: string; total_questions: number }>("qi_criar_tentativa");
  if (error || !data) return null;
  return data;
}

/** Recupera a tentativa in_progress do usuário (F5 / retomada). */
export async function obterTentativaAtiva(): Promise<TentativaSimulacao | null> {
  if (!(await backendQiAtivo())) return null;
  const { data, error } = await rpcQi<TentativaSimulacao>("qi_obter_tentativa_ativa");
  if (error || !data) return null;
  return data;
}

export async function salvarRespostas(attemptId: string, answers: Array<string | null>): Promise<boolean> {
  if (!(await backendQiAtivo())) return false;
  const { error } = await rpcQi<null>("qi_salvar_respostas", {
    p_attempt_id: attemptId,
    p_answers: JSON.stringify(answers),
  });
  return !error;
}

export async function finalizarSimulacao(
  attemptId: string,
  answers: Array<string | null>,
  finalizacao: "submit" | "expired",
): Promise<ResultadoSimulacao | null> {
  if (!(await backendQiAtivo())) return null;
  const { data, error } = await rpcQi<ResultadoSimulacao>("qi_finalizar_simulacao", {
    p_attempt_id: attemptId,
    p_answers: JSON.stringify(answers),
    p_finalizacao: finalizacao,
  });
  if (error || !data) return null;
  return data;
}

export async function listarTentativas(limite = 50): Promise<TentativaResumo[] | null> {
  if (!(await backendQiAtivo())) return null;
  const { data, error } = await rpcQi<TentativaResumo[]>("qi_listar_tentativas", { p_limite: limite });
  if (error || !data) return null;
  return data;
}

/** Última tentativa concluída/expirada do usuário (para o perfil). */
export async function obterUltimaTentativa(): Promise<TentativaResumo | null> {
  const lista = await listarTentativas(10);
  if (!lista) return null;
  return lista.find((t) => t.status !== "in_progress") ?? lista[0] ?? null;
}

/** Gabarito local para score de fallback (nunca viaja por RPC pública). */
export function gabaritoLocal(mode: QiMode, questionId: string): number {
  const g = mode === "simulation" ? GABARITO_SIMULACAO_LOCAL : GABARITO_EXERCICIO_LOCAL;
  return g[questionId] ?? -1;
}

/** Id da opção correta no banco local (para o score de fallback). */
export function gabaritoLocalOptionId(mode: QiMode, questionId: string): string | null {
  const idx = gabaritoLocal(mode, questionId);
  if (idx < 0) return null;
  const banco = mode === "simulation" ? BANCO_SIMULACAO_LOCAL : BANCO_EXERCICIO_LOCAL;
  const q = banco.find((b) => b.id === questionId);
  return q?.options?.[idx]?.id ?? null;
}