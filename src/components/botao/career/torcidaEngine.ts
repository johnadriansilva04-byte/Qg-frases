/**
 * torcidaEngine — Sistema global de torcedores do universo do campeonato.
 *
 * Regras (§5-§8 do prompt mestre):
 * - População TOTAL limitada: Σ fans de todos os clubes = TOTAL_TORCEDORES
 *   (1.000.000). Toda transferência é ZERO-SUM: um clube só ganha torcedores
 *   que saem de outro(s) clube(s). Nada é criado nem destruído.
 * - Funciona para TODOS os clubes (A/B/C, simulados ou não): cada partida
 *   disputada — real ou simulada — migra torcedores entre os dois clubes.
 * - A torcida é UMA variável de força (bônus 0..+6), somada à qualidade
 *   técnica (power base), forma recente e moral — nunca as substitui.
 *
 * Persistência: o estado vive em `CareerState.torcida` (JSONB da carreira) —
 * mesma persistência existente (persistCareer → Supabase), sobrevive a F5.
 *
 * Módulo PURO (sem imports com alias `@/`) — testável com jiti.
 */

export const TOTAL_TORCEDORES = 1_000_000;

export type TorcidaClube = {
  /** Torcedores atuais do clube (inteiro ≥ 0). */
  fans: number;
  /** Sequência: positivo = vitórias seguidas, negativo = derrotas seguidas. */
  seq: number;
};

export type TorcidaState = Record<string, TorcidaClube>;

/** Clube mínimo para distribuição: id + força técnica base. */
export interface ClubeBase {
  id: string;
  power: number;
}

/* ------------------------------------------------------------------------ */
/* Distribuição inicial                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Distribui a população total proporcionalmente à força dos clubes
 * (power² — clubes fortes começam com torcidas maiores, mas a cauda não zera).
 * A soma final é EXATAMENTE TOTAL_TORCEDORES (maior resto).
 */
export function distribuirTorcidaInicial(clubes: ClubeBase[]): TorcidaState {
  const pesos = clubes.map((c) => ({ id: c.id, peso: Math.max(1, c.power) ** 2 }));
  const somaPesos = pesos.reduce((acc, p) => acc + p.peso, 0) || 1;

  const brutos = pesos.map((p) => {
    const exato = (p.peso / somaPesos) * TOTAL_TORCEDORES;
    return { id: p.id, base: Math.floor(exato), resto: exato - Math.floor(exato) };
  });

  // Maior resto: distribui a diferença para fechar a soma exata.
  let falta = TOTAL_TORCEDORES - brutos.reduce((acc, b) => acc + b.base, 0);
  const ordenados = [...brutos].sort((a, b) => b.resto - a.resto);
  for (let i = 0; falta > 0 && ordenados.length > 0; i = (i + 1) % ordenados.length) {
    ordenados[i]!.base += 1;
    falta -= 1;
  }

  const estado: TorcidaState = {};
  for (const b of brutos) estado[b.id] = { fans: b.base, seq: 0 };
  return estado;
}

/** Soma total de torcedores (invariante do sistema). */
export function totalTorcedores(torcida: TorcidaState): number {
  return Object.values(torcida).reduce((acc, t) => acc + t.fans, 0);
}

/**
 * Garante que todos os clubes da lista existem no estado e que a soma global
 * é EXATAMENTE TOTAL_TORCEDORES. Clubes novos (ex.: time personalizado do
 * usuário) entram com uma fatia proporcional à força; depois o mapa inteiro
 * é renormalizado — o que também CURA estados degradados (entradas removidas
 * pela sanitização de dados corrompidos).
 */
export function garantirTorcida(torcida: TorcidaState, clubes: ClubeBase[]): TorcidaState {
  const faltantes = clubes.filter((c) => !torcida[c.id]);
  const somaAtual = totalTorcedores(torcida);
  if (faltantes.length === 0 && somaAtual === TOTAL_TORCEDORES) return torcida;

  const next: TorcidaState = Object.fromEntries(
    Object.entries(torcida).map(([id, t]) => [id, { ...t }]),
  );

  // Fatia de cada clube novo: mesma fórmula da distribuição inicial, limitada
  // a 5% do total por clube para não quebrar o pool.
  const alvo = Math.max(somaAtual, TOTAL_TORCEDORES);
  const somaPesos = clubes.reduce((acc, c) => acc + Math.max(1, c.power) ** 2, 0) || 1;
  for (const c of faltantes) {
    const fatia = Math.min(
      Math.round(alvo * 0.05),
      Math.max(1_000, Math.round(((Math.max(1, c.power) ** 2) / somaPesos) * alvo)),
    );
    next[c.id] = { fans: fatia, seq: 0 };
  }

  // Renormaliza o universo inteiro para o total EXATO (maior resto) — cura
  // estados degradados e absorve as fatias concedidas (zero-sum).
  const ids = Object.keys(next);
  const soma = ids.reduce((acc, id) => acc + next[id]!.fans, 0);
  if (soma <= 0 || ids.length === 0) return distribuirTorcidaInicial(clubes);
  const brutos = ids.map((id) => {
    const exato = (next[id]!.fans / soma) * TOTAL_TORCEDORES;
    return { id, base: Math.floor(exato), resto: exato - Math.floor(exato) };
  });
  let falta = TOTAL_TORCEDORES - brutos.reduce((acc, b) => acc + b.base, 0);
  const ordenados = [...brutos].sort((a, b) => b.resto - a.resto);
  for (let i = 0; falta > 0 && ordenados.length > 0; i = (i + 1) % ordenados.length) {
    ordenados[i]!.base += 1;
    falta -= 1;
  }
  for (const b of brutos) next[b.id]!.fans = b.base;
  return next;
}

/* ------------------------------------------------------------------------ */
/* Dinâmica por partida (zero-sum entre os dois clubes)                      */
/* ------------------------------------------------------------------------ */

/** Migra `qtd` torcedores de `de` para `para`, limitado ao saldo do doador. */
function migrar(torcida: TorcidaState, de: string, para: string, qtd: number): void {
  const doador = torcida[de];
  const receptor = torcida[para];
  if (!doador || !receptor || qtd <= 0) return;
  const real = Math.min(doador.fans, Math.round(qtd));
  doador.fans -= real;
  receptor.fans += real;
}

/**
 * Aplica o resultado de UMA partida à torcida dos dois clubes.
 * - Vitória: vencedor ganha % dos torcedores do perdedor (goleada amplifica).
 * - Derrota por diferença pequena: perde pouco; goleada sofrida: perde muito.
 * - Empate: migração simbólica mínima para o clube de melhor sequência.
 * - Sequências (≥3 vitórias/derrotas) intensificam a migração.
 * Sempre zero-sum: o total global não muda.
 */
export function aplicarResultadoTorcida(
  torcida: TorcidaState,
  homeId: string,
  awayId: string,
  golsHome: number,
  golsAway: number,
): TorcidaState {
  const h = torcida[homeId];
  const a = torcida[awayId];
  if (!h || !a) return torcida;

  const diff = golsHome - golsAway;
  if (diff === 0) {
    // Empate: quem VINHA de sequência melhor arranha uma fatia mínima do
    // outro (comparação ANTES de zerar as sequências).
    const seqH = h.seq;
    const seqA = a.seq;
    h.seq = 0;
    a.seq = 0;
    if (seqH > seqA) migrar(torcida, awayId, homeId, a.fans * 0.001);
    else if (seqA > seqH) migrar(torcida, homeId, awayId, h.fans * 0.001);
    return torcida;
  }

  const vencedorId = diff > 0 ? homeId : awayId;
  const perdedorId = diff > 0 ? awayId : homeId;
  const v = torcida[vencedorId]!;
  const p = torcida[perdedorId]!;
  const margem = Math.abs(diff);

  // Base: 0,6% da torcida do perdedor; goleada (margem ≥ 3): 1,5%.
  let taxa = margem >= 3 ? 0.015 : 0.006;
  // Margem intermediária (2 gols): leve acréscimo.
  if (margem === 2) taxa += 0.003;
  // Sequência de vitórias do vencedor intensifica; de derrotas do perdedor também.
  if (v.seq >= 2) taxa += 0.004;
  if (p.seq <= -2) taxa += 0.004;

  migrar(torcida, perdedorId, vencedorId, p.fans * taxa);

  // Atualiza sequências (vitória seguida acumula; derrota zera a do outro).
  v.seq = v.seq >= 0 ? v.seq + 1 : 1;
  p.seq = p.seq <= 0 ? p.seq - 1 : -1;
  return torcida;
}

/**
 * Bônus de título: o campeão atrai 2% de torcedores de TODOS os outros
 * clubes (proporcional à torcida de cada um) — zero-sum global.
 */
export function aplicarTituloTorcida(torcida: TorcidaState, campeaoId: string): TorcidaState {
  const campeao = torcida[campeaoId];
  if (!campeao) return torcida;
  for (const [id, t] of Object.entries(torcida)) {
    if (id === campeaoId) continue;
    const cota = Math.min(t.fans, Math.round(t.fans * 0.02));
    t.fans -= cota;
    campeao.fans += cota;
  }
  return torcida;
}

/* ------------------------------------------------------------------------ */
/* Torcida → força (UMA variável da composição, §7)                          */
/* ------------------------------------------------------------------------ */

/**
 * Bônus de força pela torcida: 0..+6 conforme a fatia do clube no total
 * (10% da população ≈ +6). Torcida maior ajuda, mas nunca decide sozinha.
 */
export function bonusTorcida(fans: number, total = TOTAL_TORCEDORES): number {
  if (total <= 0) return 0;
  return Math.min(6, Math.max(0, (fans / total) * 60));
}

/**
 * Força efetiva do clube = qualidade técnica (power base) + torcida + forma
 * recente (−3..+3, derivada da sequência) + bônus extra (ex.: moral do time
 * do usuário). Limitada à faixa esportiva do jogo (28..99).
 */
export function forcaEfetiva(
  powerBase: number,
  fans: number,
  seq: number,
  extra = 0,
  total = TOTAL_TORCEDORES,
): number {
  const forma = Math.max(-3, Math.min(3, seq));
  const bruta = powerBase + bonusTorcida(fans, total) + forma + extra;
  return Math.max(28, Math.min(99, Math.round(bruta * 10) / 10));
}

/** Mapa id → força efetiva para alimentar a simulação das rodadas. */
export function mapaForcas(
  torcida: TorcidaState,
  clubes: ClubeBase[],
  extras?: Record<string, number>,
): Record<string, number> {
  const total = totalTorcedores(torcida) || TOTAL_TORCEDORES;
  const mapa: Record<string, number> = {};
  for (const c of clubes) {
    const t = torcida[c.id];
    mapa[c.id] = t
      ? forcaEfetiva(c.power, t.fans, t.seq, extras?.[c.id] ?? 0, total)
      : c.power;
  }
  return mapa;
}
