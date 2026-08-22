// Guarda estrutural — o custo de manutenção da temporada DEVE ir ao ledger
// (registrarTransacaoSov com idempotencyKey). Se o débito for só local, o F5
// rehidrata o saldo autoritativo e o custo evapora.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/botao/BotaoGame.tsx", import.meta.url), "utf8");
const season = readFileSync(new URL("../src/components/botao/career/SeasonEndScreen.tsx", import.meta.url), "utf8");
const engine = readFileSync(new URL("../src/components/botao/career/seasonEngine.ts", import.meta.url), "utf8");

let ok = 0, fail = 0;
function check(nome, cond) {
  if (cond) { ok++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
}

const start = src.match(/const startNextSeason = async[\s\S]*?\n  \};\n/)?.[0] ?? "";
check("startNextSeason existe e é async", start.length > 500);
check("débito no ledger via registrarTransacaoSov", start.includes("registrarTransacaoSov("));
check("valor do débito = -custo (nunca positivo)", start.includes("-custo"));
check("idempotente por usuário+temporada+divisão", /idempotencyKey:\s*`manutencao:\$\{perfil\.user_id\}:t\$\{temporadaNova\}:\$\{divisao\}`/.test(start));
check("falha do ledger aborta a transição (nunca grava fictício)", start.includes("saldoLedger === null") && start.includes("return;"));
check("saldo da carreira espelha o ledger", start.includes("const novaSov = saldoLedger"));
check("sem débito local paralelo (iniciarNovaTemporada fora do fluxo)", !start.includes("iniciarNovaTemporada("));
check("débito ANTES de persistCareer", start.indexOf("registrarTransacaoSov") < start.indexOf("persistCareer"));

check("SeasonEndScreen mostra as outras divisões", season.includes("d.divisao !== resumo.divisaoUsuario"));
check("promovidos das outras divisões aparecem", season.includes("d.promovidosIds.map"));
check("rebaixados das outras divisões aparecem", season.includes("d.rebaixadosIds.map"));

check("resumoTemporada: 2 promovidos fora da A", engine.includes('promovidosIds: divisao === "serie-a" ? [] : tabela.slice(0, 2)'));
check("resumoTemporada: 2 rebaixados fora da C", engine.includes('rebaixadosIds: divisao === "serie-c" ? [] : tabela.slice(-2)'));

// Hidratação (F5): o cache coach.sov é realinhado ao saldo autoritativo do
// ledger — sem isso, um custo já cobrado "volta" após o refresh.
const hidrata = src.match(/hidratarCampanha[\s\S]*?obterSaldoSov\(userId\)/)?.[0] ?? "";
check("hidratação realinha coach.sov ao ledger", hidrata.includes("obterSaldoSov(userId)"));
check("hidratação grava saldo do ledger no cache", /coach:\s*\{ \.\.\.careerHidratada\.coach, sov: saldoLedger \}/.test(src));

console.log(`\n${ok}/${ok + fail} OK`);
process.exit(fail ? 1 : 0);
