export const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
export const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
export const EMAIL = "openhands.rookie.e2e@gmail.com";
export const SENHA = "Rookie#2026!E2E";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function login(email = EMAIL, senha = SENHA) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
}
export async function rpc(token, nome, body = {}) {
  const hdr = { apikey: KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" };
  const j = await (await fetch(`${SUPA}/rest/v1/rpc/${nome}`, { method: "POST", headers: hdr, body: JSON.stringify(body) })).text();
  return JSON.parse(j || "{}");
}
export async function rest(path, token) {
  const hdr = { apikey: KEY, Authorization: `Bearer ${token}` };
  return (await fetch(`${SUPA}/rest/v1/${path}`, { headers: hdr })).json();
}
export async function abrirComSessao(page, url, token) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate((t) => {
    window.localStorage.setItem(
      "sb-hkzhksauilonqppipjyc-auth-token",
      JSON.stringify({ access_token: t, token_type: "bearer", expires_in: 3600, refresh_token: "", user: { id: "" } }),
    );
  }, token);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
}
export async function clicarTexto(page, seletor, texto) {
  return page.evaluate(
    (sel, t) => {
      const els = [...document.querySelectorAll(sel)];
      const alvo = els.find((e) => (e.innerText ?? "").toLowerCase().includes(t.toLowerCase()));
      if (alvo) {
        alvo.click();
        return true;
      }
      return false;
    },
    seletor,
    texto,
  );
}
export async function esperarTexto(page, regex, tent = 25, ms = 400) {
  for (let i = 0; i < tent; i++) {
    const b = await page.evaluate(() => document.body?.innerText ?? "");
    if (regex.test(b)) return b;
    await sleep(ms);
  }
  return page.evaluate(() => document.body?.innerText ?? "");
}

/** Preenche email/senha na página (AuthScreen) e clica no Entrar. */
export async function preencherLogin(page, email, senha) {
  await page.evaluate(
    (em, pw) => {
      const set = (inp, v) => {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        s.call(inp, v);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const e = [...document.querySelectorAll("input")].find((i) =>
        (i.placeholder ?? "").includes("@"),
      );
      const p = document.querySelector("input[type=password]");
      if (e) set(e, em);
      if (p) set(p, pw);
    },
    email,
    senha,
  );
  await sleep(300);
  await clicarTexto(page, "button", "Entrar");
}

/**
 * Login pela UI NA CIDADELA — o portão de conta. O Futebol não tem mais login
 * interno: sem sessão, a Cidadela abre o AuthScreen no hub.
 */
export async function loginPelaCidadela(page, email, senha) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Aceitar/i.test(x.innerText ?? ""));
    b?.click();
  });
  await page.waitForFunction(
    () => /Entrar|Criar conta|Estádio do Campus/.test(document.body.innerText),
    { timeout: 30000 },
  ).catch(() => {});
  const t0 = await page.evaluate(() => document.body.innerText);
  if (/Entrar|Criar conta/i.test(t0) && !/Bem-vindo de volta/i.test(t0)) {
    // Portão de login da Cidadela visível → loga pela conta existente.
    // (O botão "Não tenho conta" fica SEMPRE visível no modo login — ele
    // alterna para o CADASTRO; não clicamos nele aqui. Contas novas têm
    // fluxo próprio no e2e-carreira, que usa "Criar conta".)
    await preencherLogin(page, email, senha);
    await sleep(4000);
  }
  // Com sessão, a Cidadela mostra o hub com o card Futebol/Estádio.
  await page.waitForFunction(() => /Estádio do Campus/.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
  await sleep(500);
}
