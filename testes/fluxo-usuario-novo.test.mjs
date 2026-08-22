// Garante o fluxo oficial do usuário novo (E2E financeiro):
// cadastro → perfil → carteira → bônus no ledger → wallet → cache alinhado.
// Invariantes cobertas:
//  1. O trigger de signup credita o bônus no ledger (não só no cache).
//  2. Erro real nunca vira saldo 0 (RPCs não engolem EXCEPTION).
//  3. Leitura de saldo cria a carteira (wallet inexistente ≠ "saldo 0").
//  4. O frontend faz bootstrap financeiro em TODA sessão (auto-cura).
//  5. O cache pontos_soberania só é escrito com saldo autoritativo.
import { readFileSync } from "node:fs";
let ok = 0, bad = 0;
function check(nome, cond) {
  if (!cond) { bad++; console.error("FALHOU:", nome); }
  else { ok++; }
}

const futebolSql = readFileSync("supabase/migrations/futebol.sql", "utf8");
const sovFinSql = readFileSync("supabase/migrations/sov_financial_system.sql", "utf8");
const sovCartorioSql = readFileSync("supabase/migrations/sov_integracao_cartorio.sql", "utf8");
const sovBankSql = readFileSync("supabase/migrations/sov_bank.sql", "utf8");
const useBotaoAuth = readFileSync("src/components/botao/online/useBotaoAuth.ts", "utf8");
const botaoApi = readFileSync("src/lib/botao/api.ts", "utf8");
const sovBankApi = readFileSync("src/lib/financial/sovBankApi.ts", "utf8");
const sovApi = readFileSync("src/lib/financial/sovApi.ts", "utf8");

// 1. Trigger de signup credita o bônus de cadastro no ledger.
const trigFrom = futebolSql.indexOf("CREATE OR REPLACE FUNCTION public.handle_new_user");
const trigTo = futebolSql.indexOf("$$;", trigFrom);
const trigger = futebolSql.slice(trigFrom, trigTo);
check("trigger handle_new_user chama sov_bank_bonus_cadastro", trigger.includes("PERFORM sov_bank_bonus_cadastro"));
check("trigger não quebra o cadastro se o financeiro faltar", trigger.includes("EXCEPTION WHEN OTHERS"));

// 2. Erro real nunca é engolido.
const walletFrom = sovFinSql.indexOf("CREATE OR REPLACE FUNCTION create_or_update_wallet");
const walletTo = sovFinSql.indexOf("$$;", walletFrom);
check("create_or_update_wallet não engole EXCEPTION", !sovFinSql.slice(walletFrom, walletTo).includes("EXCEPTION"));
const regFrom = sovBankSql.indexOf("CREATE OR REPLACE FUNCTION sov_bank_registrar");
const regTo = sovBankSql.indexOf("$$;", regFrom);
check("sov_bank_registrar não engole EXCEPTION", !sovBankSql.slice(regFrom, regTo).includes("EXCEPTION WHEN OTHERS"));

// 3. Leitura de saldo garante a carteira.
const saldoFrom = sovCartorioSql.indexOf("CREATE OR REPLACE FUNCTION obter_saldo_soberania");
const saldoTo = sovCartorioSql.indexOf("$$;", saldoFrom);
check("obter_saldo_soberania cria a carteira na leitura", sovCartorioSql.slice(saldoFrom, saldoTo).includes("create_or_update_wallet"));

// 4. Bônus de cadastro: idempotente e honesto sobre duplicidade.
const bonusFrom = sovBankSql.indexOf("CREATE OR REPLACE FUNCTION sov_bank_bonus_cadastro");
const bonusTo = sovBankSql.indexOf("$$;", bonusFrom);
const bonus = sovBankSql.slice(bonusFrom, bonusTo);
check("bônus usa chave idempotente signup:{user}", bonus.includes("'signup:' || p_user_id::TEXT"));
check("credited reflete duplicidade (não mente TRUE no retry)", bonus.includes("NOT COALESCE(v_dup, FALSE)"));

// 5. Frontend: bootstrap em toda sessão + cache alinhado ao saldo autoritativo.
check("useBotaoAuth roda bootstrapFinanceiro em toda sessão", useBotaoAuth.includes("bootstrapFinanceiro(u.id)"));
check("useBotaoAuth alinha cache só com saldo real (saldo != null)", useBotaoAuth.includes("saldo != null && saldo !== p.pontos_soberania"));
check("criarPerfilSeNaoExistir alinha cache ao saldo do ledger", botaoApi.includes("bootstrapFinanceiro(userId)") && botaoApi.includes("alinharCacheSoberania(userId, saldo)"));
check("alinharCacheSoberania existe e escreve pontos_soberania", botaoApi.includes("export async function alinharCacheSoberania"));
check("bootstrapFinanceiro: erro vira null, nunca 0", sovBankApi.includes("export async function bootstrapFinanceiro") && sovBankApi.includes("return null;\n}"));

// 6. Leitura de saldo no frontend: carteira inexistente = DESCONHECIDO (null),
// nunca 0 — defesa contra a RPC antiga que devolvia 0 sem wallet.
check("obterSaldoSov confere a carteira quando a RPC devolve 0", sovApi.includes('from("user_wallets")') && sovApi.includes("carteira inexistente = saldo desconhecido"));
check("obterSaldoSov: sem carteira retorna null", sovApi.includes("if (!carteira) return null;"));

console.log(`== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
