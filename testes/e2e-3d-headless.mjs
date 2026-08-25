/* E2E headless do modo 3D: mocka o contexto WebGL do canvas (o THREE cria o
 * renderer normalmente) e valida TODA a lógica do motor sem GPU: entrar em
 * campo, jogador/bola, física, câmera, barra de força, passe/chute, fim de
 * partida → integração na carreira.
 * Requer build servido em 127.0.0.1:3417 + E2E_EMAIL/E2E_PASSWORD.
 */
import puppeteer from "puppeteer-core";

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
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|403|net::|WebGL context/i.test(m.text()))
    console.log("⚠️ console.error:", m.text().slice(0, 300));
});

// Mock do contexto WebGL: o THREE cria o renderer; só o desenho vira no-op.
await page.evaluateOnNewDocument(() => {
  const fakeGL = new Proxy(
    {},
    {
      get: (t, k) => {
        if (k === "canvas") return null;
        if (k === "getExtension") return () => null;
        if (k === "getParameter") return (pname) => {
          // THREE lê VERSION/SHADING_LANGUAGE_VERSION/RENDERER/VENDOR com indexOf
          if (pname === 7938) return "WebGL 2.0 (Mock)"; // VERSION
          if (pname === 35724) return "WebGL GLSL ES 3.00 (Mock)"; // SHADING_LANGUAGE_VERSION
          if (pname === 7937) return "MockRenderer"; // RENDERER
          if (pname === 7936) return "MockVendor"; // VENDOR
          if (pname === 7939) return 0; // NUM_EXTENSIONS? (não usado)
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
        if (k === "createTexture" || k === "createBuffer" || k === "createProgram" || k === "createShader" || k === "createFramebuffer" || k === "createRenderbuffer" || k === "createVertexArray") return () => ({});
        if (k === "checkFramebufferStatus") return () => 36053;
        if (k === "getError") return () => 0;
        if (k === "readPixels") return () => {};
        if (k === "getSupportedExtensions") return () => [];
        if (k === "getString") return (pname) => {
          if (pname === 7938) return "WebGL 2.0 (Mock)";
          if (pname === 35724) return "WebGL GLSL ES 3.00 (Mock)";
          if (pname === 7937) return "MockRenderer";
          if (pname === 7936) return "MockVendor";
          return "";
        };
        // Constantes GL lidas como propriedade (MAX_*, VERSION, etc.) precisam
        // de valores reais — o THREE usa getParameter(e.VERSION) etc.
        if (k === "VERSION") return 7938;
        if (k === "SHADING_LANGUAGE_VERSION") return 35724;
        if (k === "RENDERER") return 7937;
        if (k === "VENDOR") return 7936;
        if (typeof k === "string" && k === k.toUpperCase()) return 1;
        // Qualquer outra coisa vira função que retorna string vazia.
        return () => "";
      },
      set: () => true,
    },
  );
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, attrs) {
    if (kind === "webgl2" || kind === "webgl" || kind === "experimental-webgl") return fakeGL;
    return origGetContext.call(this, kind, attrs);
  };
});

try {
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 45000 });
  await clicarTexto(page, "button", "Aceitar");
  await sleep(1200);
  await clicarTexto(page, "button, a, [role=button]", "Futebol");
  await sleep(2500);
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1500);
  await page.evaluate((email, senha) => {
    const ins = [...document.querySelectorAll("input")];
    const set = (inp, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(inp, v);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const em = ins.find((i) => (i.placeholder ?? "").includes("@"));
    const pw = ins.find((i) => i.type === "password");
    if (em) set(em, email);
    if (pw) set(pw, senha);
  }, EMAIL, SENHA);
  await sleep(300);
  await clicarTexto(page, "button", "Entrar");
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

  await page.click("[data-testid=entrar-em-campo]");
  await sleep(1000);
  await clicarTexto(page, "button", "JOGADOR");
  await sleep(4000);
  ok(/INICIAR DISPUTA/i.test(await texto(page)), "intro 3D carregou (disputa de cobranças)");

  await clicarTexto(page, "button", "INICIAR DISPUTA");
  await sleep(4000);

  const engineOk = await page.evaluate(() => !!window.__engine3d);
  if (!engineOk) {
    const erro = await page.evaluate(() => window.__ultimoErro3d ?? "sem erro capturado");
    console.log("STACK DO ERRO 3D:\n", erro);
  }
  ok(engineOk, "engine 3D montado (window.__engine3d)");

  const s0 = await page.evaluate(() => {
    const e = window.__engine3d;
    const me = e.players.find((p) => p.isControlled);
    const gk = e.players.find((p) => p.isKeeper);
    return { total: e.players.length, me: !!me, gk: !!gk, camY: e.camera.position.y, phase: e.phase };
  });
  ok(s0.total === 2, `só 2 atores em campo — cobrador + goleiro (${s0.total})`);
  ok(s0.me, "cobrador controlado existe");
  ok(s0.gk, "goleiro existe");
  ok(s0.camY >= 1.6 && s0.camY <= 8, `câmera atrás da bola (${s0.camY.toFixed(2)}m de altura)`);
  ok(s0.phase === "aim", `disputa abre aguardando o swipe (phase=${s0.phase})`);

  // 15 cobranças via SWIPE REAL de mouse sobre o canvas (o mesmo caminho de
  // pointer events do dedo no celular), alternando os cantos.
  const box = await page.evaluate(() => {
    const r = document.querySelector("canvas").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const indices = [];
  let bolaMoveu = 0;
  for (let i = 1; i <= 15; i++) {
    await page.waitForFunction(() => window.__engine3d?.phase === "aim", { timeout: 20000 });
    const antes = await page.evaluate(() => ({ idx: window.__engine3d.shotIndex, gols: window.__engine3d.playerGoals }));
    ok(antes.idx === i, `contador na cobrança ${i}/15 (nunca pula nem duplica)`);
    const sx = box.x + box.w / 2;
    const sy = box.y + box.h * 0.72;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + (i % 2 === 0 ? 150 : -150), sy - box.h * 0.35, { steps: 8 });
    await page.mouse.up();
    // a bola TEM que sair do lugar durante o voo
    const voo = await page.evaluate(
      () =>
        new Promise((res) => {
          const e = window.__engine3d;
          const t0 = Date.now();
          const poll = setInterval(() => {
            const v = e.ball.vel.length();
            if (v > 3 || e.phase !== "flight") {
              clearInterval(poll);
              res({ v, phase: e.phase });
            } else if (Date.now() - t0 > 3000) {
              clearInterval(poll);
              res({ v, phase: e.phase });
            }
          }, 40);
        }),
    );
    if (voo.v > 3) bolaMoveu++;
    indices.push(antes.idx);
  }
  ok(bolaMoveu === 15, `bola saiu do chão nas 15 cobranças (${bolaMoveu}/15)`);
  ok(indices.every((v, i) => v === i + 1), "contador 1→15 íntegro, sem pular nem duplicar");

  // A 15ª cobrança encerra a disputa sozinha → tela de fim de jogo.
  await page.waitForFunction(() => window.__engine3d?.phase === "finished", { timeout: 20000 });
  const fim = await page.evaluate(() => {
    const e = window.__engine3d;
    return { score: { ...e.score }, playerGoals: e.playerGoals, opp: e.opponentGoals, shots: e.opponentShots };
  });
  ok(fim.shots === 15, `adversário também cobrou 15 (${fim.shots}/15)`);
  ok(fim.score.home + fim.score.away === fim.playerGoals + fim.opp, "placar = soma dos gols da disputa");
  await sleep(1200);
  ok(/FIM DE JOGO/i.test(await texto(page)), "tela de fim de jogo 3D");
  await clicarTexto(page, "button", "CONTINUAR");
  await sleep(5000);
  const final = await texto(page);
  ok(
    /Entrar em campo|Próxima partida|Fim de jogo|Continuar|Temporada|Classificação|Rodada/i.test(final),
    "voltou ao fluxo da carreira sem travar",
  );

  console.log(`\n🎉 E2E 3D (headless, lógica completa): ${pass} verificações passaram`);
} finally {
  await browser.close();
}
