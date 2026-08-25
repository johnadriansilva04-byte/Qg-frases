/* Teste RUNTIME da cadeia de controles do motor 3D:
 *   tecla → InputSystem.move → inputParaVetor (código REAL do engine) → vetor
 *   no mundo, validado contra a câmera (frente = d·X, direita = d·Z).
 * Cobre o checklist do prompt: W/S/A/D, 4 diagonais, nos DOIS tempos (d=±1),
 * e o idle (soltar tudo → move zero).
 */
import { inputParaVetor } from "@/engine/MatchEngine";
import { InputSystem } from "@/engine/input";

// Stubs mínimos de browser para o InputSystem (window também captura
// handlers — o `blur` registrado nele precisa ser alcançável pelo teste).
const handlers: Record<string, (e?: unknown) => void> = {};
globalThis.window = {
  addEventListener: (t: string, fn: (e?: unknown) => void) => { handlers[t] = fn; },
  removeEventListener: () => {},
} as unknown as Window & typeof globalThis;

let pass = 0;
const ok = (cond, msg) => {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  pass++;
  console.log(`✅ ${msg}`);
};

// Alvo fake de teclado que captura os handlers registrados pelo InputSystem
const target = {
  addEventListener: (t: string, fn: (e?: unknown) => void) => { handlers[t] = fn; },
  removeEventListener: () => {},
};
const input = new InputSystem();
input.attachKeyboard(target);

const ev = (key) => ({ key, repeat: false, preventDefault() {} });
const pressionar = (...teclas: string[]) => {
  handlers.blur?.(); // limpa estado anterior
  for (const t of teclas) handlers.keydown(ev(t));
};
const soltar = (...teclas: string[]) => {
  for (const t of teclas) handlers.keyup(ev(t));
};

// Câmera: forward = d·X ⇒ right = forward × up = d·Z.
// Logo a expectativa de TELA é: W→+d·X, S→−d·X, D→+d·Z, A→−d·Z.
// O input normaliza diagonais (|v|=1 — velocidade constante em qualquer
// direção), então as diagonais esperadas usam o versor.
const N = Math.SQRT1_2;
const esperado = {
  w: (d) => ({ dx: d, dz: 0 }),
  s: (d) => ({ dx: -d, dz: 0 }),
  d: (d) => ({ dx: 0, dz: d }),
  a: (d) => ({ dx: 0, dz: -d }),
  "w+d": (d) => ({ dx: d * N, dz: d * N }),
  "w+a": (d) => ({ dx: d * N, dz: -d * N }),
  "s+d": (d) => ({ dx: -d * N, dz: d * N }),
  "s+a": (d) => ({ dx: -d * N, dz: -d * N }),
};

for (const d of [1, -1]) {
  for (const [combo, exp] of Object.entries(esperado)) {
    pressionar(...combo.split("+"));
    const mv = { ...input.move };
    const { dx, dz } = inputParaVetor(mv, d);
    const e = exp(d);
    ok(
      Math.abs(dx - e.dx) < 1e-9 && Math.abs(dz - e.dz) < 1e-9,
      `${combo.toUpperCase()} com d=${d} → mundo (${dx}, ${dz}) = tela esperada (${e.dx}, ${e.dz})`
    );
  }
}

// IDLE: soltar todas as teclas zera o vetor de movimento
pressionar("w", "d");
soltar("w", "d");
ok(input.move.x === 0 && input.move.y === 0, "soltar todas as teclas → move = (0,0) → idle");

input.dispose();
console.log(`\n${pass} verificações de controles 3D OK`);
