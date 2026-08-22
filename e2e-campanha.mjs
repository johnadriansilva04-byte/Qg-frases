// E2E completo — tour "IA Chapada" até zerar a história (6 capítulos) + recorde.
// Uso: node e2e-campanha.mjs [url-base]
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:12000";
const EMAIL = "ia.chapada.e2e+campus@gmail.com";
const SENHA = "Chapada@2026!";
const NOME = "IA Chapada";
const TIME = "Chapada FC";
const META_CAPITULOS = 6;
const MAX_PARTIDAS = 12;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const erros = [];
page.on("console", (m) => {
  const t = m.text();
  if (/error|erro/i.test(t) && !/favicon|adsense|monetag|adsterra|Failed to load resource|WebGPU|webgpu|Gen4|Automatic fallback/i.test(t)) {
    erros.push(t.slice(0, 200));
  }
});

async function shot(nome) {
  await page.screenshot({ path: `/tmp/e2e-${nome}.png` });
  log(`  📸 /tmp/e2e-${nome}.png`);
}
const texto = () => page.evaluate(() => document.body.innerText);

async function clicar(regex, { tags = "button,a,[role=button]", maxFilhos = 30, desc = "" } = {}) {
  const ok = await page.evaluate(
    ({ src, tags, maxFilhos }) => {
      const re = new RegExp(src, "i");
      const els = [...document.querySelectorAll(tags)].filter(
        (x) => re.test(x.textContent ?? "") && x.querySelectorAll("*").length < maxFilhos && !x.disabled,
      );
      if (!els.length) return false;
      els[els.length - 1].click();
      return true;
    },
    { src: regex.source, tags, maxFilhos },
  );
  if (!ok) log(`  ⚠️ clique sem alvo: ${desc || regex}`);
  return ok;
}
const clicarTestId = (tid) => page.evaluate((t) => {
  const el = document.querySelector(`[data-testid="${t}"]`);
  if (!el) return false;
  el.click();
  return true;
}, tid);

/* ------------------------- 1) ACESSO (idempotente) ------------------------ */
log("1) Acesso da conta", EMAIL);
await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(3500);
await clicar(/aceitar/i);
await sleep(400);
await clicar(/Futebol/, { tags: "button,a,[role=button],div", maxFilhos: 8 });
await sleep(3500);
await clicar(/MEU CLUBE|Minha conta/i, { tags: "button,a,[role=button],div" });
await sleep(2500);
await clicar(/Não tenho conta|Criar conta/i);
await sleep(1200);
await page.waitForSelector('input[type="email"]', { timeout: 9000 });
await page.type('input[type="email"]', EMAIL, { delay: 8 });
await page.type('input[type="password"]', SENHA, { delay: 8 });
await page.evaluate(({ nome, time }) => {
  const inputs = [...document.querySelectorAll("input.field-input")];
  const set = (el, v) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  if (inputs[2]) set(inputs[2], nome);
  if (inputs[3]) set(inputs[3], time);
  if (inputs[4]) set(inputs[4], "CHA");
  if (inputs[5]) set(inputs[5], "10");
}, { nome: NOME, time: TIME });
await sleep(400);
await clicar(/^Criar conta$|Cadastrar/i);
await sleep(7000);
let corpo = await texto();
if (/Já existe uma conta|CRIAR CONTA|perfil falhou/i.test(corpo)) {
  log("  → login (conta existente)");
  await clicar(/Já tenho conta/i);
  await sleep(1500);
  const temLogin = await page.$('input[type="email"]');
  if (temLogin) {
    await page.type('input[type="email"]', EMAIL, { delay: 8 });
    await page.type('input[type="password"]', SENHA, { delay: 8 });
    await clicar(/^Entrar$|^ENTRAR$/i);
    await sleep(7000);
  }
}
corpo = await texto();

/* ------------------------- 2) PROFISSÃO ---------------------------------- */
if (/Quem é você na Cidadela/i.test(corpo)) {
  log("2) Profissão: Técnico de Futebol");
  await clicar(/Técnico de Futebol/i, { tags: "button", maxFilhos: 40 });
  await sleep(1500);
  await clicar(/Escolher|Confirmar|Assumir/i, { tags: "button", maxFilhos: 6 });
  await sleep(4500);
}
await shot("10-logado");

/* ------------------------- 3) CARREIRA ----------------------------------- */
log("3) Iniciando carreira no Campus…");
corpo = await texto();
if (/IDENTIDADE DO CLUBE|MEU CLUBE/.test(corpo)) {
  await clicar(/^<$|Voltar/i, { desc: "voltar" });
  await sleep(1500);
  corpo = await texto();
}
// Garante que estamos dentro do Futebol (menu do BotaoGame)
if (/Cidadela dos Clássicos/.test(corpo)) {
  await clicar(/Futebol/, { tags: "button,a,[role=button],div", maxFilhos: 8 });
  await sleep(4000);
  corpo = await texto();
}
await clicar(/Carreira no Campus/i, { tags: "button,a,div", maxFilhos: 12 });
await sleep(2500);
corpo = await texto();
if (/Continuar Campanha/i.test(corpo)) {
  // Carreira existente → continua (nunca reseta)
  await clicar(/Continuar Campanha/i, { tags: "button,a,div", maxFilhos: 12 });
  await sleep(3500);
} else if (/NOVA CAMPANHA|Nova Carreira|Começar do zero|COMEÇAR/i.test(corpo)) {
  await clicar(/Nova Carreira|Começar do zero/i, { tags: "button,a,div", maxFilhos: 12 });
  await sleep(1200);
  // Botão final de confirmação ("COMEÇAR" / "INICIAR NOVA CAMPANHA")
  await page.evaluate(() => {
    const els = [...document.querySelectorAll("button,a,div")].filter((x) =>
      /INICIAR NOVA CAMPANHA|COMEÇAR/i.test(x.textContent ?? "") && x.querySelectorAll("*").length < 12,
    );
    els[els.length - 1]?.click();
  });
  await sleep(2500);
}
// Entrada triunfal → técnico
await clicar(/Entrar como Técnico/i, { tags: "button", maxFilhos: 6 });
await sleep(2500);

// Coach setup: narrativa → nome → estilo → bio → assinar
for (let i = 0; i < 10; i++) {
  corpo = await texto();
  if (/Estádio do Campus|CareerHub|Entrar em campo/i.test(corpo) && !(await page.$("[data-testid=coach-avancar]"))) break;
  const nomeInput = await page.$("[data-testid=coach-nome]");
  if (nomeInput) {
    await page.evaluate(() => {
      const el = document.querySelector("[data-testid=coach-nome]");
      if (el && !el.value) {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, "IA Chapada");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }
  await clicarTestId("estilo-equilibrado");
  const av = await clicarTestId("coach-avancar");
  if (!av) break;
  await sleep(1800);
}
await sleep(4000);
await estado("hub da carreira");
await shot("11-hub");
corpo = await texto();
if (!/Entrar em campo/i.test(corpo)) {
  log("❌ hub da carreira não encontrado — abortando");
  await browser.close();
  process.exit(1);
}

/* ------------------------- 4) MOTOR DE PARTIDA ---------------------------- */

async function estadoPartida() {
  return await page.evaluate(() => window.__botaoMatch ?? null);
}

async function esperarTurnoJogador(timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st = await estadoPartida();
    if (!st) return null; // partida acabou / canvas sumiu
    if (st.turn && st.moving === false) return st;
    await sleep(400);
  }
  return null;
}

// Melhor flick: botão ATRÁS da bola em relação ao gol adversário (mesma
// geometria do escolherFinalizador). Sem ângulo → aproxima por trás.
function planejarFlick(st, meuLado) {
  const golX = meuLado === "home" ? 970 : 30;
  const gol = { x: golX, y: 310 };
  const ball = st.discs.find((d) => d.side === "ball");
  const meus = st.discs.filter((d) => d.side === meuLado && !d.keeper);
  if (!ball || !meus.length) return null;
  const bgx = gol.x - ball.x, bgy = gol.y - ball.y;
  const bl = Math.hypot(bgx, bgy);
  const alvoCanto = { x: gol.x, y: 310 + (ball.y >= 310 ? -55 : 55) };
  let best = null;
  for (const d of meus) {
    const dbx = ball.x - d.x, dby = ball.y - d.y;
    const dl = Math.hypot(dbx, dby) || 1;
    const cos = (dbx * bgx + dby * bgy) / (dl * bl);
    if (cos > 0.3) {
      const score = dl - cos * 120;
      if (!best || score < best.score) best = { disc: d, cos, score };
    }
  }
  if (best) {
    // mira no canto (pelo contato atrás da bola)
    const bx = ball.x - best.disc.x, by = ball.y - best.disc.y;
    const dbl = Math.hypot(bx, by);
    const gcx = alvoCanto.x - ball.x, gcy = alvoCanto.y - ball.y;
    const gcl = Math.hypot(gcx, gcy);
    const contato = { x: ball.x - (gcx / gcl) * 38, y: ball.y - (gcy / gcl) * 38 };
    const dir = { x: contato.x - best.disc.x, y: contato.y - best.disc.y };
    const dl2 = Math.hypot(dir.x, dir.y);
    return { disc: best.disc, dir: { x: dir.x / dl2, y: dir.y / dl2 }, forca: Math.min(250, dbl * 2.4) };
  }
  // Ninguém atrás: move o mais próximo para trás da bola (apoio)
  const prox = [...meus].sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0];
  const apoio = { x: ball.x - (bgx / bl) * 60, y: ball.y - (bgy / bl) * 60 };
  const dir = { x: apoio.x - prox.x, y: apoio.y - prox.y };
  const dl = Math.hypot(dir.x, dir.y);
  return { disc: prox, dir: { x: dir.x / dl, y: dir.y / dl }, forca: Math.min(250, dl * 2.4) };
}

async function flick(plano) {
  const canvas = await page.$("canvas.pitch-canvas");
  if (!canvas) return false;
  const box = await canvas.boundingBox();
  const s = box.width / 1000; // FIELD.w
  const cx = box.x + plano.disc.x * s;
  const cy = box.y + plano.disc.y * s;
  const tx = cx - plano.dir.x * plano.forca * s; // estilingue: arrasta para trás
  const ty = cy - plano.dir.y * plano.forca * s;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 6 });
  await sleep(60);
  await page.mouse.up();
  return true;
}

async function jogarPartida(numero) {
  log(`\n⚽ PARTIDA ${numero} — entrando em campo…`);
  await clicarTestId("entrar-em-campo");
  await sleep(2500);
  // loading "entrando em campo"
  for (let i = 0; i < 20; i++) {
    if (await page.$("canvas.pitch-canvas")) break;
    await sleep(700);
  }
  if (!(await page.$("canvas.pitch-canvas"))) {
    log("  ❌ canvas da partida não apareceu");
    await shot(`partida-${numero}-sem-canvas`);
    return null;
  }
  // descobre o lado do usuário lendo o header (CHA aparece no placar)
  let meuLado = "home";
  const headerTxt = (await texto()).slice(0, 400);
  const m = headerTxt.match(/(\bCHA\b)/);
  void m;

  let flicks = 0;
  let ultimoTurno = null;
  let nulos = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 8 * 60 * 1000) {
    const canvasVivo = await page.$("canvas.pitch-canvas");
    const st = await estadoPartida();
    if (!st) {
      nulos++;
      if (nulos > 60) break; // hook ainda não publicou (início) — tolera 30s
      await sleep(500);
      continue;
    }
    if (!canvasVivo) {
      nulos++;
      if (nulos > 12) break; // canvas desmontou → partida encerrada
      await sleep(500);
      continue;
    }
    nulos = 0;
    if (st.moving) { await sleep(500); continue; }
    // O turno do jogador: discos do lado do usuário existem dos dois lados;
    // heurística: o lado que NÃO se move sozinho. O CPU joga sozinho — então
    // se ficarmos >3s sem movimento e sem nossa ação, é nossa vez.
    if (ultimoTurno === st.turn && st.turn !== undefined) {
      // mesmo turno parado: tenta flick no lado que ainda não jogou
    }
    ultimoTurno = st.turn;
    // Descobre meu lado na 1ª jogada: o lado que NUNCA age sozinho.
    // Simples: tenta home; se o flick não mudar o estado (turno não avança), troca.
    const antes = st.turn;
    const plano = planejarFlick(st, meuLado);
    if (!plano) { await sleep(600); continue; }
    await flick(plano);
    flicks++;
    await sleep(1200);
    const depois = await estadoPartida();
    if (!depois) continue;
    if (flicks === 1 && depois.turn === antes && !depois.moving) {
      // flick no lado errado (CPU era para jogar) — inverte
      meuLado = meuLado === "home" ? "away" : "home";
      log(`  (lado corrigido: ${meuLado})`);
    }
    if (flicks % 7 === 0) {
      log(`  …${flicks} flicks · placar ${depois.score?.home ?? "?"}-${depois.score?.away ?? "?"}`);
    }
    // fim de partida → telas de fim/coletiva não têm canvas
    await sleep(400);
  }
  log(`  partida encerrada após ${flicks} flicks (${Math.round((Date.now() - t0) / 1000)}s)`);
  await sleep(2500);
  return flicks;
}

/* ------------------------- 5) PÓS-JOGO / COLETIVA ------------------------ */

async function posJogo(numero) {
  await sleep(2000);
  await shot(`partida-${numero}-fim`);
  let corpo = await texto();
  // Pode haver decisão (choice/suborno) antes da coletiva — escolhe a 1ª opção
  if (/Decisão|diretoria|proposta/i.test(corpo) && (await clicar(/^.{8,80}$/s, { tags: "button", maxFilhos: 4 }))) {
    await sleep(1200);
  }

  // Coletiva: abre pela tela de fim de partida
  if (await clicar(/Dar coletiva/i, { tags: "button", maxFilhos: 6 })) {
    log("  🎙️ coletiva aberta");
    await sleep(2000);
    for (let i = 0; i < 8; i++) {
      corpo = await texto();
      if (/Finalizar coletiva/i.test(corpo)) break;
      const respondi = await page.evaluate(() => {
        const btns = [...document.querySelectorAll("button")].filter(
          (b) => b.className.includes("rounded-xl") && b.className.includes("border-slate-700") && !b.disabled && (b.textContent ?? "").length > 10,
        );
        if (!btns.length) return false;
        btns[0].click();
        return true;
      });
      if (!respondi) break;
      await sleep(3500);
    }
    await clicar(/Finalizar coletiva/i, { tags: "button", maxFilhos: 8 });
    await sleep(1800);
    await clicar(/CONTINUAR/i, { tags: "button", maxFilhos: 4 });
    await sleep(3000);
    log("  ✅ coletiva concluída");
  }
  await clicar(/Continuar|Avançar|Seguir/i, { tags: "button", maxFilhos: 6 });
  await sleep(2500);
  // Fechar possível nova aba de anúncio
  const pages = await browser.pages();
  for (const p of pages) if (p !== page) await p.close().catch(() => {});
  await page.bringToFront();
  await sleep(1500);
  await shot(`partida-${numero}-pos`);
}

/* ------------------------- 6) CAMPANHA ----------------------------------- */
let capitulosVistos = 0;
for (let partida = 1; partida <= MAX_PARTIDAS; partida++) {
  corpo = await texto();
  if (!/Entrar em campo/i.test(corpo)) {
    log("⚠️ fora do hub — texto atual:", corpo.slice(0, 200).replace(/\n+/g, " | "));
    break;
  }
  const f = await jogarPartida(partida);
  if (!f) break;
  await posJogo(partida);
  // status econômico/narrativo
  corpo = await texto();
  const sov = corpo.match(/SOV\s*\|?\s*(\d+)/i)?.[1];
  log(`  💰 SOV após partida ${partida}: ${sov ?? "?"}`);
  if (partida === 3) await shot("12-meio-campanha");
  if (partida >= META_CAPITULOS + 2) break;
}

log("\nErros de console:", erros.length ? erros : "nenhum");
await shot("13-final");
await browser.close();
process.exit(0);

async function estado(r) {
  log(`\n=== ${r} ===\n` + (await texto()).slice(0, 300).replace(/\n+/g, " | "));
}
