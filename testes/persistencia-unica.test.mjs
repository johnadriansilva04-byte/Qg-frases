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

// 21. §3: README documenta a conta E2E oficial do projeto (credenciais de
// teste fictícias — o dono decidiu publicá-las para outros agentes).
const readme = ler("README.md");
expect(
  readme.includes("openhands.rookie.e2e@gmail.com") && readme.includes("Rookie#2026!E2E"),
  "README: conta E2E oficial (e-mail + senha de teste) documentada",
);
expect(
  readme.includes("Rookie FC") && readme.includes("RFC"),
  "README: identidade do clube E2E documentada",
);

// 22. Exclusão total também na tela de conta (não só na api).
expect(
  profileSetup.includes("excluirContaUsuario"),
  "ProfileSetup: excluir conta usa a RPC de exclusão total",
);

// 23. §3-§5: Banco no celular com Perfil Pessoal × Perfil do Clube + extrato
// recolhível (nunca aberto por padrão).
const sovBankApp = ler("src/components/financial/SovBankApp.tsx");
expect(
  sovBankApp.includes("perfil-clube") && sovBankApp.includes("Perfil Pessoal"),
  "SovBankApp: Perfil Pessoal × Perfil do Clube separados",
);
expect(
  sovBankApp.includes("extratoAberto") && sovBankApp.includes("extratoClubeAberto"),
  "SovBankApp: extratos recolhíveis (clique para expandir)",
);
expect(
  sovBankApp.includes("useState<Secao | null>(null)") &&
    sovBankApp.includes("alternarSecao") &&
    !sovBankApp.includes('useState<Aba>("extrato")'),
  "SovBankApp: TODAS as seções fechadas por padrão (acordeão, uma aberta por vez)",
);
expect(
  sovBankApp.includes('secaoAberta === "extrato"') &&
    sovBankApp.includes('secaoAberta === "noticias"') &&
    sovBankApp.includes('secaoAberta === "economia"'),
  "SovBankApp: Extrato/Notícias/Economia só renderizam sob demanda (clique)",
);
const celularConv = ler("src/components/botao/career/CelularConversas.tsx");
expect(
  celularConv.includes("clube={clube}") && celularConv.includes("SovBankApp userId"),
  "Celular: aba Banco recebe o Perfil do Clube",
);

// 23b. Título da carreira (liga + Copa) entra na Sala de Troféus — a sala
// nunca fica vazia com títulos no ranking; contas antigas reconciliam no F5.
const storageTs = ler("src/components/botao/storage.ts");
expect(
  storageTs.includes("reconciliarTrofeusCarreira") && storageTs.includes('"carreira"'),
  "storage: reconciliarTrofeusCarreira (títulos da carreira → sala de troféus)",
);
expect(
  bj.includes("reconciliarTrofeusCarreira(progress") &&
    bj.includes("novoTitulos += 1") &&
    bj.includes('teamId === "carreira"'),
  "BotaoGame: título da liga + Copa gravam troféu e o render resolve o time",
);
expect(
  bj.includes("reconciliarTrofeusCarreira(remoteProgressRaw, remoteCareer)"),
  "BotaoGame: hidratação reconcilia troféus de contas antigas (F5 seguro)",
);
expect(
  bj.includes("partidas_vencidas:") && bj.includes("simularPartidaE2E"),
  "BotaoGame: harness E2E mantém contadores de perfil (partidas/vitórias)",
);

// 24. §6: ofertas de transferência por data + área de negociação.
const transfEngine = ler("src/components/botao/career/transferenciaEngine.ts");
expect(
  transfEngine.includes("rodada === RODADA_MEIO") && transfEngine.includes("rodada === RODADA_FIM"),
  "Transferências: gatilho por data (meio r10 / fim r19)",
);
expect(
  bj.includes("handleAceitarTransferencia") &&
    bj.includes('screen === "transferencias"') &&
    bj.includes("proximoClubeId: undefined"),
  "BotaoGame: aceitar assina (bônus no pessoal) e consome a mudança na nova temporada",
);

// 25. §9-§11: mesa com data de liberação + link de convite + admin do dono.
const mesaApi = ler("src/lib/multiplayer/mesa.api.ts");
expect(
  mesaApi.includes("linkConviteMesa") && mesaApi.includes("p_data_liberacao"),
  "mesa.api: link direto + data de liberação na criação",
);
expect(
  futebolSql.includes("data_liberacao TIMESTAMPTZ") &&
    futebolSql.includes("mesa bloqueada ate"),
  "futebol.sql: coluna data_liberacao + guarda na entrada da mesa",
);
const onlineV3 = ler("src/components/botao/components/OnlineMatchV3.tsx");
expect(
  onlineV3.includes("AdminMesaPanel") && onlineV3.includes("linkConviteMesa"),
  "OnlineMatchV3: painel de administração do dono + link de convite",
);
const conviteScreen = ler("src/components/botao/online/ConviteMesaScreen.tsx");
expect(
  conviteScreen.includes("Três clubes querem que você administre") &&
    conviteScreen.includes("convite-nome") &&
    conviteScreen.includes("convite-email"),
  "ConviteMesaScreen: 3 propostas + cadastro rápido (nome + e-mail)",
);
const rotaCidadela = ler("src/routes/cidadela.tsx");
expect(
  rotaCidadela.includes("conviteMesaId") && rotaCidadela.includes('get("mesa")'),
  "rota /cidadela: parâmetro ?mesa= abre o fluxo do convidado",
);

// === Campeonato Online v2 (link direto, bots, 50 SOV, aposta real) ===
const campV2Sql = ler("supabase/migrations/campeonato_online_v2.sql");
expect(
  campV2Sql.includes("preencher_campeonato_bots") &&
    campV2Sql.includes("so o dono da sala pode preencher com bots") &&
    campV2Sql.includes("resolver_confronto_bots") &&
    campV2Sql.includes("pelo menos 50 SOV"),
  "migration v2: bots (dono-only) + resolver bot×bot + regra 50 SOV",
);
expect(
  campV2Sql.includes("ARRAY[v_idx]::TEXT[]") && !campV2Sql.includes("v_confrontos[v_idx + 1]"),
  "migration v2: indexação jsonb 0-based corrigida (off-by-one eliminado)",
);
expect(
  campV2Sql.includes("pagar_premio_mesa") &&
    campV2Sql.includes("aposta_cobrada_de") &&
    campV2Sql.includes("sov_bank_registrar"),
  "migration v2: aposta cobrada no servidor + prêmio idempotente",
);
expect(
  campV2Sql.includes("p_amount < 0 AND v_new_balance < 0"),
  "migration v2: record_transaction — crédito NUNCA bloqueado em conta negativa",
);
expect(
  campV2Sql.includes("'finalizado' ELSE 'pendente' END") ||
    campV2Sql.includes("THEN 'finalizado' ELSE 'pendente'"),
  "migration v2: bye nasce finalizado (rodada nunca trava em número ímpar)",
);
const campApi = ler("src/lib/multiplayer/campeonato.api.ts");
expect(
  campApi.includes("linkConviteCampeonato") &&
    campApi.includes("preencherCampeonatoComBots") &&
    campApi.includes("simularConfrontoBots"),
  "campeonato.api: link direto + preencher bots + simulação determinística",
);
const onlineCamp = ler("src/components/botao/components/OnlineChampionship.tsx");
expect(
  onlineCamp.includes("Preencher com Bots") &&
    onlineCamp.includes("campeonato.criador_id !== userId") &&
    onlineCamp.includes("SOV_MINIMO_CAMPEONATO"),
  "OnlineChampionship: botão bots só do dono + regra 50 SOV",
);
expect(
  onlineCamp.includes("admin-campeonato-panel") &&
    onlineCamp.includes("premio_sov") &&
    onlineCamp.includes("32"),
  "OnlineChampionship: painel admin com vagas/humanos/bots/prêmio + salas de 32",
);
expect(
  onlineCamp.includes("adversario?.bot") && onlineCamp.includes("MatchView"),
  "OnlineChampionship: confronto contra bot joga no motor local (MatchView)",
);
expect(
  onlineV3.includes("pagarPremioMesa") && !onlineV3.includes("aplicarApostaSoberania"),
  "OnlineMatchV3: aposta paga no servidor (nunca delta local)",
);
expect(
  rotaCidadela.includes("conviteCampCodigo") &&
    rotaCidadela.includes('get("camp")') &&
    rotaCidadela.includes("mesaConviteInicial") &&
    rotaCidadela.includes("campCodigoInicial"),
  "rota /cidadela: ?camp= e ?mesa= autenticado caem DIRETO na sala/mesa",
);
const botaoGame = ler("src/components/botao/BotaoGame.tsx");
expect(
  botaoGame.includes("mesaConviteInicial") &&
    botaoGame.includes("campCodigoInicial") &&
    botaoGame.includes('setScreen("online-championship")'),
  "BotaoGame: link direto abre o fluxo online automaticamente",
);
const conviteProfissao = ler("src/components/botao/online/ConviteMesaScreen.tsx");
expect(
  conviteProfissao.includes("convite-profissoes") &&
    conviteProfissao.includes("antes de começar o campeonato") &&
    conviteProfissao.includes('modo?: "mesa" | "campeonato"'),
  "ConviteMesaScreen: profissão em 1 pergunta + modo campeonato",
);
// Nomenclatura: pontos são SOV (nunca "pontos de soberania" em UI).
const semSoberaniaUI = [
  "src/components/botao/components/OnlineMatch.tsx",
  "src/components/botao/components/OnlineMatchV3.tsx",
  "src/components/botao/career/SeasonTransition.tsx",
  "src/components/botao/career/TitleCeremony.tsx",
  "src/components/botao/career/SeasonHub.tsx",
].every((f) => !/pontos de soberania|Apostar Soberania|label="Soberania"|>Soberania<\/p>/.test(ler(f)));
expect(semSoberaniaUI, "nomenclatura: telas online/fim de temporada usam SOV, não 'Soberania'");

// 27ª passada: pessoal × caixa × total da carteira (E2E 3ª temporada).
// O ledger guarda o TOTAL (pessoal + caixa do clube) — atribuí-lo ao
// coach.sov duplicava o caixa no bolso do treinador a cada F5/partida.
expect(
  careerRemote.includes("sov: coachSalvo.sov ?? saldoSov ?? u?.pontos_soberania ?? 0"),
  "loadCareerFromSupabase: coach.sov vem do SNAPSHOT (nunca do total da carteira)",
);
expect(
  !careerRemote.includes("sov: saldoSov ?? coachSalvo.sov"),
  "loadCareerFromSupabase: ordem antiga (ledger→coach.sov) REMOVIDA",
);
expect(
  !careerRemote.includes("career: { ...career, coach: { ...career.coach, sov: novaSob } }"),
  "aplicarResultadoRemoto: NÃO grava o total da carteira como coach.sov no JSONB",
);
expect(
  !careerRemote.includes("coach: { ...career.coach, sov: novaSob, titulos: novoTit }"),
  "aplicarFimCampanhaRemoto: NÃO grava o total da carteira como coach.sov no JSONB",
);
// F5 seguro: a fila de escrita é drenável (F5 com fila pendente perde as
// últimas partidas — a hidratação lia snapshot velho e a promoção morria).
expect(
  storage.includes("export function aguardarFilaDeEscrita"),
  "storage: aguardarFilaDeEscrita exportada (dreno da fila antes de F5)",
);
expect(
  /aguardarFila:\s*(async\s*)?\(\)\s*=>/.test(botaoGame) && botaoGame.includes("aguardarFilaDeEscrita"),
  "BotaoGame: __e2e.aguardarFila expõe o dreno da fila de escrita",
);
// Saldo exibido: com carreira, "Seu SOV" é o pessoal do snapshot (o remoto
// é o TOTAL pessoal+caixa e inflaria o valor exibido).
expect(
  botaoGame.includes("const saldoSov = career?.coach.sov ?? saldoSovRemoto ?? null"),
  "BotaoGame: saldo exibido = pessoal do snapshot quando há carreira",
);
const celularHook = ler("src/hooks/useCelularCarreira.ts");
expect(
  celularHook.includes("const saldoSov = career?.coach.sov ?? saldoSovRemoto ?? null"),
  "useCelularCarreira: saldo exibido = pessoal do snapshot quando há carreira",
);

// Chave de partida no ledger inclui a TEMPORADA: ids de fixture
// (`liga-r5-2`) se repetem a cada temporada — sem o escopo, o ledger engole
// a receita da 2ª temporada em diante como "duplicada" (drift UI × banco).
expect(
  botaoGame.includes("`t${career.temporada ?? 1}:${current.id}`"),
  "BotaoGame: aplicarResultadoRemoto recebe partidaId com escopo de temporada",
);
expect(
  botaoGame.includes("idempotencyKey: `partida:${perfil.user_id}:t${temporadaAtual}:${f.id}`"),
  "BotaoGame: harness E2E registra receita com chave temporada+fixture",
);

// Telas de loading: primeiro render DETERMINÍSTICO (SSR = cliente) —
// Math.random no initializer causava hydration mismatch (React #418).
const loadingContent = ler("src/data/loadingContent.ts");
const loadingScreen = ler("src/components/botao/career/LoadingScreen.tsx");
const trilhaLoading = ler("src/components/trilha/TrilhaLoadingScreen.tsx");
expect(
  loadingContent.includes("export function conteudoDeterministico"),
  "loadingContent: conteudoDeterministico exportado (1º render = SSR)",
);
expect(
  loadingScreen.includes("conteudoDeterministico(categoria") &&
    trilhaLoading.includes("conteudoDeterministico(categoria"),
  "LoadingScreens: seleção determinística no initializer, aleatória só pós-montagem",
);

console.log(`\n== ${ok} OK / ${falhas} falhas ==`);
if (falhas > 0) process.exit(1);
