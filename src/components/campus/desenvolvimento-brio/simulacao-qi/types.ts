/**
 * Tipos do módulo SIMULAÇÃO DE TESTE DE QI.
 *
 * Este módulo é INDEPENDENTE dos EXERCÍCIOS (módulo I-RAVEN em
 * ../teste-qi). As questões da simulação vêm do banco `qi_questions` com
 * `mode = 'simulation'` (SÓ elas) e as dos exercícios com
 * `mode = 'exercise'` (SÓ elas) — a separação existe no BANCO e no RPC,
 * nunca apenas na UI. A prova tem sempre 32 questões, 6 alternativas,
 * 25 minutos e dificuldade crescente (difficulty_order ASC).
 */

export type QiMode = "exercise" | "simulation";

export const SIMULACAO = {
  TOTAL_QUESTIONS: 32,
  TIME_LIMIT_SECONDS: 25 * 60,
  OPTIONS_PER_QUESTION: 6,
  TEST_TYPE: "simulation",
  VERSION: 1,
} as const;

export const DIFFICULTY_ORDER_MIN = 1;
export const DIFFICULTY_ORDER_MAX = 7;

/** Estrutura 3×3 com 8 painéis de contexto (a 9ª célula é a resposta). */
export interface MatrixData {
  cells: PanelLight[];
}

/** Entidade serializada no formato leve {(bbox, níveis)}. */
export type EntityLight = readonly [
  typeLevel: number,
  sizeLevel: number,
  colorLevel: number,
  angleLevel: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
];

export type EstruturaPainel = "Left_Right" | "Up_Down" | "Out_In" | undefined;

export interface PanelLight {
  structure?: EstruturaPainel;
  entities: EntityLight[];
}

export interface OptionLight {
  id: string;
  panel: PanelLight;
}

/** Questão como retornada pela RPC qi_buscar_questoes (SEM correct_option). */
export interface QiQuestionDB {
  id: string;
  mode: QiMode;
  difficulty: string;
  difficulty_order: number;
  category: string;
  matrix_data: MatrixData;
  options: OptionLight[];
  active: boolean;
  version: number;
}

/** Dados oficiais da questão que o Renderer usa (equal entre modos). */
export interface QuestaoRender {
  id: string;
  difficulty: string;
  difficulty_order: number;
  category: string;
  matrix: PanelLight[];
  options: Array<{ id: string; panel: PanelLight }>;
}

export type StatusTentativa = "in_progress" | "completed" | "expired" | "abandoned";

/** Tentativa persistida (banco ou fallback local). */
export interface TentativaSimulacao {
  attempt_id: string;
  test_type: string;
  version: number;
  total_questions: number;
  questions: Array<{ question_id: string; difficulty_order: number }>;
  answers: Array<string | null>;
  answered_questions: number;
  time_limit_seconds: number;
  started_at: string;
  status: StatusTentativa;
}

/** Resultado final (da RPC qi_finalizar_simulacao no servidor). */
export interface ResultadoSimulacao {
  attempt_id: string;
  status: StatusTentativa;
  raw_score: number;
  correct_answers: number;
  answered_questions: number;
  total_questions: number;
  percentual: number;
  estimated_result: number;
  time_used_seconds: number;
  time_limit_seconds: number;
}

export interface TentativaResumo {
  attempt_id: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  raw_score: number;
  estimated_result: number | null;
  time_used_seconds: number;
  time_limit_seconds: number;
  started_at: string;
  completed_at: string | null;
  status: StatusTentativa;
}

/** Corresponde às colunas das tabelas qi_test_attempts / qi_questions. */
export const TEST_TYPE = SIMULACAO.TEST_TYPE;
export const TIME_LIMIT = SIMULACAO.TIME_LIMIT_SECONDS;
export const TOTAL_QUESTIONS = SIMULACAO.TOTAL_QUESTIONS;
export const OPTIONS = SIMULACAO.OPTIONS_PER_QUESTION;