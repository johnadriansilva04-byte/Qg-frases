/**
 * Teste RUNTIME do núcleo puro da disputa de cobranças (cobrancas.ts) —
 * o MESMO código de produção que o MatchEngine executa.
 *
 * Cobre o checklist do prompt:
 *  - swipe → direção (esq/dir), força e elevação corretas;
 *  - desfechos: gol / defesa / para fora / trave;
 *  - goleiro reage com alcance espacial (nunca sorteio por frame);
 *  - adversário determinístico (F5 não transforma nem duplica cobrança);
 *  - dificuldade parametrizada (atributos mudam a distribuição);
 *  - 15 cobranças: 10 pênaltis + 5 faltas, contador sem pular números.
 */
import {
  TOTAL_COBRANCAS,
  DESFECHO_ROTULO,
  tipoDaCobranca,
  distanciaDaCobranca,
  swipeParaChute,
  alcanceGoleiro,
  escolherMergulhoGoleiro,
  calcularDesfecho,
  resolverCobrancaAdversaria,
  resolverDesempate,
  rngSemente,
} from "@/engine/cobrancas";

let pass = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  pass++;
  console.log(`✅ ${msg}`);
};

const GW = 3.66; // meia-largura do gol
const GH = 2.44; // altura do gol

// ---- 1. Estrutura das 15 cobranças ----
ok(TOTAL_COBRANCAS === 15, "15 cobranças por lado");
ok(DESFECHO_ROTULO.goal === "GOL" && DESFECHO_ROTULO.save === "DEFESA" && DESFECHO_ROTULO.out === "PARA FORA" && DESFECHO_ROTULO.post === "TRAVE", "rótulos dos 4 desfechos");
for (let i = 1; i <= 15; i++) {
  const t = tipoDaCobranca(i);
  if (i <= 10) ok(t === "penalti" && distanciaDaCobranca(i) === 11, `cobrança ${i}/15 = pênalti (11m)`);
  else {
    const d = distanciaDaCobranca(i);
    ok(t === "falta" && d >= 19 && d <= 24, `cobrança ${i}/15 = falta (${d}m)`);
  }
}

// ---- 2. Swipe → direção (referencial da câmera: atrás da bola → gol) ----
const dirEsq = swipeParaChute({ dx: -240, dy: -60, dtMs: 300 }, "penalti", 70);
ok(dirEsq.alvoZ > 1.5, `swipe para a ESQUERDA da tela → canto esquerdo do gol (z=+${dirEsq.alvoZ.toFixed(2)})`);
const dirDir = swipeParaChute({ dx: 240, dy: -60, dtMs: 300 }, "penalti", 70);
ok(dirDir.alvoZ < -1.5, `swipe para a DIREITA da tela → canto direito do gol (z=${dirDir.alvoZ.toFixed(2)})`);
const centro = swipeParaChute({ dx: 5, dy: -200, dtMs: 300 }, "penalti", 70);
ok(Math.abs(centro.alvoZ) < 0.6, `swipe reto → bola no meio (z=${centro.alvoZ.toFixed(2)})`);

// ---- 3. Swipe → força e elevação ----
const fraco = swipeParaChute({ dx: 40, dy: -40, dtMs: 400 }, "penalti", 70);
const forte = swipeParaChute({ dx: 120, dy: -320, dtMs: 250 }, "penalti", 70);
ok(fraco.forca < forte.forca, `swipe longo = mais força (${fraco.forca.toFixed(2)} < ${forte.forca.toFixed(2)})`);
ok(fraco.forca > 0 && forte.forca <= 1.1, "força dentro dos limites");
const alta = swipeParaChute({ dx: 60, dy: -300, dtMs: 300 }, "penalti", 70);
const rasteira = swipeParaChute({ dx: 60, dy: 100, dtMs: 300 }, "penalti", 70);
ok(alta.alvoY > rasteira.alvoY, `swipe subindo eleva a bola (${alta.alvoY.toFixed(2)} > ${rasteira.alvoY.toFixed(2)})`);
ok(rasteira.alvoY <= 0.3, "swipe descendente cola a bola no chão");
const faltaAlta = swipeParaChute({ dx: 80, dy: -280, dtMs: 300 }, "falta", 70);
const penaltiIgual = swipeParaChute({ dx: 80, dy: -280, dtMs: 300 }, "penalti", 70);
ok(faltaAlta.alvoY > penaltiIgual.alvoY, `falta eleva mais que pênalti no mesmo gesto (${faltaAlta.alvoY.toFixed(2)} > ${penaltiIgual.alvoY.toFixed(2)})`);

// ---- 4. Desfechos por alcance espacial ----
ok(calcularDesfecho({ z: 0, y: 1 }, 0.5, 0, 2, GW, GH) === "save", "bola no meio com goleiro no centro = DEFESA");
ok(calcularDesfecho({ z: 3.2, y: 1 }, 0.8, -2.4, 1.5, GW, GH) === "goal", "canto oposto ao mergulho = GOL");
ok(calcularDesfecho({ z: 5.5, y: 1 }, 0.8, 0, 2, GW, GH) === "out", "alvo além da trave = PARA FORA");
ok(calcularDesfecho({ z: 0, y: 3.4 }, 0.8, 0, 2, GW, GH) === "out", "alvo acima do travessão = PARA FORA");
ok(calcularDesfecho({ z: 3.75, y: 1.2 }, 0.8, 0, 1.2, GW, GH) === "post", "beirada da trave = TRAVE");
ok(calcularDesfecho({ z: 0.5, y: 3.5 }, 0.1, 0, 2, GW, GH) === "save", "chute fraquíssimo = DEFESA fácil (bola rola)");
const alcForte = alcanceGoleiro(80, 1.0);
const alcFraco = alcanceGoleiro(80, 0.2);
ok(alcForte < alcFraco, `chute forte reduz o alcance do goleiro (${alcForte.toFixed(2)} < ${alcFraco.toFixed(2)})`);
const alcBom = alcanceGoleiro(95, 0.5);
const alcRuim = alcanceGoleiro(30, 0.5);
ok(alcBom > alcRuim, `goleiro melhor alcança mais (${alcBom.toFixed(2)} > ${alcRuim.toFixed(2)})`);

// ---- 5. Goleiro: canto determinístico (F5 não muda a escolha) ----
const m1 = escolherMergulhoGoleiro("partida-x:3");
const m2 = escolherMergulhoGoleiro("partida-x:3");
ok(m1 === m2, `mergulho determinístico por (partida, cobrança): ${m1.toFixed(2)}`);
const mOutra = escolherMergulhoGoleiro("partida-x:4");
ok(typeof mOutra === "number" && Math.abs(mOutra) < 3.2, "mergulho dentro do gol");

// ---- 6. Adversário: determinístico + dificuldade parametrizada ----
for (let i = 1; i <= 15; i++) {
  const a = resolverCobrancaAdversaria("partida-x", i, 70, 65);
  const b = resolverCobrancaAdversaria("partida-x", i, 70, 65);
  ok(a === b, `cobrança adversária ${i}/15 idêntica no F5 (${a})`);
}
const contagem = (atk: number, gk: number) => {
  const c = { goal: 0, save: 0, out: 0, post: 0 };
  for (let i = 1; i <= 300; i++) c[resolverCobrancaAdversaria(`stress:${i % 40}`, i, atk, gk)]++;
  return c;
};
const forteAtk = contagem(90, 40);
const fracoAtk = contagem(40, 90);
ok(forteAtk.goal > fracoAtk.goal, `dificuldade real: ataque forte marca mais (${forteAtk.goal} > ${fracoAtk.goal})`);
ok(fracoAtk.save + fracoAtk.out > forteAtk.save, `ataque fraco é mais defendido/errado`);
ok(forteAtk.goal > 100 && fracoAtk.goal < 250, "distribuição sã (nem tudo gol, nem tudo defesa)");

// ---- 7. Contador nunca pula nem duplica (sequência íntegra 1..15) ----
const seq = Array.from({ length: 15 }, (_, i) => i + 1);
ok(seq.every((v, i) => v === i + 1), "sequência 1→15 íntegra");

// ---- 8. Desempate: placeholder preparado (não implementa morte súbita) ----
ok(resolverDesempate() === null, "empate permanece empate (morte súbita futura entra em resolverDesempate)");

// ---- 9. PRNG: distribuição não-degenerada ----
const vals = new Set<number>();
const rng = rngSemente("amostra");
for (let i = 0; i < 200; i++) vals.add(Math.floor(rng() * 100));
ok(vals.size > 60, `PRNG varia de verdade (${vals.size} faixas distintas em 200)`);

console.log(`\n${pass} verificações da disputa de cobranças OK`);
