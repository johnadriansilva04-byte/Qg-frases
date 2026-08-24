/* E2E — Modo Jogador 3D (Entrar em Campo) + fluxo Futebol sem duplo loading.
 * Requer o build servido na porta 3417 (testes/serve-build.mjs) e
 * E2E_EMAIL/E2E_PASSWORD da conta oficial (ver README — senha NUNCA no repo).
 *   node testes/e2e-modo-jogador-3d.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const SHOT = (n) => `.e2e-shots/3d-${String(n).padStart(2, "0")}.png`;
if (!EMAIL || !SENHA) {
  console.error("Defina E2E_EMAIL e E2E_PASSWORD (ver README - Conta oficial do OpenHands).");
  process.exit(2);
}

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = (page) => page.evaluate(() => document.body.innerText);

async function esperarTexto(page, regex, timeoutMs = 20000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const t = await texto(page);
    if (regex.test(t)) return t;
    await sleep(400);
  }
  return texto(page);
}

async function clicarTexto(page, seletor, txt, exato = false) {
  return page.evaluate(
    (sel, t, ex) => {
      const els = [...document.querySelectorAll(sel)];
      const el = ex
        ? els.find((e) => e.innerText?.trim().toLowerCase() === t.toLowerCase())
        : els.find((e) => e.innerText?.toLowerCase().includes(t.toLowerCase()));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    seletor,
    txt,
    exato,
  );
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  // headed sob Xvfb: o headless deste chromium não tem WebGL; headed + SwiftShader sim
  headless: false,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=390,844",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errosPagina = [];
page.on("pageerror", (e) => {
  errosPagina.push(String(e));
  console.log("⚠️ pageerror:", String(e).slice(0, 200));
});
page.on("console", (m) => {
  if (m.type() === "error") console.log("⚠️ console.error:", m.text().slice(0, 200));
});
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`⚠️ HTTP ${r.status()} ${r.url().slice(0, 140)}`);
});

try {
  const webglOk = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  });
  ok(webglOk, "WebGL disponível no navegador de teste");

  // 1. Cidadela → Futebol SEM carregamento duplo
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 45000 });
  await clicarTexto(page, "button", "Aceitar"); // banner de cookies
  let body = await esperarTexto(page, /Futebol/i);
  ok(/Futebol/i.test(body), "hub da Cidadela carregou");

  // Clique no Futebol: NUNCA pode aparecer a tela "Abrindo o Estádio..."
  const clicou = await clicarTexto(page, "button, a, [role=button]", "Futebol");
  ok(clicou, "card Futebol clicado");
  let viuLoadingAntigo = false;
  const inicio = Date.now();
  let menuVisivel = false;
  while (Date.now() - inicio < 8000) {
    const t = await texto(page);
    if (/Abrindo o Estádio do Campus/i.test(t)) viuLoadingAntigo = true;
    if (/Amistoso|Carreira no Campus|Meu Clube/i.test(t)) {
      menuVisivel = true;
      break;
    }
    await sleep(150);
  }
  ok(!viuLoadingAntigo, "sem loading duplicado ('Abrindo o Estádio' nunca apareceu)");
  ok(menuVisivel, "tela principal do Futebol abriu DIRETO");
  await page.screenshot({ path: SHOT(1) });

  // 2. Login com a conta oficial
  ok(await clicarTexto(page, "button, a, [role=button]", "Meu Clube"), "card 'Meu Clube / Conta' abriu");
  await sleep(1200);
  const preencher = async (placeholder, valor) => {
    await page.evaluate(
      (ph, v) => {
        const inp = [...document.querySelectorAll("input")].find((i) =>
          (i.placeholder ?? "").toLowerCase().includes(ph.toLowerCase()),
        );
        if (inp) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(inp, v);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      placeholder,
      valor,
    );
  };
  await preencher("seu@email.com", EMAIL);
  await page.evaluate((v) => {
    const inp = document.querySelector("input[type=password]");
    if (inp) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(inp, v);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, SENHA);
  await sleep(300);
  await page.screenshot({ path: SHOT(2) });
  ok(await clicarTexto(page, "button", "Entrar"), "submit login clicado");
  body = await esperarTexto(page, /MEU CLUBE|AMISTOSO/i, 40000);
  ok(/MEU CLUBE|AMISTOSO/i.test(body), "login ok — menu principal do jogo");
  await page.screenshot({ path: SHOT(3) });

  // 3. Carreira → hub (atravessa telas intermediárias se houver)
  let noHub = false;
  for (let i = 0; i < 12 && !noHub; i++) {
    noHub = await page.evaluate(() => !!document.querySelector("[data-testid=entrar-em-campo]"));
    if (noHub) break;
    const t = await texto(page);
    if (/Continuar Campanha/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Continuar Campanha");
    else if (/Carreira no Campus/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Carreira no Campus");
    else if (/Continuar/i.test(t)) await clicarTexto(page, "button", "Continuar");
    else if (/Avançar/i.test(t)) await clicarTexto(page, "button", "Avançar");
    else if (/Entrar como Técnico|Treinador/i.test(t)) await clicarTexto(page, "button, a, [role=button]", "Treinador");
    await sleep(1500);
  }
  if (!noHub) console.log("TELA ATUAL:", (await texto(page)).slice(0, 400));
  ok(noHub, "hub da carreira com 'Entrar em campo' visível");
  await page.screenshot({ path: SHOT(4) });

  // 4. Entrar em Campo → modo JOGADOR (3D)
  await page.click("[data-testid=entrar-em-campo]");
  await sleep(800);
  await page.screenshot({ path: SHOT(5) });
  ok(await clicarTexto(page, "button", "JOGADOR"), "modal de modo — opção JOGADOR escolhida");
  body = await esperarTexto(page, /INICIAR PARTIDA/i, 15000);
  ok(/INICIAR PARTIDA/i.test(body), "intro da partida 3D carregou (Você controla / INICIAR PARTIDA)");
  await page.screenshot({ path: SHOT(6) });

  // 5. Iniciar a partida 3D — canvas deve ser o MESMO antes e depois (persistente)
  const canvasAntes = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return null;
    window.__canvasRef = c;
    return { w: c.width, h: c.height };
  });
  ok(canvasAntes && canvasAntes.w > 0 && canvasAntes.h > 0, `canvas presente com tamanho real (${canvasAntes?.w}x${canvasAntes?.h})`);

  ok(await clicarTexto(page, "button", "INICIAR PARTIDA"), "INICIAR PARTIDA clicado");
  await sleep(3000);

  const estado3d = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const mesmo = c === window.__canvasRef;
    let ctx = null;
    try {
      ctx = c && (c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      ctx = "contexto já pertence ao engine (esperado)";
    }
    return {
      mesmo,
      w: c?.width ?? 0,
      h: c?.height ?? 0,
      ctxJaExistente: ctx === null || typeof ctx === "string" ? "engine-dono" : "livre",
      hud: document.body.innerText,
    };
  });
  ok(estado3d.mesmo, "canvas NÃO foi remontado ao iniciar (engine preso ao elemento visível)");
  ok(estado3d.w > 100 && estado3d.h > 100, `canvas renderizando em tamanho real (${estado3d.w}x${estado3d.h})`);
  ok(/Encerrar/i.test(estado3d.hud), "HUD da partida 3D visível (placar/Encerrar)");
  await page.screenshot({ path: SHOT(7) });

  // 6. O relógio do jogo avança = loop de update/render rodando (não é tela parada)
  const minuto1 = await page.evaluate(() => document.body.innerText.match(/(\d+)'/)?.[1] ?? "0");
  await sleep(4000);
  const minuto2 = await page.evaluate(() => document.body.innerText.match(/(\d+)'/)?.[1] ?? "0");
  ok(Number(minuto2) > Number(minuto1), `relógio da partida avançando (${minuto1}' → ${minuto2}')`);
  await page.screenshot({ path: SHOT(8) });

  // 7. Encerrar → FIM DE JOGO → CONTINUAR integra o resultado na carreira
  ok(await clicarTexto(page, "button", "Encerrar"), "Encerrar clicado");
  body = await esperarTexto(page, /FIM DE JOGO/i, 10000);
  ok(/FIM DE JOGO/i.test(body), "tela de fim de jogo 3D exibida");
  await page.screenshot({ path: SHOT(9) });
  ok(await clicarTexto(page, "button", "CONTINUAR"), "CONTINUAR clicado — resultado integrado");
  await sleep(4000);
  body = await texto(page);
  ok(
    /Entrar em campo|Próxima partida|Fim de jogo|Continuar|Temporada|Classificação/i.test(body),
    "voltou ao fluxo da carreira sem travar",
  );
  await page.screenshot({ path: SHOT(10) });

  const errosFatais = errosPagina.filter((e) => !/hydrat|418|Minified React/i.test(e));
  ok(errosFatais.length === 0, `sem exceções de página (${errosFatais.length})`);

  console.log(`\n🎉 E2E MODO JOGADOR 3D: ${pass} verificações passaram`);
} finally {
  await browser.close();
}
