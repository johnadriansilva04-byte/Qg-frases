// Garante as invariantes do resume de partida no F5 e da propriedade de
// clubes na Cidadela (dono visível + propostas entre jogadores).
import { readFileSync } from "node:fs";
let ok = 0, bad = 0;
function check(nome, cond) {
  if (!cond) { bad++; console.error("FALHOU:", nome); }
  else { ok++; }
}

const botaoGame = readFileSync("src/components/botao/BotaoGame.tsx", "utf8");
const matchView = readFileSync("src/components/botao/components/MatchView.tsx", "utf8");
const futebolSql = readFileSync("supabase/migrations/futebol.sql", "utf8");
const propScreen = readFileSync("src/components/botao/career/PropriedadeScreen.tsx", "utf8");
const clubesApi = readFileSync("src/lib/cidadela/clubesPropriedade.ts", "utf8");

// --- F5 na partida ---
const blocoTelas = botaoGame.slice(
  botaoGame.indexOf("TELAS_RESTAURAVEIS"),
  botaoGame.indexOf("];", botaoGame.indexOf("TELAS_RESTAURAVEIS")),
);
check("telas de partida entram na lista restaurável",
  blocoTelas.includes('"friendly-match"') && blocoTelas.includes('"tournament-match"'));
check("contexto da partida é gravado no resume (fixtureId/rivalTeam)",
  botaoGame.includes("fixtureId") && botaoGame.includes("copaFixtureId") && botaoGame.includes("rivalTeam: screen"));
check("partida pendente é resolvida DEPOIS da hidratação",
  botaoGame.includes("partidaPendenteRef") &&
  botaoGame.indexOf("partidaPendenteRef.current = pendente ? null") === -1 &&
  botaoGame.includes("const pendente = partidaPendenteRef.current"));
check("fixture jogado/inexistente cai no hub (nunca trava)",
  botaoGame.includes('setScreen("hub")'));
check("MatchView recebe resumeKey e lê estado salvo",
  matchView.includes("resumeKey") && matchView.includes("lerMatchResume"));
check("placar/jogadas/turno restaurados do resume",
  matchView.includes("resumeInicial?.homeGoals") && matchView.includes("resumeInicial?.turnsLeft") && matchView.includes("resumeInicial?.turn"));
check("estado salvo a cada jogada e limpo ao terminar",
  matchView.includes("sessionStorage.setItem(resumeKey") && matchView.includes("sessionStorage.removeItem(resumeKey)"));
check("modo online nunca persiste resume local",
  matchView.includes("if (!resumeKey || isOnline) return") && matchView.includes("isOnline ? null : lerMatchResume"));
check("sync de turns (prop) não sobrescreve o resume offline",
  matchView.includes("if (isOnline) setTurnsLeft(turns)"));
check("resume expira em 2h e valida faixas",
  matchView.includes("2 * 3600_000") && matchView.includes("r.turnsLeft <= turns"));

// --- Splash único no F5 ---
check("ponte auth→hidratação evita remontar o splash",
  botaoGame.includes("precisaHidratar") && botaoGame.includes("hidratacaoIniciada"));
check("overlay cobre as três fases",
  botaoGame.includes("(carregando || loading || precisaHidratar)"));

// --- Propriedade visível para a Cidadela ---
check("botao_times ganha dono_user_id (sem tabela paralela de clubes)",
  futebolSql.includes("ADD COLUMN IF NOT EXISTS dono_user_id"));
check("RPC registrar dono é idempotente e falha com outro dono",
  futebolSql.includes("cidadela_registrar_dono_clube") && futebolSql.includes("clube ja tem outro dono"));
check("mapa de clubes é público (toda a Cidadela vê o dono)",
  futebolSql.includes("cidadela_mapa_clubes"));
check("compra de 100% registra o dono no servidor",
  botaoGame.includes("registrarDonoClube(clube.id)"));
check("venda abaixo de 100% libera o dono",
  botaoGame.includes("liberarDonoClube(clube.id)") && futebolSql.includes("cidadela_liberar_dono_clube"));

// --- Propostas entre jogadores ---
check("propostas nascem em tabela com RLS (só as partes veem)",
  futebolSql.includes("cidadela_propostas_clubes") && futebolSql.includes("propostas_select_partes"));
check("aceite de compra move SOV nos DOIS lados via ledger com chave idempotente",
  futebolSql.includes("':compra'") && futebolSql.includes("':venda'") && futebolSql.includes("record_transaction(v_comprador"));
check("saldo insuficiente do comprador ABORTA (erro nunca vira zero)",
  futebolSql.includes("saldo insuficiente do comprador"));
check("contratar treinador exige ser dono do clube",
  futebolSql.includes("somente o dono do clube pode contratar treinador"));
check("proposta pendente duplicada é reutilizada (idempotente)",
  futebolSql.includes("a mesma proposta pendente não duplica") || futebolSql.includes("status = 'pendente'\n  LIMIT 1"));
check("UI de propostas gateada em ser proprietário",
  propScreen.includes("souProprietario") && propScreen.includes("Contratar treinador"));
check("venda via proposta zera participação SEM nova cobrança",
  propScreen.includes("onPerdeuClube") && botaoGame.includes("handlePerdeuClube"));
check("erro de leitura do mapa não afirma 'sem dono'",
  propScreen.includes("if (!donos) return null") && clubesApi.includes("return null;"));

// --- Regressões desta auditoria ---
check("efeito de RESTAURAÇÃO declarado ANTES do de gravação (senão o save apaga o resume)",
  botaoGame.indexOf("resumeRestauradoRef.current = true") <
    botaoGame.indexOf("TELAS_RESTAURAVEIS.includes(screen)"));
const sovFinSql = readFileSync("supabase/migrations/sov_financial_system.sql", "utf8");
check("record_transaction lê o saldo COM FOR UPDATE (sem lost update em créditos paralelos)",
  /FROM user_wallets\s+WHERE user_id = p_user_id\s+FOR UPDATE/.test(sovFinSql));

console.log(`== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
