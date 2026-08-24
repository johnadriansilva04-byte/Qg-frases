// Bot-jogador da mesa online: entra na mesa criada pela conta E2E,
// aguarda o adversário humano (John A) entrar pelo link, inicia a partida
// e joga os turnos com flicks no canvas. NÃO é teste — é sessão de jogo.
// Uso: DISPLAY=:99 node testes/sala-online-bot.mjs  (log: /tmp/sala-online.log)
import puppeteer from "puppeteer-core";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const MESA = process.env.MESA_ID || "mesa_343966383436";
const BASE = process.env.BASE_URL || "https://pracinha.online";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: false,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=420,900"],
  defaultViewport: { width: 390, height: 844 },
});
const page = await browser.newPage();
page.setDefaultTimeout(15_000);
page.on("pageerror", (e) => log("⚠️ pageerror:", String(e).slice(0, 160)));

const texto = () => page.evaluate(() => document.body.innerText);
const tem = (re) => texto().then((t) => re.test(t));
async function clicarTexto(re) {
  const ok = await page.evaluate((src) => {
    const rx = new RegExp(src, "i");
    const els = [...document.querySelectorAll("button, a, [role=button]")];
    const el = els.find((e) => rx.test(e.innerText || "") && e.getBoundingClientRect().height > 0);
    if (!el) return false;
    el.click();
    return true;
  }, re.source);
  return ok;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) Login (a conta E2E já tem sessão de login no fluxo "Meu Clube / Conta").
log("abrindo", `${BASE}/cidadela`);
await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 90_000 });
await sleep(4000);
await clicarTexto(/Futebol/i);
await sleep(5000);
if (await tem(/MEU CLUBE|AMISTOSO/i)) {
  await clicarTexto(/Meu Clube/i);
  await sleep(2500);
  const campos = await page.$$("input");
  if (campos.length >= 2) {
    await campos[0].type(EMAIL, { delay: 10 });
    await campos[1].type(PASSWORD, { delay: 10 });
    await clicarTexto(/Entrar|Acessar|Login/i);
    await sleep(6000);
  }
}
log("login feito; indo para a mesa", MESA);

// 2) Link direto da mesa (autenticado cai direto no fluxo dela).
await page.goto(`${BASE}/cidadela?mesa=${encodeURIComponent(MESA)}`, { waitUntil: "networkidle2", timeout: 90_000 });
await sleep(6000);

// 3) Aguardar o adversário humano (o criador vê "Aguardando segundo jogador").
log("aguardando adversário entrar na mesa...");
const limite = Date.now() + 3 * 60 * 60 * 1000; // até 3h esperando
let iniciada = false;
let ultimoShot = 0;
while (Date.now() < limite) {
  const t = await texto();
  if (/2 jogadores conectados|Pronto para começar/i.test(t)) {
    log("adversário entrou! iniciando partida");
    await page.screenshot({ path: ".e2e-shots/sala-online-adversario.png" });
    await clicarTexto(/Iniciar Partida/i);
    iniciada = true;
    break;
  }
  if (/Seu turno|Turno do oponente/i.test(t)) { iniciada = true; break; } // já começou
  if (Date.now() - ultimoShot > 60_000) {
    ultimoShot = Date.now();
    await page.screenshot({ path: ".e2e-shots/sala-online-aguardando.png" });
    log("… aguardando (screenshot salvo)");
  }
  await sleep(3000);
}
if (!iniciada) {
  log("timeout esperando adversário");
  process.exit(2);
}

// 4) Loop de jogo: no meu turno, flick de um disco da metade de baixo (home)
// em direção ao gol adversário (topo). Alterna origens para variar jogadas.
log("partida em andamento — jogando meus turnos");
const origens = [
  [195, 690], [120, 560], [270, 560], [90, 430], [300, 430], [195, 520],
];
let n = 0;
let jogadasFeitas = 0;
while (Date.now() < limite) {
  const t = await texto();
  if (/série|FIM DE JOGO|vitória na série|Voltar/i.test(t) && !/Seu turno|Turno do oponente/i.test(t)) {
    log("fim da série detectado");
    break;
  }
  if (/Seu turno/i.test(t)) {
    const [x, y] = origens[n++ % origens.length];
    // flick: pressiona no disco, arrasta até o meio-campo atacante e solta.
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(x + (Math.random() * 40 - 20), y - i * 45);
      await sleep(16);
    }
    await page.mouse.up();
    jogadasFeitas++;
    log(`jogada ${jogadasFeitas} executada`);
    await sleep(1200); // espera o turno virar
  } else {
    await sleep(1500);
  }
}
log(`encerrando. jogadas feitas: ${jogadasFeitas}`);
const final = await texto();
const m = final.match(/(VENCEU[^.\n]*|DERROTA[^.\n]*|EMPATE[^.\n]*|FIM[^.\n]*)/i);
log("resultado:", m ? m[0] : "(ver screenshot)");
await page.screenshot({ path: ".e2e-shots/sala-online-final.png" });
await browser.close();
process.exit(0);
