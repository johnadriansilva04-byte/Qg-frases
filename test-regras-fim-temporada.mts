/**
 * Regra de recuperação de dívidas (§9) e marco de 1º lugar (§10) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-regras-fim-temporada.mts
 */
import {
  avaliarFimTemporada,
  chegouAoPrimeiroLugar,
  CUSTO_MANUTENCAO,
  iniciarNovaTemporada,
  MAX_TEMPORADAS_INADIMPLENTE,
} from "./src/components/botao/career/competitionApi";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

/** §9 — Pagou a manutenção → continua, contador zerado. */
{
  const v = avaliarFimTemporada(CUSTO_MANUTENCAO["serie-c"], "serie-c", 2);
  ok(v.continua === true && v.temporadasInadimplente === 0, "pagou: continua e zera o contador");
  ok(v.sobrou === 0, "pagou: sobra zero quando exato");
}

/** §9 — 1ª falha → continua com 1/3, aviso narrativo no motivo. */
{
  const v = avaliarFimTemporada(0, "serie-a", 0);
  ok(v.continua === true, "1ª falha: continua (o jogo não vira Game Over)");
  ok(v.temporadasInadimplente === 1, "1ª falha: contador = 1");
  ok(v.motivo.includes("1/3"), "1ª falha: motivo marca 1/3 temporadas");
  ok(v.motivo.includes("2 temporadas restantes"), "1ª falha: 2 temporadas restantes narradas");
}

/** §9 — 2ª falha → continua com 2/3 e singular corretamente na narrativa. */
{
  const v = avaliarFimTemporada(10, "serie-b", 1);
  ok(v.continua === true && v.temporadasInadimplente === 2, "2ª falha: contador = 2");
  ok(v.motivo.includes("1 temporada restante"), "2ª falha: singular na chance final");
}

/** §9 — 3ª falha (prev=2) → Game Over no limite de MAX. */
{
  const v = avaliarFimTemporada(0, "serie-b", MAX_TEMPORADAS_INADIMPLENTE - 1);
  ok(v.continua === false, "3ª falha: falência decretada");
  ok(v.temporadasInadimplente === MAX_TEMPORADAS_INADIMPLENTE, "3ª falha: contador = 3");
  ok(v.motivo.includes("Terceira temporada"), "3ª falha: motivo de falência explícito");
}

/** §9 — Um sucesso após qualquer sequência de falhas zera o contador. */
{
  const v = avaliarFimTemporada(CUSTO_MANUTENCAO["serie-a"], "serie-a", 2);
  ok(v.temporadasInadimplente === 0, "sucesso após 2 falhas: zera o contador");
  ok(v.motivo.includes("renova"), "sucesso: diretoria renova confiança");
}

/** §9 — iniciarNovaTemporada deduz custo e nunca fica negativo. */
{
  ok(
    iniciarNovaTemporada(CUSTO_MANUTENCAO["serie-c"] + 25, "serie-c") === 25,
    "dedução de manutenção devolve saldo pós-custo",
  );
  ok(iniciarNovaTemporada(0, "serie-a") === 0, "saldo nunca fica negativo");
}

/** §10 — Marco de 1º lugar: uma vez por temporada. */
{
  ok(chegouAoPrimeiroLugar(1, 1, 0) === true, "líder pela 1ª vez na T1 → celebra");
  ok(chegouAoPrimeiroLugar(1, 1, 1) === false, "líder já celebrado na T1 → não repete");
  ok(chegouAoPrimeiroLugar(1, 2, 1) === true, "na próxima temporada pode celebrar de novo");
  ok(chegouAoPrimeiroLugar(2, 1, 0) === false, "2º lugar não dispara o marco");
  ok(chegouAoPrimeiroLugar(1, 1, undefined) === true, "marco ausente (Json antigo) → celebra");
}

console.log(`\n🎉 ${passed} invariantes das regras de fim/marco OK`);
