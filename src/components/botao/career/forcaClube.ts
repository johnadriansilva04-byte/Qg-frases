/**
 * forcaClube — estrutura de força dos clubes (prompt do dono, §5-§6).
 *
 * A força real de um clube combina:
 *  - qualidade técnica (power base do elenco/botões);
 *  - TORCIDA (fatia do universo de 1.000.000 — força real, não decorativa);
 *  - estrutura/economia (derivada deterministicamente da qualidade — clubes
 *    maiores têm CT, estádio e departamento médico melhores).
 *
 * Porte: pequeno → médio → grande, com diferença clara entre os três.
 *
 * Módulo PURO (sem alias `@/`) — testável com jiti.
 */

import { bonusTorcida, TOTAL_TORCEDORES } from "./torcidaEngine";

export type PorteClube = "pequeno" | "medio" | "grande";

/** Limites alinhados à distribuição REAL da base (C: 51-65, B: 58-70, A: 70-88):
 *  Série C = pequeno, Série B = médio, Série A = grande. */
export function porteDoClube(power: number): PorteClube {
  if (power > 70) return "grande";
  if (power >= 58) return "medio";
  return "pequeno";
}

export const PORTE_LABEL: Record<PorteClube, string> = {
  pequeno: "Clube pequeno",
  medio: "Clube médio",
  grande: "Clube grande",
};

/** Estrutura do clube (1..5): CT/estádio/economia, derivada do power. */
export function estruturaDoClube(power: number): number {
  const e = Math.round(((power - 28) / (88 - 28)) * 4) + 1;
  return Math.max(1, Math.min(5, e));
}

/**
 * Bônus de força vindo da torcida (0..+6) — mesma curva da simulação de
 * partidas (`torcidaEngine.bonusTorcida`): a torcida é força real, nunca
 * número decorativo.
 */
export function bonusDaTorcida(fans: number, totalUniverso = TOTAL_TORCEDORES): number {
  return bonusTorcida(fans, totalUniverso);
}

/** Força real do clube = qualidade + torcida + ajuste fino de estrutura. */
export function forcaRealClube(power: number, fans: number, totalUniverso = TOTAL_TORCEDORES): number {
  const estrutura = estruturaDoClube(power);
  const ajusteEstrutura = (estrutura - 3) * 0.5; // -1..+1
  const bruta = power + bonusDaTorcida(fans, totalUniverso) + ajusteEstrutura;
  return Math.max(28, Math.min(99, Math.round(bruta)));
}
