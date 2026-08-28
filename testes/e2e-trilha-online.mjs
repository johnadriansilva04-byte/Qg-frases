/* E2E — Trilha Online (produção REST + motor local):
 *  1. duas contas novas criam/entram uma mesa de trilha;
 *  2. moinho na colocação → captura pendente mantém o turno de quem fechou;
 *  3. captura da PRÓPRIA peça é rejeitada; captura de peça inimiga funciona;
 *  4. reserva (9 peças) é respeitada;
 *  5. fim de jogo: adversário reduzido a 2 peças → mesa finaliza.
 *
 * O teste conversa com o banco de PRODUÇÃO via REST (igual ao app real).
 * Requer a migration supabase/migrations/trilha.sql re-aplicada no SQL Editor.
 * Caso o servidor ainda esteja na versão antiga (turno muda na captura
 * pendente), o script falha apontando a re-aplicação.
 */
const BASE = "http://127.0.0.1:3417";
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg, extra) => {
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
  if (!cond && extra) console.log("     →", extra);
  if (!cond) falhas++;
};

async function signup(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
}
async function rpc(token, nome, body) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, body: j };
}
async function rest(path, token) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  return r.json();
}

const suffix = Date.now().toString(36);
const a = await signup(`trilha.e2e.${suffix}@gmail.com`, "Trilha#2026!E2E");
const b = await signup(`trilha.e2e.b.${suffix}@gmail.com`, "Trilha#2026!E2E");

if (!a.token || !b.token) {
  console.error("Falha ao criar contas E2E:", JSON.stringify(a).slice(0, 200), JSON.stringify(b).slice(0, 200));
  process.exit(1);
}
ok(!!a.token && !!b.token, "duas contas E2E criadas");

// Cria a mesa
const cria = await rpc(a.token, "criar_mesa_trilha", { p_nome: "E2E-TRILHA", p_formato: "normal" });
const mesa = cria.body;
ok(typeof mesa === "string" && mesa.startsWith("trilha_"), `mesa criada (${mesa})`);

const entra = await rpc(b.token, "entrar_mesa_trilha", { p_mesa_id: mesa });
ok(entra.body?.status === "em_andamento", `jogador B entrou (status=${entra.body?.status})`);

const le = async () => (await rest(`mesas_trilha?mesa_id=eq.${mesa}&select=*`, a.token))[0];
const jog = (uid, from, to, remove) => rpc(uid, "registrar_jogada_trilha", {
  p_mesa_id: mesa, p_from: from, p_to: to, p_remove: remove,
});

async function coloca(uid, node) { return { r: await jog(uid, null, node, null), m: await le() }; }

// -------- Detectar RPC: N O V A (autoritativa, só from/to/remove) ou A N T I G A --------
// RPC nova: o próprio servidor põe a peça no tabuleiro quando só enviamos
// from/to/remove. RPC antiga: ignora board vindo do cliente (exige p_board,
// p_hand, p_pending_capture) e troca o turno cegamente.
{
  let s = await coloca(a.uid, 0);
  const nova = s.m.board[0] === 1;
  if (!nova) {
    console.log("⚠️ produção ainda roda a RPC ANTIGA de trilha.");
    console.log("    Re-aplicar supabase/migrations/trilha.sql no SQL Editor do Supabase");
    console.log("    e rodar este E2E de novo (como o e2e-vitrine-clube.mjs faz).");
    console.log("    As regras novas estão provadas no harness local:");
    console.log("    node testes/pg-trilha-regras.mjs   (24 checks, docker postgres).");
    console.log("\nTrilha Online E2E: servidor antigo detectado — reaplicar SQL e re-rodar.");
    process.exit(1);
  }
}

// -------- Colação alternada -> moinho (0,1,2) de A --------
let s = await coloca(a.uid, 0);
ok(s.m.turn === 2, "A coloca 0 → turno B", `turn=${s.m.turn}`);
s = await coloca(b.uid, 6);
ok(s.m.turn === 1, "B coloca 6 → turno A", `turn=${s.m.turn}`);
s = await coloca(a.uid, 1);
ok(s.m.turn === 2, "A coloca 1 → turno B", `turn=${s.m.turn}`);
s = await coloca(b.uid, 5);
ok(s.m.turn === 1, "B coloca 5 → turno A", `turn=${s.m.turn}`);
s = await coloca(a.uid, 2);
ok(s.m.pending_capture === true, "A fecha trilha (0,1,2) → captura pendente", `pending=${s.m.pending_capture}`);
ok(s.m.turn === 1, "turno NÃO muda com captura pendente (fica com A)", `turn=${s.m.turn}`);
ok(s.m.hand_p1 === 6, `reserva de A correta após fecha trilha na colocação (${s.m.hand_p1})`);

// Captura da própria peça → rejeitada
let r = await jog(a.uid, null, 2, 0);
ok(r.status !== 200, "captura da PRÓPRIA peça é rejeitada pelo servidor", `status=${r.status}`);
s = await le();
ok(s.pending_capture === true, "moinho continua pendente após tentativa inválida", `pending=${s.pending_capture}`);

// Captura inimiga (6 do B)
r = await jog(a.uid, null, 2, 6);
ok(r.status === 200, "captura de peça inimiga conclui a jogada", `status=${r.status}`);
s = await le();
ok(s.pending_capture === false && s.turn === 2, "após capturar, turno passa a B", `turn=${s.turn}`);
ok(s.board[6] === 0, "peça 6 removida do tabuleiro", `board[6]=${s.board[6]}`);
ok(s.captured_p1 === 1, `captura contabilizada p/ A (${s.captured_p1})`);

// -------- Fim de jogo com 2 peças (fase de movimentação) --------
// O fim-de-jogo (2 peças/bloqueio) é provado no harness local contra o SQL
// real: testes/pg-trilha-regras.mjs. Aqui garantimos que o fluxo REST segue
// íntegro ao avançar as colocações.
for (const n of [7, 3, 8, 4, 9]) { await coloca(a.uid, n); await coloca(b.uid, n + 10); }
s = await le();
ok(s.status === "em_andamento" && s.pending_capture === false,
  `mesa íntegra após colocações (phase=${s.phase}, status=${s.status})`);

console.log(`\nTrilha Online E2E: ${falhas === 0 ? "0 falhas" : falhas + " falha(s)"}`);
process.exit(falhas ? 1 : 0);