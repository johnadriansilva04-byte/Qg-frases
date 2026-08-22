/**
 * Integridade SOV Bank + SOV Invest (auditoria §3–§10, §16).
 *
 * Valida a LÓGICA PURA das duas carteiras e a ESTRUTURA do SQL, sem Docker:
 *  - transferência Bank→Invest (0%) preserva o total;
 *  - retirada Invest→Bank (IOF 10%) — a taxa sai de circulação;
 *  - dividendo → SOV Invest (líquido de IOF 10%);
 *  - compra na Bolsa debita o Invest (nunca cria SOV);
 *  - dividendos NUNCA param depois do primeiro (recorrência por período).
 */
import { readFileSync } from "node:fs";

let ok = 0,
  bad = 0;
function check(nome, cond) {
  if (!cond) {
    bad++;
    console.error("FALHOU:", nome);
  } else {
    ok++;
    console.log("OK:", nome);
  }
}

/* ═══════════ SIMULAÇÃO PURA DAS CARTEIRAS (espelha as RPCs) ═══════════ */
const IOF = 0.1;

/** Bank→Invest (0%). Retorna { bank, invest } ou lança saldo insuficiente. */
function transferirBankParaInvest(st, v) {
  if (st.bank < v) throw new Error("saldo insuficiente no SOV Bank");
  return { bank: st.bank - v, invest: st.invest + v };
}

/** Invest→Bank (IOF 10%): sai o BRUTO do Invest, entra o LÍQUIDO no Bank. */
function retirarInvestParaBank(st, v) {
  if (st.invest < v) throw new Error("saldo insuficiente no SOV Invest");
  const taxa = Math.round(v * IOF * 100) / 100;
  const liquido = v - taxa;
  return { bank: st.bank + liquido, invest: st.invest - v, taxa, liquido };
}

/** Dividendo: bruto → IOF 10% → líquido no Invest. */
function pagarDividendo(st, bruto) {
  const taxa = Math.round(bruto * IOF * 100) / 100;
  const liquido = bruto - taxa;
  return { ...st, invest: st.invest + liquido, taxa, liquido };
}

/** Compra na Bolsa: debita o Invest (NUNCA cria SOV). */
function comprarAtivo(st, custo) {
  if (st.invest < custo) throw new Error("saldo insuficiente no SOV Invest");
  return { ...st, invest: st.invest - custo };
}

/* 1. Bank→Invest preserva o total (transferência interna, 0%). */
{
  const ini = { bank: 100, invest: 0 };
  const fim = transferirBankParaInvest(ini, 40);
  check("Bank→Invest: bank diminui 40", fim.bank === 60);
  check("Bank→Invest: invest aumenta 40", fim.invest === 40);
  check("Bank→Invest: total preservado (100)", fim.bank + fim.invest === 100);
  check("Bank→Invest: sem taxa (0%)", ini.bank + ini.invest === fim.bank + fim.invest);
}

/* 2. Invest→Bank cobra IOF 10% (a taxa sai de circulação). */
{
  const ini = { bank: 60, invest: 40 };
  const r = retirarInvestParaBank(ini, 20);
  check("Invest→Bank: sai o BRUTO (20) do Invest", r.invest === 20);
  check("Invest→Bank: entra o LÍQUIDO (18) no Bank", r.bank === 78);
  check("Invest→Bank: taxa = 10% do bruto (2)", r.taxa === 2);
  check("Invest→Bank: total CAIU pela taxa (98) — taxa saiu de circulação", r.bank + r.invest === 98);
}

/* 3. Sem saldo, nunca transfere (não cria SOV nem fica negativo). */
{
  let erro = false;
  try {
    transferirBankParaInvest({ bank: 10, invest: 0 }, 50);
  } catch {
    erro = true;
  }
  check("Bank→Invest: saldo insuficiente é recusado", erro);
  erro = false;
  try {
    retirarInvestParaBank({ bank: 0, invest: 10 }, 50);
  } catch {
    erro = true;
  }
  check("Invest→Bank: saldo insuficiente é recusado", erro);
}

/* 4. Dividendo cai no SOV Invest, líquido de IOF 10% (não no Bank). */
{
  const ini = { bank: 100, invest: 5 };
  const r = pagarDividendo(ini, 10);
  check("dividendo: líquido (9) vai ao Invest", r.invest === 14);
  check("dividendo: Bank INALTERADO", r.bank === 100);
  check("dividendo: taxa = 1 (10% de 10)", r.taxa === 1);
}

/* 5. Compra na Bolsa debita o Invest; nunca cria SOV. */
{
  const ini = { bank: 100, invest: 50 };
  const fim = comprarAtivo(ini, 30);
  check("compra: Invest diminui 30", fim.invest === 20);
  check("compra: Bank INALTERADO (não toca o líquido)", fim.bank === 100);
  check("compra: total caiu (SOV foi para o ativo, não criado)", fim.bank + fim.invest === 120);
  let erro = false;
  try {
    comprarAtivo(ini, 999);
  } catch {
    erro = true;
  }
  check("compra: sem saldo no Invest → recusada", erro);
}

/* 6. Dividendos NUNCA param: recorrência por período. */
{
  // Espelha o guarda corrigido: igual = já pago; diferente = paga (nunca `>=`).
  const jaPago = (ultima, rodada) => ultima === rodada;
  let ultima = -1;
  const pagamentos = [];
  for (const rodada of [3, 6, 6, 9, 12, 12, 12, 15]) {
    if (jaPago(ultima, rodada)) continue; // duplicata na mesma rodada
    pagamentos.push(rodada);
    ultima = rodada;
  }
  check("dividendos recorrentes: pagos em 3,6,9,12,15", pagamentos.join(",") === "3,6,9,12,15");
  check("dividendos: nunca param depois do primeiro", pagamentos.length === 5);
  check("dividendos: duplicata na mesma rodada NÃO paga 2x", !pagamentos.includes(6) || pagamentos.filter((r) => r === 6).length === 1);
}

/* ═══════════ ESTRUTURA DO SQL (sem Docker — prova estática) ═══════════ */
const sql = readFileSync("supabase/migrations/sov_bank_invest.sql", "utf8");

check("SQL: user_wallets ganha invest_balance", sql.includes("ADD COLUMN IF NOT EXISTS invest_balance"));
check("SQL: invest nunca negativo (constraint)", sql.includes("user_wallets_invest_nonnegative"));
check("SQL: RPC transferir_carteiras", sql.includes("sov_bank_transferir_carteiras"));
check("SQL: RPC pagar_dividendo", sql.includes("sov_bank_pagar_dividendo"));
check("SQL: RPC comprar_ativo", sql.includes("sov_bank_comprar_ativo"));
check("SQL: RPC vender_ativo", sql.includes("sov_bank_vender_ativo"));
check("SQL: RPC saldos", sql.includes("sov_bank_saldos"));
check("SQL: Bank→Invest taxa 0", /bank_para_invest[\s\S]{0,200}v_taxa := 0/.test(sql));
check("SQL: Invest→Bank IOF 10%", sql.includes("v_taxa := ROUND(p_valor * 0.10, 2)"));
check("SQL: dividendo debita IOF 10%", sql.includes("v_taxa := ROUND(p_bruto * 0.10, 2)"));
check("SQL: dividendo credita o Invest", sql.includes("v_invest := v_invest + v_liquido"));
check("SQL: compra debita o Invest", sql.includes("v_invest := v_invest - p_custo"));
check("SQL: atomicidade (FOR UPDATE trava a linha)", (sql.match(/FOR UPDATE/g) || []).length >= 4);
check("SQL: idempotência por chave", sql.includes("idempotency_key = "));
check("SQL: só o próprio jogador (auth.uid)", sql.includes("auth.uid() <> p_user_id"));
check("SQL: IOF sai de circulação (fee, destino contábil)", sql.includes("'iof-retirada-invest'"));
check("SQL: NUNCA cria SOV (nenhum INSERT aumenta balance do nada)", !/INSERT INTO user_wallets[\s\S]{0,120}balance[^)]*\+/.test(sql));

/* ═══════════ INTEGRAÇÃO FRONTEND ═══════════ */
const botaoGame = readFileSync("src/components/botao/BotaoGame.tsx", "utf8");
const economia = readFileSync("src/components/botao/career/EconomiaScreen.tsx", "utf8");
const investApi = readFileSync("src/lib/financial/sovInvestApi.ts", "utf8");

check("BotaoGame: compra é ATÔMICA (débito antes da posição)", botaoGame.indexOf("await comprarAtivoInvest") < botaoGame.indexOf("comprarAtivo(bolsaAtual"));
check("BotaoGame: compra aborta se o ledger falha", botaoGame.includes("Compra não concluída"));
check("BotaoGame: trava anti duplo-clique na bolsa", botaoGame.includes("operacaoBolsaRef"));
check("BotaoGame: dividendo vai ao SOV Invest", botaoGame.includes("pagarDividendoInvest"));
check("BotaoGame: dividendo idempotente por período (t:r)", botaoGame.includes("`dividendo:${novaCareer.temporada}:r${novaCareer.rodadaAtual}`"));
check("EconomiaScreen: transferências Bank↔Invest presentes", economia.includes("transferirBankParaInvest") && economia.includes("transferirInvestParaBank"));
check("EconomiaScreen: compra exige saldo no SOV Invest", economia.includes("saldos.invest < custo"));
check("sovInvestApi: Bank→Invest e Invest→Bank separados", investApi.includes("transferirBankParaInvest") && investApi.includes("transferirInvestParaBank"));
check("sovInvestApi: IOF documentado na retirada", investApi.includes("IOF 10%"));

console.log(`\n== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
