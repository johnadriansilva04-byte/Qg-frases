/**
 * Sala final: "Copa Universal — 32 jogadores" em produção.
 *  1. Garante a conta-dono "Universal" (bônus de 50 SOV → elegível à regra).
 *  2. Cria a sala de 32 com prêmio e imprime o LINK DIRETO.
 *  3. Aguarda John A / Gueto FC entrar (poll).
 *  4. Clica "Preencher com Bots" (RPC do dono) → 32 participantes.
 *  5. Deixa a sala PRONTA (não inicia a partida).
 */
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(token, nome, body) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function rest(path, token) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  return r.json();
}
async function entrarOuCriarConta(email, senha, perfil) {
  let r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  let j = await r.json();
  if (!j.access_token) {
    r = await fetch(`${SUPA}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: KEY, "content-type": "application/json" },
      body: JSON.stringify({ email, password: senha }),
    });
    j = await r.json();
  }
  const auth = { token: j.access_token, uid: j.user?.id };
  await rpc(auth.token, "atualizar_perfil_clube", {
    p_uid: auth.uid,
    p_nome: perfil.nome,
    p_time: perfil.time,
    p_abreviacao: perfil.abrev,
    p_cores: null,
    p_tatica: null,
    p_botoes: null,
  });
  await rpc(auth.token, "sov_bank_bonus_cadastro", { p_user_id: auth.uid });
  return auth;
}

const EMAIL_DONO = "universal.e2e.openhands@gmail.com";
const SENHA_DONO = "Universal#2026!E2E";

// 0) migration v2 aplicada — confirma antes de criar
const donoProbe = await entrarOuCriarConta(EMAIL_DONO, SENHA_DONO, {
  nome: "Universal",
  time: "Universal FC",
  abrev: "UNI",
});
const probe = await rpc(donoProbe.token, "preencher_campeonato_bots", { p_codigo: "PROBE", p_bots: [] });
if (probe.body?.code === "PGRST202") {
  console.log("⚠️  migration campeonato_online_v2.sql ainda não aplicada. Aplique e rode de novo.");
  process.exit(2);
}
const saldoDono = await rpc(donoProbe.token, "obter_saldo_soberania", { p_user_id: donoProbe.uid });
console.log(`Saldo do dono (Universal): ${saldoDono.body} SOV`);

// 1) Sala de 32 (reutiliza se já existir uma aberta do dono)
let sala;
const existentes = await rest(
  `botao_campeonatos_online?criador_id=eq.${donoProbe.uid}&status=eq.aguardando&order=criado_em.desc&limit=1`,
  donoProbe.token,
);
if (existentes?.[0]) {
  sala = existentes[0];
  console.log(`Sala existente reutilizada: ${sala.codigo}`);
} else {
  const criada = await rpc(donoProbe.token, "criar_campeonato_online", {
    p_nome: "Copa Universal — 32",
    p_max: 32,
    p_premio_sov: 100,
  });
  if (!criada.body?.codigo) {
    console.log("Falha ao criar:", JSON.stringify(criada.body));
    process.exit(1);
  }
  sala = criada.body;
  console.log(`Sala criada: ${sala.codigo}`);
}
const LINK = `https://pracinha.online/cidadela?camp=${sala.codigo}`;
console.log(`\n🔗 LINK DIRETO: ${LINK}\n`);

// 2) Aguarda John A / Gueto FC entrar (até 40 min)
console.log("Aguardando John A / Gueto FC entrar na sala...");
const ehJohn = (p) =>
  /john/i.test(p.nome ?? "") || /g[eu]to/i.test(p.time_id ?? "") || /g[eu]to/i.test(p.abreviacao ?? "");
let johnEntrou = false;
for (let i = 0; i < 240 && !johnEntrou; i++) {
  await sleep(10000);
  const [atual] = await rest(
    `botao_campeonatos_online?codigo=eq.${sala.codigo}&select=participantes,status`,
    donoProbe.token,
  );
  const humanos = (atual?.participantes ?? []).filter((p) => !p.bot);
  const john = humanos.find((p) => p.user_id !== donoProbe.uid && ehJohn(p));
  if (i % 6 === 0) {
    console.log(`  ...${humanos.length} humano(s) na sala (${humanos.map((p) => p.nome).join(", ") || "só o dono"})`);
  }
  if (john) {
    johnEntrou = true;
    console.log(`\n🎮 JOHN ENTROU: ${john.nome} · ${john.time_id} (${john.abreviacao})`);
  }
  if (atual?.status && atual.status !== "aguardando") {
    console.log("A sala mudou de status — abortando espera:", atual.status);
    process.exit(1);
  }
}
if (!johnEntrou) {
  console.log("John A não entrou no tempo de espera. A sala CONTINUA ABERTA:", LINK);
  process.exit(3);
}

// 3) Preenche com bots (clubes REAIS da base TEAMS)
const { readFileSync } = await import("node:fs");
const teamsSrc = readFileSync(new URL("../src/components/botao/data/teams.ts", import.meta.url), "utf8");
const clubesBase = [...teamsSrc.matchAll(/t\("([^"]+)", "([^"]+)", "([^"]+)", "[^"]*", "[^"]*", "[^"]*", (\d+)/g)]
  .map((m) => ({ time_id: m[1], nome: m[2], abreviacao: m[3], power: Number(m[4]) }));
const preenchida = await rpc(donoProbe.token, "preencher_campeonato_bots", {
  p_codigo: sala.codigo,
  p_bots: clubesBase,
});
const parts = preenchida.body?.participantes ?? [];
console.log(`\n🤖 Preencher com Bots: ${parts.length}/32 participantes (${parts.filter((p) => p.bot).length} bots)`);
const johnAinda = parts.find((p) => !p.bot && p.user_id !== donoProbe.uid);
console.log(`✔ John A preservado: ${johnAinda ? `${johnAinda.nome} · ${johnAinda.time_id}` : "NÃO ENCONTRADO — VERIFICAR"}`);
console.log(`\n✅ Sala pronta para iniciar (dono clica "Iniciar campeonato" quando quiser): ${LINK}`);
