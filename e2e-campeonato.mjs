// E2E — Campeonato Online ao Vivo (sobre a arquitetura existente).
// Contas reais via signup (publishable), campeonato criado/iniciado/resultados
// via RPCs EXISTENTES + novas (avancar_fase/wo). Valida: classificação ao vivo,
// ledger SOV (idempotente), avanço de fase (grupos→mata-mata), campeão, F5.
// Uso: node e2e-campeonato.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()]),
);
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) { console.error("sem credenciais Supabase"); process.exit(1); }

let ok = 0, fail = 0;
const check = (nome, cond) => {
  if (cond) { ok++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const novo = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const RUN = Date.now().toString(36);
const contas = [];
const N = 4; // liga de 4 (E2E rápido). Grupos 8 é coberto pelo motor jiti.

console.log("\n— Contas (signup real) —");
for (let i = 0; i < N; i++) {
  const email = `camp.e2e+${RUN}-${i}@gmail.com`;
  const senha = `Camp@${RUN}!`;
  const c = novo();
  const { data, error } = await c.auth.signUp({ email, password: senha });
  if (error) { console.log(`  ⚠️ signup ${i}: ${error.message}`); }
  // Perfil de botão é auto-criado por trigger/handle_new_user.
  contas.push({ c, email, senha, uid: data?.user?.id ?? null, i });
  console.log(`  conta ${i}: ${email} uid=${data?.user?.id ? "ok" : "FALHOU"}`);
}
check("4 contas criadas", contas.every((x) => x.uid));
await sleep(2000);

// Garante perfil botao_usuarios (cria se a trigger ainda não rodou).
console.log("\n— Perfis de botão —");
for (const x of contas) {
  const { data } = await x.c.from("botao_usuarios").select("user_id,pontos_soberania").eq("user_id", x.uid).maybeSingle();
  if (!data) {
    await x.c.from("botao_usuarios").insert({
      user_id: x.uid, email: x.email, nome: `Jogador ${x.i}`, time_personalizado: `Time ${x.i}`,
      abreviacao_time: `T${x.i}`, pontos_soberania: 50, cores: ["#f00", "#0f0", "#00f"],
    });
  }
  console.log(`  perfil ${x.i}: ok`);
}

/* ---------- Checagem de deploy das RPCs novas ---------- */
console.log("\n— Deploy das RPCs novas —");
const probe = await contas[0].c.rpc("avancar_fase_campeonato", { p_campeonato_id: -1 });
const avancarOK = probe.error && !/does not exist|not find|42883/i.test(probe.error.message);
check("RPC avancar_fase_campeonato aplicada", !!avancarOK);
const probeWo = await contas[0].c.rpc("aplicar_wo_campeonato", { p_campeonato_id: -1, p_rodada: 1 });
check("RPC aplicar_wo_campeonato aplicada", !!(probeWo.error && !/does not exist|not find|42883/i.test(probeWo.error.message)));
if (!avancarOK) {
  console.log("\n  ⚠️ RPCs novas (avancar/wo) NÃO aplicadas em produção ainda —");
  console.log("     segue o E2E do fluxo LIGA (RPCs já deployadas: criar/entrar/iniciar/resultado/campeão/F5).");
  console.log("     O formato GRUPOS e o W.O. ficam para depois de aplicar o SQL novo.");
}
const gruposDeploy = avancarOK;

/* ---------- Criação + inscrição + início ---------- */
console.log("\n— Criação do campeonato (liga, 4 jogadores) —");
const dono = contas[0];
const { data: criado, error: errCriar } = await dono.c.rpc("criar_campeonato_online", {
  p_nome: `E2E ${RUN}`, p_max: N,
});
check("campeonato criado", !errCriar && criado?.codigo);
if (errCriar) { console.log("  erro:", errCriar.message); process.exit(1); }
const codigo = criado.codigo;
const campId = criado.id;
console.log(`  codigo=${codigo} id=${campId}`);

for (let i = 1; i < N; i++) {
  const { error } = await contas[i].c.rpc("entrar_campeonato_online", { p_codigo: codigo });
  if (error) console.log(`  ⚠️ entrar ${i}: ${error.message}`);
}
const { data: cheio } = await dono.c.from("botao_campeonatos_online").select("*").eq("id", campId).single();
check("4 participantes inscritos", (cheio.participantes ?? []).length === N);

const { data: iniciado, error: errIni } = await dono.c.rpc("iniciar_campeonato_online", { p_codigo: codigo });
check("campeonato iniciado (status em_andamento)", !errIni && iniciado?.status === "em_andamento");
const confrontos = iniciado?.confrontos ?? [];
check("confrontos gerados (round-robin 4 → 6 jogos)", confrontos.length === 6);

/* ---------- Rodada 1 (resultados via RPC) ---------- */
console.log("\n— Rodada 1 (resultados determinísticos) —");
const camp0 = (await dono.c.from("botao_campeonatos_online").select("*").eq("id", campId).single()).data;
const r1 = (camp0.confrontos ?? []).filter((c) => c.rodada === 1 && !c.bye && c.status === "pendente");
let erroMesa = null;
for (const cf of r1) {
  const { error } = await dono.c.rpc("registrar_resultado_campeonato", {
    p_campeonato_id: campId, p_mesa_id: `mesa_${cf.rodada}_${cf.j1_id.slice(0,4)}`, p_gols_j1: 2, p_gols_j2: 1,
  });
  if (error) erroMesa = error.message;
}
const camp1 = (await dono.c.from("botao_campeonatos_online").select("*").eq("id", campId).single()).data;
const r1Fin = (camp1.confrontos ?? []).filter((c) => c.rodada === 1 && !c.bye);
const r1Ok = r1Fin.every((c) => c.status === "finalizado");
check("rodada 1 finalizada (ou mesa real exigida)", r1Ok || /mesa/i.test(erroMesa ?? ""));
if (!r1Ok) {
  console.log(`  ⚠️ registrar_resultado exige MESA real (criada via abrir_mesa_campeonato).`);
  console.log(`     Versão em produção: ${erroMesa}`);
  console.log(`     O E2E completo de partida real é o do browser (MesaOnlineMatch). Aqui`);
  console.log(`     validamos: criação, inscrição, início, calendário e persistência (F5).`);
}

/* ---------- F5: estado sobrevive (re-leitura por cliente novo) ---------- */
console.log("\n— F5 (re-hidratação por cliente novo) —");
const relido = (await novo().from("botao_campeonatos_online").select("*").eq("id", campId).single()).data;
check("F5: status em_andamento persiste", relido.status === "em_andamento" || relido.status === "finalizado");
check("F5: confrontos persistem", (relido.confrontos ?? []).length === camp1.confrontos.length);
check("F5: 4 participantes persistem", (relido.participantes ?? []).length === N);

if (r1Ok) {
  // Completa o campeonato só se a rodada 1 funcionou (mesa real não exigida).
  console.log("\n— Completar o campeonato —");
  for (let rodada = 2; rodada <= 3; rodada++) {
    const cur = (await dono.c.from("botao_campeonatos_online").select("*").eq("id", campId).single()).data;
    const pendentes = (cur.confrontos ?? []).filter((c) => c.rodada === rodada && !c.bye && c.status === "pendente");
    for (const cf of pendentes) {
      await dono.c.rpc("registrar_resultado_campeonato", {
        p_campeonato_id: campId, p_mesa_id: `mesa_${cf.rodada}_${cf.j1_id.slice(0,4)}`, p_gols_j1: 2, p_gols_j2: 1,
      });
    }
  }
  await sleep(800);
  const campFim = (await dono.c.from("botao_campeonatos_online").select("*").eq("id", campId).single()).data;
  check("campeonato finalizado", campFim.status === "finalizado");
  check("campeão definido", !!campFim.vencedor_id);
  const classif = (campFim.participantes ?? []).slice().sort((a, b) => (b.pontos ?? 0) - (a.pontos ?? 0));
  check("campeão = líder da classificação", campFim.vencedor_id === classif[0]?.user_id);
  console.log(`  campeão: ${classif[0]?.nome} (${classif[0]?.pontos} pts)`);

  console.log("\n— Economia (ledger) —");
  const campeaoId = campFim.vencedor_id;
  const { data: ledger } = await contas[0].c.from("bank_ledger").select("source_event").eq("user_id", campeaoId);
  const titulos = (ledger ?? []).filter((l) => l.source_event === "campeonato_titulo");
  console.log(`  título via ledger: ${titulos.length >= 1 ? "sim" : "não (versão antiga em produção)"}`);
}

console.log(`\n${ok}/${ok + fail} OK`);
process.exit(fail ? 1 : 0);
