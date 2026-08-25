/* E2E — vitrine pública de clubes: a conta de exposição ANUNCIA o clube que
 * possui (Jacu do Norte) e qualquer jogador vê o anúncio — no Mercado de
 * Clubes (carreira) E no Marketplace do celular.
 * DEPENDE da migration `clubes_venda.sql` aplicada em produção (SQL Editor).
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... node testes/e2e-vitrine-clube.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const ANON = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
if (!EMAIL || !SENHA) { console.error("defina E2E_EMAIL/E2E_PASSWORD"); process.exit(2); }

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`✅ ${m}`); } else { fail++; console.error(`❌ ${m}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = (page) => page.evaluate(() => document.body.innerText);
async function esperarTexto(page, regex, timeoutMs = 20000) {
  const ini = Date.now();
  while (Date.now() - ini < timeoutMs) {
    const t = await texto(page);
    if (regex.test(t)) return t;
    await sleep(400);
  }
  return texto(page);
}
async function clicarTexto(page, sel, txt, exato = false) {
  return page.evaluate((s, t, ex) => {
    const els = [...document.querySelectorAll(s)];
    const el = ex
      ? els.find((e) => e.innerText?.trim().toLowerCase() === t.toLowerCase())
      : els.find((e) => e.innerText?.toLowerCase().includes(t.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, sel, txt, exato);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 200)));

try {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  await sleep(400);
  await clicarTexto(page, "button, a, [role=button]", "Futebol");
  await esperarTexto(page, /Amistoso/i, 15000);
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1200);
  await page.evaluate((em, pw) => {
    const set = (inp, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const e = [...document.querySelectorAll("input")].find((i) => (i.placeholder ?? "").includes("email"));
    const p = document.querySelector("input[type=password]");
    if (e) set(e, em); if (p) set(p, pw);
  }, EMAIL, SENHA);
  await sleep(300);
  await clicarTexto(page, "button", "Entrar");
  await esperarTexto(page, /MEU CLUBE|AMISTOSO/i, 40000);

  const auth = await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = JSON.parse(localStorage.getItem(k));
        return { token: v?.access_token, uid: v?.user?.id };
      }
    }
    return {};
  });
  ok(!!auth.token, "token de sessão capturado");

  const rpc = async (nome, body = {}) => {
    const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.text() };
  };

  // 0) A migration está aplicada em produção?
  const probe = await rpc("cidadela_listar_clubes_a_venda");
  if (probe.status === 404) {
    fail++;
    console.error("❌ RPC cidadela_listar_clubes_a_venda não existe em produção.");
    console.error("   APLIQUE `supabase/migrations/clubes_venda.sql` no SQL Editor e rode de novo.");
    console.log(`\n⚠️ E2E VITRINE: ${pass} ok, ${fail} falhas (BLOQUEADO: migration pendente)`);
    process.exitCode = 1;
    await browser.close();
    process.exit(1);
  }
  ok(probe.status === 200, "migration clubes_venda.sql presente em produção");

  // 1) Clube da conta (100%): o dono_user_id tem que ser o da conta.
  const mapa = await rpc("cidadela_mapa_clubes");
  const meus = JSON.parse(mapa.body).filter((c) => c.dono_user_id === auth.uid);
  ok(meus.length > 0, `conta é dona de ${meus.length} clube(s): ${meus.map((c) => c.nome).join(", ")}`);
  const clube = meus[0];

  // 2) Anuncia por um preço redondo (deixa à venda para qualquer jogador).
  const PRECO = 250;
  const anuncio = await rpc("cidadela_anunciar_venda_clube", { p_clube_id: clube.clube_id, p_preco: PRECO });
  ok(anuncio.status === 200 && anuncio.body.includes("true"), `clube anunciado na vitrine por ${PRECO} SOV`);

  // 3) A vitrine pública lista o clube.
  const vitrine = JSON.parse((await rpc("cidadela_listar_clubes_a_venda")).body);
  const anunciado = vitrine.find((v) => v.clube_id === clube.clube_id);
  ok(!!anunciado && Number(anunciado.preco) === PRECO, `vitrine pública lista ${clube.nome} por ${PRECO} SOV`);

  // 4) UI — Mercado de Clubes (carreira) mostra o anúncio como "Seu anúncio".
  let noHub = false;
  for (let i = 0; i < 14 && !noHub; i++) {
    noHub = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHub) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    await sleep(1500);
  }
  ok(noHub, "hub da carreira");
  await sleep(1500);
  ok(await clicarTexto(page, "button", "Mercado de Clubes"), "Mercado de Clubes aberto");
  await esperarTexto(page, /Seus Clubes|Mercado de Clubes/i, 10000);
  await sleep(2000);
  const tMercado = await texto(page);
  ok(tMercado.includes("Clubes à venda") && tMercado.includes(clube.nome),
    "Mercado de Clubes mostra a vitrine com o clube da conta");
  ok(tMercado.includes("Seu anúncio") || tMercado.includes("Retirar da vitrine"),
    "anúncio marcado como da própria conta (com opção de retirar)");
  await page.screenshot({ path: ".e2e-shots/vitrine-mercado.png" });

  // 5) UI — o CELULAR (Marketplace) mostra o clube à venda.
  await clicarTexto(page, "button", "Voltar");
  await sleep(1000);
  const abriuCelular = await page.evaluate(() => {
    const b = document.querySelector("[data-tour=celular]") ??
      [...document.querySelectorAll("button")].find((x) => /celular/i.test(x.getAttribute("aria-label") ?? x.title ?? ""));
    if (b) { b.click(); return true; }
    return false;
  });
  ok(abriuCelular, "celular aberto");
  await sleep(1200);
  ok(await clicarTexto(page, "button, [role=button]", "Marketplace"), "app Marketplace aberto no celular");
  await sleep(2500);
  const tCelular = await texto(page);
  ok(tCelular.includes("Clubes à venda") && tCelular.includes(clube.nome),
    "celular mostra o clube à venda no Marketplace");
  await page.screenshot({ path: ".e2e-shots/vitrine-celular.png" });

  console.log(`\n${fail === 0 ? "🎉" : "⚠️"} E2E VITRINE: ${pass} ok, ${fail} falhas`);
  process.exitCode = fail ? 1 : 0;
} finally {
  await browser.close();
}
