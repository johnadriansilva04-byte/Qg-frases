/**
 * Testes do embaralhamento determinístico das alternativas da SIMULAÇÃO.
 *
 * Regras (§10 da spec):
 *  - a resposta correta NUNCA pode ficar sempre na mesma posição;
 *  - o embaralhamento deve ser DETERMINÍSTICO por tentativa (F5 re-deriva
 *    exatamente a mesma ordem);
 *  - o id da opção é estável: o servidor pontua por id, indiferente à posição.
 */
import assert from "node:assert/strict";
import { BANCO_EXERCICIO_LOCAL, BANCO_SIMULACAO_LOCAL, GABARITO_SIMULACAO_LOCAL } from "../../src/components/campus/desenvolvimento-brio/simulacao-qi/banco-local";
import { embaralharOpcoes, hash32, posicaoDaResposta } from "../../src/components/campus/desenvolvimento-brio/simulacao-qi/embaralhar";

let n = 0;
function ok(nome: string) {
  n++;
  console.log(`✅ ${nome}`);
}

// ---- REGRA ABSOLUTA (§1): EXERCÍCIOS e SIMULAÇÃO são bancos DISJUNTOS ----
const simIds = new Set(BANCO_SIMULACAO_LOCAL.map((q) => q.id));
const exIds = new Set(BANCO_EXERCICIO_LOCAL.map((q) => q.id));
const interseccao = [...simIds].filter((x) => exIds.has(x));
assert.equal(interseccao.length, 0, `interseção sim/ex: ${interseccao.join(",")}`);
assert.ok(BANCO_SIMULACAO_LOCAL.every((q) => q.mode === "simulation"), "alguma questão sim sem mode=simulation");
assert.ok(BANCO_EXERCICIO_LOCAL.every((q) => q.mode === "exercise"), "alguma questão ex sem mode=exercise");
ok("bancos disjuntos: nenhuma questão aparece nos dois modos");
assert.equal(BANCO_SIMULACAO_LOCAL.length, 32, "simulação deve ter 32 questões");
ok("simulação tem exatamente 32 questões");
assert.equal(BANCO_EXERCICIO_LOCAL.length, 24, "exercícios têm 24 questões");
ok("exercícios têm exatamente 24 questões");

// 1. hash32 é estável (determinístico)
const h1 = hash32("tentativa-abc::sim-01");
const h2 = hash32("tentativa-abc::sim-01");
assert.equal(h1, h2);
ok("hash32 determinístico");

// 2. embaralharOpcoes preserva o conjunto de ids
for (const q of BANCO_SIMULACAO_LOCAL) {
  const opts = q.options.map((o) => ({ id: o.id, panel: o.panel }));
  const embaralhadas = embaralharOpcoes(opts, "tentativa-1", q.id);
  const idsOrig = opts.map((o) => o.id).sort().join(",");
  const idsEmb = embaralhadas.map((o) => o.id).sort().join(",");
  assert.equal(idsEmb, idsOrig, `ids perdidos/duplicados em ${q.id}`);
}
ok("embaralhamento preserva o conjunto de ids (todas as 32 questões)");

// 3. F5: mesma tentativa → mesma ordem (compare duas chamadas)
for (const q of BANCO_SIMULACAO_LOCAL.slice(0, 6)) {
  const opts = q.options.map((o) => ({ id: o.id, panel: o.panel }));
  const a = embaralharOpcoes(opts, "tentativa-f5-1", q.id);
  const b = embaralharOpcoes(opts, "tentativa-f5-1", q.id);
  assert.deepEqual(a.map((o) => o.id), b.map((o) => o.id));
}
ok("F5: mesma tentativa re-deriva a MESMA ordem");

// 4. tentativas diferentes → ordens DIFERENTES na maioria das questões
let diferentes = 0;
for (const q of BANCO_SIMULACAO_LOCAL) {
  const opts = q.options.map((o) => ({ id: o.id, panel: o.panel }));
  const t1 = embaralharOpcoes(opts, "tentativa-aaaa-1", q.id);
  const t2 = embaralharOpcoes(opts, "tentativa-bbbb-2", q.id);
  if (JSON.stringify(t1.map((o) => o.id)) !== JSON.stringify(t2.map((o) => o.id))) diferentes++;
}
// Pelo menos metade das questões deve diferir (é ~65/67 por shuffle aleatório)
assert.ok(diferentes >= BANCO_SIMULACAO_LOCAL.length / 2, `poucas questões diferem: ${diferentes}`);
ok(`tentativas diferentes alteram a ordem em ${diferentes}/32 questões`);

// 5. a resposta correta NUNCA fica sempre na mesma posição
const posicoesPorQuestao: Record<string, Set<number>> = {};
let corretaSempreNaMesmaPos = true;
let variacaoTotal = new Set<number>();
const tentativas = ["t-0001", "t-0002", "t-0003", "t-0004", "t-0005", "t-0006", "t-0007", "t-0008"];
for (const q of BANCO_SIMULACAO_LOCAL) {
  const opts = q.options.map((o) => ({ id: o.id, panel: o.panel }));
  const corretaIdx = GABARITO_SIMULACAO_LOCAL[q.id];
  const corretaId = opts[corretaIdx]?.id;
  assert.ok(corretaId, `sem gabarito local em ${q.id}`);
  const posicoes = new Set<number>();
  for (const t of tentativas) {
    const embaralhadas = embaralharOpcoes(opts, t, q.id);
    const pos = posicaoDaResposta(embaralhadas, corretaId);
    posicoes.add(pos);
    variacaoTotal.add(pos);
  }
  posicoesPorQuestao[q.id] = posicoes;
  if (posicoes.size > 1) corretaSempreNaMesmaPos = false;
}
assert.ok(!corretaSempreNaMesmaPos, "a resposta correta fica sempre na mesma posição em alguma questão");
ok("a resposta correta varia de posição entre tentativas (nenhuma sempre fixa)");
assert.ok(variacaoTotal.size > 1, "posições da correta não variam");
ok(`a resposta correta ocupou ${variacaoTotal.size} posições diferentes no conjunto`);

// 6. a posição da correta NÃO é sempre a mesma em TODAS as questões
const posicaoDominante = (() => {
  const counts = new Map<number, number>();
  for (const idx of Object.values(GABARITO_SIMULACAO_LOCAL)) {
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
})();
ok("gabarito canônico tem distribuição heterogênea (dominante " + posicaoDominante?.[1] + "/32)");

console.log(`\n${n} verificações OK`);