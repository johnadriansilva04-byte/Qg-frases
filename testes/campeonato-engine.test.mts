import {
  configGrupos,
  distribuirGrupos,
  roundRobin,
  gerarFaseGrupos,
  pontosNoGrupo,
  classificarGrupo,
  selecionarClassificados,
  gruposCompletos,
  gerarMataMata,
  vencedorConfronto,
  avancarMataMata,
  estimarDuracaoMin,
  gerarAgenda,
  CONFIG_PADRAO,
} from "../src/components/botao/career/campeonatoEngine.ts";

let ok = 0, fail = 0;
function check(nome, cond) {
  if (cond) { ok++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
}
const ids = (n) => Array.from({ length: n }, (_, i) => `u${i + 1}`);
const fin = (c, pl1, pl2) => ({ ...c, pl_j1: pl1, pl_j2: pl2, status: "finalizado" });

console.log("\n— configGrupos (8/16/32) —");
check("8 → 2 grupos de 4", (() => { const c = configGrupos(8); return c.numGrupos === 2 && c.porGrupo === 4; })());
check("8 → 2 classif/grupo → semifinal+final", (() => { const c = configGrupos(8); return c.classificadosPorGrupo === 2 && c.fasesMataMata.join() === "semifinal,final"; })());
check("16 → 4 grupos de 4 → quartas+semi+final", (() => { const c = configGrupos(16); return c.numGrupos === 4 && c.fasesMataMata[0] === "quartas"; })());
check("32 → 8 grupos de 4 → oitavas+quartas+semi+final", (() => { const c = configGrupos(32); return c.numGrupos === 8 && c.fasesMataMata[0] === "oitavas"; })());

console.log("\n— distribuirGrupos / roundRobin —");
check("distribui 8 em 2 grupos de 4", distribuirGrupos(ids(8), 2).every((g) => g.length === 4));
check("serpente: todos os 8 alocados", new Set(distribuirGrupos(ids(8), 2).flat()).size === 8);
check("roundRobin 4 → 3 rodadas", roundRobin(ids(4)).length === 3);
check("roundRobin 4 → 2 pares/rodada", roundRobin(ids(4)).every((r) => r.length === 2));
check("roundRobin ímpar → bye (null)", roundRobin(["a","b","c"]).flat().flat().includes(null));

console.log("\n— gerarFaseGrupos —");
const fg8 = gerarFaseGrupos(ids(8));
check("8 → grupos A e B", new Set(fg8.map((c) => c.grupo)).size === 2);
check("cada grupo ocupa sua mesa", fg8.every((c) => c.mesa === c.grupo));
check("fase = grupos", fg8.every((c) => c.fase === "grupos"));
const fg32 = gerarFaseGrupos(ids(32));
check("32 → 8 grupos", new Set(fg32.map((c) => c.grupo)).size === 8);
check("32 → cada id joga 3x (grupo de 4)", (() => {
  const cont = {};
  fg32.forEach((c) => { if (!c.bye) { cont[c.j1_id]=(cont[c.j1_id]||0)+1; cont[c.j2_id]=(cont[c.j2_id]||0)+1; } });
  return Object.values(cont).every((v) => v === 3);
})());

console.log("\n— classificação / seleção —");
const grupos8 = distribuirGrupos(ids(8), 2);
const conf = fg8.map((c) => (c.bye ? c : fin(c, c.j1_id === "u1" ? 5 : 1, c.j2_id === "u1" ? 0 : 2)));
check("u1 lidera grupo A", classificarGrupo("A", grupos8[0], conf)[0] === "u1");
const sel = selecionarClassificados(grupos8, conf);
check("8 → 4 classificados", sel.length === 4);
check("classificados têm grupo+pos", sel.every((s) => s.grupo && s.pos >= 1));
check("grupos completos quando tudo finalizado", gruposCompletos(conf));
check("grupos incompletos se pendente", !gruposCompletos(fg8));

console.log("\n— mata-mata —");
const mm = gerarMataMata(sel, 10);
check("8 → semifinal com 2 jogos", mm.length === 2 && mm.every((c) => c.fase === "semifinal"));
check("mata-mata usa mesa Principal", mm.every((c) => c.mesa === "Principal"));
check("mata-mata sequencial (rodadas distintas)", new Set(mm.map((c) => c.rodada)).size === mm.length);
const mmF = mm.map((c, i) => fin(c, 3, 1)); // j1 vence ambos
const prox = avancarMataMata(mmF, 20);
check("avança para final", prox && prox.length === 1 && prox[0].fase === "final");
check("final: vencedores se enfrentam", prox[0].j1_id === vencedorConfronto(mmF[0]) && prox[0].j2_id === vencedorConfronto(mmF[1]));
check("final não avança mais", avancarMataMata(prox.map((c) => fin(c, 2, 0)), 30) === null);
check("não avança se fase incompleta", avancarMataMata(mm, 20) === null);

console.log("\n— duração / agenda —");
check("liga 8 ≈ 7 slots", estimarDuracaoMin(8, "liga", CONFIG_PADRAO) === 7 * 10);
// Duração real depende do slot (duracao+intervalo). Com o padrão (10 min),
// 32 em grupos não cabe em 90 — o sistema deve expor isso. Com slot curto
// (3+1=4 min, partida rápida), grupos 32 cabem. A config é explícita.
check("grupos 32 estoura 90 min com slot padrão (expõe duração real)", estimarDuracaoMin(32, "grupos", CONFIG_PADRAO) > 90);
check("grupos 32 cabe em 90 com slot curto (3+1)", estimarDuracaoMin(32, "grupos", { ...CONFIG_PADRAO, duracaoPartidaMin: 3, intervaloMin: 1 }) <= 90);
check("grupos 8 ≤ 60 min", estimarDuracaoMin(8, "grupos", CONFIG_PADRAO) <= 60);
const agenda = gerarAgenda(fg8.slice(0, 4), "2026-08-22T20:00:00Z", CONFIG_PADRAO);
check("agenda tem início ISO", agenda.every((a) => !isNaN(Date.parse(a.inicio))));
check("agenda: rodada 1 no início", agenda.filter((a) => a.rodada === 1).every((a) => a.inicio === "2026-08-22T20:00:00.000Z"));

console.log(`\n${ok}/${ok + fail} OK`);
process.exit(fail ? 1 : 0);
