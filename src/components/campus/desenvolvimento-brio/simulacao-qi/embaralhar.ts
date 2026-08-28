/**
 * Embaralhamento determinístico das 6 alternativas por tentativa.
 *
 * REGRA (§10 da spec): as alternativas PODEM ser embaralhadas, mas a resposta
 * correta NUNCA pode ficar sempre na mesma posição. Como o id de cada opção
 * é estável (`op-{índiceCanônico}-{questão}`), embaralhar apenas a ORDEM de
 * exibição não muda o que o servidor pontua (`qi_finalizar_simulacao` cruza
 * o id da opção escolhida com o id da correta — indiferente à posição).
 *
 * A seed deriva do attempt_id + id da questão, então:
 *  - duas tentativas têm ordens DIFERENTES (a correta muda de posição);
 *  - F5/recuperação re-deriva EXATAMENTE a mesma ordem (attempt_id estável).
 */
import type { QuestaoRender } from "./types";

type OpcaoRender = QuestaoRender["options"][number];

/** Hash FNV-1a 32-bit de uma string → número. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** PRNG mulberry32 (determinístico a partir de uma seed). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates determinístico. */
function fisherYates<T>(arr: T[], rnd: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Ordem de exibição (embaralhada) das opções de uma questão numa tentativa.
 * `attemptId` identifica a tentativa; `questionId` individualiza a questão.
 */
export function embaralharOpcoes(
  options: OpcaoRender[],
  attemptId: string,
  questionId: string,
): OpcaoRender[] {
  const seed = hash32(`${attemptId}::${questionId}`);
  return fisherYates(options, mulberry32(seed));
}

/** Variação da posição da resposta correta entre duas tentativas (uso em teste). */
export function posicaoDaResposta(
  options: OpcaoRender[],
  correctOptionId: string,
): number {
  const idx = options.findIndex((o) => o.id === correctOptionId);
  return idx; // 0..5
}