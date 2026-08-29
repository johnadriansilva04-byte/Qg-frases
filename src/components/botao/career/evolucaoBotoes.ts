/**
 * evolucaoBotoes — evolução dos 5 botões de linha do clube do jogador.
 *
 * Regras (prompt do dono, §7-§10):
 * - Cada botão tem UMA única habilidade ("Habilidade") com nível 0..5.
 * - Evoluir custa SOV (dinheiro do jogo) e o preço é PROGRESSIVO: cada nível
 *   custa mais que o anterior. Não existe evolução infinita/barata.
 * - O nível tem impacto REAL na partida: botão chuta mais forte (multiplicador
 *   de impulso) e fica mais pesado (empurra melhor a bola e é menos desviado).
 * - A média dos níveis soma um bônus à força (power) do time (0..+5).
 *
 * Módulo PURO (sem alias `@/`) — testável com jiti.
 */

export const MAX_NIVEL_BOTAO = 5;
export const TOTAL_BOTOES_LINHA = 5;

/** Custo para subir do nível i para i+1 (i = nível atual, 0-based). */
export const CUSTOS_EVOLUCAO: readonly number[] = [20, 50, 120, 280, 650];

export type NiveisBotoes = number[];

export function niveisIniciais(): NiveisBotoes {
  return Array.from({ length: TOTAL_BOTOES_LINHA }, () => 0);
}

/** Saneia o que vier do JSONB (sempre 5 níveis inteiros em 0..MAX). */
export function normalizarNiveis(bruto: unknown): NiveisBotoes {
  const base = niveisIniciais();
  if (!Array.isArray(bruto)) return base;
  return base.map((_, i) => {
    const n = Number(bruto[i]);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(MAX_NIVEL_BOTAO, Math.floor(n)));
  });
}

/** Custo para o próximo nível; null quando já está no máximo. */
export function custoProximoNivel(nivelAtual: number): number | null {
  if (nivelAtual >= MAX_NIVEL_BOTAO) return null;
  return CUSTOS_EVOLUCAO[Math.max(0, Math.floor(nivelAtual))] ?? null;
}

/** Custo total já investido num botão (para exibição/contabilidade). */
export function custoInvestido(nivelAtual: number): number {
  let total = 0;
  for (let i = 0; i < Math.min(nivelAtual, MAX_NIVEL_BOTAO); i++) {
    total += CUSTOS_EVOLUCAO[i] ?? 0;
  }
  return total;
}

export function podeEvoluir(
  niveis: NiveisBotoes,
  idx: number,
  saldoSov: number,
): { ok: boolean; custo: number | null; motivo?: string } {
  const nivel = niveis[idx] ?? 0;
  const custo = custoProximoNivel(nivel);
  if (custo === null) return { ok: false, custo: null, motivo: "Nível máximo" };
  // Compra é gasto voluntário: exige saldo (dívida só existe pela manutenção
  // de temporada — o jogador não se endivida para evoluir botão).
  if (saldoSov < custo) return { ok: false, custo, motivo: "SOV insuficiente" };
  return { ok: true, custo };
}

/** Devolve uma NOVA lista com o botão evoluído (sem mutar). */
export function evoluirBotao(niveis: NiveisBotoes, idx: number): NiveisBotoes {
  const next = normalizarNiveis(niveis);
  next[idx] = Math.min(MAX_NIVEL_BOTAO, (next[idx] ?? 0) + 1);
  return next;
}

/** Multiplicador de força do chute daquele botão (1.0 → 1.25 no nível 5). */
export function multTiro(nivel: number): number {
  const n = Math.max(0, Math.min(MAX_NIVEL_BOTAO, nivel));
  return 1 + n * 0.05;
}

/** Massa extra do botão (mais pesado: empurra mais e desvia menos). */
export function massaExtra(nivel: number): number {
  const n = Math.max(0, Math.min(MAX_NIVEL_BOTAO, nivel));
  return n * 0.07;
}

/** Bônus de força do time (power) = média dos níveis (0..+5). */
export function bonusForcaTime(niveis: NiveisBotoes): number {
  const n = normalizarNiveis(niveis);
  const soma = n.reduce((acc, v) => acc + v, 0);
  return Math.round((soma / TOTAL_BOTOES_LINHA) * 10) / 10;
}

/** Estrelas visuais do nível: "★★★☆☆". */
export function estrelasNivel(nivel: number): string {
  const n = Math.max(0, Math.min(MAX_NIVEL_BOTAO, Math.floor(nivel)));
  return "★".repeat(n) + "☆".repeat(MAX_NIVEL_BOTAO - n);
}

/** Chave idempotente do débito no ledger (retry/F5 nunca cobra duas vezes). */
export function chaveEvolucao(userId: string, idx: number, novoNivel: number): string {
  return `botao:${userId}:${idx}:n${novoNivel}`;
}
