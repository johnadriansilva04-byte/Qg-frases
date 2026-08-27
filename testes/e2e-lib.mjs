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
