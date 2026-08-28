/* E2E — compra de clube (100%) no Mercado de Clubes + continuidade pós-aquisição. */
import puppeteer from "puppeteer-core";
import { loginPelaCidadela } from "./e2e-lib.mjs";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`✅ ${msg}`);
  else { falhas++; console.log(`❌ ${msg}`); }
};

async function clicarTexto(page, seletor, texto) {
  return page.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll(sel)].find((e) =>
      e.innerText?.toLowerCase().includes(txt.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, seletor, texto);
}
const texto = (page) => page.evaluate(() => document.body.innerText);
async function esperarTexto(page, regex, timeoutMs = 20000) {
  const ini = Date.now();
  while (Date.now() - ini < timeoutMs) {
    if (regex.test(await texto(page))) return true;
    await sleep(400);
  }
  return false;
}
const career = (page) => page.evaluate(() => window.__e2e?.getCareer?.() ?? null);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=390,844", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => { falhas++; console.log("❌ pageerror:", String(e).slice(0, 160)); });

// Login (portão da Cidadela)
await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2", timeout: 60000 });
await loginPelaCidadela(page, EMAIL, SENHA);
await sleep(1000);

// Hub
await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2" });
await sleep(2500);
await esperarTexto(page, /Futebol/i, 20000);
await clicarTexto(page, "button, a, [role=button]", "Futebol");
await esperarTexto(page, /Carreira no Campus/i, 20000);
await clicarTexto(page, "button, a, [role=button]", "Carreira");
await sleep(2500);
for (let i = 0; i < 30; i++) {
  if (await career(page)) break;
  await sleep(500);
}
await clicarTexto(page, "button", "Continuar Campanha");
await sleep(4000);

const c0 = await career(page);
ok(!!c0, "carreira carregada no hub");
const saldo0 = c0.coach.sov;
console.log(`   💰 saldo pessoal antes: ${saldo0}`);

// Mercado de Clubes
await clicarTexto(page, "button", "Mercado de Clubes");
await esperarTexto(page, /Clube \(100%\)/i, 15000);
await sleep(2000);
const bodyMerc = await texto(page);
ok(!/5[0-9]{4}|9[0-9]{4}/.test(bodyMerc.match(/Clube \(100%\):\s*([\d.]+)/)?.[1] ?? ""), "preço de clube na escala do mercado (não mais ~52.000)");

// Escolhe o clube mais barato DISPONÍVEL (botão não desabilitado)
const alvo = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".grid > div")].filter((d) =>
    d.innerText?.includes("Clube (100%)"));
  let melhor = null;
  for (const c of cards) {
    const btn = c.querySelector("button");
    if (!btn || btn.disabled) continue;
    const m = c.innerText.match(/Clube \(100%\):\s*([\d.,]+)/);
    const nome = c.querySelector("h4")?.innerText ?? "";
    if (m) {
      const preco = Number(m[1].replace(/\./g, "").replace(",", "."));
      if (!melhor || preco < melhor.preco) melhor = { preco, nome };
    }
  }
  return melhor;
});
ok(!!alvo, `clube mais barato identificado (${alvo?.nome} por ${alvo?.preco} SOV)`);
// Participação atual nesse clube (pode já ter cotas de runs anteriores)
const partAnterior = await page.evaluate((nome) => {
  const cards = [...document.querySelectorAll(".grid > div")].filter((d) =>
    d.innerText?.includes("Clube (100%)"));
  const card = cards.find((c) => c.querySelector("h4")?.innerText === nome);
  const m = card?.innerText.match(/Sua participação:\s*([\d.,]+)%/);
  return m ? Number(m[1].replace(",", ".")) : 0;
}, alvo.nome);
const custoEsperado = ((100 - partAnterior) / 100) * alvo.preco;
ok(custoEsperado <= saldo0 + 1, `saldo ${saldo0} cobre o restante (${custoEsperado.toFixed(0)} = ${100 - partAnterior}%)`);

// Compra 100%
await page.evaluate((nome) => {
  const cards = [...document.querySelectorAll(".grid > div")].filter((d) =>
    d.innerText?.includes("Clube (100%)"));
  const card = cards.find((c) => c.querySelector("h4")?.innerText === nome);
  card?.querySelector("button")?.click();
}, alvo.nome);
await sleep(1200);
await page.evaluate(() => {
  const r = document.querySelector("input[type=range]");
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(r, r.max);
  r.dispatchEvent(new Event("input", { bubbles: true }));
  r.dispatchEvent(new Event("change", { bubbles: true }));
});
await sleep(800);
const bodyModal = await texto(page);
ok(/100%/.test(bodyModal), "modal com 100% selecionado");
await clicarTexto(page, "button", "Confirmar");
await sleep(6000);

const bodyPos = await texto(page);
ok(/Comprou 100%|PROPRIETÁRIO|Proprietário/i.test(bodyPos), "compra de 100% confirmada na UI");
await page.screenshot({ path: "/tmp/shot-20-clube-comprado.png" });

const c1 = await career(page);
const part = c1?.propriedadeClubes?.participacoes ?? {};
const minha = Object.values(part).find((p) => p.participacao >= 100);
ok(!!minha, `participação 100% persistida no snapshot (${minha?.clubeId})`);
const saldo1 = c1.coach.sov;
console.log(`   💰 saldo depois: ${saldo1} (gasto ${(saldo0 - saldo1).toFixed(0)})`);
ok(saldo1 < saldo0, "saldo pessoal debitado pela compra");
ok(Math.abs(saldo0 - saldo1 - custoEsperado) < 2, `débito ≈ custo esperado (${custoEsperado.toFixed(0)})`);

// F5 — persistência
await page.evaluate(() => window.__e2e?.aguardarFila?.());
await page.reload({ waitUntil: "networkidle2" });
await sleep(3500);
await esperarTexto(page, /Futebol/i, 20000);
await clicarTexto(page, "button, a, [role=button]", "Futebol");
await esperarTexto(page, /Carreira no Campus/i, 20000);
await clicarTexto(page, "button, a, [role=button]", "Carreira");
await sleep(2500);
for (let i = 0; i < 30; i++) {
  if (await career(page)) break;
  await sleep(500);
}
await clicarTexto(page, "button", "Continuar Campanha");
await sleep(4000);
const c2 = await career(page);
const part2 = c2?.propriedadeClubes?.participacoes ?? {};
ok(Object.values(part2).some((p) => p.participacao >= 100), "F5: propriedade do clube preservada");
ok(Math.abs(c2.coach.sov - saldo1) < 2, `F5: saldo pessoal preservado (${c2.coach.sov} ≈ ${saldo1})`);

// Vende 10% de volta — crédito deve entrar no pessoal (consistência venda)
const c2b = await career(page);
const saldoAntesVenda = c2b.coach.sov;
await clicarTexto(page, "button", "Mercado de Clubes");
await esperarTexto(page, /Seus Clubes/i, 15000);
await sleep(1500);
await clicarTexto(page, "button", "Vender");
await sleep(1200);
const temVender = await texto(page);
if (/Vender Cota|Venda de/i.test(temVender)) {
  await page.evaluate(() => {
    const r = document.querySelector("input[type=range]");
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    s.call(r, 10);
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(600);
  await clicarTexto(page, "button", "Confirmar");
  await sleep(5000);
  const cV = await career(page);
  const ganho = cV.coach.sov - saldoAntesVenda;
  ok(ganho > 0, `venda de 10% creditou o pessoal (+${ganho})`);
  const partV = Object.values(cV?.propriedadeClubes?.participacoes ?? {}).map((p) => p.participacao);
  ok(partV.some((p) => p === 90), `participação caiu para 90% (${partV})`);
} else {
  console.log("   (card de venda não abriu — verificando markup)");
  falhas++;
}

// Continua jogando depois da aquisição (3 rodadas)
let jogou = 0;
for (let r = 0; r < 3; r++) {
  const antes = await career(page);
  await page.evaluate(() => window.__e2e.simularPartida());
  await sleep(2500);
  const depois = await career(page);
  if ((depois?.rodadaAtual ?? 0) > (antes?.rodadaAtual ?? 0)) jogou++;
}
ok(jogou === 3, `carreira continua após a compra (${jogou}/3 rodadas)`);
const c3 = await career(page);
console.log(`   📊 pós-compra: T${c3.temporada} r${c3.rodadaAtual} pessoal=${c3.coach.sov} caixa=${c3.clubeCaixa}`);
await page.evaluate(() => window.__e2e?.aguardarFila?.());
await page.screenshot({ path: "/tmp/shot-21-pos-compra.png" });

await browser.close();
console.log(falhas === 0 ? "\n🎉 E2E COMPRA DE CLUBE: 0 falhas" : `\n💥 ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
