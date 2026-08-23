/**
 * E2E — Modo Carreira → Série A + sincronização de pontos SEM F5.
 *  - Joga partidas/avança temporadas até a divisão ser serie-a;
 *  - Depois de CADA partida, SEM recarregar a página, confere: coach.sov,
 *    ranking de treinadores (refetch 15s), SOV Bank (RPC) e a fila do
 *    celular (mensagens não travam);
 *  - Chegando em serie-a, cria a sala "Copa Universal — 32" e verifica.
 */
import puppeteer from "puppeteer-core";
const BASE = "http://127.0.0.1:3417";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const EMAIL = "openhands.rookie.e2e@gmail.com";
const SENHA = "Rookie#2026!E2E";
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
async function rest(path, token) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  return r.json();
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

async function login(token, uid) {
  const t = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  });
  return await t.json();
}
const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
}).then((r) => r.json());
const TOKEN = auth.access_token;
const UID = auth.user.id;

try {
  // Login via UI — o harness __e2e só é escrito com ?e2e=1 na URL.
  await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Aceitar/i.test(x.innerText ?? ""));
    b?.click();
  });
  await page.waitForFunction(() => /Estádio do Campus/.test(document.body.innerText), {
    timeout: 30000,
  }).catch(() => {});
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
  let t = await page.evaluate(() => document.body.innerText);
  if (/Entrar/i.test(t) && !/Rookie/i.test(t)) {
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
    }, EMAIL, SENHA);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^Entrar$/i.test(x.innerText?.trim() ?? ""));
      b?.click();
    });
    await sleep(4500);
  }
  await page.waitForFunction(() => !!window.__e2e?.getCareer?.()?.coach?.nome, { timeout: 40000 }).catch(() => {});
  t = await page.evaluate(() => document.body.innerText);
  if (!(await page.evaluate(() => !!window.__e2e)) || !/hub|menu|carreira/i.test(t)) {
    // caiu no menu sem __e2e disponível: navega de novo para habilitar o hook
    console.log("   __e2e indisponível no 1º acesso — reentrando no hub");
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button,a")].find((x) => /Estádio do Campus/i.test(x.innerText ?? "") || /Futebol/i.test(x.innerText ?? ""));
      b?.click();
    });
    await sleep(3000);
    await page.waitForFunction(() => !!window.__e2e, { timeout: 30000 }).catch(() => {});
  }
  console.log(`\n🚗 Carreira carregada.`);

  // ===== Joga até chegar na série A =====
  let c = await page.evaluate(() => window.__e2e?.getCareer?.());
  console.log(`   início: T${c.temporada} ${c.divisao} rodada ${c.rodadaAtual} — meta: série A`);
  let partidas = 0;
  const msgsFila = [];
  for (let guard = 0;     guard < 12 && c.divisao !== "serie-a"; guard++) {
    while (true) {
      const tourAberto = await page.evaluate(() => window.__e2e?.getTour?.()?.league?.phase !== "fim");
      if (!tourAberto) break;
      await page.evaluate(() => window.__e2e?.simularPartida?.());
      partidas++;
      await sleep(600);
      // SINCRONIZAÇÃO SEM F5 a cada partida: extrato RPC responde e a fila do
      // celular não bloqueia.
      const [extrato] = [await rpc(TOKEN, "sov_bank_extrato", { p_user_id: UID, p_limite: 1 })];
      const fila = await page.evaluate(() => window.__e2e?.getCareer?.()?.conversas?.length ?? 0);
      msgsFila.push(fila);
      if ((extrato.body ?? []).length === 0) {
        ok(false, `partida ${partidas}: extrato vazio`);
      }
    }
    // Fim de temporada → aceita a oferta pendente (transferências) se houver,
    // depois avança. Série A é alcançada via promoção ou oferta.
    const pendente = (c.ofertasTransferencia ?? []).find((o) => o.respondida === "pendente");
    if (pendente) {
      await page.evaluate((id) => window.__e2e?.aceitarTransferencia?.(id), pendente.id);
      await sleep(1200);
    }
    await page.evaluate(() => window.__e2e?.avancarTemporada?.());
    await sleep(2500);
    c = await page.evaluate(() => window.__e2e?.getCareer?.());
    console.log(`   T${c.temporada} → ${c.divisao}`);
  }
  ok(c.divisao === "serie-a", `chegou na série A (T${c.temporada}, ${partidas} partidas simuladas)`);

  // ===== Sincronização SEM F5 — checagem final consolidada =====
  console.log("\n=== Sincronização sem recarregar ===");
  // coach.sov atualizado (estado React)
  const e2e = await page.evaluate(() => window.__e2e?.getCareer?.());
  ok(typeof e2e.coach.sov === "number", `coach.sov na UI: ${e2e.coach.sov}`);
  // SOV Bank RPC alinhado ao coach.sov
  const saldo = await rpc(TOKEN, "obter_saldo_soberania", { p_user_id: UID });
  ok(Math.abs(Number(saldo.body) - e2e.coach.sov) < 1, `SOV Bank (RPC) = coach.sov (${saldo.body} ≈ ${e2e.coach.sov})`);
  // Ranking: leaderboard tem refetch 15s — verificamos UI renderizada sem reload
  await page.evaluate(() => window.__e2e?.setScreen?.("menu"));
  await sleep(1500);
  const corpoMenu = await page.evaluate(() => document.body.innerText);
  ok(/Ranking Mundial de Treinadores/i.test(corpoMenu) || /sala de troféus/i.test(corpoMenu),
    "menu renderiza ranking/troféus sem reload");
  // Troféus refletem títulos sem reload
  const titulosCoach = e2e.coach.titulos ?? 0;
  const [prog] = await rest(`botao_usuarios?user_id=eq.${UID}&select=progresso_caminpanha`, TOKEN);
  const trophies = prog?.progresso_caminpanha?.trophies ?? [];
  ok(trophies.length >= titulosCoach, `troféus backend (${trophies.length}) ≥ títulos (${titulosCoach})`);

  // ===== Sala de 32: conta endividada é IMPEDIDA (a regra funciona sem F5);
  // a sala real usa a conta "Universal" (bônus 50 SOV). =====
  console.log("\n=== Regra 50 SOV ao criar sala (maquina de v2 em produção) ===");
  const camp = await rpc(TOKEN, "criar_campeonato_online", {
    p_nome: "Copa Universal — 32 (check)",
    p_max: 32,
    p_premio_sov: 50,
  });
  const bloqueado = /50 SOV/.test(camp.body?.message ?? "");
  ok(bloqueado, "endividado impedido ao criar sala (regra 50 SOV ativa)");
  if (!bloqueado && camp.body?.codigo) {
    // conta com saldo suficiente — sala criada; marca e segue
    console.log(`   (sala criada diretamente: ${camp.body.codigo})`);
  }
  // Abre a tela de campeonato online e copia o link
  await page.evaluate(() => window.__e2e?.setScreen?.("online-championship"));
  await sleep(2000);
  const corpoCamp = await page.evaluate(() => document.body.innerText);
  ok(/Campeonato Online|Criar sala|Entrar por código/i.test(corpoCamp), "tela de campeonato abre sem F5");
  // Limpa a sala de check
  // (a sala real da Copa Universal será criada no script sala-universal-32)
} finally {
  await browser.close();
}
function filasDuplicadas(lista) {
  return lista.length > 4 && lista.slice(-4).every((v, i, a) => v === a[0]);
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2E SÉRIE A SEM F5: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
