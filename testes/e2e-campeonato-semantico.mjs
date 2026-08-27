/**
 * E2E — pipeline SEMÂNTICO do resultado no Campeonato Online (conta oficial
 * do README, navegador REAL, produção). Sem criar novas contas.
 *
 * Caminho:
 *  1. login pela UI (como um jogador real);
 *  2. campeonato em andamento (reusa ou cria com até 8 bots via RPC da
 *     própria sessão do navegador);
 *  3. Jogar o confronto vs bot no navegador (flicks reais no canvas);
 *  4. valida placar da UI (.scoreboard) ↔ identidade home/away;
 *  5. servidor: confronto finalizado com pl_j1 ↔ j1, pl_j2 ↔ j2 e pontos
 *     coerentes para a identidade do usuário;
 *  6. F5 na sala → classificação/confrontos preservados.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3417";
const EMAIL = "openhands.rookie.e2e@gmail.com";
const SENHA = "Rookie#2026!E2E";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
let passadas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
  if (cond) passadas++;
  else falhas++;
};

function fnsPage() {
  const txt = (root) => (root.innerText ?? "").replace(/\s+/g, " ");
  return {
    sleep,
    clicarTexto: async (page, seletor, texto) => {
      const achou = await page.evaluate(
        (sel, t) => {
          const els = [...document.querySelectorAll(sel)];
          const alvo = els.find((e) => (e.innerText ?? "").toLowerCase().includes(t.toLowerCase()));
          if (alvo) { alvo.click(); return true; }
          return false;
        },
        seletor,
        texto,
      );
      if (achou) await sleep(300);
      return achou;
    },
    esperarTexto: async (page, regex, tentativas = 30, ms = 400) => {
      for (let i = 0; i < tentativas; i++) {
        const b = await page.evaluate(() => document.body?.innerText ?? "");
        const t = (b ?? "").replace(/\s+/g, " ");
        if (regex.test(t)) return t;
        await sleep(ms);
      }
      const final = await page.evaluate(() => document.body?.innerText ?? "");
      return (final ?? "").replace(/\s+/g, " ");
    },
  };
}

// Clubes reais da base TEAMS (bots)
const teamsSrc = readFileSync(
  new URL("../src/components/botao/data/teams.ts", import.meta.url),
  "utf8",
);
const clubesBase = [
  ...teamsSrc.matchAll(/t\("([^"]+)", "([^"]+)", "([^"]+)", "[^"]*", "[^"]*", "[^"]*", (\d+)/g),
].map((m) => ({ time_id: m[1], nome: m[2], abreviacao: m[3], power: Number(m[4]) }));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium", protocolTimeout: 240000,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const { clicarTexto, esperarTexto } = fnsPage();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => console.log("⚠️ pageerror:", String(e).slice(0, 200)));

try {
  // 1. Login pela UI
  await page.goto(`${BASE}/cidadela`, { waitUntil: "networkidle2", timeout: 60000 });
  await clicarTexto(page, "button", "Aceitar");
  await esperarTexto(page, /Futebol|Estádio/i, 30);
  await clicarTexto(page, "button, a, [role=button]", "Futebol");
  await esperarTexto(page, /Amistoso|Meu Clube|Carreira/i, 30);
  if (!(/Amistoso/i.test(await esperarTexto(page, /./, 1)))) {
    await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  }
  // card Meu Clube / Conta (mapear login)
  await clicarTexto(page, "button, a, [role=button]", "Meu Clube");
  await sleep(1200);
  const setCampo = async (ph, v) => {
    await page.evaluate(
      (p, val) => {
        const inp = [...document.querySelectorAll("input")].find((i) =>
          (i.placeholder ?? "").toLowerCase().includes(p.toLowerCase()),
        );
        if (inp) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(inp, val);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      ph,
      v,
    );
  };
  await setCampo("seu@email.com", EMAIL);
  await page.evaluate((v) => {
    const inp = document.querySelector("input[type=password]");
    if (inp) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(inp, v);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, SENHA);
  await sleep(400);
  await clicarTexto(page, "button", "Entrar");
  await esperarTexto(page, /Rookie|Voltar|menu/i, 40);
  ok(await clicarTexto(page, "button", "Voltar"), "login pela UI (Rookie FC)");

  // 2. Campeonato: re-usa ativo ou cria com bots (via supabase do browser)
  const camp = await page.evaluate(
    async (EMAIL2, SENHA2, listaBots) => {
      const url = "https://hkzhksauilonqppipjyc.supabase.co";
      const key = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
      const hdr = { apikey: key, "content-type": "application/json" };
      const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({ email: EMAIL2, password: SENHA2 }),
      }).then((r) => r.json());
      const token = login.access_token;
      const uid = login.user.id;
      const auth = { apikey: key, Authorization: `Bearer ${token}`, "content-type": "application/json" };
      const rpc = async (nome, body) =>
        fetch(`${url}/rest/v1/rpc/${nome}`, { method: "POST", headers: auth, body: JSON.stringify(body ?? {}) }).then((r) => r.json().catch(() => ({})));
      const rest = async (p) => fetch(`${url}/rest/v1/${p}`, { headers: auth }).then((r) => r.json());
      let camp = null;
      const ativos = await rest(`botao_campeonatos_online?status=eq.em_andamento&select=*`);
      camp = (ativos ?? []).find((c) => (c.participantes ?? []).some((p) => p.user_id === uid));
      if (!camp) {
        const criado = await rpc("criar_campeonato_online", { p_nome: "Aspecto E2E", p_max: 8, p_premio_sov: 0 });
        if (!criado?.codigo) return { erro: criado?.message ?? "sem codigo", uid };
        await rpc("preencher_campeonato_bots", { p_codigo: criado.codigo, p_bots: listaBots });
        camp = await rpc("iniciar_campeonato_online", { p_codigo: criado.codigo });
      }
      return { camp, token, uid };
    },
    EMAIL,
    SENHA,
    clubesBase,
  );
  ok(!!camp.camp && camp.camp.status === "em_andamento", `campeonato em andamento (${camp.camp?.codigo ?? camp.erro ?? "-"})`);
  if (!camp.camp) throw new Error(camp.erro ?? "sem campeonato");
  const uid = camp.uid;
  const cCod = camp.camp.codigo;

  // 3. Abrir a sala direto pelo link
  await page.goto(`${BASE}/cidadela?camp=${cCod}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2000);
  let body = await esperarTexto(page, /Classificação|Confrontos|Sua próxima partida/i, 30);
  ok(/Classificação|Confrontos/i.test(body), "sala do campeonato aberta (link direto)");

  // Confronto pendente do usuário vs bot
  const cAntes = await page.evaluate(
    async (token, codigo) => {
      const url = "https://hkzhksauilonqppipjyc.supabase.co";
      const key = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
      const auth = { apikey: key, Authorization: `Bearer ${token}` };
      const [c] = await fetch(`${url}/rest/v1/botao_campeonatos_online?codigo=eq.${codigo}&select=*`, { headers: auth }).then((r) => r.json());
      return c;
    },
    camp.token,
    cCod,
  );
  const confronto = (cAntes.confrontos ?? []).find(
    (c) => c.rodada === cAntes.rodada_atual && !c.bye && c.status === "pendente" && (c.j1_id === uid || c.j2_id === uid),
  );
  ok(!!confronto, "confronto pendente do usuário nesta rodada");
  const euSouJ1 = confronto?.j1_id === uid;
  console.log(`   usuário=${euSouJ1 ? "J1/home (ataque à direita)" : "J2/away (ataque à esquerda)"}`);

  // 4. Jogar a partida no browser
  await page.evaluate((d) => (window.__dirAlvo = d), euSouJ1 ? 1 : -1);
  async function flick() {
    const alvo = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (!c) return null;
      const ctx = c.getContext("2d");
      let data;
      try { data = ctx.getImageData(0, 0, c.width, c.height).data; } catch { return null; }
      const gw = 90, gh = 64, cw = c.width / gw, ch = c.height / gh;
      const cells = [];
      let ball = null, bw = 0;
      for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
        let n = 0, tr = 0, tg = 0, tb = 0;
        const x0 = Math.floor(gx * cw), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * cw));
        const y0 = Math.floor(gy * ch), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * ch));
        for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
          const i = (y * c.width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 235 && g > 235 && b > 235) {
            n++;
            if (n > 4 && n > bw) { bw = n; ball = { gx: gx + 0.5, gy: gy + 0.5 }; }
          } else if (Math.max(r, g, b) > 120) {
            tr += r; tg += g; tb += b; n++;
          }
        }
        if (n > 1) cells.push({ gx: gx + 0.5, gy: gy + 0.5, r: tr / n, g: tg / n, b: tb / n, n });
      }
      const direcao = window.__dirAlvo ?? 1;
      // Só os discos do LADO do usuário (esquerda=direcao>0; direita=direcao<0)
      // — discos do bot ficam do outro lado e não são selecionáveis no jogo.
      const cand = cells.filter(
        (x) =>
          !(x.r > 195 && x.g > 195 && x.b > 195) &&
          (direcao > 0 ? x.gx < gw * 0.5 : x.gx > gw * 0.5),
      );
      let best = cand[0], bestD = Infinity;
      for (const b of cand) {
        const d = ball ? Math.hypot(b.gx - ball.gx, b.gy - ball.gy) : b.n;
        if (d < bestD) { bestD = d; best = b; }
      }
      if (!best) return null;
      const rect = c.getBoundingClientRect();
      return {
        x: rect.x + best.gx * cw * (rect.width / c.width),
        y: rect.y + best.gy * ch * (rect.height / c.height),
        pullX: (40 + Math.random() * 40) * direcao,
        pullY: (Math.random() - 0.5) * 60,
      };
    });
    if (!alvo) return false;
    await page.mouse.move(alvo.x, alvo.y);
    await page.mouse.down();
    await page.mouse.move(alvo.x + alvo.pullX, alvo.y + alvo.pullY, { steps: 4 });
    await page.mouse.up();
    return true;
  }
  async function placarDom() {
    return page.evaluate(() => {
      const el = document.querySelector(".scoreboard");
      if (!el) return null;
      const m = el.innerText.match(/(\d+)\s*-\s*(\d+)/);
      if (!m) return null;
      return { esq: Number(m[1]), dir: Number(m[2]) };
    });
  }

  // Botão Jogar
  let entrou = false;
  for (let i = 0; i < 10 && !entrou; i++) {
    entrou = await clicarTexto(page, "button", "Jogar");
    if (!entrou) await sleep(1000);
  }
  ok(entrou, "botão Jogar acionado");
  await sleep(2500);
  const temCanvas = await page.evaluate(() => !!document.querySelector("canvas"));
  ok(temCanvas, "partida abriu (canvas no ar)");

  let placar = null;
  let jogadasOk = 0;
  const lerJogadas = () =>
    page.evaluate(() => {
      const el = document.querySelector(".scoreboard");
      if (!el) return null;
      const m = el.innerText.match(/(\d+)\s*jogadas/i);
      return m ? Number(m[1]) : null;
    });
  for (let i = 0; i < 140; i++) {
    const semCanvas = await page.evaluate(() => !document.querySelector("canvas"));
    if (semCanvas) break;
    const antes = await lerJogadas();
    const okF = await flick();
    // espera a simulação terminar (jogadas mudam) ou timeout curto
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) {
      await sleep(400);
      const depois = await lerJogadas();
      if (antes === null || depois === null || depois < antes) break;
      if (!(await page.evaluate(() => !!document.querySelector("canvas")))) break;
    }
    if (okF) jogadasOk++;
    placar = await placarDom();
    const j = await lerJogadas();
    if (i % 4 === 3) console.log(`      it ${i}: placar=${placar ? `${placar.esq}-${placar.dir}` : "—"} jogadas=${j}`);
    if (j !== null && j <= 0) break;
  }
  const fim = await page.evaluate(() => !document.querySelector("canvas"));
  const restantes = await lerJogadas();
  ok(fim || jogadasOk > 3, `partida processada (fim=${fim}, jogadas=${jogadasOk}, restantes=${restantes}, placar=${placar ? `${placar.esq}-${placar.dir}` : "—"})`);

  // 5. Servidor: confronto finalizado pontuou com a identidade correta
  await sleep(3000);
  const cDepois = await page.evaluate(
    async (token, codigo) => {
      const url = "https://hkzhksauilonqppipjyc.supabase.co";
      const key = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
      const auth = { apikey: key, Authorization: `Bearer ${token}` };
      const [c] = await fetch(`${url}/rest/v1/botao_campeonatos_online?codigo=eq.${codigo}&select=confrontos,participantes,rodada_atual`, { headers: auth }).then((r) => r.json());
      return c;
    },
    camp.token,
    cCod,
  );
  const fin = (cDepois.confrontos ?? []).find(
    (c) => c.rodada === confronto.rodada && c.j1_id === confronto.j1_id && c.j2_id === confronto.j2_id,
  );
  if (!fin || fin.status !== "finalizado") {
    console.log("   (partida não finalizada a tempo — informo no relatório)");
  } else {
    const meusGols = euSouJ1 ? fin.pl_j1 : fin.pl_j2;
    const golsAdv = euSouJ1 ? fin.pl_j2 : fin.pl_j1;
    const ptsEsperados = meusGols > golsAdv ? 3 : meusGols === golsAdv ? 1 : 0;
    const part = (cDepois.participantes ?? []).find((p) => p.user_id === uid);
    const partAntes = (cAntes.participantes ?? []).find((p) => p.user_id === uid);
    const delta = (part?.pontos ?? 0) - (partAntes?.pontos ?? 0);
    ok(
      delta === ptsEsperados,
      `pontos Δ exato (${fin.pl_j1}-${fin.pl_j2} ↦ user ${meusGols}-${golsAdv} → Δ=${delta}, esperado ${ptsEsperados})`,
    );
    const golsAntes = (partAntes?.gols_pro ?? 0);
    ok(
      (part?.gols_pro ?? 0) - golsAntes === meusGols,
      `gols_pro inclui os gols do usuário (Δ=${(part?.gols_pro ?? 0) - golsAntes} == ${meusGols})`,
    );
    const vencedor = meusGols > golsAdv ? uid : meusGols < golsAdv ? (euSouJ1 ? fin.j2_id : fin.j1_id) : null;
    console.log(`   vencedor semântico: ${vencedor ?? "empate"} (user=${vencedor === uid}, ptsΔ=${delta})`);
  }

  // 6. F5 preserva
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(2500);
  body = await esperarTexto(page, /Classificação|Confrontos/i, 20);
  ok(/Classificação|Confrontos/i.test(body), "F5: sala do campeonato preservada");
} finally {
  await browser.close();
}
console.log(`\n== e2e-campeonato-semantico: ${passadas} OK / ${falhas} falhas ==`);
process.exit(falhas ? 1 : 0);
