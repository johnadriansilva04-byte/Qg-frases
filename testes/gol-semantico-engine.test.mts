/**
 * Teste de runtime (jiti) — pipeline SEMÂNTICO de gol:
 *  - o ponto pertence ao lado ATACANTE do gol atingido (scoringSide),
 *    independentemente de quem chutou por último;
 *  - gol contra = último a tocar pertence ao lado QUE SOFREU o gol;
 *  - identificação do gol atingido é por POSIÇÃO (esquerda = gol do home,
 *    direita = gol do away), não por quem chutou;
 *  - troca de lados (home/away) preserva a semântica para os dois times.
 */
import { step, initialDiscs, FIELD, type Disc, type Side } from "../src/components/botao/engine/physics";

let passou = 0;
let falhou = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    passou++;
    console.log(`✅ ${msg}`);
  } else {
    falhou++;
    console.log(`❌ ${msg}`);
  }
}

/** Roda a física até um gol ou até esgotar; devolve acumulado semântico. */
function simularAteGol(discs: Disc[], maxPasses = 4000): {
  goal: Side | null;
  ownGoal: boolean;
  lastTouch: Side | null;
} {
  let lastTouch: Side | null = null;
  let ownGoal = false;
  let goal: Side | null = null;
  for (let i = 0; i < maxPasses; i++) {
    const r = step(discs);
    if (r.lastTouchSide) lastTouch = r.lastTouchSide;
    if (r.ownGoal) ownGoal = true;
    if (r.goal) {
      goal = r.goal;
      // Reclassificação semântica ACUMULADA (como o MatchView faz):
      const conceding: Side = r.goal === "home" ? "away" : "home";
      ownGoal = (lastTouch ?? r.goal) === conceding;
      break;
    }
  }
  return { goal, ownGoal, lastTouch };
}

function bolaEm(discs: Disc[], x: number, y: number) {
  const b = discs.find((d) => d.side === "ball");
  if (!b) throw new Error("sem bola");
  b.x = x;
  b.y = y;
  b.vx = 0;
  b.vy = 0;
  return b;
}
function botaoDo(discs: Disc[], side: Side, x: number, y: number, vx: number, vy: number) {
  const b = discs.find((d) => d.side === side && !d.keeper);
  if (!b) throw new Error(`sem botão ${side}`);
  b.x = x;
  b.y = y;
  b.vx = vx;
  b.vy = vy;
  return b;
}

function tirarTimes(discs: Disc[]) {
  for (const d of discs) {
    if (d.side === "ball") continue;
    d.x = d.side === "home" ? 60 : 940;
    d.y = d.id.endsWith("gk") ? FIELD.h - 55 : 55;
    d.vx = 0;
    d.vy = 0;
  }
}

// --------------------------------------------------------------------------
// 1) GOL NORMAL do away: bola cruza a trave da ESQUERDA = gol do home → away pontua
//    (times recolhidos nos cantos — lance isolado para provar o scoringSide)
// --------------------------------------------------------------------------
{
  const discs = initialDiscs();
  tirarTimes(discs);
  const b = bolaEm(discs, FIELD.w * 0.5, FIELD.h * 0.5);
  b.vx = -30; // bola voando para a ESQUERDA (gol do home)
  b.vy = 0;
  const r = simularAteGol(discs);
  ok(r.goal === "away", "1) bola dentro do gol esquerdo → away pontua (scoringSide=away)");
  ok(r.ownGoal === false, "1) sem toque dos defensores → NÃO é gol contra");
}

// 2) GOL NORMAL do home: bola cruza a trave da DIREITA = gol do away → home pontua
{
  const discs = initialDiscs();
  tirarTimes(discs);
  const b = bolaEm(discs, FIELD.w * 0.5, FIELD.h * 0.5);
  b.vx = 30; // bola voando para a DIREITA (gol do away)
  b.vy = 0;
  const r = simularAteGol(discs);
  ok(r.goal === "home", "2) bola dentro do gol direito → home pontua (scoringSide=home)");
  ok(r.ownGoal === false, "2) sem toque dos defensores → NÃO é gol contra");
}

// 3) GOL CONTRA do home: botão do HOME empurra a bola para DENTRO do próprio
//    gol (esquerda). O ponto é do away, e o autor é o home.
{
  const discs = initialDiscs();
  const b = bolaEm(discs, FIELD.margin + 60, FIELD.h * 0.5); // bola perto da trave esquerda
  // botão do home logo à DIREITA da bola, empurrando para a esquerda
  botaoDo(discs, "home", b.x + b.r + 30, FIELD.h * 0.5, -20, 0);
  const r = simularAteGol(discs);
  ok(r.goal === "away", "3) bola dentro do gol esquerdo → away pontua (mesmo o home tocando por último)");
  ok(r.ownGoal === true, "3) último a tocar foi o home (quem sofreu) → É gol contra");
  ok(r.lastTouch === "home", "3) autor semanticamente identificado = home");
}

// 4) GOL CONTRA do away: botão do AWAY empurra a bola para o próprio gol (direita).
{
  const discs = initialDiscs();
  const b = bolaEm(discs, FIELD.w - FIELD.margin - 60, FIELD.h * 0.5);
  botaoDo(discs, "away", b.x - b.r - 30, FIELD.h * 0.5, 20, 0);
  const r = simularAteGol(discs);
  ok(r.goal === "home", "4) bola dentro do gol direito → home pontua");
  ok(r.ownGoal === true, "4) último a tocar foi o away (quem sofreu) → É gol contra");
  ok(r.lastTouch === "away", "4) autor semanticamente identificado = away");
}

// 5) GOL NORMAL com toque do ATACANTE: home chuta com o último toque de home —
//    NÃO pode ser marcado como gol contra (bug anterior invertia a detecção).
{
  const discs = initialDiscs();
  const b = bolaEm(discs, FIELD.w - FIELD.margin - 60, FIELD.h * 0.5);
  // atacante do home à ESQUERDA da bola, empurrando para a direita (gol lá)
  botaoDo(discs, "home", b.x - b.r - 30, FIELD.h * 0.5, 20, 0);
  const r = simularAteGol(discs);
  ok(r.goal === "home", "5) bola dentro do gol direito → home pontua");
  ok(r.ownGoal === false, "5) último a tocar foi o próprio home (atacante) → NÃO é gol contra");
}

// 6) TROCA DE LADOS: mesma jogada com times invertidos preserva a semântica
//    (à esquerda agora defende o away) — para o AWAY não há como: o goleiro do
//    away é SEMPRE da direita no motor. O mapeamento time→lado é do chamador.
//    O que a prova aqui: o ponto do gol contra SEMPRE vai ao lado ATACANTE,
//    nunca ao último a tocar — quaisquer que sejam os times nos lados.
{
  const discs = initialDiscs();
  bolaEm(discs, FIELD.margin + 40, FIELD.h * 0.5);
  botaoDo(discs, "away", FIELD.margin + 40 + 80, FIELD.h * 0.5, -25, 0); // away invade o fundo esquerdo
  const r = simularAteGol(discs);
  ok(r.goal === "away", "6) bola dentro do gol esquerdo → away pontua");
  ok(r.ownGoal === false, "6) toque do atacante (away) → gol normal, não contra");
}

console.log(`\n== gol-semantico-engine: ${passou} OK / ${falhou} falhas ==`);
if (falhou > 0) process.exit(1);
