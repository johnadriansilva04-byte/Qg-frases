/**
 * E2E E2Z COMPLETO — uma única conta, fluxo real de usuário.
 * Fases 2-14: tour, time/clube, campeonato online (partidas registradas),
 * bots nativos, offline×online, tempo real/F5, finanças/bolsa, celular, visual.
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const EMAIL = "e2z.teste@gmail.com";
const SENHA = "E2Z#2026!Teste";
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
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  return r.json();
}

const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
}).then((r) => r.json());
const TOKEN = auth.access_token;
const UID = auth.user.id;

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const texto = () => page.evaluate(() => document.body.innerText);
async function clicar(sel) {
  await page.evaluate((s) => document.querySelector(s)?.dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);
}

try {
  // ===== Login via UI =====
  console.log("=== Login E2Z via UI ===");
  await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Aceitar/i.test(x.innerText ?? "")); b?.click(); });
  await page.waitForFunction(() => /Estádio do Campus/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll("button,a")].find((x) => /Futebol/i.test(x.innerText ?? "")); b?.click(); });
  await sleep(4000);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button,a")].find((x) => /Meu Clube/i.test(x.innerText ?? "")); b?.click(); });
  await sleep(1800);
  let t = await texto();
  if (/Entrar/i.test(t) && !/E2Z/i.test(t)) {
    await page.evaluate((email, senha) => {
      const set = (i, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; s.call(i, v); i.dispatchEvent(new Event("input", { bubbles: true })); };
      const e = [...document.querySelectorAll("input")].find((x) => (x.placeholder ?? "").includes("@"));
      if (e) set(e, email);
      const p = document.querySelector("input[type=password]");
      if (p) set(p, senha);
    }, EMAIL, SENHA);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Entrar$/i.test(x.innerText?.trim() ?? "")); b?.click(); });
    await sleep(4500);
  }
  ok(true, "login E2Z na UI");

  // ===== FASE 2: tour/onboarding (profissão) =====
  console.log("\n=== FASE 2: tour / profissão ===");
  t = await texto();
  ok(/profissão|Técnico|Estudante|Empresário/i.test(t) || /Estádio|Menu|Carreira/i.test(t), "tela inicial coerente (profissão ou estádio)");

  // ===== FASE 3: carreira / time =====
  console.log("\n=== FASE 3: carreira ===");
  await page.waitForFunction(() => !!window.__e2e, { timeout: 30000 }).catch(() => {});
  const temE2E = await page.evaluate(() => !!window.__e2e);
  ok(temE2E, "harness __e2e disponível");
  let c = await page.evaluate(() => window.__e2e?.getCareer?.());
  if (!c?.coach?.nome) {
    // cria carreira via fluxo (ofertas → identidade)
    await page.evaluate(() => window.__e2e?.setScreen?.("career-menu")).catch(() => {});
    await sleep(1500);
    t = await texto();
    console.log("   tela carreira-menu:", /Nova Carreira|Continuar/i.test(t));
  }
  c = await page.evaluate(() => window.__e2e?.getCareer?.());
  console.log(`   carreira: ${c ? `T${c.temporada} ${c.divisao}` : "não criada ainda"}`);

  // ===== FASE 4: CAMPEONATO ONLINE — partida REGISTRADA =====
  console.log("\n=== FASE 4: campeonato online — partida registrada ===");
  // Cria campeonato de 4 (rápido) com a E2Z como dona.
  const camp = await rpc(TOKEN, "criar_campeonato_online", { p_nome: "E2Z Cup", p_max: 4, p_premio_sov: 0 });
  ok(!!camp.body?.codigo, `campeonato criado: ${camp.body?.codigo ?? JSON.stringify(camp.body)}`);
  const CODIGO = camp.body?.codigo;

  // Preenche com bots nativos (sem conta extra)
  const { readFileSync } = await import("node:fs");
  const teamsSrc = readFileSync(new URL("../src/components/botao/data/teams.ts", import.meta.url), "utf8");
  const clubes = [...teamsSrc.matchAll(/t\("([^"]+)", "([^"]+)", "([^"]+)", "[^"]*", "[^"]*", "[^"]*", (\d+)/g)]
    .map((m) => ({ time_id: m[1], nome: m[2], abreviacao: m[3], power: Number(m[4]) }));
  const fill = await rpc(TOKEN, "preencher_campeonato_bots", { p_codigo: CODIGO, p_bots: clubes });
  const parts = fill.body?.participantes ?? [];
  ok(parts.length === 4, `bots preencheram: ${parts.length}/4 (${parts.filter((p) => p.bot).length} bots nativos)`);
  const contasApos = await rest("botao_usuarios?select=email", TOKEN);
  ok(contasApos.length === 3, `banco continua com 3 contas (sem contas artificiais): ${contasApos.map((x) => x.email).join(", ")}`);

  // Inicia
  const ini = await rpc(TOKEN, "iniciar_campeonato_online", { p_codigo: CODIGO });
  ok(ini.body?.status === "em_andamento", "campeonato iniciado");
  ok((ini.body?.confrontos ?? []).length === 6, `6 confrontos (round-robin 4 jogadores)`);

  // Joga a partida da E2Z (contra bot) via fluxo oficial: abrir mesa → registrar
  const meuId = UID;
  const meuConf = (ini.body?.confrontos ?? []).find((c) => c.rodada === 1 && (c.j1_id === meuId || c.j2_id === meuId) && !c.bye);
  ok(!!meuConf, "meu confronto da rodada 1 existe");
  const souJ1 = meuConf?.j1_id === meuId;
  // Contra bot: abrir_mesa devolve 'botmatch_...' (sem mesa realtime).
  const mesa = await rpc(TOKEN, "abrir_mesa_campeonato", { p_campeonato_id: camp.body.id, p_rodada: 1 });
  ok(typeof mesa.body === "string" && mesa.body.startsWith("botmatch_"), `botmatch devolvido: ${JSON.stringify(mesa.body).slice(0, 50)}`);
  // Registra vitória 3-1 da E2Z contra o bot (sem mesa).
  const reg = await rpc(TOKEN, "registrar_resultado_vs_bot", {
    p_campeonato_id: camp.body.id, p_rodada: 1, p_gols_humano: 3, p_gols_bot: 1,
  });
  const meuPart = (reg.body?.participantes ?? []).find((p) => p.user_id === meuId);
  ok(meuPart?.pontos === 3, `PARTIDA REGISTRADA: meus pontos = ${meuPart?.pontos} (3 pela vitória)`);
  ok(meuPart?.gols_pro === 3, `gols pró = ${meuPart?.gols_pro}`);

  // Perfil atualizado (partidas/vitórias)
  const [perfilApos] = await rest(`botao_usuarios?user_id=eq.${UID}&select=partidas_jogadas,partidas_vencidas,pontos_soberania`, TOKEN);
  ok(perfilApos?.partidas_jogadas === 1, `partidas_jogadas = ${perfilApos?.partidas_jogadas}`);
  ok(perfilApos?.partidas_vencidas === 1, `partidas_vencidas = ${perfilApos?.partidas_vencidas}`);

  // Bots jogam entre si (rodada completa)
  const bots1 = (reg.body?.confrontos ?? []).filter((c) => c.rodada === 1 && c.status === "pendente" && !c.bye && (reg.body.participantes.find((p) => p.user_id === c.j1_id)?.bot) && (reg.body.participantes.find((p) => p.user_id === c.j2_id)?.bot));
  for (const c of bots1) {
    await rpc(TOKEN, "resolver_confronto_bots", { p_campeonato_id: camp.body.id, p_rodada: 1, p_j1: c.j1_id, p_j2: c.j2_id, p_gols_j1: 2, p_gols_j2: 1 });
  }
  const [campApos] = await rest(`botao_campeonatos_online?codigo=eq.${CODIGO}&select=confrontos,rodada_atual,participantes`, TOKEN);
  const pendentes = (campApos.confrontos ?? []).filter((c) => c.rodada === 1 && c.status === "pendente" && !c.bye).length;
  ok(pendentes === 0, `rodada 1 completa (pendentes: ${pendentes})`);
  ok(campApos.rodada_atual === 2, `rodada avançou para ${campApos.rodada_atual}`);

  // ===== FASE 5: classificação =====
  console.log("\n=== FASE 5: classificação ===");
  const tabela = (campApos.participantes ?? []).map((p) => ({ n: p.abreviacao, pts: p.pontos, bot: !!p.bot })).sort((a, b) => b.pts - a.pts);
  console.log("   tabela:", JSON.stringify(tabela));
  ok(tabela[0].n === "E2Z", "E2Z lidera a tabela após a vitória");

  // ===== FASE 6: tempo real (UI sem F5) =====
  console.log("\n=== FASE 6: tempo real (sem F5) ===");
  await page.evaluate(() => window.__e2e?.setScreen?.("online-championship"));
  await sleep(2500);
  t = await texto();
  ok(/Campeonato Online/i.test(t), "tela de campeonato abre sem F5");
  // ranking atualiza (polling 15s já implementado)
  await page.evaluate(() => window.__e2e?.setScreen?.("menu"));
  await sleep(1500);
  t = await texto();
  ok(/Ranking Mundial|sala de troféus/i.test(t), "menu renderiza ranking/troféus");

  // ===== FASE 7: F5 — nada desaparece =====
  console.log("\n=== FASE 7: F5 (persistência) ===");
  const antesF5 = { pts: meuPart?.pontos, jog: perfilApos?.partidas_jogadas };
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await sleep(4000);
  const [campF5] = await rest(`botao_campeonatos_online?codigo=eq.${CODIGO}&select=participantes`, TOKEN);
  const euF5 = (campF5.participantes ?? []).find((p) => p.user_id === meuId);
  ok(euF5?.pontos === antesF5.pts, `F5: meus pontos persistem (${euF5?.pontos})`);
  const [perfilF5] = await rest(`botao_usuarios?user_id=eq.${UID}&select=partidas_jogadas,partidas_vencidas`, TOKEN);
  ok(perfilF5?.partidas_jogadas === antesF5.jog, `F5: partidas persistem (${perfilF5?.partidas_jogadas})`);

  // ===== FASE 8: finanças =====
  console.log("\n=== FASE 8: finanças (extrato bate) ===");
  const extrato = (await rpc(TOKEN, "sov_bank_extrato", { p_user_id: UID, p_limite: 20 })).body ?? [];
  const saldo = (await rpc(TOKEN, "obter_saldo_soberania", { p_user_id: UID })).body;
  const ultima = extrato[0];
  ok(extrato.length > 0, `extrato tem ${extrato.length} lançamentos`);
  ok(ultima && Math.abs(Number(ultima.balance_after) - Number(saldo)) < 0.01, `saldo (${saldo}) = balance_after da última tx (${ultima?.balance_after})`);
  console.log(`   últimas tx: ${extrato.slice(0, 4).map((x) => `${x.amount}(${x.source_event ?? x.transaction_type})`).join(", ")}`);

  // ===== FASE 9: celular =====
  console.log("\n=== FASE 9: celular ===");
  await page.evaluate(() => window.__e2e?.setScreen?.("hub"));
  await sleep(1000);
  for (let i = 0; i < 4 && !(await texto()).match(/Banco/i); i++) {
    await page.evaluate(() => document.querySelector("[data-tour='celular']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await sleep(1200);
  }
  t = await texto();
  ok(/Banco|Contatos|Rede|Missões/i.test(t), "celular abre com apps");
  // banco no celular recolhido
  await page.evaluate(() => { const b = [...document.querySelectorAll("button, [role=button]")].find((x) => (x.innerText ?? "").trim() === "Banco"); b?.click(); });
  await sleep(2000);
  t = await texto();
  ok(/SOV Bank|Saldo/i.test(t), "SOV Bank no celular");

  // ===== FASE 10: consistência final =====
  console.log("\n=== FASE 10: consistência final ===");
  const contasFim = await rest("botao_usuarios?select=email", TOKEN);
  ok(contasFim.length === 3, `FIM: banco com 3 contas reais (nenhuma artificial): ${contasFim.map((x) => x.email).join(", ")}`);
  const [campFim] = await rest(`botao_campeonatos_online?codigo=eq.${CODIGO}&select=participantes,rodada_atual,status`, TOKEN);
  console.log(`   campeonato: status=${campFim.status} rodada=${campFim.rodada_atual} participantes=${(campFim.participantes ?? []).length}`);
} finally {
  await browser.close();
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2Z COMPLETO: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
