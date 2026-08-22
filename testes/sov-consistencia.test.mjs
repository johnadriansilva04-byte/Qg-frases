// Garante a consistência da fonte de verdade SOV (banco + cache).
import { readFileSync } from "node:fs";
let ok = 0, bad = 0;
function check(nome, cond) {
  if (!cond) { bad++; console.error("FALHOU:", nome); }
  else { ok++; }
}
const sovApi = readFileSync("src/lib/financial/sovApi.ts", "utf8");
const careerRemote = readFileSync("src/components/botao/career/careerRemote.ts", "utf8");
const botaoGame = readFileSync("src/components/botao/BotaoGame.tsx", "utf8");
const sovBankSql = readFileSync("supabase/migrations/sov_bank.sql", "utf8");
check("guarda transaction_id NULL → falha (fallback), nunca saldo 0", sovApi.includes("linha.transaction_id == null"));
check("quando guarda falha: log completo + retorna null", sovApi.includes("sov_bank_registrar (transação não gravada)") && sovApi.includes("return null;"));
const from = sovBankSql.indexOf("CREATE OR REPLACE FUNCTION sov_bank_registrar");
const to = sovBankSql.indexOf("$$;", from);
const corpoRegistrar = sovBankSql.slice(from, to);
check("SQL não engole mais EXCEPTION em sov_bank_registrar", !corpoRegistrar.includes("EXCEPTION WHEN OTHERS"));
check("aposta aborta quando o ledger não confirma (sem cálculo local)", careerRemote.includes("aposta NÃO confirmada") && careerRemote.includes("return null;"));
check("compra de clube aborta quando o banco recusa", botaoGame.includes("Compra não concluída"));
check("aposta: cache nunca é soma local (saldoLedger ?? atual, não atual + delta)", !careerRemote.includes("saldoLedger ?? Math.max(0, atual + delta)"));
console.log(`== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
