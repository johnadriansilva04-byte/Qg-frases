/* Probe: qual é o saldo REAL da carteira em produção segundo cada RPC. */
const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const ANON = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const EMAIL = process.env.E2E_EMAIL, SENHA = process.env.E2E_PASSWORD;
const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
}).then(r => r.json());
const token = auth.access_token, uid = auth.user.id;
const H = { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const rpc = async (nome, body = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  const t = await r.text();
  return `${r.status} ${t.slice(0, 300)}`;
};
console.log("obter_saldo_soberania:", await rpc("obter_saldo_soberania"));
console.log("sov_bank_saldos:", await rpc("sov_bank_saldos"));
console.log("sov_bank_reconciliar:", await rpc("sov_bank_reconciliar"));
console.log("extrato (5):", await rpc("sov_bank_extrato", { p_user_id: uid, p_limite: 5 }));
const u = await fetch(`${SUPA}/rest/v1/botao_usuarios?user_id=eq.${uid}&select=pontos_soberania,progresso_caminpanha`, { headers: H }).then(r => r.json());
const c = u[0]?.progresso_caminpanha?.career ?? {};
console.log("cache pontos_soberania:", u[0]?.pontos_soberania, "| coach.sov:", c.coach?.sov, "| clubeCaixa:", c.clubeCaixa);
