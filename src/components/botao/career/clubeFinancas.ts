/**
 * clubeFinancas — separação financeira CLUBE × TREINADOR (§10-§14 do dono).
 *
 * - O CLUBE tem caixa próprio (`clubeCaixa`): recebe a receita das partidas
 *   (pontos de resultado, bônus de título/classificação, premiação da Copa),
 *   paga a manutenção da temporada e o salário do treinador. Pode ficar
 *   NEGATIVO (dívida do clube — estado válido, o treinador continua).
 * - O TREINADOR tem dinheiro pessoal (`coach.sov`): recebe SALÁRIO a cada 10
 *   rodadas (sai do caixa do clube) e o que ganha em atividades pessoais
 *   (investimentos, narrativa, história). É dele que saem as evoluções de
 *   botões, compras de clubes e aportes na Bolsa.
 * - Os 3 pontos da vitória (e toda receita esportiva) são DO CLUBE — nunca
 *   caem direto na conta pessoal.
 * - Salário: a cada rodada múltipla de 10 (10, 20, 30...), valor por divisão,
 *   sai do caixa do clube → carteira pessoal. Idempotente por rodada.
 *
 * O LEDGER (user_wallets) continua sendo a fonte de verdade do TOTAL: todo
 * crédito/débito real de SOV passa por ele (teto de 200k intacto). O caixa do
 * clube é a contabilidade interna da carreira (JSONB): wallet = pessoal +
 * caixa. O salário é transferência interna (wallet não muda de total) — por
 * isso aparece como PAR de lançamentos no extrato (saída + entrada), nunca
 * como criação de dinheiro.
 *
 * Módulo PURO (sem alias `@/`) — testável com jiti.
 */

export interface TransacaoClube {
  id: string;
  tipo: "receita" | "despesa" | "salario";
  valor: number;
  descricao: string;
  rodada: number;
  temporada: number;
}

/** Salário por divisão, pago a cada 10 rodadas. */
export const SALARIO_POR_DIVISAO: Record<string, number> = {
  "serie-c": 10,
  "serie-b": 15,
  "serie-a": 25,
};

/**
 * RECEITA ESPORTIVA por partida (bilheteria + direitos + prêmio de rodada) —
 * multiplicador do placar em pontos. Clubes maiores têm torcida maior e
 * contratos melhores: a receita cresce com a divisão. Calibrado contra os
 * custos (manutenção + folha): um time que VENCE a maioria lucra; um time na
 * média paga as contas; um time em crise afunda (dívida real).
 */
export const RECEITA_MULT_POR_DIVISAO: Record<string, number> = {
  "serie-c": 5,
  "serie-b": 8,
  "serie-a": 12,
};

export function receitaDa(divisao: string, pontos: number): number {
  return pontos * (RECEITA_MULT_POR_DIVISAO[divisao] ?? RECEITA_MULT_POR_DIVISAO["serie-c"]!);
}

/**
 * Premiação de fim de temporada por posição: na escala da divisão, com
 * degrau real entre campeão, vice, top-4 e o resto. Alinhada aos custos
 * (manutenção + folha) para que uma temporada boa pague as contas e uma
 * temporada ruim deixe o clube no vermelho — sem quebrar sempre.
 */
export function premiacaoDa(divisao: string, posicao: number, campeaoBonus: number): number {
  const base = receitaDa(divisao, 10); // 10 "pontos" na escala da divisão
  if (posicao === 1) return campeaoBonus;
  if (posicao === 2) return Math.round(base * 1.5);
  if (posicao <= 4) return base;
  return Math.round(base * 0.5);
}

export const INTERVALO_SALARIO = 10;
export const MAX_EXTRATO_CLUBE = 60;

export function salarioDa(divisao: string): number {
  return SALARIO_POR_DIVISAO[divisao] ?? SALARIO_POR_DIVISAO["serie-c"]!;
}

/** A rodada paga salário? (10, 20, 30...) */
export function devePagarSalario(rodadaAtual: number): boolean {
  return rodadaAtual > 0 && rodadaAtual % INTERVALO_SALARIO === 0;
}

/** Id estável do lançamento de salário (idempotência — F5 não paga 2x). */
export function idSalario(temporada: number, rodada: number): string {
  return `salario-t${temporada}-r${rodada}`;
}

/** Chave idempotente do par de lançamentos do salário no ledger. */
export function chaveSalarioLedger(userId: string, temporada: number, rodada: number): string {
  return `salario:${userId}:t${temporada}:r${rodada}`;
}

function anexar(extrato: TransacaoClube[], tx: TransacaoClube): TransacaoClube[] {
  if (extrato.some((t) => t.id === tx.id)) return extrato;
  return [tx, ...extrato].slice(0, MAX_EXTRATO_CLUBE);
}

/** Receita do clube (resultado, título, premiação) → caixa + extrato. */
export function registrarReceitaClube(
  caixa: number,
  extrato: TransacaoClube[],
  valor: number,
  descricao: string,
  rodada: number,
  temporada: number,
): { caixa: number; extrato: TransacaoClube[] } {
  if (valor === 0) return { caixa, extrato };
  const tx: TransacaoClube = {
    id: `receita-t${temporada}-r${rodada}-${extrato.length}-${Math.round(valor * 100)}`,
    tipo: "receita",
    valor,
    descricao,
    rodada,
    temporada,
  };
  return { caixa: caixa + valor, extrato: anexar(extrato, tx) };
}

/** Despesa do clube (manutenção etc.) → caixa pode ficar negativo (dívida). */
export function registrarDespesaClube(
  caixa: number,
  extrato: TransacaoClube[],
  valor: number,
  descricao: string,
  rodada: number,
  temporada: number,
  id?: string,
): { caixa: number; extrato: TransacaoClube[] } {
  if (valor <= 0) return { caixa, extrato };
  const tx: TransacaoClube = {
    id: id ?? `despesa-t${temporada}-r${rodada}-${extrato.length}-${Math.round(valor * 100)}`,
    tipo: "despesa",
    valor: -valor,
    descricao,
    rodada,
    temporada,
  };
  return { caixa: caixa - valor, extrato: anexar(extrato, tx) };
}

/** Saneamento do JSONB: caixa é número (negativo = dívida, válido), extrato
 *  é array de lançamentos bem-formados, sem duplicatas por id. */
export function normalizarClubeFinancas(
  caixaBruto: unknown,
  extratoBruto: unknown,
): { caixa: number; extrato: TransacaoClube[] } {
  const caixa = Number.isFinite(Number(caixaBruto)) ? Number(caixaBruto) : 0;
  const extrato: TransacaoClube[] = [];
  const vistos = new Set<string>();
  if (Array.isArray(extratoBruto)) {
    for (const t of extratoBruto) {
      const tx = t as Partial<TransacaoClube>;
      if (!tx || typeof tx.id !== "string" || vistos.has(tx.id)) continue;
      if (!Number.isFinite(Number(tx.valor))) continue;
      vistos.add(tx.id);
      extrato.push({
        id: tx.id,
        tipo: tx.tipo === "despesa" || tx.tipo === "salario" ? tx.tipo : "receita",
        valor: Number(tx.valor),
        descricao: typeof tx.descricao === "string" ? tx.descricao : "",
        rodada: Number.isFinite(Number(tx.rodada)) ? Number(tx.rodada) : 0,
        temporada: Number.isFinite(Number(tx.temporada)) ? Number(tx.temporada) : 1,
      });
      if (extrato.length >= MAX_EXTRATO_CLUBE) break;
    }
  }
  return { caixa, extrato };
}
