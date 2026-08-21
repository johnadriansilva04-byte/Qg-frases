/**
 * Testes da torcida global (1.000.000, zero-sum) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-torcida.mts
 */
import {
  TOTAL_TORCEDORES,
  aplicarResultadoTorcida,
  aplicarTituloTorcida,
  bonusTorcida,
  distribuirTorcidaInicial,
  forcaEfetiva,
  garantirTorcida,
  mapaForcas,
  totalTorcedores,
  type ClubeBase,
} from "./src/components/botao/career/torcidaEngine";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

const clubes: ClubeBase[] = Array.from({ length: 61 }, (_, i) => ({
  id: `clube-${i}`,
  power: 30 + (i % 60),
}));

// 1) Distribuição inicial: soma EXATA e todos os clubes presentes.
const inicial = distribuirTorcidaInicial(clubes);
ok(Object.keys(inicial).length === 61, "61 clubes na distribuição inicial");
ok(totalTorcedores(inicial) === TOTAL_TORCEDORES, "soma inicial = 1.000.000 exatos");
ok(Object.values(inicial).every((t) => t.fans > 0), "nenhum clube nasce sem torcida");
ok(
  inicial["clube-59"]!.fans > inicial["clube-0"]!.fans,
  "clube mais forte começa com torcida maior",
);

// 2) Resultado: zero-sum, vencedor ganha, perdedor perde.
const antes = totalTorcedores(inicial);
const fansA0 = inicial["clube-10"]!.fans;
const fansB0 = inicial["clube-20"]!.fans;
const depois1 = aplicarResultadoTorcida(inicial, "clube-10", "clube-20", 2, 0);
ok(totalTorcedores(depois1) === antes, "vitória mantém o total (zero-sum)");
ok(depois1["clube-10"]!.fans > fansA0, "vencedor ganha torcedores");
ok(depois1["clube-20"]!.fans < fansB0, "perdedor perde torcedores");
ok(depois1["clube-10"]!.seq === 1 && depois1["clube-20"]!.seq === -1, "sequências atualizadas");

// 3) Goleada migra MAIS que vitória apertada.
const estA = distribuirTorcidaInicial(clubes);
const estB = distribuirTorcidaInicial(clubes);
aplicarResultadoTorcida(estA, "clube-1", "clube-2", 1, 0);
aplicarResultadoTorcida(estB, "clube-1", "clube-2", 4, 0);
ok(
  estB["clube-1"]!.fans > estA["clube-1"]!.fans,
  "goleada transfere mais torcedores que vitória magra",
);

// 4) Empate: ninguém despenca; total preservado.
const estE = distribuirTorcidaInicial(clubes);
const fansEmp = estE["clube-5"]!.fans;
aplicarResultadoTorcida(estE, "clube-5", "clube-6", 1, 1);
ok(totalTorcedores(estE) === TOTAL_TORCEDORES, "empate mantém o total");
ok(
  Math.abs(estE["clube-5"]!.fans - fansEmp) <= fansEmp * 0.01,
  "empate não causa perda significativa",
);

// 4b) Empate após sequência: quem vinha melhor arranha fatia simbólica.
const estES = distribuirTorcidaInicial(clubes);
aplicarResultadoTorcida(estES, "clube-30", "clube-31", 2, 0); // clube-30 fica com seq +1
const fans30 = estES["clube-30"]!.fans;
const fans31b = estES["clube-31"]!.fans;
aplicarResultadoTorcida(estES, "clube-30", "clube-31", 1, 1); // empate
ok(estES["clube-30"]!.fans > fans30, "empate favorece simbolicamente quem vinha de sequência");
ok(estES["clube-31"]!.fans < fans31b, "quem vinha pior cede a fatia simbólica");
ok(estES["clube-30"]!.seq === 0, "empate zera a sequência");
ok(totalTorcedores(estES) === TOTAL_TORCEDORES, "empate simbólico também é zero-sum");

// 5) Sequência de vitórias intensifica a migração.
const estSeq = distribuirTorcidaInicial(clubes);
for (let i = 0; i < 3; i++) aplicarResultadoTorcida(estSeq, "clube-7", "clube-8", 2, 1);
const fansAntes4 = estSeq["clube-7"]!.fans;
const fansPerdedor4 = estSeq["clube-8"]!.fans;
aplicarResultadoTorcida(estSeq, "clube-7", "clube-8", 2, 1);
const ganho4 = estSeq["clube-7"]!.fans - fansAntes4;
ok(ganho4 > fansPerdedor4 * 0.008, "sequência de vitórias amplifica a migração");
ok(estSeq["clube-7"]!.seq === 4, "sequência de vitórias acumula");

// 6) Título: campeão atrai de TODOS, zero-sum global.
const estT = distribuirTorcidaInicial(clubes);
const fansCamp0 = estT["clube-3"]!.fans;
aplicarTituloTorcida(estT, "clube-3");
ok(totalTorcedores(estT) === TOTAL_TORCEDORES, "título mantém o total (zero-sum)");
ok(estT["clube-3"]!.fans > fansCamp0, "campeão ganha torcedores com o título");
ok(
  Object.entries(estT)
    .filter(([id]) => id !== "clube-3")
    .every(([id, t]) => t.fans < inicial[id]!.fans),
  "todos os outros clubes cedem torcedores ao campeão",
);

// 7) Clube novo (time do usuário) entra sem quebrar a soma.
const estN = distribuirTorcidaInicial(clubes);
const comNovo = garantirTorcida(estN, [...clubes, { id: "custom", power: 75 }]);
ok(Boolean(comNovo["custom"]), "clube novo coberto");
ok(comNovo["custom"]!.fans > 0, "clube novo recebe torcida inicial");
ok(totalTorcedores(comNovo) === TOTAL_TORCEDORES, "entrada de clube novo é zero-sum");

// 8) 10 rodadas simuladas: invariante global + universo evolui.
let estR = distribuirTorcidaInicial(clubes);
let alterados = 0;
for (let rodada = 0; rodada < 10; rodada++) {
  for (let i = 0; i + 1 < clubes.length; i += 2) {
    const gh = Math.floor(Math.random() * 4);
    const ga = Math.floor(Math.random() * 4);
    estR = aplicarResultadoTorcida(estR, clubes[i]!.id, clubes[i + 1]!.id, gh, ga);
  }
  ok(totalTorcedores(estR) === TOTAL_TORCEDORES, `rodada ${rodada + 1}: total preservado`);
}
for (const c of clubes) if (estR[c.id]!.fans !== inicial[c.id]!.fans) alterados++;
ok(alterados > 40, `universo evolui sem o jogador (${alterados}/61 clubes mudaram)`);

// 9) Força efetiva: torcida é UMA variável (teto +6), nunca decide sozinha.
ok(bonusTorcida(0) === 0, "sem torcida, sem bônus");
ok(bonusTorcida(TOTAL_TORCEDORES / 10) === 6, "10% da população = bônus máximo +6");
ok(bonusTorcida(TOTAL_TORCEDORES) === 6, "bônus nunca passa de +6");
const fraca = forcaEfetiva(40, TOTAL_TORCEDORES, 3);
ok(fraca <= 49, `time fraco com TODA a torcida não vira forte (${fraca})`);
ok(forcaEfetiva(28, 0, -38) >= 28, "piso de força respeitado");
ok(forcaEfetiva(99, TOTAL_TORCEDORES, 38) <= 99, "teto de força respeitado");

// 10) mapaForcas cobre todos os clubes.
const mapa = mapaForcas(inicial, clubes);
ok(Object.keys(mapa).length === 61, "mapa de forças cobre o universo");
ok(
  Object.values(mapa).every((f) => f >= 28 && f <= 99),
  "todas as forças efetivas na faixa esportiva",
);

console.log(`\n🎉 ${passed} invariantes da torcida OK`);
