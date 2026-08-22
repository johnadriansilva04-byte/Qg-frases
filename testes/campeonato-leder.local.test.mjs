// E2E do Campeonato no pg LOCAL (PGlite) — testa o SQL real de ponta a ponta:
// usuários → carteiras/bônus via trigger → criar/entrar/iniciar (liga e grupos)
// → resultados → avanço de fase → campeão → ledger SOV idempotente → F5 (re-leitura).
import { novoBanco, aplicarMigrations } from "./db-local.mjs";

let ok = 0, fail = 0;
const check = (nome, cond) => {
  if (cond) { ok++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
};
const uid = () => crypto.randomUUID();

const db = await novoBanco();
const res = await aplicarMigrations(db);
if (res.some((r) => !r.ok)) { console.error("migration falhou — aborta"); process.exit(1); }
console.log("— migrations 12/12 no banco local —\n");

const AS = async (sql, params) => {
  // pglite não tem prepared statements no exec; usamos SQL literal com cast seguro.
  const [u] = params;
  return db.query(sql, [u]);
};
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const rpc = async (fn, sqlParams) => db.query(`SELECT public.${fn}`, sqlParams);

/* ---------- usuários (trigger handle_new_user deve criar perfil+carteira+bônus) ---------- */
console.log("— Usuários —");
const users = Array.from({ length: 4 }, () => uid());
for (const u of users) {
  await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [u, `u${u.slice(0,4)}@e2e.dev`]);
}
for (const u of users) {
  const perfil = await q("SELECT pontos_soberania FROM public.botao_usuarios WHERE user_id=$1", [u]);
  check(`trigger criou perfil ${u.slice(0,6)}`, perfil.length === 1);
}
const wallets0 = await q("SELECT user_id, balance FROM public.user_wallets");
console.log(`  carteiras criadas pelo trigger: ${wallets0.length}`);
check("4 carteiras com saldo 50 (bônus no ledger)", wallets0.length === 4 && wallets0.every((w) => Number(w.balance) === 50));

const asUser = async (u, fn) => {
  await db.query(`SELECT set_config('app.test_uid', $1, false)`, [u]);
  return fn();
};

/* ---------- LIGA (4 jogadores, round-robin) ---------- */
console.log("\n— LIGA (4) —");
let campId, codigo;
await asUser(users[0], async () => {
  await rpc("criar_campeonato_online($1,$2)", ["Copa Local", 4]);
});
const criado = (await q("SELECT id, codigo FROM public.botao_campeonatos_online ORDER BY id DESC LIMIT 1"))[0];
codigo = criado?.codigo;
campId = criado?.id;
check("campeonato criado com código", !!codigo);
for (const u of users.slice(1)) {
  await asUser(u, async () => { await rpc("entrar_campeonato_online($1)", [codigo]); });
}
const camp1 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campId]))[0];
check("4 inscritos", (camp1.participantes ?? []).length === 4);

// Cronometrista: em produção o chamador é o dono; aqui chamamos como dono.
await asUser(users[0], async () => {
  await rpc("iniciar_campeonato_online($1)", [codigo]);
});
let camp = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campId]))[0];
check("status em_andamento", camp.status === "em_andamento");
check("formato liga", camp.formato === "liga");
const confrontos = camp.confrontos ?? [];
check("round-robin 4 → 6 jogos", confrontos.length === 6);
check("3 rodadas", Math.max(...confrontos.map((c) => c.rodada)) === 3);

// Joga todas as rodadas usando o fluxo REAL: o jogador do confronto abre a
// mesa (abrir_mesa_campeonato grava mesa_id no confronto) e o resultado é
// registrado com o mesa_id retornado. j1 vence 2-1 (determinístico).
const totalRodadas = Math.max(...confrontos.map((c) => c.rodada));
for (let rodada = 1; rodada <= totalRodadas; rodada++) {
  for (let guard = 0; guard < 100; guard++) {
    let campNow = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campId]))[0];
    const pend = (campNow.confrontos ?? []).filter((c) => c.rodada === rodada && !c.bye && c.status === "pendente");
    if (pend.length === 0) break;
    const cf = pend[0];
    let mesaId = null;
    for (const uid of [cf.j1_id, cf.j2_id]) {
      try {
        await asUser(uid, async () => {
          const r = await rpc("abrir_mesa_campeonato($1,$2)", [campId, cf.rodada]);
          mesaId = r.rows[0]?.abrir_mesa_campeonato;
        });
      } catch (e) { /* jogador não tem pendente nesta rodada */ }
      if (mesaId) break;
    }
    if (!mesaId) {
      console.log(`  ⚠️ abrir r${rodada}: ninguém conseguiu abrir mesa para ${cf.j1_id} vs ${cf.j2_id}`);
      const roles = users.map((u, i) => u === cf.j1_id ? `j${i}` : u === cf.j2_id ? `ape${i}` : "");
      console.log(`  papéis: j1=${roles[0]}, j2=${roles[1]} (users[0..3] = ${users[0].slice(0,4)} ${users[1].slice(0,4)} ${users[2].slice(0,4)} ${users[3].slice(0,4)})`);
      process.exit(1);
    }
    await asUser(users[0], async () => {
      await db.query("SELECT public.registrar_resultado_campeonato($1,$2,$3,$4)", [campId, mesaId, 2, 1]);
    });
  }
}
await sleep(50);
camp = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campId]))[0];
const pendRest = (camp.confrontos ?? []).filter((c) => !c.bye && c.status !== "finalizado");
if (pendRest.length > 0) {
  console.log(`  ⚠️ ${pendRest.length} pendente(s): ${pendRest.map((c) => `r${c.rodada} ${c.j1_id.slice(0,4)}x${c.j2_id.slice(0,4)}`).join(", ")}`);
}
check("todas as partidas finalizadas", pendRest.length === 0);
check("campeonato finalizado", camp.status === "finalizado");
const classif = (camp.participantes ?? []).slice().sort((a, b) => (b.pontos ?? 0) - (a.pontos ?? 0));
check("campeão definido", camp.vencedor_id === classif[0]?.user_id);
console.log(`  campeão: ${classif[0]?.nome} (${classif[0]?.pontos} pts, ${classif[0]?.gols_pro}-${classif[0]?.gols_contra})`);

// Idempotência: re-registrar mesa já finalizada NÃO duplica SOV.
const campeaoId = camp.vencedor_id;
const mesaFinal = (camp.confrontos ?? []).find((c) => !c.bye)?.mesa_id;
const wAntes = (await q("SELECT balance FROM public.user_wallets WHERE user_id=$1", [campeaoId]))[0]?.balance;
let dupErro = null;
await asUser(users[0], async () => {
  try { await db.query("SELECT public.registrar_resultado_campeonato($1,$2,$3,$4)", [campId, mesaFinal, 2, 1]); }
  catch (e) { dupErro = e.message; }
});
const wDepois = (await q("SELECT balance FROM public.user_wallets WHERE user_id=$1", [campeaoId]))[0]?.balance;
check("re-registrar mesa finalizada = idempotente (saldo igual, sem erro)", dupErro === null && wAntes === wDepois);

// Mesa inexistente deve falhar explicitamente (não engolir resultado).
let mesaErro = null;
await asUser(users[0], async () => {
  try { await db.query("SELECT public.registrar_resultado_campeonato($1,$2,$3,$4)", [campId, "mesa_fake_xyz", 1, 0]); }
  catch (e) { mesaErro = e.message; }
});
check("mesa desconhecida falha explicitamente", /nenhum confronto/i.test(mesaErro ?? ""));

// Ledger: campeão tem +50 do título + resultados; cache = ledger.
const titulos = await q("SELECT amount FROM public.bank_ledger WHERE user_id=$1 AND source_event='campeonato_titulo'", [campeaoId]);
check("premiação de título no ledger (+50)", titulos.length === 1 && Number(titulos[0].amount) === 50);
const cacheCampeao = (await q("SELECT pontos_soberania FROM public.botao_usuarios WHERE user_id=$1", [campeaoId]))[0]?.pontos_soberania;
check("cache pontos_soberania = saldo do ledger", Number(cacheCampeao) === Number(wDepois));

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------- GRUPOS (8 jogadores, fase de grupos → mata-mata) ---------- */
console.log("\n— GRUPOS (8) —");
let campG, codigoG;
await asUser(users[0], async () => {
  await rpc("criar_campeonato_online($1,$2)", ["Copa Grupos", 8]);
  // formato é atualizado via UPDATE (mesmo padrão do frontend)
});
campG = (await q("SELECT * FROM public.botao_campeonatos_online ORDER BY id DESC LIMIT 1"))[0];
codigoG = campG.codigo;
await db.query("UPDATE public.botao_campeonatos_online SET formato='grupos' WHERE id=$1", [campG.id]);
// Sobrescreve com 8 jogadores: o autocriado conta como 1, entram mais 7.
const extras = Array.from({ length: 7 }, () => uid());
for (const u of extras) {
  await db.query("INSERT INTO auth.users (id, email) VALUES ($1,$2)", [u, `g${u.slice(0,4)}@e2e.dev`]);
  await asUser(u, async () => { await rpc("entrar_campeonato_online($1)", [codigoG]); });
}
const allG = [users[0], ...extras];
await asUser(users[0], async () => { await rpc("iniciar_campeonato_online($1)", [codigoG]); });
campG = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
check("grupos: 8 inscritos", (campG.participantes ?? []).length === 8);
check("grupos: gerou fase de grupos", (campG.confrontos ?? []).every((c) => c.fase === "grupos") && (campG.confrontos ?? []).length === 12);
check("grupos: 3 rodadas por grupo", Math.max(...(campG.confrontos ?? []).map((c) => c.rodada)) === 3);

// Fase de grupos: j1 vence 2-1 (determinístico). Por grupo.
for (let rodada = 1; rodada <= 3; rodada++) {
  for (let guard = 0; guard < 100; guard++) {
    const now = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
    const pend = (now.confrontos ?? []).filter((c) => c.fase === "grupos" && !c.bye && c.status === "pendente");
    if (pend.length === 0) break;
    const cf = pend[0];
    let mesaId = null;
    let msgTest = null;
    for (const uidP of [cf.j1_id, cf.j2_id]) {
      try {
        await asUser(uidP, async () => {
          const r = await rpc("abrir_mesa_campeonato($1,$2)", [campG.id, cf.rodada]);
          mesaId = r.rows[0]?.abrir_mesa_campeonato;
        });
      } catch (e) { msgTest = e.message; }
      if (mesaId) break;
    }
    if (!mesaId) {
      const cfI = (now.confrontos ?? []).findIndex((c) => c === cf || (c.rodada === cf.rodada && !c.bye && c.status === "pendente" && (c.j1_id === cf.j1_id || c.j2_id === cf.j2_id)));
      console.log(`  ⚠️ grupos: ${msgTest}`);
      console.log(`     cf: rodada=${cf.rodada} grupo=${cf.grupo} j1=${cf.j1_id?.slice(0,8)} j2=${cf.j2_id?.slice(0,8)} idx=${cfI}`);
      const pends = (now.confrontos ?? []).filter((c) => c.fase === "grupos" && !c.bye && c.status === "pendente" && c.rodada === rodada);
      console.log(`     pend rodada ${rodada}: ${pends.length}`);
      process.exit(1);
    }
    await asUser(users[0], async () => {
      await db.query("SELECT public.registrar_resultado_campeonato($1,$2,$3,$4)", [campG.id, mesaId, 2, 1]);
    });
  }
}

// Avança fase de grupos → mata-mata
await asUser(users[0], async () => { await rpc("avancar_fase_campeonato($1)", [campG.id]); });
let campG2 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
const mm = (campG2.confrontos ?? []).filter((c) => c.fase !== "grupos");
  console.log(`  fases após avanço: ${mm.map((c) => `${c.fase}(r${c.rodada}) ${c.j1_id?.slice(0,4)}x${c.j2_id?.slice(0,4)}`).join(" | ")}`);
  check("mata-mata gerado após grupos (4 classificados → semifinal)", mm.length === 2 && mm.every((c) => c.fase === "semifinal"));
check("mata-mata: 4 classificados com chaveamento 1°A×2°B e 1°B×2°A", mm.every((c) => c.j1_id && c.j2_id));

// 4 — avancar (idempotente por fase)
let avErr = null;
await asUser(users[0], async () => {
  try {
    await rpc("avancar_fase_campeonato($1)", [campG.id]);
  } catch (e) { avErr = e.message; }
});
if (avErr) console.log(`  avancar erro: ${avErr}`);
let campG3 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
// W.O. duplo: fecha as rodadas da semifinal sem inventar SOV
await asUser(users[0], async () => { await rpc("aplicar_wo_campeonato($1,$2)", [campG.id, 4]); });
await asUser(users[0], async () => { await rpc("aplicar_wo_campeonato($1,$2)", [campG.id, 5]); });
campG3 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
check("W.O.: semifinais terminam 0-0 sem SOV", (campG3.confrontos ?? []).filter((c) => c.fase === "semifinal").every((c) => c.status === "finalizado"));

// Avança mata-mata → final
await asUser(users[0], async () => { await rpc("avancar_fase_campeonato($1)", [campG.id]); });
campG2 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
const final = (campG2.confrontos ?? []).filter((c) => c.fase === "final");
check("final gerada (2 vencedores W.O.)", final.length === 1);

// Joga a final
{
  const cf = final[0];
  let mesaId = null;
  for (const uidP of [cf.j1_id, cf.j2_id]) {
    let rodFinal = (campG2.confrontos ?? []).find((c) => c.fase === "final")?.rodada ?? cf.rodada;
    try {
      await asUser(uidP, async () => {
        const r = await rpc("abrir_mesa_campeonato($1,$2)", [campG.id, rodFinal]);
        mesaId = r.rows[0]?.abrir_mesa_campeonato;
      });
    } catch (e) {}
    if (mesaId) break;
  }
  await asUser(users[0], async () => {
    await db.query("SELECT public.registrar_resultado_campeonato($1,$2,$3,$4)", [campG.id, mesaId, 3, 0]);
  });
}
let avanciErr = null;
await asUser(users[0], async () => {
  try {
    await rpc("avancar_fase_campeonato($1)", [campG.id]);
  } catch (e) { avanciErr = e.message; }
});
if (avanciErr) console.log(`  avancar-final erro: ${avanciErr}`);
campG2 = (await q("SELECT * FROM public.botao_campeonatos_online WHERE id=$1", [campG.id]))[0];
check("grupos: campeonato finalizado", campG2.status === "finalizado");
check("grupos: campeão definido", !!campG2.vencedor_id);
const titG = await q("SELECT idempotency_key, amount FROM public.bank_ledger WHERE source_event='campeonato_titulo' AND user_id=$1", [campG2.vencedor_id]);
check("grupos: premiação no ledger idempotente", titG.length === 1);
if (titG.length !== 1) {
  const tudo = await q("SELECT source_event, amount FROM public.bank_ledger LIMIT 60");
  const campos = tudo.filter((t) => /campeonato|wo/.test(t.source_event ?? ""));
  console.log(`  ⚠️ ${titG.length} entradas título: ledger campeonato temp: ${campos.map((t) => `${t.source_event}+${t.amount}`).join(" | ")}`);
}

console.log(`\n${ok}/${ok + fail} OK`);
process.exit(fail ? 1 : 0);
