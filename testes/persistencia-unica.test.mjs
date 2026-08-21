/**
 * Auditoria estrutural de persistência (prompt mestre: um dado → uma fonte):
 *
 * 1. Read-modify-write da carreira SÓ dentro da fila serializada
 *    (mutateProgressInSupabase) — ninguém regrava snapshot velho (rollback F5).
 * 2. O delta SOV de uma partida tem UM escritor no ledger (aplicarResultadoRemoto
 *    com chave por fixture) — nada de patchSob duplicando o crédito.
 * 3. Sem helpers remotos que re-aplicam efeitos já persistidos no snapshot
 *    (escolha/campanha/manchetes — double-apply eliminado).
 * 4. Nenhum código grava o JSONB progresso_caminpanha inteiro de uma vez.
 * 5. Bolsa: compra/venda persistem via persistCareer (snapshot) + ledger.
 * 6. Onboarding persiste via RPC do perfil — não em coluna inexistente.
 *
 * Rodar: node testes/persistencia-unica.test.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let ok = 0;
let falhas = 0;
function expect(cond, nome) {
  if (cond) { ok++; console.log("OK:", nome); }
  else { falhas++; console.log("FALHOU:", nome); }
}
const ler = (p) => {
  const full = join(ROOT, p);
  if (existsSync(full)) return readFileSync(full, "utf8");
  throw new Error("não encontrado: " + p);
};

const storage = ler("src/components/botao/storage.ts");
const careerRemote = ler("src/components/botao/career/careerRemote.ts");
const bj = ler("src/components/botao/BotaoGame.tsx");
const apiLegado = ler("src/lib/botao/api.ts");
const onboardingApi = ler("src/lib/onboarding/onboardingApi.ts");
const economia = ler("src/components/botao/career/EconomiaScreen.tsx");
const futebolSql = ler("supabase/migrations/futebol.sql");
const readmeSql = ler("supabase/migrations/README.md");
const coachSetup = ler("src/components/botao/career/CoachSetup.tsx");
const profissoes = ler("src/lib/cidadela/profissoes.ts");

// 1. Fila serializada única: merge e mutate compartilham o mesmo enqueue.
expect(storage.includes("mutateProgressInSupabase"), "storage: mutateProgressInSupabase existe");
expect(
  (storage.match(/enqueueProgressWrite\(userId/g) ?? []).length >= 2,
  "storage: merge E mutate usam a mesma fila (enqueueProgressWrite)",
);

// 2. careerRemote: nenhum read-modify-write fora da fila (só readProgress,
//    usada na HIDRATAÇÃO, pode ler solto; mutações passam por mutate/merge).
const mutacoes = careerRemote.slice(careerRemote.indexOf("export async function inserirManchetesRemotas"));
expect(
  mutacoes.includes("mutateProgressInSupabase(uid, (prog, row)"),
  "aplicarResultadoRemoto: read-modify-write dentro da fila",
);
expect(
  careerRemote.includes("mutateProgressInSupabase(userId, (prog)"),
  "inserirManchetesRemotas: anexa na carreira fresca da fila",
);
expect(
  !careerRemote.includes('select("pontos_soberania, partidas_jogadas, partidas_vencidas, progresso_caminpanha")'),
  "careerRemote: sem SELECT solto de contadores + JSONB (fonte da corrida)",
);

// 3. Delta da partida tem UM escritor no ledger; patchSob não é registrado.
expect(
  !bj.includes('sourceEvent: "partida_carreira"'),
  "BotaoGame: escrita patchSob duplicada REMOVIDA (só aplicarResultadoRemoto grava o delta)",
);
expect(
  careerRemote.includes("idempotencyKey: `partida:${uid}:${partidaId}`"),
  "aplicarResultadoRemoto: chave idempotente por fixture",
);
expect(
  bj.includes("idempotencyKey: `desafio:${perfil.user_id}:${career.desafioPatrocinador.id}`"),
  "BotaoGame: desafio de patrocinador idempotente por proposta",
);
expect(
  bj.includes("idempotencyKey: `decisao:${perfil.user_id}:${choice.id}`"),
  "BotaoGame: decisão RPG idempotente por escolha",
);

// 4. Helpers de double-apply eliminados dos dois lados.
expect(!careerRemote.includes("aplicarEscolhaRemoto"), "careerRemote: aplicarEscolhaRemoto removida");
expect(!careerRemote.includes("iniciarCampanhaRemota"), "careerRemote: iniciarCampanhaRemota removida");
expect(!bj.includes("aplicarEscolhaRemoto("), "BotaoGame: sem re-aplicação remota de escolha");
expect(!bj.includes("iniciarCampanhaRemota("), "BotaoGame: sem reset remoto paralelo de campanha");
expect(!bj.includes("inserirManchetesRemotas("), "BotaoGame: manchetes só via snapshot");

// 5. Fim de campanha não dobra o contador de títulos.
expect(
  careerRemote.includes("opcoes?.careerAtual\n      ? (career.coach.titulos ?? 0)") ||
    careerRemote.includes("opcoes?.careerAtual\r\n      ? (career.coach.titulos ?? 0"),
  "aplicarFimCampanhaRemoto: careerAtual não re-incrementa títulos",
);

// 6. Ninguém sobrescreve o JSONB inteiro fora do merge.
expect(
  !apiLegado.includes("progresso_caminpanha: progresso"),
  "api legada: salvarResultado não sobrescreve o JSONB inteiro",
);
expect(
  apiLegado.includes("mergeProgressInSupabase"),
  "api legada: salvarResultado mescla via fila",
);

// 7. Bolsa: compra e venda persistem snapshot + ledger (nunca só interface).
const handleCompra = bj.slice(bj.indexOf("const handleComprarAtivo"), bj.indexOf("const handleVenderAtivo"));
expect(handleCompra.includes("persistCareer("), "Bolsa: compra persiste snapshot da carreira");
expect(handleCompra.includes("registrarTransacaoSov("), "Bolsa: compra debita no ledger SOV");
expect(handleCompra.includes("comprarAtivo("), "Bolsa: compra passa pelo engine (custos/cotas)");
const handleVenda = bj.slice(bj.indexOf("const handleVenderAtivo"), bj.indexOf("const finishCopaMatch"));
expect(handleVenda.includes("persistCareer(") && handleVenda.includes("venderAtivo("),
  "Bolsa: venda persiste snapshot + engine");

// 8. EconomiaScreen NÃO mantém cópia local da bolsa (fonte = career hidratada).
expect(!economia.includes("useState<BolsaState"), "EconomiaScreen: sem estado local de bolsa");
expect(economia.includes("career.bolsa"), "EconomiaScreen: lê career.bolsa (fonte única)");

// 9. Onboarding: grava via RPC do perfil, não em coluna inexistente.
expect(
  onboardingApi.includes('supabase.rpc("atualizar_estado_cidadela"'),
  "onboardingApi: persiste via RPC atualizar_estado_cidadela",
);
expect(
  !onboardingApi.includes('.from("botao_usuarios")'),
  "onboardingApi: sem UPDATE direto em botao_usuarios (coluna fantasma)",
);

// 10. Perfil da Cidadela tem UMA fonte: cidadela_perfis (existente em produção).
//     futebol.sql NÃO pode reintroduzir colunas duplicadas (regressão do HEAD).
const cidadelaSqlPath = join(ROOT, "supabase/migrations/cidadela_rpg.sql");
expect(existsSync(cidadelaSqlPath), "migration cidadela_rpg.sql presente (fonte do perfil)");
expect(
  !futebolSql.includes("estado_cidadela") && !futebolSql.includes("profissao_atual"),
  "futebol.sql: sem colunas-fantasma duplicando cidadela_perfis",
);
expect(
  profissoes.includes('rpc("obter_perfil_cidadela")') &&
    profissoes.includes('rpc("escolher_profissao"') &&
    profissoes.includes('rpc("atualizar_estado_cidadela"'),
  "profissoes: perfil via RPCs de cidadela_perfis (fonte única)",
);
expect(
  readmeSql.includes("cidadela_rpg.sql"),
  "migrations README: ordem cita a migration do perfil",
);

// 11. §13: coach name prefilled from logged identity.
expect(coachSetup.includes("nomeInicial"), "CoachSetup: aceita identidade do login");

console.log(`\n== ${ok} OK / ${falhas} falhas ==`);
if (falhas > 0) process.exit(1);
