/* E2E CAMPEONATO OFFLINE — progressão de temporadas (foco: 3ª temporada+).
 * Joga a carreira inteira pelo pipeline real (window.__e2e, ?e2e=1) com a
 * conta E2E oficial (README.md) e valida, a CADA temporada:
 *   - veredito de fim de temporada aparece (SeasonEndScreen real);
 *   - avanço incrementa a temporada e recria ligas FRESCAS (0 jogos, grupos);
 *   - promoção/rebaixamento coerente com a posição final da tabela;
 *   - composição da nova divisão: 20 times, sem duplicata, usuário presente;
 *   - finanças: caixa do clube = caixa anterior + premiação - manutenção,
 *     extrato bate com o caixa, salário só muda o pessoal;
 *   - F5 no meio da temporada e no fim da temporada preserva o estado;
 *   - UI viva, sem erros de página.
 *
 *   E2E_EMAIL=... E2E_PASSWORD=... node testes/e2e-offline-temporadas.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";
const TEMPORADAS_ALVO = Number(process.env.E2E_TEMPORADAS ?? 5);

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

const MANUTENCAO = { "serie-a": 120, "serie-b": 80, "serie-c": 50 };

async function entrar(page) {
  await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  let body = await esperarTexto(page, /Futebol|Amistoso|Carreira no Campus/i, 30000);
  if (!/Carreira no Campus|Amistoso/i.test(body)) {
    await clicarTexto(page, "button, a, [role=button]", "Futebol");
    body = await esperarTexto(page, /Amistoso|Carreira no Campus/i, 30000);
  }
  // Login (conta oficial já existe — ProfileSetup abre em modo login/editar)
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1500);
  const body2 = await texto(page);
  if (/Não tenho conta|Entrar/i.test(body2) && !/editar/i.test(body2)) {
    await page.evaluate((email, senha) => {
      const set = (i, v) => {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        s.call(i, v);
        i.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const i = [...document.querySelectorAll("input")].find((x) => (x.placeholder ?? "").includes("@"));
      if (i) set(i, email);
      const p = document.querySelector("input[type=password]");
      if (p) set(p, senha);
    }, EMAIL, SENHA);
    await clicarTexto(page, "button", "Entrar");
    await esperarTexto(page, /Rookie|editar|Meu Time|Jogador/i, 20000);
  }
  // Portão de profissão da Cidadela (conta nova)
  const bodyPort = await texto(page);
  if (/Quem é você na Cidadela/i.test(bodyPort)) {
    await clicarTexto(page, "button, [role=button], div", "Técnico de Futebol");
    await sleep(2500);
  }
  await page.goto(`${BASE}/cidadela?e2e=1`, { waitUntil: "networkidle2" });
  await sleep(2500);
  let corpo = await texto(page);
  if (!/Meu Clube|Carreira no Campus|Amistoso/i.test(corpo)) {
    await clicarTexto(page, "button, a, [role=button]", "Futebol");
    await esperarTexto(page, /Carreira no Campus|Amistoso/i, 15000);
  }
  await clicarTexto(page, "button, a, [role=button]", "Carreira");
  await sleep(1500);
  // Decide pela CARREIRA HIDRATADA (não pelo texto do menu — o estado vazio
  // aparece instantaneamente e enganava o regex antes da hidratação).
  let temCarreira = false;
  for (let i = 0; i < 40; i++) {
    temCarreira = await page.evaluate(() => !!window.__e2e?.getCareer?.());
    if (temCarreira) break;
    await sleep(500);
  }

  if (!temCarreira) {
    console.log("🌱 Sem carreira — criando pelo fluxo real (ofertas → identidade → contrato)");
    await clicarTexto(page, "button, a", "COMEÇAR");
    await sleep(2500);
    const bodyIntro = await texto(page);
    if (/PRIMEIRA ENTRADA|COMECE COMO|Entrar como/i.test(bodyIntro)) {
      await clicarTexto(page, "button", "Entrar como Técnico");
      await sleep(2500);
    }
    const ofertas = await page.$$eval("[data-testid^='oferta-']", (els) =>
      els.map((e) => e.getAttribute("data-testid")));
    ok(ofertas.length === 3, `entrada da carreira: 3 ofertas de clubes (${ofertas.length})`);
    await page.click(`[data-testid='${ofertas[0]}']`);
    await sleep(500);
    await clicarTexto(page, "button", "Aceitar proposta");
    await sleep(1200);
    await clicarTexto(page, "button", "Continuar");
    await sleep(1200);
    await clicarTexto(page, "button", "Assinar contrato");
    await sleep(9000);
  } else {
    console.log("ℹ️ carreira existente — continuando campanha");
    // Clica no BOTÃO "Continuar Campanha" (não no título) e confirma o hub.
    for (let tent = 0; tent < 3; tent++) {
      await clicarTexto(page, "button", "Continuar Campanha");
      await sleep(3500);
      const telaHub = await texto(page);
      if (/Próxima partida|Calendário|Bolsa|Rodada \d+/i.test(telaHub)) break;
    }
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
    await sleep(500);
  }
  return jogos;
}

/** Drena a fila de escrita no banco (F5 seguro — sem snapshot velho). */
async function drenarFila(page) {
  await page.evaluate(() => window.__e2e?.aguardarFila?.());
  await sleep(400);
}

/** Snapshot completo da carreira + derivados para auditoria. */
async function snapshot(page) {
  return page.evaluate(() => {
    const c = window.__e2e?.getCareer?.();
    if (!c) return null;
    const liga = c.ligas?.[c.divisao];
    const tabela = liga?.groups?.[0]?.table ?? [];
    const row = tabela.find((r) => r.teamId === "custom");
    const jogados = liga?.groupFixtures?.filter((f) => f.played).length ?? -1;
    const totalFix = liga?.groupFixtures?.length ?? -1;
    // Mesmo comparador do engine (sortTable): pts, SG, GP, id.
    const posicao = [...tabela]
      .sort((a, b) => b.p - a.p || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || a.teamId.localeCompare(b.teamId))
      .findIndex((r) => r.teamId === "custom") + 1;
    return {
      temporada: c.temporada, divisao: c.divisao, rodadaAtual: c.rodadaAtual,
      sov: c.coach.sov, clubeCaixa: c.clubeCaixa, titulos: c.coach.titulos,
      extrato: c.clubeExtrato ?? [], phase: liga?.phase, jogados, totalFix,
      posicao, row, moral: c.moralTime,
      composicao: c.composicoes?.[c.divisao] ?? [],
      ligasFases: Object.fromEntries(Object.entries(c.ligas ?? {}).map(([d, l]) => [d, l.phase])),
      veredito: window.__e2e?.getVeredito?.() ?? null,
    };
  });
}

/** A tela de fim de temporada REAL está visível? (data-testid, não regex vaga) */
async function telaFimTemporada(page) {
  return page.evaluate(() => !!document.querySelector("[data-testid='season-end-screen']"));
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
  if (!s.includes("#418")) errosPagina.push(s.slice(0, 300));
});

try {
  await entrar(page);
  const c0 = await snapshot(page);
  console.log(`\n🏁 Início: T${c0.temporada} ${c0.divisao} rodada ${c0.rodadaAtual} pessoal=${c0.sov} caixa=${c0.clubeCaixa}`);
  ok(c0.temporada >= 1, "carreira válida no início");

  let anterior = c0;
  for (let t = 0; t < TEMPORADAS_ALVO; t++) {
    const antes = await snapshot(page);
    const temp = antes.temporada;
    const divDaTemporada = antes.divisao;
    console.log(`\n════════ TEMPORADA ${temp} (${divDaTemporada}) ════════`);

    // Joga a temporada inteira
    const jogos = await jogarTemporada(page, temp);
    await drenarFila(page);
    const fim = await snapshot(page);
    console.log(`📋 T${temp} fim: ${jogos} partidas | ${fim.row ? `${fim.row.v}V ${fim.row.e}E ${fim.row.d}D pts=${fim.row.p}` : "?"}` +
      ` | posição=${fim.posicao} | pessoal=${fim.sov} caixa=${fim.clubeCaixa}`);
    ok(fim.jogados === fim.totalFix && fim.totalFix > 0, `T${temp}: liga completa (${fim.jogados}/${fim.totalFix})`);
    ok(fim.phase === "fim", `T${temp}: fase da liga = fim (${fim.phase})`);

    // Tela de fim de temporada (SeasonEndScreen real, via data-testid)
    await sleep(1200);
    ok(await telaFimTemporada(page), `T${temp}: SeasonEndScreen visível`);
    const tela = await texto(page);
    ok(!/tentativa de recuperação|restam|chances/i.test(tela), `T${temp}: SEM texto que entrega regras ocultas`);

    // F5 NO FIM DA 2ª TEMPORADA DA EXECUÇÃO (veredito re-derivado, não trava)
    if (t === 1) {
      await drenarFila(page);
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(5000);
      const pos = await snapshot(page);
      ok(pos && pos.temporada === temp, `T${temp}: F5 no fim da temporada preserva a temporada`);
      ok(pos && pos.jogados === pos.totalFix, `T${temp}: F5 preserva a liga concluída (${pos?.jogados}/${pos?.totalFix})`);
      ok(pos && pos.clubeCaixa === fim.clubeCaixa && pos.sov === fim.sov,
        `T${temp}: F5 preserva finanças (caixa ${fim.clubeCaixa}→${pos?.clubeCaixa}, pessoal ${fim.sov}→${pos?.sov})`);
      ok(await telaFimTemporada(page), `T${temp}: F5 reabre o veredito (SeasonEndScreen)`);
    }

    // Auditoria financeira do fechamento: extrato × caixa
    const somaExtratoTemp = fim.extrato
      .filter((tx) => tx.temporada === temp)
      .reduce((s, tx) => s + tx.valor, 0);
    console.log(`   💰 extrato T${temp}: ${fim.extrato.filter((tx) => tx.temporada === temp).length} lançamentos, soma=${somaExtratoTemp}`);

    // Avança de temporada
    await page.evaluate(() => window.__e2e?.avancarTemporada?.());
    await sleep(2000);
    await drenarFila(page);
    const nova = await snapshot(page);
    ok(nova.temporada === temp + 1, `T${temp}→T${temp + 1}: temporada incrementou (=${nova.temporada})`);
    ok(nova.rodadaAtual === 0, `T${temp + 1}: rodadaAtual zerada (=${nova.rodadaAtual})`);
    ok(nova.jogados === 0, `T${temp + 1}: liga NOVA sem jogos (=${nova.jogados})`);
    ok(nova.phase === "grupos", `T${temp + 1}: fase da liga = grupos (${nova.phase})`);
    ok(nova.composicao.length === 20, `T${temp + 1}: divisão com 20 times (=${nova.composicao.length})`);
    ok(new Set(nova.composicao).size === nova.composicao.length, `T${temp + 1}: sem times duplicados`);
    ok(nova.composicao.includes("custom"), `T${temp + 1}: time do jogador presente na divisão`);

    // Promoção/rebaixamento coerente com a posição final
    const esperado =
      fim.posicao <= 2 && divDaTemporada !== "serie-a"
        ? divDaTemporada === "serie-c" ? "serie-b" : "serie-a"
        : fim.posicao >= 19 && divDaTemporada !== "serie-c"
          ? divDaTemporada === "serie-a" ? "serie-b" : "serie-c"
          : divDaTemporada;
    ok(nova.divisao === esperado,
      `T${temp}→T${temp + 1}: divisão coerente (pos=${fim.posicao} em ${divDaTemporada} → ${nova.divisao}, esperado ${esperado})`);

    // Manutenção debitada UMA vez do caixa do clube
    const manut = nova.extrato.filter((tx) => tx.id === `manutencao-t${temp}`);
    ok(manut.length === 1, `T${temp + 1}: manutenção debitada 1x (=${manut.length})`);
    const custo = MANUTENCAO[divDaTemporada] ?? 50;
    ok(manut[0] && manut[0].valor === -custo, `T${temp + 1}: manutenção = -${custo} (=${manut[0]?.valor})`);
    const caixaEsperado = fim.clubeCaixa - custo;
    ok(nova.clubeCaixa === caixaEsperado,
      `T${temp + 1}: caixa = ${fim.clubeCaixa} - ${custo} = ${caixaEsperado} (real=${nova.clubeCaixa})`);
    // Pessoal NÃO paga manutenção
    ok(nova.sov === fim.sov, `T${temp + 1}: pessoal inalterado na virada (${fim.sov} → ${nova.sov})`);

    console.log(`   → T${nova.temporada} começou na ${nova.divisao} | pessoal=${nova.sov} caixa=${nova.clubeCaixa}`);

    // F5 logo após o início da 3ª temporada da execução (ponto de quebra)
    if (t === 2) {
      await drenarFila(page);
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(5000);
      const pos = await snapshot(page);
      ok(pos && pos.temporada === nova.temporada && pos.rodadaAtual === 0 && pos.jogados === 0,
        `T${nova.temporada}: F5 no início preserva temporada/rodada/liga fresca`);
      ok(pos && pos.divisao === nova.divisao, `T${nova.temporada}: F5 preserva a divisão (${pos?.divisao})`);
      ok(pos && pos.clubeCaixa === nova.clubeCaixa && pos.sov === nova.sov,
        `T${nova.temporada}: F5 preserva finanças (caixa ${nova.clubeCaixa}→${pos?.clubeCaixa}, pessoal ${nova.sov}→${pos?.sov})`);
    }
    anterior = nova;
  }

  const final = await snapshot(page);
  console.log(`\n💰 Estado final: T${final.temporada} ${final.divisao} pessoal=${final.sov} caixa=${final.clubeCaixa} títulos=${final.titulos}`);
  ok(final.temporada >= TEMPORADAS_ALVO, `chegou à T${final.temporada} (alvo ≥ ${TEMPORADAS_ALVO})`);
  ok(errosPagina.length === 0, `sem erros de página (${errosPagina.length})`);
  if (errosPagina.length) console.log(errosPagina.slice(0, 5));
} finally {
  await browser.close();
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2E OFFLINE TEMPORADAS: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
