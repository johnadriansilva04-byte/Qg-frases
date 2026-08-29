/**
 * Pontuação da SIMULAÇÃO DE TESTE DE QI (pura, sem I/O).
 *
 * A conversão para "estimativa experimental" fica ISOLADA em
 * calculateEstimatedResult para que a metodologia possa ser alterada depois
 * sem tocar no resto do sistema. Nenhum número aqui é apresentado como "QI
 * oficial": é SEMPRE uma estimativa experimental da própria simulação.
 */
import { SIMULACAO } from "./types";

export interface DadosResultado {
  rawScore: number;
  totalQuestions: number;
  metadata?: { version?: number; extra?: Record<string, unknown> };
}

/**
 * Conversão estimativa experimental: pontuação bruta → escala padrão 100±30
 * (média 100, desvio ~15 por questão), centralizada em metade dos acertos.
 * Fórmula deliberadamente simples e substituível.
 */
export function calculateEstimatedResult(rawScore: number, totalQuestions: number, metadata?: unknown): number {
  const n = totalQuestions > 0 ? totalQuestions : SIMULACAO.TOTAL_QUESTIONS;
  // 100 + (acertos − metade) × 2  → 0 acertos = 68, 16/32 = 100, 32/32 = 132.
  return Math.round(100 + (rawScore - n / 2) * 2);
}

/** Conversão completa usada pela UI. */
export function calcularResultado(dados: DadosResultado): {
  rawScore: number;
  percentual: number;
  estimatedResult: number;
} {
  const total = dados.totalQuestions > 0 ? dados.totalQuestions : SIMULACAO.TOTAL_QUESTIONS;
  const clamped = Math.max(0, Math.min(total, dados.rawScore));
  return {
    rawScore: clamped,
    percentual: Math.round((clamped / total) * 100),
    estimatedResult: calculateEstimatedResult(clamped, total, dados.metadata),
  };
}

/** "MM:SS" a partir de segundos (comporta ≥1h como "H:MM:SS"). */
export function formatarTempo(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Data DD/MM/AAAA para exibição no perfil. */
export function formatarData(iso: string | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}