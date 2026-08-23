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

// 7. Bolsa: compra/venda persistem snapshot + ledger ATÔMICO (nunca só interface).
const handleCompra = bj.slice(bj.indexOf("const handleComprarAtivo"), bj.indexOf("const handleVenderAtivo"));
expect(handleCompra.includes("persistCareer("), "Bolsa: compra persiste snapshot da carreira");
expect(handleCompra.includes("comprarAtivoInvest("), "Bolsa: compra debita o SOV Invest no ledger (atômico)");
expect(handleCompra.includes("await comprarAtivoInvest") && handleCompra.indexOf("await comprarAtivoInvest") < handleCompra.indexOf("comprarAtivo(bolsaAtual"),
  "Bolsa: compra é ledger-first (débito antes de gravar a posição)");
expect(handleCompra.includes("operacaoBolsaRef"), "Bolsa: compra com trava anti duplo-clique");
expect(handleCompra.includes("comprarAtivo("), "Bolsa: compra passa pelo engine (custos/cotas)");
const handleVenda = bj.slice(bj.indexOf("const handleVenderAtivo"), bj.indexOf("const finishCopaMatch"));
expect(handleVenda.includes("persistCareer(") && handleVenda.includes("venderAtivo(") && handleVenda.includes("venderAtivoInvest("),
  "Bolsa: venda credita o SOV Invest no ledger + persiste snapshot + engine");

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

// 12. Entrada da carreira enxuta: oferta do clube na temporada 1 (3 etapas).
expect(
  coachSetup.includes("Aceitar proposta") && coachSetup.includes("CUSTO_MANUTENCAO"),
  "CoachSetup: etapa 1 é a oferta do clube da temporada 1",
);
expect(
  coachSetup.includes("const totalSteps = 3"),
  "CoachSetup: exatamente 3 etapas (nunca 6)",
);

// 13. §5 — O contador de chances NUNCA vaza para o jogador.
const seasonEnd = ler("src/components/botao/career/SeasonEndScreen.tsx");
const competitionApi = ler("src/components/botao/career/competitionApi.ts");
expect(
  !/de 3|\/ 3|Tentativa de recuperação|temporadas restantes|restantes antes/.test(seasonEnd),
  "SeasonEndScreen: sem contador 'X de 3' nem chances restantes na UI",
);
expect(
  !/\(\$\{|\/\$\{| de 3| temporadas restantes|falência/.test(
    competitionApi.match(/const AVISO_DIRETORIA = \[[\s\S]*?\];/)?.[0] ?? "",
  ),
  "competitionApi: avisos da diretoria não expõem número de chances",
);
expect(
  !competitionApi.includes("continua: false"),
  "competitionApi: falta de dinheiro nunca encerra a carreira (continua sempre true)",
);

// 14. §4 — Dívida real: saldo pode ficar negativo no fim de temporada.
expect(
  !/iniciarNovaTemporada[\s\S]*?Math\.max\(0/.test(competitionApi.split("chegouAoPrimeiroLugar")[0] ?? ""),
  "competitionApi: iniciarNovaTemporada permite saldo negativo (dívida)",
);
expect(
  bj.includes('idempotencyKey: `manutencao:${perfil.user_id}:t${temporadaEncerrada}`'),
  "BotaoGame: débito de manutenção idempotente no ledger",
);

// 15. Excluir conta = exclusão TOTAL (auth.users + domínio), com fallback.
expect(
  futebolSql.includes("public.excluir_conta_total()") &&
    futebolSql.includes("DELETE FROM auth.users") &&
    futebolSql.includes("DELETE FROM public.user_wallets") &&
    futebolSql.includes("DELETE FROM public.bank_ledger") &&
    futebolSql.includes("DELETE FROM public.cidadela_perfis") &&
    futebolSql.includes("dono_user_id = NULL"),
  "futebol.sql: RPC excluir_conta_total apaga auth.users, economia e perfis; clubes voltam ao universo",
);
expect(
  apiLegado.includes("excluir_conta_total"),
  "api.ts: excluirContaUsuario usa a RPC de exclusão total",
);

// 16. Namorada é conquistada, não dada: Valéria começa como conhecida e a
// apresentação é um evento-gatilho (nunca mensagem automática a cada rodada).
const personagens = ler("src/components/botao/career/rpg/personagens.ts");
const eventos = ler("src/components/botao/career/rpg/eventos.ts");
const rpgEngine = ler("src/components/botao/career/rpg/rpgEngine.ts");
expect(
  !personagens.match(/"npc-valeria": \{[\s\S]*?\},/)?.[0]?.includes('cargo: "Namorada"'),
  "personagens: Valéria NÃO começa como namorada",
);
expect(
  eventos.includes('id: "encontro-valeria"') && eventos.includes('id: "jantar-valeria"'),
  "eventos: apresentação da Valéria é um evento-gatilho",
);
expect(
  !rpgEngine.includes("Oi, amor! Soube que você assumiu o time"),
  "rpgEngine: Valéria não é contato inicial automático",
);
expect(
  rpgEngine.includes("encontro-valeria") && rpgEngine.includes("cargoValeria"),
  "rpgEngine: gatilho da Valéria + rótulo dinâmico por relação",
);

// 17. Mensagens pós-partida por gatilho (médico) e torcida na Rede, não em DM.
expect(
  bj.includes("gatilhoMedico") && bj.includes("Reação da torcida → Rede pública"),
  "BotaoGame: relatório médico por gatilho; reação da torcida vai para o feed",
);

// 18. §7-§10: evolução de botões substitui o "nomear botões".
const profileSetup = ler("src/components/botao/career/ProfileSetup.tsx");
expect(
  !profileSetup.includes("Nomear botões") && !profileSetup.includes("PersonalizacaoBotoes"),
  "ProfileSetup: sistema de nomear botões REMOVIDO",
);
expect(
  profileSetup.includes("PainelEvolucaoBotoes") &&
    profileSetup.includes("estrelasNivel") &&
    profileSetup.includes("Aumentar — $"),
  "ProfileSetup: painel de evolução com estrelas + preço progressivo",
);
expect(
  bj.includes("chaveEvolucao(perfil.user_id, idx, nivelAtual + 1)"),
  "BotaoGame: evolução de botão com débito idempotente no ledger",
);

// 19. §4: entrada da carreira = ofertas de clubes pequenos.
expect(
  coachSetup.includes("estão interessados em você") && coachSetup.includes("ofertas"),
  "CoachSetup: etapa 1 mostra ofertas de clubes interessados",
);
expect(
  bj.includes('t.divisaoInicial === "serie-c"') && bj.includes("gerarOfertasIniciais"),
  "BotaoGame: ofertas vêm só dos clubes pequenos (Série C)",
);
expect(
  bj.includes("assinatura:${perfil.user_id}:t1:") && bj.includes("clubeOrigemId"),
  "BotaoGame: bônus de assinatura idempotente + clube de origem persistido",
);

// 20. §11: escudo + cor dentro do botão em campo.
const matchView = ler("src/components/botao/components/MatchView.tsx");
expect(
  matchView.includes("botaoSimbolo") && matchView.includes("userSimbolo"),
  "MatchView: símbolo/escudo desenhado dentro do botão do usuário",
);
expect(
  matchView.includes("multTiro(") && matchView.includes("massaExtra("),
  "MatchView: evolução tem impacto real (chute mais forte + mais massa)",
);

// 21. §3: README documenta a conta oficial do OpenHands + credencial segura.
const readme = ler("README.md");
expect(
  readme.includes("open.rangers.fc.oficial@gmail.com") && readme.includes("OPENHANDS_E2E_PASSWORD"),
  "README: conta oficial do OpenHands + mecanismo de credencial por variável de ambiente",
);
expect(
  !/senha[:=]\s*["']?[A-Za-z0-9!@#]{6,}/.test(readme),
  "README: NUNCA contém senha real",
);

// 22. Exclusão total também na tela de conta (não só na api).
expect(
  profileSetup.includes("excluirContaUsuario"),
  "ProfileSetup: excluir conta usa a RPC de exclusão total",
);

console.log(`\n== ${ok} OK / ${falhas} falhas ==`);
if (falhas > 0) process.exit(1);
