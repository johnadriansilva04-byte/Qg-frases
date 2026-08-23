/**
 * Resolve os confrontos bot×bot da rodada atual como DONO (chamada nos canal
 * do dono, com placares determinísticos por poder dos clubes).
 */
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const CODIGO = process.argv[2] ?? "CAMP-260823225053920-633738";
const EMAIL = "universal.e2e.openhands@gmail.com";
const SENHA = "Universal#2026!E2E";

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
function placar(p1, p2, chave) {
  let h = 2166136261;
  for (const ch of chave) h = ((h ^ ch.charCodeAt(0)) * 16777619) >>> 0;
  const diff = p1 - p2;
  let g1 = (h >>> 3) % 3;
  let g2 = (h >>> 11) % 3;
  if (diff > 6 && g1 <= g2) g1 = g2 + 1;
  else if (diff < -6 && g2 <= g1) g2 = g1 + 1;
  else if (diff > 0 && g1 < g2) [g1, g2] = [g2, g1];
  return { g1, g2 };
}

const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
}).then((r) => r.json());
const TOKEN = auth.access_token;
const [camp] = await rest(`botao_campeonatos_online?codigo=eq.${CODIGO}&select=*`, TOKEN);
if (!camp) { console.log("campeonato não encontrado"); process.exit(1); }
console.log(`▶ ${camp.nome} | rodada ${camp.rodada_atual} | status ${camp.status}`);
const parts = Object.fromEntries((camp.participantes ?? []).map((p) => [p.user_id, p]));
const pend = (camp.confrontos ?? []).filter(
  (c) => c.rodada === camp.rodada_atual && c.status === "pendente" && !c.bye,
);
const bb = pend.filter((c) => parts[c.j1_id]?.bot && parts[c.j2_id]?.bot);
console.log(`▶ conduit: ${pend.length} pendentes | bot×bot: ${bb.length}`);
let resolvidos = 0;
for (const c of bb) {
  const p1 = parts[c.j1_id]?.power ?? 50;
  const p2 = parts[c.j2_id]?.power ?? 50;
  const { g1, g2 } = placar(p1, p2, `${camp.id}:r${camp.rodada_atual}:${c.j1_id}x${c.j2_id}`);
  const r = await rpc(TOKEN, "resolver_confronto_bots", {
    p_campeonato_id: camp.id,
    p_rodada: camp.rodada_atual,
    p_j1: c.j1_id,
    p_j2: c.j2_id,
    p_gols_j1: g1,
    p_gols_j2: g2,
  });
  if (r.status === 200 && r.body?.id === camp.id) resolvidos++;
  else console.log(`   falhou ${parts[c.j1_id]?.abreviacao} x ${parts[c.j2_id]?.abreviacao}:`, r.body?.message ?? r.body);
}
console.log(`🤖 resolvidos: ${resolvidos}/${bb.length}`);
const [depois] = await rest(`botao_campeonatos_online?codigo=eq.${CODIGO}&select=rodada_atual,confrontos`, TOKEN);
const pendDepois = (depois.confrontos ?? []).filter(
  (c) => c.rodada === camp.rodada_atual && c.status === "pendente" && !c.bye,
);
console.log(`▶ após resolução: ${pendDepois.length} pendentes na rodada ${depois.rodada_atual}`);
