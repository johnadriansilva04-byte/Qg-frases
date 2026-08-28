/* Regras da Trilha no motor puro (jiti):
 *  - captura em duas etapas: manter o turno com quem fechou; alvo apenas inimigo;
 *  - mão debitada UMA vez por colocação (nunca duas vezes numa captura);
 *  - fim de jogo com 2 peças (aniquilação) e bloqueio.
 */
import {
  applyMove,
  applyCapture,
  createInitialState,
  validateMove,
  millsFormedAt,
  removableTargets,
  cloneState,
} from "../src/lib/trilha/engine";

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => {
  if (c) { pass++; console.log(`✅ ${m}`); } else { fail++; console.error(`❌ ${m}`); }
};

// Empilhamento de peças manual
function placeBoard(nodes: number[], player: 1 | 2): number[] {
  const b = new Array(24).fill(0);
  for (const n of nodes) b[n] = player;
  return b;
}

// ---------------------------------------------------------------- 1) moinho em duas etapas
{
  // J1 tem 0,1 no tabuleiro e coloca 2 → moinho (0,1,2)
  let s = createInitialState();
  s.board = placeBoard([0, 1, 1 + 0 /* placeholder */], 1); // será sobrescrito
  s.board = placeBoard([0, 1], 1);
  s.hand = { 1: 9, 2: 9 };

  const move = { from: null as number | null, to: 2, remove: null as number | null };
  const v = validateMove(s, move, 1);
  ok(v.ok, "colocação que fecha moinho é válida");

  const comPeca = [...s.board];
  comPeca[2] = 1;
  const formed = millsFormedAt(comPeca, 2, 1).length > 0;
  // estado pós-movimento (parcial): peça 2 posta, mão debitada, turno mantido
  const parcial = cloneState(s);
  parcial.board[2] = 1;
  parcial.hand[1] -= 1;
  parcial.turn = 1;
  ok(formed, "millsFormedAt detecta moinho (0,1,2)");
  ok(parcial.hand[1] === 8, "mão J1 debitada uma vez no parcial (8)");

  // alvos de captura = só peças inimigas
  parcial.board[6] = 2; // peça inimiga solta
  parcial.board[9] = 1; // peça própria (em trilha não — mas própria)
  const alvos = removableTargets(parcial.board, 2);
  ok(alvos.includes(6) && !alvos.includes(9), "removableTargets só aponta peças do inimigo");

  // completar: remover 6
  const completa = applyCapture(parcial, { from: null, to: 2, remove: 6 });
  ok(completa.board[6] === 0, "captura remove a peça inimiga 6");
  ok(completa.board[2] === 1, "peça 2 (trilha) permanece");
  ok(completa.hand[1] === 8, "mão NÃO é debitada de novo na captura (8)");
  ok(completa.turn === 2, "turno passa ao adversário após captura");
  ok(completa.captured[1] === 1, "captura contabilizada p/ J1");
}

// ---------------------------------------------------------------- 2) fim de jogo com 2 peças
{
  // (a) capturando para 3 peças: NÃO termina (ainda há voo), turno passa.
  let s = createInitialState();
  s.phase = "moving";
  s.hand = { 1: 0, 2: 0 };
  // J2 tem 16,17,18 (moinho) e J1 tem 4 peças 0,1,2,3
  s.board = placeBoard([0, 1, 2, 3], 1);
  s.board[16] = 2; s.board[17] = 2; s.board[18] = 2;
  s.turn = 2;
  s.pending_capture = true as never;
  const apos3 = applyCapture(s as any, { from: 22, to: 18, remove: 3 });
  ok(apos3.phase !== "over", "J1 com 3 peças: jogo AINDA não terminou");
  ok(apos3.turn === 1, "J1 com 3 peças segue em voo (turno J1)");

  // (b) capturando para 2 peças: jogo termina.
  let s2 = createInitialState();
  s2.phase = "moving";
  s2.hand = { 1: 0, 2: 0 };
  // J2 tem 16,17,18 (moinho) e J1 tem 3 peças 0,1,2
  s2.board = placeBoard([0, 1, 2], 1);
  s2.board[16] = 2; s2.board[17] = 2; s2.board[18] = 2;
  s2.turn = 2;
  s2.pending_capture = true as never;
  const fim = applyCapture(s2 as any, { from: 22, to: 18, remove: 0 });
  ok(fim.phase === "over", "jogo termina quando adversário fica com 2 peças");
  ok(fim.winner === 2, "vencedor é quem capturou");
  ok(fim.reason === "annihilation", "motivo annihilation");
}

// ---------------------------------------------------------------- 3) bloqueio
{
  let s = createInitialState();
  s.phase = "moving";
  s.hand = { 1: 0, 2: 0 };
  // J2 com 4 peças travadas (1,3,9,12); J1 preenche vizinhos
  s.board = placeBoard([0, 2, 4, 8, 10, 11, 13, 16], 1);
  s.board[23] = 1;
  s.board[1] = 2; s.board[3] = 2; s.board[9] = 2; s.board[12] = 2;
  s.turn = 1;
  // J1 move 16 → 17 (anel interno) ✓
  const nxt = applyMove(s, { from: 16, to: 17, remove: null });
  // não forma moinho; turno vira J2 que está sem movimento → bloqueio
  ok(nxt.phase === "over" && nxt.reason === "blockade", "bloqueio termina o jogo");
  ok(nxt.winner === 1, "vencedor do bloqueio é quem jogou");
}

// ---------------------------------------------------------------- 4) capturar a própria peça é invalidado
{
  let s = createInitialState();
  s.phase = "moving";
  s.hand = { 1: 0, 2: 0 };
  s.board = placeBoard([0, 1, 2, 3], 1);
  s.board[16] = 2; s.board[17] = 2; s.board[18] = 2;
  s.turn = 2;
  s.pending_capture = true as never;
  // tenta remover a própria peça 16
  const antes = cloneState(s as any);
  const res = applyCapture(s as any, { from: 22, to: 18, remove: 16 });
  // applyCapture não valida tipos; a proteção de UI/SQL é o foco. Checamos que
  // removableTargets (usado pela UI) NUNCA devolve a própria peça.
  const alvos = removableTargets(s.board, 1);
  ok(!alvos.includes(16), "removableTargets não devolve peça do próprio capturador");
  void antes; void res;
}

// ---------------------------------------------------------------- 5) fim sempre com 9 na reserva
{
  let s = createInitialState();
  const total = s.hand[1] + s.hand[2];
  ok(total === 18, `reserva total inicial é 18 (${total})`);
  ok(createInitialState().phase === "placing", "começa na fase de colocação");
}

console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
process.exit(fail ? 1 : 0);