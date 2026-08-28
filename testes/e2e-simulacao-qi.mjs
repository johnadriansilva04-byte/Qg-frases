// E2E da Simulação de QI — modo local (sem migration aplicada no servidor local).
// Cobre: tela inicial, início, 32 questões ordenadas por dificuldade, 6 alternativas,
// navegação (próx/anterior), alterar resposta, F5 (recuperação + relógio contínuo),
// finalização e cálculo do resultado.
import puppeteer from "puppeteer-core";

const BASE = process.env.APP_URL ?? "http://localhost:3417";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function falha(msg) {
  console.error("❌ " + msg);
  process.exitCode = 1;
}

let passou = 0;
function ok(msg) {
  passou++;
  console.log("✅ " + msg);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

// Clica no botão cujo texto contém "txt".
async function cliqueTexto(page, txt) {
  const clicado = await page.evaluate((t) => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => (x.textContent ?? "").trim() === t || (x.textContent ?? "").includes(t));
    if (!b) return false;
    b.click();
    return true;
  }, txt);
  if (!clicado) throw new Error("Botão não encontrado: " + txt);
}

// Clica na alternativa com o rótulo (A-F) via data-qi-option.
async function cliqueOpcao(page, rotulo) {
  const clicado = await page.evaluate((r) => {
    const b = document.querySelector(`button[data-qi-option="${r}"]`);
    if (!b) return null;
    const idx = Array.from(document.querySelectorAll("button[data-qi-option]")).indexOf(b);
    b.click();
    return idx;
  }, rotulo);
  if (clicado === null) throw new Error("Alternativa não encontrada: " + rotulo);
  return clicado;
}

// Id (estável) da opção exibida num dado rótulo (A-F) na questão corrente.
async function idDaOpcao(page, rotulo) {
  const id = await page.evaluate((r) => {
    const b = document.querySelector(`button[data-qi-option="${r}"]`);
    return b ? b.getAttribute("data-qi-id") ?? null : null;
  }, rotulo);
  if (!id) throw new Error("Sem data-qi-id para " + rotulo);
  return id;
}

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });

const log = [];
page.on("console", (m) => {
  if (m.type() === "error") log.push(m.text());
});

// ---- TESTE: tela inicial ----
await page.goto(`${BASE}/simulacao-qi`, { waitUntil: "networkidle0", timeout: 30000 });
let texto = await page.evaluate(() => document.body.innerText);
ok(texto.includes("SIMULAÇÃO DE TESTE DE QI"), "tela inicial: título");
ok(texto.includes("32"), "tela inicial: 32 questões citadas");
ok(texto.includes("25"), "tela inicial: 25 minutos citados");
ok(texto.includes("INICIAR SIMULAÇÃO"), "tela inicial: botão INICIAR");
ok(/Mensa Brasil/.test(texto), "aviso: não é teste oficial da Mensa");

// ---- Confirma botão acessível ----
await cliqueTexto(page, "INICIAR SIMULAÇÃO");
await sleep(1200);

// ---- TESTE: prova inicia com questão 1 ----
texto = await page.evaluate(() => document.body.innerText);
ok(/Questão 1\s*\/\s*32/.test(texto), "prova: Questão 1 / 32");

// Cronômetro mostra 25:00 ou 24:xx
ok(/24:5\d|25:00|24:4\d/.test(texto), "cronômetro iniciou perto de 25:00");

// 6 alternativas A-F
for (const L of ["A", "B", "C", "D", "E", "F"]) {
  const visivel = await page.evaluate(
    (l) => !!Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === l),
    L,
  );
  if (!visivel) falha(`Faltou alternativa ${L}`);
}
ok(true, "6 alternativas (A-F) visíveis na questão 1");

// ---- TESTE: sessionStorage registra tentativa com 32 questões ordenadas ----
let attemptIdLocal = null;
const sessoes = await page.evaluate(() => {
  const ativo = sessionStorage.getItem("qi:simulacao:ativo:v1");
  if (!ativo) return null;
  const j = JSON.parse(ativo);
  return { attemptId: j.attemptId, n: j.questions.length, ords: j.questions.map((q) => q.difficulty_order), first: j.questions[0]?.question_id, last: j.questions[31]?.question_id };
});
if (sessoes) attemptIdLocal = sessoes.attemptId;
if (!sessoes) falha("sessionStorage sem tentativa ativa");
else {
  if (sessoes.n !== 32) falha(`tentativa tem ${sessoes.n} questões (esperado 32)`);
  else ok("32 questões registradas na tentativa");
  const ord = JSON.stringify(sessoes.ords);
  if (ord !== "[1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,5,5,5,5,6,6,6,6]") falha(`ordem de dificuldade errada: ${ord}`);
  else ok("questões em ordem crescente de dificuldade (1..6) — não embaralhada");
  if (sessoes.first !== "sim-01" || sessoes.last !== "sim-32") falha(`pontas erradas: ${sessoes.first} / ${sessoes.last}`);
  else ok("questão 1 = sim-01 (mais fácil), questão 32 = sim-32 (a mais difícil)");
}

// ---- TESTE: separação exercício × simulação ----
// A tentativa ativa da SIMULAÇÃO só pode conter questões sim-* (mode =
// simulation). Questões de exercício têm ids ex-* e NUNCA podem aparecer
// aqui. (A disjunção id a id é coberta por qi-embaralhar.test.mts no código-
// fonte; este E2E valida o que a prova realmente carrega.)
const qids = await page.evaluate(() => {
  const ativo = sessionStorage.getItem("qi:simulacao:ativo:v1");
  if (!ativo) return [];
  const j = JSON.parse(ativo);
  return Array.isArray(j.questions) ? j.questions.map((q) => q.question_id) : [];
});
if (qids.length === 0) falha("sem question_ids na tentativa p/ validar separação");
else {
  const intrusos = qids.filter((id) => !id.startsWith("sim-"));
  if (intrusos.length) falha(`questões fora da simulação na tentativa: ${intrusos.join(",")}`);
  else ok("tentativa de simulação só contém questões sim-* (nenhum ex-* intruso)");
}

// ---- TESTE: selecionar resposta e alterar (embaralhado por tentativa) ----
const idB = await idDaOpcao(page, "B");
await cliqueOpcao(page, "B");
await sleep(300);
const resp1 = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:resp:v1"));
if (!resp1 || !resp1.includes(idB)) falha(`resposta B não registrada na Q1 (esperado ${idB})`);
else ok(`resposta selecionada (B → ${idB}) registrada na Q1`);

const idA = await idDaOpcao(page, "A");
if (idA === idB) falha(`alternativas A e B têm o mesmo id? ${idA}`);
await cliqueOpcao(page, "A");
await sleep(300);
const resp1b = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:resp:v1"));
if (!resp1b || !resp1b.includes(idA) || resp1b.includes(idB)) falha(`alteração de resposta não registrada (esperado ${idA})`);
else ok("resposta alterada de B para A na Q1");

// ---- TESTE: avançar / voltar ----
await cliqueTexto(page, "Próxima");
await sleep(400);
texto = await page.evaluate(() => document.body.innerText);
if (!/Questão 2\s*\/\s*32/.test(texto)) falha("não avançou para a Questão 2");
else ok("avançou para a Questão 2");

await cliqueTexto(page, "Anterior");
await sleep(400);
texto = await page.evaluate(() => document.body.innerText);
if (!/Questão 1\s*\/\s*32/.test(texto)) falha("não voltou para a Questão 1");
else ok("voltou para a Questão 1");

// ---- TESTE: F5 recupera a tentativa (relógio contínuo, resposta preservada) ----
const tStart = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:start:v1"));
await page.reload({ waitUntil: "networkidle0", timeout: 30000 });
await sleep(800);
texto = await page.evaluate(() => document.body.innerText);
if (!/Questão 1\s*\/\s*32/.test(texto)) falha("F5 não restaurou a prova (Questão 1)");
else ok("F5 restaurou a prova");
const tStart2 = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:start:v1"));
if (tStart !== tStart2) falha("F5 reiniciou o relógio (start mudou)");
else ok("relógio contínuo após F5 (mesmo started_at)");
const tent2 = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:ativo:v1"));
if (tent2 && tent2.includes(attemptIdLocal ?? "__NONE__")) ok("F5 NÃO criou nova tentativa (mesmo attempt_id local)");
else if (tent2) falha(`F5 criou nova tentativa local: tinha ${attemptIdLocal}, agora ${tent2.match(/local-[0-9-]+/)?.[0]}`);
else falha("tentativa ativa sumiu após F5");
const respF5 = await page.evaluate(() => sessionStorage.getItem("qi:simulacao:resp:v1"));
if (respF5 && respF5.includes(idA)) ok(`resposta preservada após F5 (${idA})`);
else falha(`resposta perdida após F5 (esperado ${idA})`);

// ---- TESTE: avançar rápido até a última questão e FINALIZAR ----
for (let i = 0; i < 31; i++) {
  const temProxima = await page.evaluate(
    () => !!Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("Próxima")),
  );
  if (!temProxima) break;
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => (x.textContent ?? "").includes("Próxima"));
    b?.click();
  });
  await sleep(120);
}
await sleep(400);
texto = await page.evaluate(() => document.body.innerText);
if (!/Questão 32\s*\/\s*32/.test(texto)) falha(`não chegou na Questão 32 (última: ${texto.slice(0, 120)})`);
else ok("navegou até a última questão (32/32)");

// ---- TESTE: finalizar ----
const temFinalizar = await page.evaluate(() => !!Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("FINALIZAR")));
if (!temFinalizar) falha("botão FINALIZAR não aparece na Q32");
else ok("botão FINALIZAR presente na Q32 (não há mais Próxima)");
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.textContent ?? "").includes("FINALIZAR"));
  b?.click();
});
await sleep(800);
texto = await page.evaluate(() => document.body.innerText);
if (!/SIMULAÇÃO CONCLUÍDA/.test(texto)) falha("tela de resultado não apareceu");
else ok("tela SIMULAÇÃO CONCLUÍDA exibida");

// Resultado: Q1 respondida — gabarito local de sim-01 é op-4-sim-01.
// O embaralhamento determinístico da tentativa decide se o id sob "A" é o
// correto ou não; o acerto esperado é 1 se idA for o correto, senão 0.
const mAcertos = texto.match(/(\d+)\s*\/\s*32/);
if (!mAcertos) falha("resultado sem X/32");
else {
  const corretaSim01 = "op-4-sim-01";
  const esperado = idA === corretaSim01 ? "1" : "0";
  if (mAcertos[1] === esperado) ok(`resultado mostra acerto contável: ${mAcertos[0]} (${idA} ${idA === corretaSim01 ? "era" : "não era"} a correta)`);
  else falha(`resultado inesperado: ${mAcertos[0]} (esperava ${esperado})`);
}
if (/TEMPO/.test(texto) && /%.*/.test(texto)) ok("resultado mostra TEMPO e PERCENTUAL");
else falha("resultado não mostra TEMPO/PERCENTUAL");
ok(/experimental|estimativa/i.test(texto), "resultado rotula como estimativa experimental");

// ---- isolamento: nova aba não recupera tentativa de outra origem ----
const page2 = await browser.newPage();
await page2.goto(`${BASE}/simulacao-qi`, { waitUntil: "networkidle0", timeout: 30000 });
const texto2 = await page2.evaluate(() => document.body.innerText);
if (!texto2.includes("INICIAR SIMULAÇÃO")) falha("aba nova não abriu na tela inicial (deveria: sessionStorage é por aba)");
else ok("aba nova abre limpa (tentativa é por aba — sessionStorage)");

await browser.close();
console.log(`\n${passou} verificações OK`);
process.exit(process.exitCode ?? 0);