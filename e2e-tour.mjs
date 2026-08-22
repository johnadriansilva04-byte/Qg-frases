// E2E real — tour completo da conta "IA Chapada" (puppeteer-core + chromium).
// Uso: node e2e-tour.mjs [url-base]
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:12000";
const EMAIL = "ia.chapada.e2e+campus@gmail.com";
const SENHA = "Chapada@2026!";
const NOME = "IA Chapada";
const TIME = "Chapada FC";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const erros = [];
page.on("console", (m) => {
  const t = m.text();
  if (/error|erro/i.test(t) && !/favicon|adsense|monetag|adsterra|Failed to load resource|WebGPU|webgpu/i.test(t)) {
    erros.push(t.slice(0, 180));
  }
});

async function shot(nome) {
  await page.screenshot({ path: `/tmp/e2e-${nome}.png` });
  log(`  📸 /tmp/e2e-${nome}.png`);
}

async function texto() {
  return await page.evaluate(() => document.body.innerText);
}

async function clicar(regex, { desc = "", tags = "button,a,[role=button]", maxFilhos = 14 } = {}) {
  const ok = await page.evaluate(
    ({ src, tags, maxFilhos }) => {
      const re = new RegExp(src, "i");
      const els = [...document.querySelectorAll(tags)].filter(
        (x) => re.test(x.textContent ?? "") && x.querySelectorAll("*").length < maxFilhos,
      );
      const el = els[els.length - 1];
      if (!el) return false;
      el.click();
      return true;
    },
    { src: regex.source, tags, maxFilhos },
  );
  log(`  ${ok ? "✅" : "⚠️ NÃO ACHOU"} clique: ${desc || regex}`);
  return ok;
}

async function digitar(selector, valor) {
  await page.waitForSelector(selector, { timeout: 8000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, valor, { delay: 12 });
}

async function estado(rotulo) {
  const t = (await texto()).slice(0, 260).replace(/\n+/g, " | ");
  log(`\n=== ${rotulo} ===\n${t}`);
}

/* ------------------------------- TOUR ---------------------------------- */

log("1) Acesso da conta", EMAIL);
await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(3500);
await clicar(/aceitar/i, { desc: "cookies" });
await sleep(400);
await clicar(/Futebol/, { desc: "card Futebol", tags: "button,a,[role=button],div", maxFilhos: 8 });
await sleep(3500);
await clicar(/MEU CLUBE|Minha conta/i, { desc: "Meu Clube / Conta", tags: "button,a,[role=button],div" });
await sleep(2500);
await clicar(/Não tenho conta|Criar conta/i, { desc: "modo cadastro" });
await sleep(1200);

await digitar('input[type="email"]', EMAIL);
await digitar('input[type="password"]', SENHA);
await page.evaluate(
  ({ nome, time }) => {
    const inputs = [...document.querySelectorAll("input.field-input")];
    const set = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      desc.set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    if (inputs[2]) set(inputs[2], nome);
    if (inputs[3]) set(inputs[3], time);
    if (inputs[4]) set(inputs[4], "CHA");
    if (inputs[5]) set(inputs[5], "10");
  },
  { nome: NOME, time: TIME },
);
await sleep(600);
await clicar(/^Criar conta$|Cadastrar/i, { desc: "submeter cadastro", tags: "button" });
await sleep(6000);

// Se a conta já existia (tour idempotente), cai no login.
let corpo = await texto();
if (/perfil falhou|já cadastrad|já existe|already registered|CRIAR CONTA/i.test(corpo)) {
  log("  conta já existia — alternando para login");
  await clicar(/Já tenho conta/i, { desc: "modo login" });
  await sleep(1200);
  await digitar('input[type="email"]', EMAIL);
  await digitar('input[type="password"]', SENHA);
  await clicar(/^Entrar$|^ENTRAR$/i, { desc: "submeter login", tags: "button" });
  await sleep(6000);
}
await estado("pós-acesso");
await shot("05-pos-acesso");

log("\n2) Profissão: Técnico de Futebol");
corpo = await texto();
if (/Quem é você na Cidadela/i.test(corpo)) {
  await clicar(/Técnico de Futebol/i, { desc: "profissão técnico", tags: "button", maxFilhos: 40 });
  await sleep(1500);
  // Card pode expandir antes de confirmar — botão interno "Escolher"
  await clicar(/Escolher|Confirmar|Assumir/i, { desc: "confirmar profissão", tags: "button", maxFilhos: 6 });
  await sleep(4000);
}
await estado("pós-profissão");
await shot("06-pos-profissao");

log("\n3) Coach setup (nome do treinador)");
corpo = await texto();
if (/treinador|técnico|Como te chamam/i.test(corpo)) {
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].filter((i) => i.type === "text" || !i.type);
    const el = inputs[0];
    if (el) {
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, "IA Chapada");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await clicar(/Confirmar|Continuar|Começar|Avançar|Assumir/i, { desc: "confirmar coach" });
  await sleep(4000);
}
await estado("pós-coach");
await shot("07-pos-coach");

log("\nErros de console:", erros.length ? erros : "nenhum");
await browser.close();
log("FIM PARCIAL");
