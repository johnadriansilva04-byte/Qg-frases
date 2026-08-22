// Guarda estrutural — RPCs do Campeonato Online ao Vivo (SQL).
// Não executa o SQL (sem pg local); verifica as invariantes estruturais.
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/futebol.sql", import.meta.url), "utf8");
let ok = 0, fail = 0;
function check(nome, cond) {
  if (cond) { ok++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
}
const fn = (nome) => {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${nome}[\\s\\S]*?END; \\$\\$;`));
  return m ? m[0] : "";
};

check("RPC _gerar_fase_grupos_campeonato existe", fn("_gerar_fase_grupos_campeonato").length > 200);
check("RPC avancar_fase_campeonato existe", fn("avancar_fase_campeonato").length > 200);
check("RPC aplicar_wo_campeonato existe", fn("aplicar_wo_campeonato").length > 200);

const res = fn("registrar_resultado_campeonato");
check("resultado usa sov_bank_registrar (ledger)", res.includes("sov_bank_registrar"));
check("resultado NÃO muta pontos_soberania seco", !/SET pontos_soberania = (GREATEST|pontos_soberania)/.test(res));
check("resultado idempotente por confronto", res.includes(":partida:"));
check("resultado FOR UPDATE", res.includes("FOR UPDATE"));

const av = fn("avancar_fase_campeonato");
check("avancar: fase grupos→mata-mata", av.includes("'grupos'") && av.includes("Principal"));
check("avancar: semifinal/final", av.includes("'semifinal'") && av.includes("'final'"));
check("avancar: define campeão", av.includes("vencedor_id"));
check("avancar: premia via ledger", av.includes("sov_bank_registrar"));
check("avancar: FOR UPDATE", av.includes("FOR UPDATE"));
check("avancar: premio configurável", av.includes("premio_sov"));

check("W.O. FOR UPDATE", fn("aplicar_wo_campeonato").includes("FOR UPDATE"));
check("W.O. não inventa SOV (sem registrar)", !fn("aplicar_wo_campeonato").includes("sov_bank_registrar"));

check("max_jogadores até 32", sql.includes("BETWEEN 2 AND 32"));
check("coluna formato", sql.includes("ADD COLUMN IF NOT EXISTS formato"));
check("coluna agendado_em", sql.includes("agendado_em TIMESTAMPTZ"));
check("coluna tolerancia_min", sql.includes("tolerancia_min"));
check("coluna premio_sov", sql.includes("premio_sov"));

console.log(`\n${ok}/${ok + fail} OK`);
process.exit(fail ? 1 : 0);
