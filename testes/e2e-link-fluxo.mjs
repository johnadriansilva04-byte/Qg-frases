import puppeteer from "puppeteer-core";
const BASE = "http://127.0.0.1:3417";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "✅" : "❌") + " " + msg); if (!cond) falhas++; };

async function rpc(token, nome, body) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function login(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
}
async function signup(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

/** Login via UI: Cidadela → Futebol → Meu Clube / Conta → Entrar. */
async function loginPelaUI(page, email, senha) {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Aceitar/i.test(x.innerText ?? ""));
    b?.click();
  });
  // Espera o hub terminar o loading (cards só existem depois).
  await page
    .waitForFunction(() => /Estádio do Campus/.test(document.body.innerText), { timeout: 30000 })
    .catch(() => {});
  await sleep(500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button,a")].find((x) => /Futebol/i.test(x.innerText ?? ""));
    b?.click();
  });
  await sleep(4500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button,a")].find((x) => /Meu Clube/i.test(x.innerText ?? ""));
    b?.click();
  });
  await sleep(1800);
  await page.evaluate((email, senha) => {
    const set = (i, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(i, v);
      i.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const e = [...document.querySelectorAll("input")].find((x) => (x.placeholder ?? "").includes("@"));
    if (e) set(e, email);
    const p = document.querySelector("input[type=password]");
    if (p) set(p, senha);
  }, email, senha);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Entrar$/i.test(x.innerText?.trim() ?? ""));
    b?.click();
  });
  await sleep(4500);
}
try {
  // Cria um campeonato pequeno via RPC (≤8 funciona mesmo sem a v2).
  const emailD = `e2e.link.${Date.now()}@gmail.com`;
  const dono = await signup(emailD, "Link#2026!E2E");
  await rpc(dono.token, "atualizar_perfil_clube", {
    p_uid: dono.uid, p_nome: "Dono Link", p_time: "Link FC", p_abreviacao: "LNK",
    p_cores: null, p_tatica: null, p_botoes: null,
  });
  await rpc(dono.token, "sov_bank_bonus_cadastro", { p_user_id: dono.uid });
  const camp = await rpc(dono.token, "criar_campeonato_online", { p_nome: "Link Test", p_max: 4 });
  const CODIGO = camp.body.codigo;
  ok(!!CODIGO, "campeonato de teste criado via RPC");

  // 1) Convidado SEM login: link ?camp= → tela de convite com profissão.
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page1.on("pageerror", (e) => console.log("PAGEERROR p1:", String(e).slice(0, 200)));
  await page1.goto(`${BASE}/cidadela?camp=${CODIGO}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(4000);
  let corpo = await page1.evaluate(() => document.body.innerText);
  ok(/Três clubes|clube você escolhe/i.test(corpo), "convidado sem login → tela de convite com clubes");
  // escolhe clube, nome+email, profissão → entra
  await page1.evaluate(() => {
    const b = [...document.querySelectorAll("[data-testid^='convite-oferta-']")];
    b[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(800);
  await page1.evaluate(() => {
    const set = (i, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(i, v);
      i.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set(document.querySelector("[data-testid='convite-nome']"), "Link Test");
    set(document.querySelector("[data-testid='convite-email']"), `e2e.linkconv.${Date.now()}@gmail.com`);
    const p = [...document.querySelectorAll("[data-testid^='convite-profissao-']")];
    p[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(800);
  const estadoBtn = await page1.evaluate(() => {
    const b = document.querySelector("[data-testid='convite-confirmar']");
    return { disabled: b?.disabled, txt: b?.innerText };
  });
  console.log("   botão confirmar:", JSON.stringify(estadoBtn));
  await page1.evaluate(() => {
    const b = document.querySelector("[data-testid='convite-confirmar']");
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(3000);
  const erroConvite = await page1.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((x) => /não foi possível|erro/i.test(x.innerText ?? "") && (x.innerText ?? "").length < 200);
    return el?.innerText ?? null;
  });
  if (erroConvite) console.log("   erro do convite:", erroConvite);
  await sleep(6000);
  corpo = await page1.evaluate(() => document.body.innerText);
  ok(/Campeonato Online|Criar sala|Aguardando|Classificação|Sua próxima partida/i.test(corpo),
    "após cadastro+profissão → cai DIRETO no Campeonato Online");
  if (!/Campeonato Online|Aguardando/i.test(corpo)) console.log("   trecho:", corpo.slice(0, 300));
  const url1 = page1.url();
  console.log(`   url final: ${url1}`);
  await page1.close();

  // 2) Jogador AUTENTICADO: link ?camp= → entra direto na sala (sem convite).
  const emailC = `e2e.linkauth.${Date.now()}@gmail.com`;
  const conv = await signup(emailC, "Auth#2026!E2E");
  await rpc(conv.token, "atualizar_perfil_clube", {
    p_uid: conv.uid, p_nome: "Auth Link", p_time: "Auth FC", p_abreviacao: "AUT",
    p_cores: null, p_tatica: null, p_botoes: null,
  });
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page2.on("pageerror", (e) => console.log("PAGEERROR p2:", String(e).slice(0, 160)));
  await loginPelaUI(page2, emailC, "Auth#2026!E2E");
  await page2.goto(`${BASE}/cidadela?camp=${CODIGO}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(7000);
  corpo = await page2.evaluate(() => document.body.innerText);
  ok(/Aguardando|Classificação|Campeonato Online|Iniciar campeonato|Preencher com Bots/i.test(corpo),
    "autenticado pelo link → cai DIRETO na sala do campeonato");
  if (!/Aguardando|Campeonato Online/i.test(corpo)) console.log("   trecho:", corpo.slice(0, 200));
  await page2.close();

  // 3) Amistoso: ?mesa= autenticado entra DIRETO na mesa.
  const dono2 = await login(emailD, "Link#2026!E2E");
  const mesa = await rpc(dono2.token, "criar_mesa_futebol", { p_time: "Link FC" });
  const MESA = mesa.body;
  ok(!!MESA, "mesa de teste criada");
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page3.on("pageerror", (e) => console.log("PAGEERROR p3:", String(e).slice(0, 160)));
  await loginPelaUI(page3, emailC, "Auth#2026!E2E");
  await page3.goto(`${BASE}/cidadela?mesa=${MESA}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(8000);
  corpo = await page3.evaluate(() => document.body.innerText);
  ok(/Mesas Online|Partida Online|Aguardando adversário|Chat|turno/i.test(corpo),
    "autenticado pelo link ?mesa= → cai DIRETO na mesa");
  if (!/Mesas Online|Partida Online|turno/i.test(corpo)) console.log("   trecho:", corpo.slice(0, 200));
  await page3.close();
} finally {
  await browser.close();
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2E LINK: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
