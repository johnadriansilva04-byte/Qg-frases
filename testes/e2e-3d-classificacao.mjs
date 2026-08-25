/* E2E — partida 3D (MODO JOGADOR) DEVE gravar EXATAMENTE como a 2D:
 * classificação (ligas), rodada, torneio, caixa do clube e carteira — tudo
 * coerente (Δcarteira == Δsnapshot) e sobrevivendo a F5.
 * Requer build servido em 127.0.0.1:3417 + E2E_EMAIL/E2E_PASSWORD.
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
async function clicarTexto(page, sel, txt) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((e) =>
      e.innerText?.toLowerCase().includes(t.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, sel, txt);
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
    coachSov: career.coach?.sov,
    clubeCaixa: career.clubeCaixa,
    ligasPlayed: gfLigas.filter((f) => f.played).length,
    tourPlayed: gfTour.filter((f) => f.played).length,
    ligasFase: ligas[div]?.phase,
    userRow: (ligas[div]?.groups?.[0]?.table ?? []).find((x) => x.teamId === tour.userTeamId) ?? null,
    cacheSov: rows[0]?.pontos_soberania,
  };
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 200)));

// Mock WebGL (o 3D roda headless sem GPU) — mesmo proxy do e2e-3d-headless.
await page.evaluateOnNewDocument(() => {
  const fakeGL = new Proxy({}, {
    get: (t, k) => {
      if (k === "getExtension") return () => null;
      if (k === "getParameter") return (p) => {
        if (p === 7938) return "WebGL 2.0 (Mock)";
        if (p === 35724) return "WebGL GLSL ES 3.00 (Mock)";
        if (p === 7937) return "MockRenderer";
        if (p === 7936) return "MockVendor";
        return 1;
      };
      if (k === "getContextAttributes") return () => ({});
      if (k === "isContextLost") return () => false;
      if (k === "getShaderPrecisionFormat") return () => ({ precision: 1, rangeMin: 1, rangeMax: 1 });
      if (k === "getProgramParameter" || k === "getShaderParameter") return () => true;
      if (k === "getProgramInfoLog" || k === "getShaderInfoLog") return () => "";
      if (k === "getShaderSource") return () => "";
      if (k === "getActiveUniform" || k === "getActiveAttrib") return () => ({ name: "", type: 0, size: 1 });
      if (k === "getUniformLocation") return () => ({});
      if (k === "getAttribLocation") return () => 0;
      if (/^create/.test(String(k))) return () => ({});
      if (k === "checkFramebufferStatus") return () => 36053;
      if (k === "getError") return () => 0;
      if (k === "readPixels") return () => {};
      if (k === "getSupportedExtensions") return () => [];
      if (k === "getString") return () => "Mock";
      if (k === "VERSION") return 7938;
      if (k === "SHADING_LANGUAGE_VERSION") return 35724;
      if (k === "RENDERER") return 7937;
      if (k === "VENDOR") return 7936;
      if (typeof k === "string" && k === k.toUpperCase()) return 1;
      return () => "";
    },
    set: () => true,
  });
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, attrs) {
    if (kind === "webgl2" || kind === "webgl" || kind === "experimental-webgl") return fakeGL;
    return orig.call(this, kind, attrs);
  };
});

try {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  await sleep(1200);
  await clicarTexto(page, "button, a, [role=button]", "Futebol");
  await sleep(2500);
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1500);
  await page.evaluate((em, pw) => {
    const set = (inp, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const e = [...document.querySelectorAll("input")].find((i) => (i.placeholder ?? "").includes("@"));
    const p = document.querySelector("input[type=password]");
    if (e) set(e, em); if (p) set(p, pw);
  }, EMAIL, SENHA);
  await sleep(300);
  await clicarTexto(page, "button", "Entrar");
  await sleep(12000);

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

  let noHub = false;
  for (let i = 0; i < 12 && !noHub; i++) {
    noHub = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHub) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    await sleep(2000);
  }
  ok(noHub, "hub da carreira visível");
  await sleep(2500);

  const antes = await estadoRemoto(auth.token, auth.uid);
  console.log("REMOTO ANTES:", JSON.stringify(antes));

  // Partida 3D: entra em campo no MODO JOGADOR.
  await page.click("[data-testid=entrar-em-campo]");
  await sleep(1000);
  ok(await clicarTexto(page, "button", "JOGADOR"), "modo JOGADOR (3D) escolhido");
  await sleep(4000);
  await esperarTexto(page, /INICIAR PARTIDA/i, 15000);
  await clicarTexto(page, "button", "INICIAR PARTIDA");
  await sleep(4000);
  ok(await page.evaluate(() => !!window.__engine3d), "engine 3D em campo");

  // Placar controlado 2×0: injeta a bola atrás da linha do gol adversário
  // (detecção real do engine: |x| > halfLength, |z| < goalHalfWidth,
  // y < goalHeight). Loop assíncrono — cede o rAF entre as injeções.
  const placar = await page.evaluate(
    () =>
      new Promise((res) => {
        const e = window.__engine3d;
        const me = e.players.find((p) => p.isControlled);
        const lado = me.side; // "home" | "away"
        const d = e.dir(lado); // direção de ataque do jogador controlado
        let gols = 0;
        const injetar = () => {
          if (gols >= 2) {
            res({ lado, score: { ...e.score } });
            return;
          }
          // Bola já cruzando a linha do gol que o jogador ataca.
          e.ball.owner = null;
          e.ball.lastToucher = me;
          e.ball.pos.set(d * 53.2, 0.11, 0);
          e.ball.vel.set(d * 20, 0, 0);
          const alvo = e.score[lado] + 1;
          const t0 = Date.now();
          const poll = setInterval(() => {
            if (e.score[lado] >= alvo) {
              clearInterval(poll);
              gols++;
              // espera o freeze do kickoff assentar antes do próximo gol
              setTimeout(injetar, 2000);
            } else if (Date.now() - t0 > 3000) {
              clearInterval(poll);
              injetar(); // o goleiro defendeu — tenta de novo
            } else if (e.freeze <= 0) {
              // reforça a trajetória enquanto o engine processa
              e.ball.owner = null;
              e.ball.lastToucher = me;
              e.ball.pos.set(d * 53.2, 0.11, 0);
              e.ball.vel.set(d * 20, 0, 0);
            }
          }, 120);
        };
        injetar();
      }),
  );
  console.log("placar 3D:", JSON.stringify(placar));
  ok((placar.score[placar.lado] ?? 0) >= 1, `gol registrado pelo engine (${JSON.stringify(placar.score)})`);

  await clicarTexto(page, "button", "Encerrar");
  await sleep(1500);
  ok(/FIM DE JOGO/i.test(await texto(page)), "tela de fim de jogo 3D");
  await clicarTexto(page, "button", "CONTINUAR");
  await sleep(3000);

  // Atravessa o pós-jogo até o hub (mesmo fluxo da 2D).
  let noHubDepois = false;
  for (let i = 0; i < 20 && !noHubDepois; i++) {
    const t = await texto(page);
    noHubDepois = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHubDepois) break;
    if (/CONTINUAR/i.test(t)) await clicarTexto(page, "button", "CONTINUAR");
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
  ok(noHubDepois, "voltou ao hub após a partida 3D");

  const drenou = await page.evaluate(async () => {
    if (window.__e2e?.aguardarFila) { await window.__e2e.aguardarFila(); return true; }
    return false;
  });
  if (!drenou) await sleep(12000);

  const depois = await estadoRemoto(auth.token, auth.uid);
  console.log("REMOTO DEPOIS:", JSON.stringify(depois));

  ok(depois.tourPlayed === antes.tourPlayed + 10 || depois.ligasFase !== "grupos",
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
  const deltaCache = (depois.cacheSov ?? 0) - (antes.cacheSov ?? 0);
  const deltaSnapshot =
    ((depois.coachSov ?? 0) + (depois.clubeCaixa ?? 0)) -
    ((antes.coachSov ?? 0) + (antes.clubeCaixa ?? 0));
  ok(Math.abs(deltaCache - deltaSnapshot) < 1,
    `coerência 3D: Δcarteira ${deltaCache} == Δsnapshot ${deltaSnapshot}`);
  const soma = (depois.coachSov ?? 0) + (depois.clubeCaixa ?? 0);
  ok(Math.abs((depois.cacheSov ?? 0) - soma) < 1,
    `invariante 3D: carteira ${depois.cacheSov} == pessoal ${depois.coachSov} + caixa ${depois.clubeCaixa}`);

  // F5 → persiste
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(4000);
  let noHubF5 = false;
  for (let i = 0; i < 16 && !noHubF5; i++) {
    noHubF5 = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHubF5) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    await sleep(1500);
  }
  ok(noHubF5, "hub após F5");
  const f5 = await estadoRemoto(auth.token, auth.uid);
  ok(f5.rodadaAtual === depois.rodadaAtual && f5.ligasPlayed === depois.ligasPlayed,
    `F5 preserva rodada ${f5.rodadaAtual} e ${f5.ligasPlayed} jogos de liga`);

  console.log(`\n${fail === 0 ? "🎉" : "⚠️"} E2E 3D→CLASSIFICAÇÃO: ${pass} ok, ${fail} falhas`);
  process.exitCode = fail ? 1 : 0;
} finally {
  await browser.close();
}
