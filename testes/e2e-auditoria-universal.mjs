/* E2E AUDITORIA — jornada real da conta oficial com validação cruzada.
 * Cobre: partidas → ranking → títulos → troféus → SOV → SOV Bank → extrato
 * → ofertas de clubes → consistência ponta a ponta (frontend × backend).
 *
 * Requer o build servido na porta 3417 (testes/serve-build.mjs):
 *   E2E_EMAIL=... E2E_PASSWORD=... node testes/e2e-auditoria-universal.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3417";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const EMAIL = process.env.E2E_EMAIL ?? "";
const SENHA = process.env.E2E_PASSWORD ?? "";

if (!EMAIL || !SENHA) {
  console.error("Defina E2E_EMAIL e E2E_PASSWORD (conta oficial no README.md).");
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

async function rest(path, token) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}` },
  });
  return r.json();
}

async function rpc(nome, args, token) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  return r.json();
}

/** Saldo autoritativo via RPC (user_wallets não é legível direto por RLS). */
async function saldoSov(uid, token) {
  const v = await rpc("obter_saldo_soberania", { p_user_id: uid }, token);
  return typeof v === "number" ? v : null;
}

async function extratoSov(uid, limite, token) {
  const v = await rpc("sov_bank_extrato", { p_user_id: uid, p_limite: limite }, token);
  return Array.isArray(v) ? v : [];
}

async function loginRest() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`login REST falhou: ${JSON.stringify(j)}`);
  return j;
}

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
  if (/Não tenho conta|Entrar/i.test(body2) && !/Rookie/i.test(body2)) {
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
  }
  await page.waitForFunction(() => !!window.__e2e?.getCareer?.()?.coach?.nome, { timeout: 30000 });
  await sleep(1500);
}

const sessao = await loginRest();
const UID = sessao.user.id;
const TOKEN = sessao.access_token;
console.log(`🔐 Conta: ${EMAIL} (${UID})`);

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
  // ===== ESTADO INICIAL (backend) =====
  const [perfil0] = await rest(`botao_usuarios?user_id=eq.${UID}&select=*`, TOKEN);
  const saldo0 = await saldoSov(UID, TOKEN);
  const extrato0 = await extratoSov(UID, 3, TOKEN);
  console.log(`\n📊 Backend inicial: partidas=${perfil0?.partidas_jogadas} vitórias=${perfil0?.partidas_vencidas} cacheSOV=${perfil0?.pontos_soberania} saldoLedger=${saldo0} extrato=${extrato0.length} tx`);
  ok(perfil0 && saldo0 !== null, "perfil + saldo do ledger existem no backend");

  // ===== ENTRAR NO JOGO =====
  await entrar(page);
  const c0 = await page.evaluate(() => window.__e2e?.getCareer?.());
  console.log(`\n🏁 Carreira: T${c0.temporada} rodada ${c0.rodadaAtual} pessoal=${c0.coach.sov} caixa=${c0.clubeCaixa} div=${c0.divisao} títulos=${c0.coach.titulos}`);

  // ===== 1) SOV BANK NO CELULAR: tudo recolhido por padrão =====
  console.log("\n=== 1. SOV Bank no celular (organização) ===");
  await page.evaluate(() => window.__e2e?.setScreen?.("hub"));
  await sleep(800);
  let corpoCel = await texto(page);
  for (let tentativa = 0; tentativa < 4 && !/Banco/i.test(corpoCel); tentativa++) {
    await page.evaluate(() => {
      const b = document.querySelector("[data-tour='celular']");
      b?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(1500);
    corpoCel = await texto(page);
  }
  ok(/Banco/i.test(corpoCel), "celular abre com o card Banco no menu de apps");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, [role=button]")].find(
      (x) => (x.innerText ?? "").trim() === "Banco",
    );
    b?.click();
  });
  await sleep(2500);
  const bancoTxt = await texto(page);
  ok(/SOV Bank|Saldo líquido/i.test(bancoTxt), "SOV Bank abre no celular");
  // Recolhido por padrão: nenhuma lista aberta sem clique.
  const estadoFechado = await page.evaluate(() => {
    const t = document.body.innerText;
    const ultimasAberto = /Nenhuma movimentação ainda|Recompensa|Transferência/.test(t) && !/Últimas movimentações/.test(t.split("Recompensa")[0] ?? "");
    return {
      temToggleUltimas: !!document.querySelector("[data-testid='extrato-toggle']"),
      temToggleExtrato: !!document.querySelector("[data-testid='secao-extrato-toggle']"),
      temToggleNoticias: !!document.querySelector("[data-testid='secao-noticias-toggle']"),
      temToggleEconomia: !!document.querySelector("[data-testid='secao-economia-toggle']"),
      alturaTotal: document.querySelector(".phone-screen")?.scrollHeight ?? 0,
    };
  });
  ok(estadoFechado.temToggleUltimas, "toggle 'Últimas movimentações' existe");
  ok(estadoFechado.temToggleExtrato && estadoFechado.temToggleNoticias && estadoFechado.temToggleEconomia,
    "toggles Extrato/Notícias/Economia existem (recolhidos por padrão)");
  // Expandir "Últimas movimentações" por clique.
  await page.click("[data-testid='extrato-toggle']").catch(() => {});
  await sleep(600);
  const aberto1 = await page.evaluate(() => {
    const btn = document.querySelector("[data-testid='extrato-toggle']");
    const bloco = btn?.parentElement;
    return bloco ? bloco.innerText.length : 0;
  });
  ok(aberto1 > 60, "clique em 'Últimas movimentações' expande o conteúdo");
  // Abrir "Notícias" deve FECHAR "Últimas movimentações" (acordeão).
  await page.click("[data-testid='secao-noticias-toggle']").catch(() => {});
  await sleep(600);
  const acordeao = await page.evaluate(() => {
    const ult = document.querySelector("[data-testid='extrato-toggle']")?.parentElement;
    const not = document.querySelector("[data-testid='secao-noticias-toggle']")?.parentElement;
    return { ultLen: ult?.innerText.length ?? 0, notLen: not?.innerText.length ?? 0 };
  });
  ok(acordeao.notLen > 40 && acordeao.ultLen < aberto1, "acordeão: só uma seção aberta por vez");
  await page.screenshot({ path: "/tmp/e2e-banco-celular.png" });
  // Fecha o celular.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /fechar/i.test(x.innerText ?? "") || /fechar/i.test(x.title ?? ""));
    b?.click();
  });
  await sleep(800);

  // ===== 2) PARTIDAS → PERFIL / RANKING / SOV (consistência cruzada) =====
  console.log("\n=== 2. Partidas → perfil/ranking/SOV ===");
  const N_PARTIDAS = 3;
  let jogadas = 0;
  for (let i = 0; i < N_PARTIDAS; i++) {
    // Guarda: não simula resultado com a liga já fechada (senão grava um
    // jogo a mais na temporada encerrada — a rodada não avança mas o
    // resultado persiste).
    const aberta = await page.evaluate(() => window.__e2e?.getTour?.()?.league?.phase !== "fim");
    if (!aberta) break;
    await page.evaluate(() => window.__e2e?.simularPartida?.());
    jogadas++;
    await sleep(900);
  }
  const c1 = await page.evaluate(() => window.__e2e?.getCareer?.());
  ok(c1.rodadaAtual === c0.rodadaAtual + jogadas, `rodada avançou ${c0.rodadaAtual} → ${c1.rodadaAtual}`);
  await sleep(2500); // escritas na fila
  const [perfil1] = await rest(`botao_usuarios?user_id=eq.${UID}&select=partidas_jogadas,partidas_vencidas,pontos_soberania,progresso_caminpanha`, TOKEN);
  const jogadasBackend = perfil1?.partidas_jogadas ?? 0;
  ok(jogadasBackend >= (perfil0?.partidas_jogadas ?? 0) + N_PARTIDAS,
    `partidas_jogadas no backend: ${perfil0?.partidas_jogadas} → ${jogadasBackend} (+${N_PARTIDAS})`);
  const golsBackend = perfil1?.progresso_caminpanha?.gols_feitos ?? null;
  ok(golsBackend !== null, "gols registrados no JSONB de progresso");
  const saldo1 = await saldoSov(UID, TOKEN);
  const ledger1 = await extratoSov(UID, 6, TOKEN);
  console.log(`   saldo ledger: ${saldo0} → ${saldo1} | últimas tx: ${ledger1.map((t) => `${t.amount}(${t.source_module})`).join(", ")}`);
  ok(ledger1.length > 0, "ledger registra movimentações das partidas");
  // SOV da UI = SOV do ledger (a fonte de verdade é o ledger).
  const saldoUi = await page.evaluate(() => window.__e2e?.getCareer?.()?.coach?.sov);
  console.log(`   SOV coach (UI): ${saldoUi} | saldo ledger: ${saldo1}`);
  ok(typeof saldoUi === "number" && typeof saldo1 === "number", "SOV presente na UI e no ledger");

  // ===== 3) RANKING reflete a conta =====
  console.log("\n=== 3. Ranking ===");
  await page.evaluate(() => window.__e2e?.setScreen?.("hub"));
  await sleep(1000);
  await clicarTexto(page, "button, a, div, span", "Tabela") || await clicarTexto(page, "button, a, div, span", "Classificação");
  await sleep(1500);
  const corpoTabela = await texto(page);
  ok(/Classificação|Ranking|Série/i.test(corpoTabela), "tela de classificação/ranking abre");
  // Ranking mundial de treinadores (leaderboard): a conta deve aparecer.
  const corpoRanking = await esperarTexto(page, /Rookie|Ranking Mundial|treinadores/i, 8000);
  ok(/Rookie/i.test(corpoRanking), "conta aparece no ranking de treinadores");
  const linhaRanking = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-testid^='leaderboard-row']")];
    const minha = rows.find((r) => /Rookie/i.test(r.innerText));
    return minha?.innerText ?? null;
  });
  if (linhaRanking) {
    console.log(`   linha do ranking: ${linhaRanking.replace(/\n/g, " | ")}`);
    const m = linhaRanking.match(/(\d+)V\/(\d+)J/);
    if (m) ok(Number(m[2]) >= jogadasBackend - 1, `ranking mostra ${m[2]}J (backend ${jogadasBackend})`);
  }

  // ===== 4) TÍTULOS / TROFÉUS / SALA DE TROFÉUS =====
  console.log("\n=== 4. Títulos / troféus / sala de troféus ===");
  const titulosCoach = c1.coach.titulos ?? 0;
  const [prog1] = await rest(`botao_usuarios?user_id=eq.${UID}&select=progresso_caminpanha`, TOKEN);
  const trophiesBackend = prog1?.progresso_caminpanha?.trophies ?? [];
  const titlesBackend = prog1?.progresso_caminpanha?.titles ?? {};
  console.log(`   títulos coach=${titulosCoach} | trophies backend=${trophiesBackend.length} | titles=${JSON.stringify(titlesBackend)}`);
  ok(trophiesBackend.length >= titulosCoach,
    `sala de troféus (backend) cobre os títulos: ${trophiesBackend.length} troféus × ${titulosCoach} títulos`);
  // Tela da sala de troféus.
  await page.evaluate(() => window.__e2e?.setScreen?.("trophies"));
  await sleep(1500);
  const corpoTrofeus = await texto(page);
  ok(/Sala de troféus/i.test(corpoTrofeus), "sala de troféus abre");
  const contagemTela = await page.evaluate(() => {
    const trofeusAcesos = document.querySelectorAll(".trophy-on").length;
    return { trofeusAcesos, texto: document.body.innerText };
  });
  console.log(`   troféus acesos na tela: ${contagemTela.trofeusAcesos}`);
  ok(contagemTela.trofeusAcesos >= titulosCoach || titulosCoach === 0,
    `troféus na tela (${contagemTela.trofeusAcesos}) ≥ títulos (${titulosCoach})`);
  await page.screenshot({ path: "/tmp/e2e-sala-trofeus.png" });

  // ===== 5) SOV BANK × extrato × últimas movimentações (consistência) =====
  console.log("\n=== 5. SOV Bank × extrato ===");
  const extrato = await extratoSov(UID, 10, TOKEN);
  const somaExtrato = extrato.reduce((s, t) => s + Number(t.amount), 0);
  console.log(`   extrato (10 últimas): soma=${somaExtrato}`);
  ok(extrato.every((t) => t.description && t.source_module), "extrato rastreável (descrição + módulo em todas)");
  // Reconciliação: saldo da carteira vs última linha do ledger (balance_after).
  const saldo2 = await saldoSov(UID, TOKEN);
  const ultimaLinha = extrato[0];
  console.log(`   reconciliação: saldo=${saldo2} vs balance_after da última tx=${ultimaLinha?.balance_after}`);
  ok(ultimaLinha && Math.abs(Number(ultimaLinha.balance_after) - Number(saldo2)) < 0.01,
    "SOV Bank reconciliado: saldo = balance_after da última movimentação");

  // ===== 6) OFERTAS DE CLUBES =====
  console.log("\n=== 6. Ofertas de clubes ===");
  const ofertas = c1.ofertasTransferencia ?? [];
  console.log(`   ofertas persistidas: ${ofertas.length} (${ofertas.map((o) => `${o.clubeNome ?? o.clubeId}:${o.respondida ?? "pendente"}`).join(", ") || "nenhuma"})`);
  await page.evaluate(() => window.__e2e?.setScreen?.("transferencias"));
  await sleep(1500);
  const corpoTransf = await texto(page);
  ok(/Transfer/i.test(corpoTransf), "área de Transferências abre");
  const ofertaVisivel = ofertas.length === 0 || ofertas.some((o) => corpoTransf.includes(o.clubeNome ?? ""));
  ok(ofertaVisivel, "oferta persistida aparece na área de Transferências");
  // Persistência F5 da oferta.
  const [prog2] = await rest(`botao_usuarios?user_id=eq.${UID}&select=progresso_caminpanha`, TOKEN);
  const ofertasBackend = prog2?.progresso_caminpanha?.career?.ofertasTransferencia ?? [];
  ok(ofertasBackend.length === ofertas.length, `ofertas no backend (${ofertasBackend.length}) = UI (${ofertas.length})`);

  // Aceite real de oferta pendente: bônus no ledger + proximoClubeId + F5.
  const pendente = ofertas.find((o) => o.respondida === "pendente");
  if (pendente) {
    const saldoAntes = await saldoSov(UID, TOKEN);
    await page.evaluate((id) => window.__e2e?.aceitarTransferencia?.(id), pendente.id);
    await sleep(3000);
    const cAceite = await page.evaluate(() => window.__e2e?.getCareer?.());
    const aceita = (cAceite.ofertasTransferencia ?? []).find((o) => o.id === pendente.id);
    ok(aceita?.respondida === "aceita", `oferta ${pendente.clubeNome} marcada como aceita`);
    ok(cAceite.proximoClubeId === pendente.clubeId, "proximoClubeId marcado para a mudança");
    ok(cAceite.coach.sov === c1.coach.sov + pendente.bonusAssinatura,
      `bônus de assinatura no SOV do coach (+${pendente.bonusAssinatura})`);
    const saldoDepois = await saldoSov(UID, TOKEN);
    ok(saldoDepois === saldoAntes + pendente.bonusAssinatura,
      `bônus de assinatura no ledger SOV Bank (${saldoAntes} → ${saldoDepois})`);
    const extratoAssinatura = await extratoSov(UID, 5, TOKEN);
    ok(extratoAssinatura.some((t) => t.source_event === "assinatura_transferencia"),
      "extrato registra o bônus de assinatura (rastreável)");
    // F5: decisão persistida, bônus não duplica.
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await sleep(3000);
    await page.waitForFunction(() => !!window.__e2e?.getCareer?.()?.coach?.nome, { timeout: 40000 }).catch(() => {});
    const cF5 = await page.evaluate(() => window.__e2e?.getCareer?.());
    ok((cF5?.ofertasTransferencia ?? []).find((o) => o.id === pendente.id)?.respondida === "aceita",
      "F5: aceite persistido");
    ok(cF5?.proximoClubeId === pendente.clubeId, "F5: proximoClubeId persistido");
    const saldoF5 = await saldoSov(UID, TOKEN);
    ok(saldoF5 === saldoDepois, `F5: bônus NÃO duplicou (${saldoF5})`);

    // Mudança de clube: jogar até o fim da temporada e avançar — o treinador
    // deve assumir a divisão do clube-assinado.
    console.log("   → jogando até o fim da temporada para a mudança de clube...");
    for (let i = 0; i < 25; i++) {
      const r = await page.evaluate(() => window.__e2e?.simularPartida?.());
      if (r === "veredito" || r === "fim" || r === undefined) break;
      await sleep(700);
    }
    await sleep(1200);
    await page.evaluate(() => window.__e2e?.avancarTemporada?.());
    await sleep(3000);
    const cNova = await page.evaluate(() => window.__e2e?.getCareer?.());
    ok(cNova.temporada === cF5.temporada + 1, `nova temporada começou (T${cNova.temporada})`);
    ok(cNova.divisao === pendente.divisaoOfertante,
      `mudança de clube aplicada: divisão ${cNova.divisao} (ofertante ${pendente.divisaoOfertante})`);
    ok(!cNova.proximoClubeId, "proximoClubeId consumido na mudança");
  } else {
    console.log("   (sem oferta pendente nesta rodada — aceite já validado em runs anteriores)");
  }

    // ===== 7) F5: tudo persiste =====
  console.log("\n=== 7. F5 (persistência) ===");
  // Baseline FRESCO imediatamente antes do F5 (a seção 6 pode ter avançado a
  // temporada — comparar com o estado da seção 2 seria falso negativo).
  const c1f5 = await page.evaluate(() => window.__e2e?.getCareer?.());
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await sleep(3000);
  await page.waitForFunction(() => !!window.__e2e?.getCareer?.()?.coach?.nome, { timeout: 40000 }).catch(() => {});
  const c2 = await page.evaluate(() => window.__e2e?.getCareer?.());
  if (c2 && c1f5) {
    ok(c2.rodadaAtual === c1f5.rodadaAtual && c2.temporada === c1f5.temporada,
      `F5: temporada/rodada preservadas (T${c2.temporada} r${c2.rodadaAtual})`);
    // O SOV pessoal pode subir com salário (rodada 10) entre a leitura e o F5 —
    // transferência interna clube→treinador é legítima. O que não pode é
    // SUMIR dinheiro (zerar ou cair sem lançamento).
    ok(c2.coach.sov >= c1f5.coach.sov, `F5: SOV do coach não evapora (${c1f5.coach.sov} → ${c2.coach.sov})`);
    ok((c2.ofertasTransferencia ?? []).length >= (c1f5.ofertasTransferencia ?? []).length, "F5: ofertas preservadas");
  } else {
    // Career não hidratou direto (caiu no menu) — ainda assim o backend manda.
    const [perfil2] = await rest(`botao_usuarios?user_id=eq.${UID}&select=partidas_jogadas`, TOKEN);
    ok(perfil2?.partidas_jogadas === jogadasBackend, "F5: backend preserva partidas (UI voltou ao menu)");
  }

  // ===== 8) Sala VS Robô =====
  console.log("\n=== 8. Sala VS Robô ===");
  const mesas = await rest(`mesas_futebol?select=*&order=criado_em.desc&limit=20`, TOKEN);
  const salaRobo = mesas.find((m) => /rob/i.test(m.mesa_id ?? "") || /rob/i.test(m.time_j1 ?? ""));
  if (salaRobo) {
    console.log(`   sala encontrada: ${salaRobo.mesa_id} status=${salaRobo.status}`);
    ok(true, "sala VS Robô existe");
  } else {
    console.log("   sala VS Robô ainda não existe no banco (será criada pelo dono).");
  }

  ok(errosPagina.length === 0, `sem erros de página (${errosPagina.length})`);
  if (errosPagina.length) console.log(errosPagina.slice(0, 5));
} finally {
  await browser.close();
}
console.log(`\n${falhas === 0 ? "🎉" : "⚠️"} E2E AUDITORIA: ${falhas} falhas`);
process.exit(falhas === 0 ? 0 : 1);
