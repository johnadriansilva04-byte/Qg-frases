/**
 * Deleta as contas de TESTE que eu criei durante os E2Es (senhas conhecidas
 * criadas por mim — não são do usuário real). Cada conta se chama
 * excluir_conta_total() autenticada como dona de si própria.
 */
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const PASSWORDS = ["Link#2026!E2E", "Conv#2026!E2E", "Auth#2026!E2E", "Dbg#2026!E2E", "Rookie#2026!E2E", "Dono#2026!E2E", "Universal#2026!E2E"];

const emails = [
  "universal.e2e.openhands@gmail.com",
];

const r = await fetch(`${SUPA}/rest/v1/botao_usuarios?select=user_id,email`, { headers: { apikey: KEY } })
  .then((x) => x.json()).catch(() => []);
const teste = r.filter((u) => /e2e\.|universal\.e2e/i.test(u.email ?? ""));
console.log(`Deletando ${teste.length} contas de teste...`);
let deletadas = 0;
let falharam = 0;
for (const u of teste) {
  // Dono "Universal" NUNCA é deletado (é o dono da sala de 32).
  if (u.email === "universal.e2e.openhands@gmail.com") {
    console.log(`   (dono mantido): ${u.email}`);
    continue;
  }
  // tenta as senhas conhecidas criadas por mim
  let auth = null;
  for (const senha of PASSWORDS) {
    const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: KEY, "content-type": "application/json" },
      body: JSON.stringify({ email: u.email, password: senha }),
    }).then((x) => x.json()).catch(() => null);
    if (res?.access_token) { auth = res; break; }
  }
  if (!auth?.access_token) {
    console.log(`   ⚠️  senha desconhecida (não deletada): ${u.email}`);
    falharam++;
    continue;
  }
  try {
    const del = await fetch(`${SUPA}/rest/v1/rpc/excluir_conta_total`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${auth.access_token}`, "content-type": "application/json" },
      body: "{}",
    }).then((x) => x.text());
    deletadas++;
  } catch {
    falharam++;
  }
}
console.log(`\n${deletadas} deletadas / ${falharam} falharam`);
process.exit(falharam === 0 ? 0 : 1);
