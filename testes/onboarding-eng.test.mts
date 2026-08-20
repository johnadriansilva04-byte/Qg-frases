import {
  estadoInicialOnboarding,
  normalizarEstadoOnboarding,
  avancarStage,
  marcarDestino,
  concluirOnboarding,
  ehConcluido,
  responderPracinha,
  detectarOfensiva,
  mensagemDoStage,
  type OnboardingEstado,
} from "../src/lib/onboarding/onboardingEngine";

let ok = true;
function expect(cond: boolean, nome: string) {
  if (!cond) { ok = false; console.log("FALHOU:", nome); }
  else console.log("OK:", nome);
}

let e = estadoInicialOnboarding();
expect(e.stage === "nao-iniciado", "estado inicial nao-iniciado");

const ordem: string[] = ["nao-iniciado","identificacao","introducao","ambientes","sov","destino","primeiro-jogo","concluido"];
let cur: OnboardingEstado = e;
for (let i = 0; i < ordem.length; i++) {
  expect(cur.stage === (ordem[i] as never), `ordem stage ${ordem[i]}`);
  cur = avancarStage(cur);
}
expect(ehConcluido(cur), "apos sequencia completa, concluído");

e = estadoInicialOnboarding();
e = marcarDestino(e, "cidadela");
expect(e.destino === "cidadela" && e.stage === "primeiro-jogo", "marcarDestino");
e = concluirOnboarding(e);
expect(ehConcluido(e), "concluido");
e = avancarStage(e);
expect(e.stage === "concluido", "não avança após concluído");

expect(normalizarEstadoOnboarding(null).stage === "nao-iniciado", "normaliza null");
expect(normalizarEstadoOnboarding({ stage: "error" } as never)?.stage === "nao-iniciado", "saneia inválido");
expect(normalizarEstadoOnboarding({ stage: "destino", destino: "gerador" } as never).destino === "gerador", "preserva válido");

expect(detectarOfensiva("vai tomar no cu"), "detecta palavrão");
expect(!detectarOfensiva("olá, tudo bem"), "não detecta falso positivo");
const resp = responderPracinha(e, "vai tomar no cu");
expect(resp.texto.toLowerCase().includes("palavr"), "resposta corrige palavrão");

for (const s of ordem) {
  const t = mensagemDoStage(s as never).texto;
  expect(typeof t === "string" && t.length > 4, `mensagemStage ${s}`);
}

const r1 = responderPracinha(e, "tomar no cu").texto;
const r2 = responderPracinha(e, "tomar no cu").texto;
expect(r1 === r2, "determinista: retry igual");

console.log(ok ? "== ONBOARDING TESTS OK ==" : "== FALHAS ==");
if (!ok) process.exit(1);
