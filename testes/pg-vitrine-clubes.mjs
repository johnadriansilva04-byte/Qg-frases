/* Valida clubes_venda.sql num Postgres LOCAL (docker), com a cadeia real de
 * migrations na ordem do README + stubs de auth (pg_cron não existe fora do
 * Supabase). Prova o ciclo inteiro da vitrine: anunciar → listar → comprar
 * (débito/crédito no ledger, posse transferida, participação do vendedor
 * removida do JSONB, idempotência e bordas).
 * Uso: sudo docker run --rm -d --name pgtest -e POSTGRES_PASSWORD=pg -p 55432:5432 postgres:16
 *      node testes/pg-vitrine-clubes.mjs
 */
import { execSync } from "node:child_process";

const PSQL = (sql) =>
  execSync(
    `sudo -n docker exec -i pgtest psql -U postgres -v ON_ERROR_STOP=1 -At`,
    { input: sql, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
const PSQL_SEM_STOP = (sql) => {
  try {
    return { ok: true, out: PSQL(sql) };
  } catch (e) {
    return { ok: false, out: String(e.stderr ?? e.message) };
  }
};

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`✅ ${m}`); } else { fail++; console.error(`❌ ${m}`); } };

// 1) Stubs de auth (fora do Supabase não existem).
PSQL(`
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT, created_at TIMESTAMPTZ DEFAULT now(),
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::jsonb ->> 'sub', '')::UUID $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'authenticated' $$;
`);

// 2) Cadeia real na ordem necessária à vitrine.
// pg_cron só existe no Supabase: no Postgres local o bloco do agendador é
// substituído por no-op (adaptação do harness, o arquivo de produção segue
// intacto).
const fs = await import("node:fs");
const CRON_BLOCO = /CREATE EXTENSION IF NOT EXISTS pg_cron;[\s\S]*?cron\.schedule\([^;]+\$\$[\s\S]*?\$\$\);/;
for (const arq of ["sov_financial_system.sql", "sov_bank.sql", "futebol.sql", "clubes_venda.sql"]) {
  let sql = fs.readFileSync(`supabase/migrations/${arq}`, "utf8");
  sql = sql.replace(CRON_BLOCO, "-- pg_cron: stub local (só existe no Supabase)");
  const r = PSQL_SEM_STOP(sql);
  const erro = r.ok ? "" : (r.out.match(/ERROR:[^\n]*/)?.[0] ?? r.out.slice(0, 300));
  ok(r.ok, `migration ${arq} aplica limpa${r.ok ? "" : " → " + erro}`);
}

// 3) Cenário: dois usuários (vendedor=comprador de clube, comprador).
// O trigger handle_new_user cria o perfil em botao_usuarios automaticamente.
PSQL(`
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'vendedor@teste'),
  ('22222222-2222-2222-2222-222222222222', 'comprador@teste');
-- carteiras com saldo de teste (ledger-backed)
SELECT record_transaction('11111111-1111-1111-1111-111111111111', 'reward', 100, 'setup', 'system', '{}'::jsonb);
SELECT record_transaction('22222222-2222-2222-2222-222222222222', 'reward', 500, 'setup', 'system', '{}'::jsonb);
-- vendedor é dono do primeiro clube da base
UPDATE public.botao_times SET dono_user_id = '11111111-1111-1111-1111-111111111111'
  WHERE id = (SELECT id FROM public.botao_times ORDER BY id LIMIT 1);
-- snapshot do vendedor com participação de 100% no clube (para provar a limpeza)
UPDATE public.botao_usuarios SET progresso_caminpanha = jsonb_build_object(
  'career', jsonb_build_object('propriedadeClubes', jsonb_build_object(
    'participacoes', jsonb_build_object(
      (SELECT id FROM public.botao_times ORDER BY id LIMIT 1),
      jsonb_build_object('clubeId', (SELECT id FROM public.botao_times ORDER BY id LIMIT 1), 'participacao', 100, 'custoMedio', 2, 'adquiridoEm', now()::text)),
    'totalDividendos', 0, 'ultimaRodadaDividendos', 0)))
WHERE user_id = '11111111-1111-1111-1111-111111111111';
`);

const CLUBE = PSQL(`SELECT id FROM public.botao_times ORDER BY id LIMIT 1;`).trim();
const COMO = (uid, sql) =>
  `SET request.jwt.claims = '{"sub":"${uid}"}'; ${sql}`;
// Saída de psql com SET prefixado: usa só a última linha útil.
const ULTIMA = (s) => s.trim().split("\n").filter((l) => l !== "SET").pop()?.trim() ?? "";
const VENDEDOR = "11111111-1111-1111-1111-111111111111";
const COMPRADOR = "22222222-2222-2222-2222-222222222222";

// 4) Bordas: não-dono não anuncia; sem autenticação não anuncia.
let r = PSQL_SEM_STOP(COMO(COMPRADOR, `SELECT public.cidadela_anunciar_venda_clube('${CLUBE}', 300);`));
ok(!r.ok && r.out.includes("somente o dono"), "não-dono NÃO anuncia (erro claro)");

// 5) Dono anuncia → aparece na vitrine para todos.
r = PSQL_SEM_STOP(COMO(VENDEDOR, `SELECT public.cidadela_anunciar_venda_clube('${CLUBE}', 300);`));
ok(r.ok && r.out.includes("true"), "dono anuncia a venda");
const vitrine = PSQL(COMO(COMPRADOR, `SELECT clube_id || '|' || preco || '|' || dono_nome FROM public.cidadela_listar_clubes_a_venda();`));
ok(vitrine.includes(`${CLUBE}|300`), `vitrine pública mostra o clube por 300 (${vitrine.trim()})`);

// 6) O próprio dono não compra o próprio anúncio.
r = PSQL_SEM_STOP(COMO(VENDEDOR, `SELECT public.cidadela_comprar_clube_anunciado('${CLUBE}');`));
ok(!r.ok && r.out.includes("ja e o dono"), "dono não compra o próprio anúncio");

// 7) Compra atômica: ledger dos dois lados + posse + vitrine limpa.
// As carteiras já tinham o bônus de signup (+50) creditado pelo trigger.
r = PSQL_SEM_STOP(COMO(COMPRADOR, `SELECT public.cidadela_comprar_clube_anunciado('${CLUBE}');`));
ok(r.ok, `compra na vitrine concluída${r.ok ? "" : " → " + r.out.slice(0, 300)}`);
const saldoComprador = Number(ULTIMA(PSQL(`SELECT balance FROM public.user_wallets WHERE user_id = '${COMPRADOR}';`)));
const saldoVendedor = Number(ULTIMA(PSQL(`SELECT balance FROM public.user_wallets WHERE user_id = '${VENDEDOR}';`)));
ok(saldoComprador === 250, `comprador debitado: 550 − 300 = ${saldoComprador}`);
ok(saldoVendedor === 450, `vendedor creditado: 150 + 300 = ${saldoVendedor}`);
const donoDepois = ULTIMA(PSQL(`SELECT dono_user_id || '|' || em_venda FROM public.botao_times WHERE id = '${CLUBE}';`));
ok(donoDepois === `${COMPRADOR}|false`, `posse transferida e vitrine limpa (${donoDepois})`);
const partVendedor = PSQL(`SELECT COALESCE(progresso_caminpanha #> '{career,propriedadeClubes,participacoes}' ? '${CLUBE}', FALSE) FROM public.botao_usuarios WHERE user_id = '${VENDEDOR}';`).trim();
ok(partVendedor === "f", "participação do vendedor removida do snapshot (sem dividendos fantasma)");

// 8) Clube fora da vitrine não pode ser comprado de novo.
r = PSQL_SEM_STOP(COMO(COMPRADOR, `SELECT public.cidadela_comprar_clube_anunciado('${CLUBE}');`));
ok(!r.ok && r.out.includes("nao esta a venda"), "recompra fora da vitrine bloqueada");

// 9) Saldo insuficiente: cria outro comprador pobre, dono anuncia de novo.
PSQL(`
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'pobre@teste');
SELECT record_transaction('33333333-3333-3333-3333-333333333333', 'reward', 50, 'setup', 'system', '{}'::jsonb);
`);
r = PSQL_SEM_STOP(COMO(COMPRADOR, `SELECT public.cidadela_anunciar_venda_clube('${CLUBE}', 400);`));
ok(r.ok, "novo dono anuncia a revenda");
r = PSQL_SEM_STOP(COMO("33333333-3333-3333-3333-333333333333", `SELECT public.cidadela_comprar_clube_anunciado('${CLUBE}');`));
ok(!r.ok && r.out.includes("saldo insuficiente"), "saldo insuficiente aborta SEM mover posse");
const donoFinal = PSQL(`SELECT dono_user_id FROM public.botao_times WHERE id = '${CLUBE}';`).trim();
ok(donoFinal === COMPRADOR, "posse intacta após tentativa sem saldo");

// 10) Retirar da vitrine funciona (preço NULL).
r = PSQL_SEM_STOP(COMO(COMPRADOR, `SELECT public.cidadela_anunciar_venda_clube('${CLUBE}', NULL);`));
ok(r.ok && r.out.includes("false"), "anúncio retirado com preço NULL");
const vitrineVazia = ULTIMA(PSQL(COMO(COMPRADOR, `SELECT COUNT(*) FROM public.cidadela_listar_clubes_a_venda();`)));
ok(vitrineVazia === "0", "vitrine vazia após retirada");

console.log(`\n${fail === 0 ? "🎉" : "⚠️"} PG VITRINE: ${pass} ok, ${fail} falhas`);
process.exitCode = fail ? 1 : 0;
