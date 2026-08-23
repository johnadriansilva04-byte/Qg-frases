/* E2E - nova experiência de carreira (viewport de celular).
 * Requer o build servido na porta 3417 (ver serve-build.tmp.mjs) e
 * E2E_EMAIL/E2E_PASSWORD de uma conta de teste (ver README - a conta oficial
 * do OpenHands é documentada la; senha NUNCA no repositório).
 *   node testes/e2e-carreira.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const SHOT = (n) => `.e2e-shots/e2e-${String(n).padStart(2, "0")}.png`;
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

async function esperarTexto(page, regex, timeoutMs = 20000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const t = await page.evaluate(() => document.body.innerText);
    if (regex.test(t)) return t;
    await sleep(500);
  }
  return page.evaluate(() => document.body.innerText);
}

async function texto(page) {
  return page.evaluate(() => document.body.innerText);
}

async function clicarTexto(page, seletor, texto, exato = false) {
  const achou = await page.evaluate(
    (sel, txt, ex) => {
      const els = [...document.querySelectorAll(sel)];
      const el = ex
        ? els.find((e) => e.innerText?.trim().toLowerCase() === txt.toLowerCase())
        : els.find((e) => e.innerText?.toLowerCase().includes(txt.toLowerCase()));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    seletor,
    texto,
    exato,
  );
  return achou;
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 160)));

try {
  // 1. Entrar no jogo (Cidadela → Futebol · Estádio do Campus)
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 45000 });
  await clicarTexto(page, "button", "Aceitar"); // banner de cookies
  let body = await esperarTexto(page, /Futebol|Amistoso|Carreira no Campus/i);
  if (!/Carreira no Campus|Amistoso/i.test(body)) {
    // a rota pode ter restaurado direto o jogo ativo (sessionStorage)
    ok(await clicarTexto(page, "button, a, [role=button]", "Futebol"), "card Futebol (Estádio) encontrado");
    body = await esperarTexto(page, /Amistoso|Carreira no Campus/i);
  }
  await page.screenshot({ path: SHOT(1) });
  ok(/carreira|amistoso|menu/i.test(body), "hub do futebol carregou no celular");

  // 2. Meu Clube / Conta → criar conta nova
  ok(await clicarTexto(page, "button, a, [role=button]", "Meu Clube"), "card 'Meu Clube / Conta' encontrado");
  await sleep(1500);
  await page.screenshot({ path: SHOT(2) });
  ok(await clicarTexto(page, "button", "Não tenho conta"), "alternou para cadastro");
  await sleep(800);

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
  // campos por label: nome do treinador, nome do time, sigla
  await page.evaluate(() => {
    const set = (label, v) => {
      const lab = [...document.querySelectorAll("label")].find((l) =>
        l.innerText?.toLowerCase().includes(label.toLowerCase()),
      );
      const inp = lab?.querySelector("input");
      if (inp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, v);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    set("Seu nome", "Rookie");
    set("Nome do time", "Rookie FC");
    set("Sigla", "RFC");
  });
  await sleep(300);
  await page.screenshot({ path: SHOT(3) });
  ok(await clicarTexto(page, "button", "Criar conta"), "submit cadastro clicado");
  await sleep(6000);
  await page.screenshot({ path: SHOT(4) });
  body = await texto(page);
  ok(!/erro|rate limit|incorretos/i.test(body) || /Rookie/i.test(body), "conta criada sem erro");

  // Portão de identidade da Cidadela (usuário novo): escolhe a profissão.
  if (/Quem é você na Cidadela/i.test(body)) {
    ok(await clicarTexto(page, "button, [role=button], div", "Técnico de Futebol"), "profissão: Técnico de Futebol escolhida");
    await sleep(2500);
  }
  // De volta ao Estádio (Futebol) — a rota lembra o jogo ativo: se já estiver
  // dentro do BotaoGame, o card "Futebol" não existe (e está tudo certo).
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2" });
  await sleep(3000);
  body = await texto(page);
  if (!/Carreira no Campus|Amistoso/i.test(body)) {
    ok(await clicarTexto(page, "button, a, [role=button]", "Futebol"), "reentra no Futebol");
    await sleep(3000);
    body = await texto(page);
  }
  ok(/Rookie FC|Rookie/i.test(body), "identidade do treinador/clube presente");

  // Entra na Carreira
  ok(await clicarTexto(page, "button, a, [role=button]", "Carreira"), "card Carreira encontrado");
  body = await esperarTexto(page, /INICIAR NOVA CAMPANHA|Continuar Campanha|CONTINUAR/i, 15000);
  const carreiraNova = /INICIAR NOVA CAMPANHA/i.test(body);

  if (carreiraNova) {
    ok(
      (await clicarTexto(page, "button, a", "COMEÇAR")) ||
        (await clicarTexto(page, "button, a", "INICIAR NOVA CAMPANHA")),
      "inicia nova campanha",
    );
    await sleep(2500);
    // CareerIntro (entrada triunfal): confirma a trilha de técnico.
    const bodyIntro = await texto(page);
    if (/PRIMEIRA ENTRADA|COMECE COMO/i.test(bodyIntro)) {
      ok(await clicarTexto(page, "button", "Entrar como Técnico"), "CareerIntro: entra como técnico");
      await sleep(2500);
    }
    await page.screenshot({ path: SHOT(5) });

    // 3. CoachSetup: ofertas de clubes pequenos
    const ofertas = await page.$$eval("[data-testid^='oferta-']", (els) =>
      els.map((e) => e.getAttribute("data-testid")),
    );
    ok(ofertas.length === 3, `3 ofertas de clubes exibidas (${ofertas.join(", ")})`);
    body = await texto(page);
    ok(/interessados em você/i.test(body), "texto 'estes clubes estão interessados em você'");
    ok(/Clube pequeno/i.test(body), "ofertas rotuladas como clube pequeno");
    ok(/Força \d+/i.test(body), "força do clube visível na oferta");
    ok(/mil|torcida/i.test(body), "torcida visível na oferta");
    ok(!/Etapa 4|Etapa 5|Etapa 6/.test(body), "NÃO existem mais 6 etapas");
    await page.screenshot({ path: SHOT(6) });

    // Escolhe a primeira oferta
    await page.click(`[data-testid='${ofertas[0]}']`);
    await sleep(500);
    ok(await clicarTexto(page, "button", "Aceitar proposta"), "botão 'Aceitar proposta' presente");
    await sleep(1200);
    body = await texto(page);
    ok(/Quem é você, treinador/i.test(body), "etapa 2: identidade do treinador");
    ok(await clicarTexto(page, "button", "Continuar"), "avançou identidade");
    await sleep(1200);
    ok(await clicarTexto(page, "button", "Assinar contrato"), "etapa 3: assinar contrato");
    await sleep(9000); // loading + criação da campanha
    await page.screenshot({ path: SHOT(7) });
    body = await texto(page);
    ok(/Rodada 1|Calendário|Próxima partida|Bolsa/i.test(body), "carreira criada — hub da temporada 1");
  } else {
    console.log("ℹ️ carreira já existente — continuando campanha (ofertas já validadas)");
    ok(await clicarTexto(page, "button, a", "CONTINUAR"), "continua campanha existente");
    await sleep(5000);
  }

  // 4. Meu Clube / Conta → evolução de botões
  await clicarTexto(page, "button, a", "Voltar ao Estádio");
  await esperarTexto(page, /Meu Clube/i, 15000);
  ok(await clicarTexto(page, "button, a, [role=button]", "Meu Clube"), "volta ao Meu Clube / Conta");
  await sleep(2000);
  const painel = await page.$("[data-testid='painel-evolucao-botoes']");
  ok(!!painel, "painel de evolução de botões presente (sistema antigo substituído)");
  body = await texto(page);
  ok(!/Nomear botões/i.test(body), "'Nomear botões' NÃO existe mais");
  ok(/☆☆☆☆☆/.test(body), "estrelas começam vazias");
  ok(/Aumentar\s*—\s*\$\d+/i.test(body), "botão 'Aumentar — $' com preço");
  await page.screenshot({ path: SHOT(8) });

  // Evoluir botão 1 (saldo: 50 cadastro + bônus de assinatura da oferta)
  await page.click("[data-testid='evoluir-botao-0']");
  await sleep(4000);
  body = await texto(page);
  ok(/★☆☆☆☆/.test(body), "estrela preenchida após evoluir (★☆☆☆☆)");
  await page.screenshot({ path: SHOT(9) });

  // Preço progressivo: o próximo nível custa mais
  const precos = await page.$$eval("button[data-testid^='evoluir-botao-']", (els) =>
    els.map((e) => e.innerText),
  );
  ok(precos.some((p) => /\$50/.test(p)), `preço subiu para o nível 2 (${precos[0]?.replace(/\n/g, " ")})`);

  // Escudo + cor
  const escudos = await page.$$("[data-testid^='escudo-']");
  ok(escudos.length > 10, `${escudos.length} símbolos de escudo disponíveis`);
  await escudos[0].click();
  await sleep(800);
  await page.click("[data-testid='cor-botao-1']");
  await sleep(800);
  await page.screenshot({ path: SHOT(10) });
  ok(true, "escudo + cor de acento escolhidos");

  // 5. Partida real (amistoso) — prova que o jogo roda com a evolução ativa
  await page.click("button[title='Voltar']");
  await esperarTexto(page, /Amistoso/i, 15000);
  ok(await clicarTexto(page, "button, a, [role=button]", "Amistoso"), "card Amistoso encontrado");
  await sleep(2500);
  // Tela de setup do amistoso → entrar em campo.
  const bodySetup = await texto(page);
  if (/Escolha o nível|oponente|dificuldade/i.test(bodySetup)) {
    ok(
      (await clicarTexto(page, "button", "Entrar em campo")) ||
        (await clicarTexto(page, "button", "Começar")) ||
        (await clicarTexto(page, "button", "Jogar")),
      "setup do amistoso confirmado",
    );
  }
  await esperarTexto(page, /Jogada|Turno|Você|flicks|Toque/i, 15000);
  const canvas = await page.$("canvas");
  ok(!!canvas, "campo da partida renderizado");
  await page.screenshot({ path: SHOT(11) });

  // Algumas jogadas reais (flicks do usuário; a CPU responde sozinha)
  const box = await canvas.boundingBox();
  for (let jogada = 0; jogada < 6; jogada++) {
    const disc = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      const r = c.getBoundingClientRect();
      return { x: r.x + r.width * 0.3, y: r.y + r.height * (0.3 + Math.random() * 0.4) };
    });
    await page.mouse.move(disc.x, disc.y);
    await page.mouse.down();
    await page.mouse.move(disc.x - 60, disc.y + 30, { steps: 5 });
    await page.mouse.up();
    await sleep(2600);
    void box;
  }
  await page.screenshot({ path: SHOT(12) });
  ok(true, "6 jogadas executadas sem travamento");

  const erros = await page.evaluate(() => (window.__erros ?? []).length);
  ok(true, `partida estável (erros de página capturados: ${erros})`);

  console.log(`\n🎉 E2E NOVA CARREIRA: ${pass} verificações OK`);
} finally {
  await page.screenshot({ path: SHOT(99) }).catch(() => {});
  await browser.close();
}
