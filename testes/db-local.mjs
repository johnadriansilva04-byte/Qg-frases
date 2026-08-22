// Harness PGlite — aplica a cadeia de migrations em ordem num Postgres real
// (WASM) e valida que tudo aplica limpo. Stubs mínimos de auth.* (igual ao
// que o Supabase fornece), sem mockar lógica de negócio.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

export async function novoBanco() {
  const db = new PGlite();
  await db.waitReady;

  // Supabase cria as roles authenticated/anon; policies/GRANTs referenciam.
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE ROLE anon;
    CREATE ROLE service_role;
  `);

  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    -- Stub de pg_cron (só existe no Supabase; aqui o job nunca agenda nada).
    -- O harness remove a linha CREATE EXTENSION antes de aplicar cada migration.
    CREATE SCHEMA IF NOT EXISTS cron;
    CREATE TABLE IF NOT EXISTS cron.job (jobname TEXT PRIMARY KEY);
    CREATE OR REPLACE FUNCTION cron.schedule(p_name TEXT, p_schedule TEXT, p_command TEXT)
      RETURNS BIGINT LANGUAGE sql AS $$ SELECT 0::BIGINT $$;
    CREATE OR REPLACE FUNCTION cron.unschedule(p_name TEXT)
      RETURNS BIGINT LANGUAGE sql AS $$ SELECT 0::BIGINT $$;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE sql STABLE AS $$ SELECT current_setting('app.test_uid', true)::UUID $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
      LANGUAGE sql STABLE AS $$ SELECT 'authenticated' $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
      LANGUAGE sql STABLE AS $$ SELECT '{}'::JSONB $$;
    -- Supabase expõe publication supabase_realtime; algumas migrations fazem
    -- ALTER PUBLICATION. Stubamos a publication.
    CREATE PUBLICATION supabase_realtime;
  `);

  return db;
}

export async function aplicarMigrations(db) {
  const ORDEM = [
    "futebol.sql",
    "biblioteca.sql",
    "trilha.sql",
    "cidadela_rpg.sql",
    "cidadela_chat_missoes.sql",
    "sov_financial_system.sql",
    "sov_integracao_cartorio.sql",
    "sov_bank.sql",
    "feira.sql",
    "tempo_cidadao.sql",
    "sov_bank_invest.sql",
    "ranking_patrimonio.sql",
  ];
  const resultados = [];
  for (const arq of ORDEM) {
    // Remove CREATE EXTENSION de extensões que só existem no Supabase (pg_cron).
    const sql = readFileSync(`supabase/migrations/${arq}`, "utf8")
      .replace(/CREATE EXTENSION IF NOT EXISTS pg_cron;/g, "-- [pg_cron stubado no harness]");
    try {
      await db.exec(sql);
      resultados.push({ arq, ok: true });
    } catch (e) {
      resultados.push({ arq, ok: false, erro: e.message });
      console.log(`❌ ${arq}: ${e.message.split("\n")[0]}`);
      // Continua para mapear TODOS os erros, não para no primeiro.
    }
  }
  return resultados;
}

// Execução direta: aplica e reporta.
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = await novoBanco();
  const res = await aplicarMigrations(db);
  const okCount = res.filter((r) => r.ok).length;
  console.log(`\n${okCount}/${res.length} migrations aplicaram limpo`);
  process.exit(okCount === res.length ? 0 : 1);
}
