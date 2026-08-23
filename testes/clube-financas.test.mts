/**
 * Separação financeira CLUBE × TREINADOR (§10-§14) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/clube-financas.test.mts
 */
import {
  INTERVALO_SALARIO,
  MAX_EXTRATO_CLUBE,
  SALARIO_POR_DIVISAO,
  chaveSalarioLedger,
  devePagarSalario,
  idSalario,
  normalizarClubeFinancas,
  registrarDespesaClube,
  registrarReceitaClube,
  salarioDa,
  type TransacaoClube,
} from "../src/components/botao/career/clubeFinancas";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

/* --- receita/despesa do clube --- */
{
  const r = registrarReceitaClube(0, [], 3, "Vitória 2x1", 1, 1);
  ok(r.caixa === 3 && r.extrato.length === 1, "receita entra no caixa do clube");
  ok(r.extrato[0]!.tipo === "receita" && r.extrato[0]!.valor === 3, "extrato registra a receita");
  const d = registrarDespesaClube(r.caixa, r.extrato, 50, "Manutenção", 0, 1);
  ok(d.caixa === -47, "despesa deixa o clube NEGATIVO (dívida do clube é válida)");
  ok(d.extrato[0]!.tipo === "despesa" && d.extrato[0]!.valor === -50, "extrato registra a despesa");
  const zero = registrarReceitaClube(10, [], 0, "nada", 1, 1);
  ok(zero.caixa === 10 && zero.extrato.length === 0, "valor zero não gera lançamento");
}

/* --- salário: a cada 10 rodadas, sai do clube para o treinador --- */
{
  ok(INTERVALO_SALARIO === 10, "intervalo de salário é 10 rodadas");
  ok(devePagarSalario(10) && devePagarSalario(20) && devePagarSalario(40), "rodadas 10/20/40 pagam salário");
  ok(!devePagarSalario(0) && !devePagarSalario(9) && !devePagarSalario(15), "demais rodadas não pagam");
  ok(salarioDa("serie-c") === SALARIO_POR_DIVISAO["serie-c"], "salário por divisão (C)");
  ok(
    SALARIO_POR_DIVISAO["serie-a"]! > SALARIO_POR_DIVISAO["serie-b"]! &&
      SALARIO_POR_DIVISAO["serie-b"]! > SALARIO_POR_DIVISAO["serie-c"]!,
    "salário cresce com a divisão (carreira progressiva)",
  );
  ok(idSalario(2, 30) === "salario-t2-r30", "id do lançamento idempotente por rodada");
  ok(
    chaveSalarioLedger("u1", 2, 30) === "salario:u1:t2:r30",
    "chave do par de ledger idempotente (F5 não paga 2x)",
  );
}

/* --- saneamento do JSONB --- */
{
  const n = normalizarClubeFinancas(undefined, "lixo");
  ok(n.caixa === 0 && n.extrato.length === 0, "JSONB ausente → clube zerado");
  const n2 = normalizarClubeFinancas(-120, [
    { id: "a", tipo: "receita", valor: 5, descricao: "x", rodada: 1, temporada: 1 },
    { id: "a", tipo: "receita", valor: 5, descricao: "dup", rodada: 1, temporada: 1 },
    { id: "b", tipo: "salario", valor: -10, descricao: "s", rodada: 10, temporada: 1 },
  ]);
  ok(n2.caixa === -120, "caixa negativo sobrevive à hidratação");
  ok(n2.extrato.length === 2, "extrato sem duplicatas por id");
  const gigante = normalizarClubeFinancas(
    0,
    Array.from({ length: 200 }, (_, i) => ({
      id: `t${i}`,
      tipo: "receita",
      valor: 1,
      descricao: "",
      rodada: i,
      temporada: 1,
    })) as TransacaoClube[],
  );
  ok(gigante.extrato.length <= MAX_EXTRATO_CLUBE, "extrato capado (JSONB não incha)");
}

/* --- invariante do dono: dinheiro do clube NUNCA vai ao treinador direto --- */
{
  // O único fluxo clube→treinador é o salário (a cada 10 rodadas).
  const receita = registrarReceitaClube(0, [], 500, "premiação", 5, 1);
  ok(receita.caixa === 500, "premiação inteira fica no clube (treinador não recebe nada dela)");
}

console.log(`\n🎉 ${passed} invariantes de finanças do clube OK`);
