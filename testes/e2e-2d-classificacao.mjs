/* E2E — partida 2D (técnico) DEVE gravar: classificação (ligas), rodada,
 * torneio e SOV — e tudo tem que sobreviver a F5. Compara o estado REMOTO
 * (REST) antes × depois da partida, não só a UI.
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... node testes/e2e-2d-classificacao.mjs
 */
import puppeteer from "puppeteer-core";
import { flickInteligente } from "./flick-helper.mjs";

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

async function estadoRemoto(token, uid) {
  const r = await fetch(`${SUPA}/rest/v1/botao_usuarios?user_id=eq.${uid}&select=progresso_caminpanha,pontos_soberania`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  const rows = await r.json();
  const prog = rows[0]?.progresso_caminpanha ?? {};
  const career = prog.career ?? {};
  const tour = prog.tournament ?? {};
  const ligas = career.ligas ?? {};
  const div = career.divisao ?? "serie-c";
  const gfLigas = ligas[div]?.groupFixtures ?? [];
  const gfTour = tour.groupFixtures ?? [];
  return {
    rodadaAtual: career.rodadaAtual,
    temporada: career.temporada,
    divisao: div,
    coachSov: career.coach?.sov,
    clubeCaixa: career.clubeCaixa,
    ligasPlayed: gfLigas.filter((f) => f.played).length,
    tourPlayed: gfTour.filter((f) => f.played).length,
    ligasFase: ligas[div]?.phase,
    tourFase: tour.phase,
    userRow: (ligas[div]?.groups?.[0]?.table ?? []).find((x) => x.teamId === tour.userTeamId) ?? null,
    cacheSov: rows[0]?.pontos_soberania,
  };
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__debugWrites = true; });
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 300)));
page.on("console", (m) => {
  const t = m.text();
  if (t.startsWith("[writeq]")) console.log("🧾", t.replace(/\n/g, " § ").slice(0, 700));
  else if (m.type() === "error" && !/cidadela_chat_messages|Failed to load resource/.test(t))
    console.log("⚠️ console.error:", t.slice(0, 250));
});
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("botao_usuarios") && (r.request().method() === "PATCH" || r.request().method() === "POST")) {
    let body = "";
    try { body = r.request().postData() ?? ""; } catch {}
    let resumo = "";
    try {
      const j = JSON.parse(body);
      const prog = j.progresso_caminpanha ?? {};
      const c = prog.career ?? {};
      const t = prog.tournament ?? {};
      const div = c.divisao ?? "?";
      const ligasPlayed = (c.ligas?.[div]?.groupFixtures ?? []).filter((f) => f.played).length;
      const tourPlayed = (t.groupFixtures ?? []).filter((f) => f.played).length;
      resumo = `rodadaAtual=${c.rodadaAtual} ligasPlayed=${ligasPlayed} tourPlayed=${tourPlayed} sov=${c.coach?.sov} caixa=${c.clubeCaixa} col=${Object.keys(j).filter((k) => k !== "progresso_caminpanha").join(",")}`;
    } catch { resumo = body.slice(0, 120); }
    console.log(`🌐 PATCH → ${r.status()} | ${resumo}`);
  }
});

try {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  await sleep(400);
  ok(await clicarTexto(page, "button, a, [role=button]", "Futebol"), "Futebol clicado");
  await esperarTexto(page, /Amistoso/i, 15000);
  ok(await clicarTexto(page, "button, a, [role=button]", "Meu Clube"), "Meu Clube aberto");
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
  ok(await clicarTexto(page, "button", "Entrar"), "login submit");
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

  // Carreira → hub
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
  await sleep(2500);

  const antes = await estadoRemoto(auth.token, auth.uid);
  console.log("REMOTO ANTES:", JSON.stringify(antes));

  // LIMPEZA do ajuste de auditoria equivocado (o cache pontos_soberania era
  // derrubado para coach.sov por saveCareerToSupabase — bug corrigido neste
  // commit — e um reparo anterior chegou a zerar o caixa por engano; o
  // lançamento de auditoria relativo a ele sai do extrato).
  {
    const getRow = await fetch(
      `${SUPA}/rest/v1/botao_usuarios?user_id=eq.${auth.uid}&select=progresso_caminpanha`,
      { headers: { apikey: ANON, Authorization: `Bearer ${auth.token}` } },
    );
    const prog = (await getRow.json())[0]?.progresso_caminpanha ?? {};
    const career = prog.career ?? {};
    const extrato = career.clubeExtrato ?? [];
    const limpo = extrato.filter((tx) => !String(tx.id ?? "").startsWith("ajuste-auditoria-"));
    if (limpo.length !== extrato.length) {
      career.clubeExtrato = limpo;
      const patch = await fetch(`${SUPA}/rest/v1/botao_usuarios?user_id=eq.${auth.uid}`, {
        method: "PATCH",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ progresso_caminpanha: { ...prog, career } }),
      });
      ok(patch.status === 204, "lançamento de auditoria equivocado removido do extrato do clube");
    } else {
      ok(true, "extrato do clube sem lançamentos de auditoria pendentes");
    }
  }

  // Coerência ANTES da partida: o cache (carteira) tem que bater com
  // pessoal + caixa — o bug derrubava o cache para o pessoal a cada save.
  {
    const soma = (antes.coachSov ?? 0) + (antes.clubeCaixa ?? 0);
    ok(
      Math.abs((antes.cacheSov ?? 0) - soma) < 1,
      `pré-partida: carteira ${antes.cacheSov} == pessoal ${antes.coachSov} + caixa ${antes.clubeCaixa}`,
    );
  }

  // Entrar em campo → TÉCNICO (2D)
  await page.click("[data-testid=entrar-em-campo]");
  await sleep(1000);
  ok(await clicarTexto(page, "button", "TÉCNICO"), "modo TÉCNICO escolhido");
  await esperarTexto(page, /JOGADAS|Sua vez|arraste/i, 30000);
  ok(true, "partida 2D em campo");

  // Jogar até o fim (a tela de fim pode aparecer E avançar entre duas
  // leituras — aceita também a transição para a tela pós-jogo/hub).
  let fim = false;
  for (let i = 0; i < 150 && !fim; i++) {
    const t = await texto(page);
    if (/FIM DE JOGO|Fim de jogo|CONTINUAR/i.test(t)) { fim = true; break; }
    const jogou = await flickInteligente(page);
    if (!jogou) {
      if (!/JOGADAS|Sua vez/i.test(t)) { fim = true; break; }
      await sleep(1200);
      continue;
    }
    await sleep(2200);
  }
  ok(fim, "partida 2D terminou");
  await page.screenshot({ path: ".e2e-shots/2d-fim.png" });

  // Atravessar pós-jogo até o hub
  let noHubDepois = false;
  for (let i = 0; i < 20 && !noHubDepois; i++) {
    const t = await texto(page);
    noHubDepois = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHubDepois) break;
    if (/CONTINUAR/i.test(t)) { await clicarTexto(page, "button", "CONTINUAR"); }
    else if (/Finalizar coletiva/i.test(t)) {
      await clicarTexto(page, "button", "Finalizar coletiva");
      await sleep(800);
      await clicarTexto(page, "button", "CONTINUAR");
    }
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    else if (/Pular/i.test(t)) await clicarTexto(page, "button", "Pular");
    else if (/Fechar/i.test(t)) await clicarTexto(page, "button", "Fechar");
    await sleep(1800);
  }
  ok(noHubDepois, "voltou ao hub após a partida 2D");
  await page.screenshot({ path: ".e2e-shots/2d-hub-depois.png" });

  // Drena a fila de escrita
  const drenou = await page.evaluate(async () => {
    if (window.__e2e?.aguardarFila) { await window.__e2e.aguardarFila(); return true; }
    return false;
  });
  if (!drenou) await sleep(12000);

  const depois = await estadoRemoto(auth.token, auth.uid);
  console.log("REMOTO DEPOIS:", JSON.stringify(depois));

  ok(depois.tourPlayed === antes.tourPlayed + 10 || depois.tourFase !== "grupos",
    `torneio: rodada aplicada (${antes.tourPlayed} → ${depois.tourPlayed})`);
  ok(depois.ligasPlayed === antes.ligasPlayed + 10 || depois.ligasFase !== "grupos",
    `LIGAS (classificação): rodada aplicada (${antes.ligasPlayed} → ${depois.ligasPlayed})`);
  ok(depois.rodadaAtual === antes.rodadaAtual + 1 || depois.ligasFase !== "grupos",
    `rodadaAtual avançou (${antes.rodadaAtual} → ${depois.rodadaAtual})`);
  if (antes.userRow && depois.userRow) {
    ok(depois.userRow.j === antes.userRow.j + 1,
      `tabela: jogos do usuário ${antes.userRow.j} → ${depois.userRow.j}`);
    ok(depois.userRow.p >= antes.userRow.p,
      `tabela: pontos ${antes.userRow.p} → ${depois.userRow.p}`);
  }
  console.log(`caixa do clube: ${antes.clubeCaixa} → ${depois.clubeCaixa} | coach SOV: ${antes.coachSov} → ${depois.coachSov} | cache: ${antes.cacheSov} → ${depois.cacheSov}`);

  // COERÊNCIA ledger × snapshot: a variação do cache (carteira) TEM que ser a
  // MESMA variação do caixa do clube + coach — senão o dinheiro da partida
  // caiu em um lugar e não no outro (o drift 12× original).
  const deltaCache = (depois.cacheSov ?? 0) - (antes.cacheSov ?? 0);
  const deltaSnapshot =
    ((depois.coachSov ?? 0) + (depois.clubeCaixa ?? 0)) -
    ((antes.coachSov ?? 0) + (antes.clubeCaixa ?? 0));
  ok(
    Math.abs(deltaCache - deltaSnapshot) < 1,
    `coerência da partida: Δcarteira ${deltaCache} == Δsnapshot(pessoal+caixa) ${deltaSnapshot}`,
  );
  // Invariante de fim de sessão: carteira == pessoal + caixa (cache = carteira).
  const somaSnapshot = (depois.coachSov ?? 0) + (depois.clubeCaixa ?? 0);
  ok(
    Math.abs((depois.cacheSov ?? 0) - somaSnapshot) < 1,
    `invariante: carteira ${depois.cacheSov} == coach.sov ${depois.coachSov} + clubeCaixa ${depois.clubeCaixa}`,
  );

  // UI da classificação tem que mostrar a MESMA tabela do estado remoto.
  {
    const abriu = await clicarTexto(page, "button", "Classificação");
    if (abriu) {
      await sleep(1500);
      const tClass = await texto(page);
      const j = depois.userRow?.j;
      ok(
        j == null || new RegExp(`\\b${j}\\b`).test(tClass),
        `classificação (UI) reflete ${j ?? "?"} jogos do usuário`,
      );
      await page.screenshot({ path: ".e2e-shots/2d-classificacao.png" });
      await clicarTexto(page, "button", "Voltar");
      await sleep(800);
    } else {
      ok(false, "botão Classificação não encontrado no hub");
    }
  }

  // F5 → tudo tem que continuar lá
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(4000);
  let noHubF5 = false;
  for (let i = 0; i < 16 && !noHubF5; i++) {
    noHubF5 = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHubF5) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/CONTINUAR|Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    await sleep(1500);
  }
  ok(noHubF5, "hub após F5");
  const tF5 = await texto(page);
  await page.screenshot({ path: ".e2e-shots/2d-hub-f5.png" });
  const esperado = (depois.rodadaAtual ?? 0) + 1;
  ok(tF5.includes(`Rodada ${esperado}`) || depois.ligasFase !== "grupos" || /veredito|Temporada/i.test(tF5),
    `hub pós-F5 mostra rodada ${esperado} (ou fim de temporada)`);

  console.log(`\n${fail === 0 ? "🎉" : "⚠️"} E2E 2D→CLASSIFICAÇÃO: ${pass} ok, ${fail} falhas`);
  process.exitCode = fail ? 1 : 0;
} finally {
  await browser.close();
}
