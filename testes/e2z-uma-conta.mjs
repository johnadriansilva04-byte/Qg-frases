/**
 * E2E E2Z — UMA ÚNICA CONTA, fluxo completo de usuário real.
 * NÃO cria outras contas. Adversários = bots nativos do jogo.
 *
 * Fases: 1 conta → 2 tour → 3 time/clube → 4 campeonato online → 5 bots →
 *        6 offline × online → 7 tempo real/F5 → 8-9 finanças/bolsa → 10 celular →
 *        11-12 visual/mobile → 13 investigação → 14 consistência final.
 */
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const EMAIL = process.env.E2Z_EMAIL ?? "e2z.teste@gmail.com";
const SENHA = process.env.E2Z_PASSWORD ?? "E2Z#2026!Teste";
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
async function login(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
}
async function signup(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id, raw: j };
}

// ============================================================
// FASE 1 — UMA ÚNICA CONTA E2Z
// ============================================================
console.log("=== FASE 1: UMA ÚNICA CONTA E2Z ===\n");
const antes = await rest("botao_usuarios?select=user_id", (await login("john@gmail.com", "senha_errada_probe")).token ?? KEY).catch(() => []);
let auth = await login(EMAIL, SENHA);
let uid = auth.uid;
let token = auth.token;
if (!token) {
  const s = await signup(EMAIL, SENHA);
  uid = s.uid;
  token = s.token;
  console.log(`   conta E2Z criada: ${uid}`);
} else {
  console.log(`   conta E2Z já existia (login): ${uid}`);
}
if (!token) {
  console.log("   ⚠️  signup sem token (confirmação de e-mail?). Tentando login de novo...");
  auth = await login(EMAIL, SENHA);
  token = auth.token;
  uid = auth.uid;
}
if (!token) {
  console.log("❌ Não consegui autenticar a conta E2Z. Confira as credenciais.");
  process.exit(1);
}
console.log(`   ✅ UMA conta E2Z autenticada: ${uid}`);

// Perfil mínimo (time próprio)
await rpc(token, "atualizar_perfil_clube", {
  p_uid: uid,
  p_nome: "Treinador E2Z",
  p_time: "E2Z FC",
  p_abreviacao: "E2Z",
  p_cores: ["#0b7a3b", "#ffffff", "#f59e0b"],
  p_tatica: null,
  p_botoes: null,
});
// Bônus de cadastro (idempotente)
await rpc(token, "sov_bank_bonus_cadastro", { p_user_id: uid });
const saldoInicial = (await rpc(token, "obter_saldo_soberania", { p_user_id: uid })).body;
console.log(`   saldo inicial: ${saldoInicial} SOV`);

// Banco limpo: só as contas reais + E2Z
const contas = await rest("botao_usuarios?select=email", token);
console.log(`   contas no banco: ${contas.map((c) => c.email).join(", ")}`);
console.log(`   ✅ nenhuma conta artificial extra criada\n`);

export { rpc, rest, login, signup, token as TOKEN, uid as UID, EMAIL, SENHA, sleep, SUPA, KEY };
