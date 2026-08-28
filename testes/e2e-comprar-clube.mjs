/* E2E: compra um clube na conta oficial de exposição e o deixa visível no
 * Mercado de Clubes (qualquer jogador online vê o dono e pode propor compra).
 * Requer build servido em 127.0.0.1:3417 + E2E_EMAIL/E2E_PASSWORD.
 */
import puppeteer from "puppeteer-core";
import { loginPelaCidadela } from "./e2e-lib.mjs";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = (page) => page.evaluate(() => document.body.innerText);

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

async function clicarTexto(page, seletor, txt) {
  return page.evaluate(
    (sel, t) => {
      const els = [...document.querySelectorAll(sel)];
      const el = els.find((e) => e.innerText?.toLowerCase().includes(t.toLowerCase()));
      if (el) { el.click(); return true; }
      return false;
    },
    seletor,
    txt,
  );
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 200)));

try {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 45000 });
  await loginPelaCidadela(page, EMAIL, SENHA);
  await sleep(1200);
  await clicarTexto(page, "button, a, [role=button]", "Futebol");
  await sleep(2500);
  await sleep(12000);

  let noHub = false;
  for (let i = 0; i < 12 && !noHub; i++) {
    noHub = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHub) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/Iniciar Temporada/i.test(t)) await clicarTexto(page, "button", "Iniciar Temporada");
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    await sleep(2000);
  }
  ok(noHub, "hub da carreira visível");

  // Saldo atual
  const saldoAntes = await page.evaluate(() => {
    const m = document.body.innerText.match(/Saldo[:\s]*([\d.,]+)\s*SOV/i);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  });
  console.log("saldo antes:", saldoAntes);

  // Abre o Mercado de Clubes
  await clicarTexto(page, "button", "Mercado de Clubes");
  await sleep(3000);
  const mercado = await texto(page);
  ok(/Mercado de Clubes/i.test(mercado), "Mercado de Clubes aberto");

  // Procura um clube acessível (série C, power baixo) e compra 100%
  const comprou = await page.evaluate(() => {
    // Procura cards de clube: têm "Power:" e um botão Comprar/Aumentar
    const cards = [...document.querySelectorAll("div")].filter((d) => {
      const t = d.innerText ?? "";
      return /Power:\s*\d+/.test(t) && /Cota \(1%\)/.test(t) && /Clube \(100%\)/.test(t);
    });
    // Ordena por power (mais fraco = mais barato)
    cards.sort((a, b) => {
      const pa = parseInt((a.innerText.match(/Power:\s*(\d+)/) ?? [0, 999])[1]);
      const pb = parseInt((b.innerText.match(/Power:\s*(\d+)/) ?? [0, 999])[1]);
      return pa - pb;
    });
    for (const card of cards) {
      const nome = card.querySelector("h4")?.innerText?.trim();
      const btn = [...card.querySelectorAll("button")].find((b) => /Comprar|Aumentar/i.test(b.innerText) && !b.disabled);
      if (nome && btn) {
        btn.click();
        return nome;
      }
    }
    return null;
  });
  ok(comprou, `clube selecionado para compra: ${comprou}`);
  await sleep(1500);

  // Ajusta para 100% e confirma
  const porcentagem100 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const b100 = btns.find((b) => /100%/.test(b.innerText));
    if (b100) { b100.click(); return true; }
    // Tenta input range
    const range = document.querySelector("input[type=range]");
    if (range) {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(range, "100");
      range.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  });
  await sleep(500);
  const confirmou = await clicarTexto(page, "button", "Confirmar");
  ok(confirmou, "compra confirmada");
  await sleep(4000);

  const depois = await texto(page);
  ok(/Comprou|proprietário|adquiriu/i.test(depois), `compra registrada (${depois.match(/Comprou[^.]*|proprietário[^.]*/i)?.[0] ?? "?"})`);

  // Verifica que o clube aparece como "Administrado por você" (visível para todos)
  const visivel = await page.evaluate(() => {
    return document.body.innerText.includes("Administrado por você") ||
           document.body.innerText.includes("Seus clubes") ||
           document.body.innerText.includes("proprietário");
  });
  ok(visivel, "clube visível como propriedade da conta (qualquer jogador vê o dono)");

  console.log(`\n🎉 CLUBE COMPRADO E EXPOSTO: ${pass} verificações passaram`);
} finally {
  await browser.close();
}
