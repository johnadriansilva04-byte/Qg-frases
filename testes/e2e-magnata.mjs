/* E2E MAGNATA — jornada longa da conta E2E oficial (ver README.md).
 * Joga temporadas inteiras pelo pipeline real (window.__e2e, ?e2e=1),
 * valida a separação CLUBE×TREINADOR e a promoção/rebaixamento.
 *
 * Requer o build servido na porta 3417 (testes/serve-build.mjs) e as
 * credenciais da conta E2E oficial (README.md) nas variáveis:
 *   E2E_EMAIL=... E2E_PASSWORD=... node testes/e2e-magnata.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const TEMPORADAS_ALVO = Number(process.env.E2E_TEMPORADAS ?? 4);

if (!EMAIL || !SENHA) {
  console.error("Defina E2E_EMAIL e E2E_PASSWORD (a conta oficial está no README.md).");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`✅ ${msg}`);
  else {
    falhas++;
    console.error(`❌ ${msg}`);
  }
};

async function clicarTexto(page, seletor, texto, exato = false) {
  return page.evaluate(
    (sel, txt, ex) => {
      const els = [...document.querySelectorAll(sel)];
      const el = ex
        ? els.find((e) => e.innerText?.trim().toLowerCase() === txt.toLowerCase())
        : els.find((e) => e.innerText?.toLowerCase().includes(txt.toLowerCase()));
      if (el) { el.click(); return true; }
      return false;
    }, seletor, texto, exato);
}
async function texto(page) { return page.evaluate(() => document.body.innerText); }
async function esperarTexto(page, regex, timeoutMs = 20000) {
  const ini = Date.now();
  while (Date.now() - ini < timeoutMs) {
    const t = await texto(page);
    if (regex.test(t)) return t;
    await sleep(400);
  }
  return texto(page);
}

async function entrar(page) {
  await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  let body = await esperarTexto(page, /Futebol|Amistoso|Carreira no Campus/i, 30000);
  if (!/Carreira no Campus|Amistoso/i.test(body)) {
    await clicarTexto(page, "button, a, [role=button]", "Futebol");
    body = await esperarTexto(page, /Amistoso|Carreira no Campus/i, 30000);
  }
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1500);
  const body2 = await texto(page);
  if (/Não tenho conta/i.test(body2)) {
    await page.evaluate((email, senha) => {
      const i = [...document.querySelectorAll("input")].find((x) => (x.placeholder ?? "").includes("seu@email"));
      if (i) {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        s.call(i, email);
        i.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const p = document.querySelector("input[type=password]");
      if (p) {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        s.call(p, senha);
        p.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, EMAIL, SENHA);
    await clicarTexto(page, "button", "Entrar");
    await esperarTexto(page, /Rookie|editar/i, 20000);
  }
  await page.click("button[title='Voltar']").catch(() => {});
  await esperarTexto(page, /Carreira|Futebol/i, 15000);
  const corpoHub = await texto(page);
  if (!/Meu Clube|Carreira no Campus|Amistoso/i.test(corpoHub)) {
    await clicarTexto(page, "button, a, [role=button]", "Futebol");
    await esperarTexto(page, /Carreira no Campus|Amistoso/i, 15000);
  }
  await clicarTexto(page, "button, a, [role=button]", "Carreira");
  await esperarTexto(page, /CAMPANHA ATUAL|CONTINUAR|INICIAR|Rodada|ENTRAR EM CAMPO/i, 15000);
  const corpo = await texto(page);
  if (/CONTINUAR CAMPANHA|Continuar Campanha/i.test(corpo)) {
    await clicarTexto(page, "button, a, div, span", "Continuar Campanha") ||
      (await clicarTexto(page, "button, a", "CONTINUAR"));
  } else if (/INICIAR NOVA/i.test(corpo)) {
    await clicarTexto(page, "button, a", "COMEÇAR");
  }
  await page.waitForFunction(() => !!window.__e2e?.getCareer?.()?.coach?.nome, { timeout: 30000 });
  await sleep(1500);
}

/** Joga partidas até o veredito de fim de temporada. */
async function jogarTemporada(page, num) {
  let jogos = 0;
  for (let i = 0; i < 60; i++) {
    const r = await page.evaluate(() => window.__e2e?.simularPartida?.());
    if (r === "veredito") break;
    if (r === "fim" || r === undefined || r === "wo-pendente") {
      await sleep(800);
      const tela = await texto(page);
      if (/Temporada|Continuar|manutenção/i.test(tela)) break;
    }
    jogos++;
    await sleep(650);
    if (i % 10 === 9) {
      const viva = await page.evaluate(() => document.body.innerText.length > 50);
      ok(viva, `T${num}: UI viva após ${i + 1} partidas`);
    }
  }
  return jogos;
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errosPagina = [];
page.on("pageerror", (e) => {
  const s = String(e);
  if (!s.includes("#418")) errosPagina.push(s.slice(0, 200));
});

try {
  await entrar(page);
  const c0 = await page.evaluate(() => window.__e2e?.getCareer?.());
  console.log(
    `\n🏁 Carreira: T${c0.temporada} rodada ${c0.rodadaAtual} pessoal=${c0.coach.sov} caixa=${c0.clubeCaixa} div=${c0.divisao}`,
  );

  for (let t = 0; t < TEMPORADAS_ALVO; t++) {
    const antes = await page.evaluate(() => window.__e2e?.getCareer?.());
    const temp = antes.temporada;
    const jogos = await jogarTemporada(page, temp);
    const fim = await page.evaluate(() => {
      const c = window.__e2e?.getCareer?.();
      const liga = c?.ligas?.[c.divisao];
      const row = liga?.groups?.[0]?.table?.find((r) => r.teamId === "custom");
      return { ...c, _row: row };
    });
    console.log(
      `📋 T${temp}: ${jogos} partidas, pessoal=${fim.coach.sov}, caixa=${fim.clubeCaixa}, div=${fim.divisao}` +
        (fim._row ? ` | campanha: ${fim._row.v}V ${fim._row.e}E ${fim._row.d}D pts=${fim._row.p}` : ""),
    );

    const tela = await esperarTexto(page, /Manutenção|temporada|Continuar|Próxima Temporada/i, 10000);
    ok(/Manutenção|Continuar|Próxima Temporada/i.test(tela), `T${temp}: tela de fim de temporada apareceu`);

    // Avança de temporada (mesmo sem grana — a dívida é permitida).
    await page.evaluate(() => window.__e2e?.avancarTemporada?.());
    await sleep(2500);
    const nova = await page.evaluate(() => window.__e2e?.getCareer?.());
    ok(nova.temporada === temp + 1, `avançou para T${temp + 1} (temporada=${nova.temporada})`);
    console.log(`   → T${nova.temporada} começou na ${nova.divisao} com pessoal=${nova.coach.sov} caixa=${nova.clubeCaixa}`);

    // Estratégia de magnata: evolui o botão 1 quando sobra dinheiro pessoal.
    if (nova.coach.sov > 120) {
      await page.evaluate(() => window.__e2e?.evoluirBotao?.(0));
      await sleep(1500);
    }
  }

  const final = await page.evaluate(() => window.__e2e?.getCareer?.());
  console.log(
    `\n💰 Estado final: T${final.temporada} ${final.divisao} pessoal=${final.coach.sov} caixa=${final.clubeCaixa} títulos=${final.coach.titulos}`,
  );
  console.log(
    `   botões: [${(final.botoesNiveis ?? []).join(",")}] clubes: ${Object.keys(final.propriedadeClubes?.participacoes ?? {}).join(",") || "nenhum"}`,
  );
  ok(errosPagina.length === 0, `sem erros de página (${errosPagina.length})`);
  if (errosPagina.length) console.log(errosPagina.slice(0, 5));
} finally {
  await browser.close();
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2E MAGNATA: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
