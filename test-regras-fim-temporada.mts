/**
 * Regra de fim de temporada SEM bloqueio por falta de dinheiro + marco de
 * 1º lugar (§10) — jiti:
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

/** Padrões que NUNCA podem vazar para o jogador (contador de chances). */
const PADROES_PROIBIDOS = [/\d\s*(de|\/)\s*3/, /tentativa/i, /restantes/i, /chances/i, /falência/i];
function okMotivoLimpo(motivo: string, contexto: string) {
  for (const p of PADROES_PROIBIDOS) {
    ok(!p.test(motivo), `${contexto}: motivo não expõe contador de chances (${p})`);
  }
}

/** §4 — Pagou a manutenção → continua, contador interno zerado. */
{
  const v = avaliarFimTemporada(CUSTO_MANUTENCAO["serie-c"], "serie-c", 2);
  ok(v.continua === true && v.temporadasInadimplente === 0, "pagou: continua e zera o contador");
  ok(v.sobrou === 0, "pagou: sobra zero quando exato");
  ok(v.motivo.includes("renova"), "pagou: diretoria renova confiança");
}

/** §4 — Falta de dinheiro NUNCA bloqueia: 1ª, 2ª e 3ª+ falhas continuam. */
{
  const v1 = avaliarFimTemporada(0, "serie-a", 0);
  ok(v1.continua === true, "1ª falha: continua — o jogo nunca bloqueia por falta de dinheiro");
  ok(v1.temporadasInadimplente === 1, "1ª falha: contador interno = 1");
  ok(v1.sobrou === -CUSTO_MANUTENCAO["serie-a"], "1ª falha: sobrou negativo = dívida real");
  okMotivoLimpo(v1.motivo, "1ª falha");
  ok(/diretoria/i.test(v1.motivo), "1ª falha: aviso narrativo da diretoria presente");

  const v2 = avaliarFimTemporada(10, "serie-b", 1);
  ok(v2.continua === true && v2.temporadasInadimplente === 2, "2ª falha: continua, contador interno = 2");
  okMotivoLimpo(v2.motivo, "2ª falha");

  const v3 = avaliarFimTemporada(0, "serie-b", MAX_TEMPORADAS_INADIMPLENTE - 1);
  ok(v3.continua === true, "3ª falha: AINDA continua — falência não encerra a carreira");
  ok(v3.temporadasInadimplente === MAX_TEMPORADAS_INADIMPLENTE, "3ª falha: contador interno = 3");
  okMotivoLimpo(v3.motivo, "3ª falha");

  const v4 = avaliarFimTemporada(0, "serie-b", MAX_TEMPORADAS_INADIMPLENTE);
  ok(v4.continua === true, "4ª falha: segue jogando endividado");
  ok(v4.temporadasInadimplente === MAX_TEMPORADAS_INADIMPLENTE, "contador interno trava no teto (não cresce além)");
}

/** §4 — Um sucesso após qualquer sequência de falhas zera o contador. */
{
  const v = avaliarFimTemporada(CUSTO_MANUTENCAO["serie-a"], "serie-a", 2);
  ok(v.temporadasInadimplente === 0, "sucesso após 2 falhas: zera o contador");
}

/** §4 — iniciarNovaTemporada deduz o custo e PERMITE saldo negativo (dívida). */
{
  ok(
    iniciarNovaTemporada(CUSTO_MANUTENCAO["serie-c"] + 25, "serie-c") === 25,
    "dedução de manutenção devolve saldo pós-custo",
  );
  ok(
    iniciarNovaTemporada(0, "serie-a") === -CUSTO_MANUTENCAO["serie-a"],
    "saldo PODE ficar negativo — a dívida é real, não bloqueia",
  );
  ok(
    iniciarNovaTemporada(-30, "serie-c") === -30 - CUSTO_MANUTENCAO["serie-c"],
    "dívida acumula de temporada para temporada",
  );
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
