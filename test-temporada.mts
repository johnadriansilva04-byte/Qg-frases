/**
 * Testes de temporada: promoção/rebaixamento, composições e resumo — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-temporada.mts
 */
import {
  composicoesIniciais,
  criarLigasDaTemporada,
  divisaoComTime,
  ligasConcluidas,
  processarResultadoTemporada,
  resumoTemporada,
  type LigasTemporada,
} from "./src/components/botao/career/seasonEngine";
import { sortTable } from "./src/components/botao/tournament";
import { createCustomTeam, timesDaDivisao } from "./src/components/botao/data/teams";
import type { Divisao } from "./src/components/botao/career/types";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

const userTeam = createCustomTeam("custom", "Meu FC", "MFC", "#111111", "#eeeeee", 75);

/** Constrói ligas ENCERRADAS com posição desejada do usuário (1..20). */
function ligasEncerradas(divisaoUser: Divisao, posicaoUser: number): LigasTemporada {
  const composicoes = composicoesIniciais(userTeam, divisaoUser);
  const ligas = criarLigasDaTemporada(composicoes, userTeam, "amador");
  for (const divisao of ["serie-a", "serie-b", "serie-c"] as Divisao[]) {
    const liga = ligas[divisao];
    const teamIds = liga.groups[0]!.teamIds;
    // Ordena os ids colocando o usuário na posição desejada APENAS na sua
    // divisão; as outras ficam em ordem determinística.
    const ordenados = teamIds.filter((id) => id !== userTeam.id);
    if (divisao === divisaoUser) ordenados.splice(posicaoUser - 1, 0, userTeam.id);
    else ordenados.sort();
    // Tabela final artificial: pontos decrescentes estritos (sem empates).
    liga.groups[0]!.table = ordenados.map((id, i) => ({
      teamId: id,
      p: 100 - i,
      j: 38,
      v: 30,
      e: 10 - Math.min(9, i),
      d: 0,
      gp: 80 - i,
      gc: 20 + i,
    }));
    for (const f of liga.groupFixtures) {
      f.played = true;
      f.result = { homeId: f.homeId, awayId: f.awayId, homeGoals: 1, awayGoals: 0 };
    }
    liga.champion = ordenados[0]!;
    liga.phase = "fim";
  }
  return ligas;
}

function verificaIntegridade(comps: Record<Divisao, string[]>, msg: string) {
  const todos = [...comps["serie-a"], ...comps["serie-b"], ...comps["serie-c"]];
  ok(comps["serie-a"].length === 20, `${msg}: Série A com 20 clubes`);
  ok(comps["serie-b"].length === 20, `${msg}: Série B com 20 clubes`);
  ok(comps["serie-c"].length === 20, `${msg}: Série C com 20 clubes`);
  ok(new Set(todos).size === 60, `${msg}: 60 clubes únicos (sem duplicados)`);
}

// 1) Usuário 2º na Série C → PROMOVIDO à Série B.
{
  const ligas = ligasEncerradas("serie-c", 2);
  ok(ligasConcluidas(ligas), "ligas encerradas detectadas");
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(resumo.usuarioPromovido, "2º na C → promovido");
  ok(!resumo.usuarioCampeao && !resumo.usuarioRebaixado, "2º na C: nem campeão nem rebaixado");
  ok(resumo.posicaoUsuario === 2, "posição do usuário = 2");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-b"].includes(userTeam.id), "usuário aparece na Série B da próxima temporada");
  ok(!comps["serie-c"].includes(userTeam.id), "usuário some da Série C");
  verificaIntegridade(comps, "promoção C→B");
  // Os 2 piores da B caem para a C.
  const tabelaB = sortTable(ligas["serie-b"].groups[0]!.table).map((r) => r.teamId);
  ok(comps["serie-c"].includes(tabelaB[18]!) && comps["serie-c"].includes(tabelaB[19]!),
    "2 piores da B rebaixados para a C");
}

// 2) Usuário 1º na Série B → CAMPEÃO e promovido à Série A.
{
  const ligas = ligasEncerradas("serie-b", 1);
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(resumo.usuarioCampeao, "1º na B → campeão");
  ok(resumo.usuarioPromovido, "campeão da B → promovido");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-a"].includes(userTeam.id), "campeão da B sobe para a Série A");
  verificaIntegridade(comps, "promoção B→A");
}

// 3) Usuário 20º na Série A → REBAIXADO à Série B.
{
  const ligas = ligasEncerradas("serie-a", 20);
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(resumo.usuarioRebaixado, "20º na A → rebaixado");
  ok(resumo.divisoes.find((d) => d.divisao === "serie-a")!.promovidosIds.length === 0,
    "Série A não tem promovidos (topo)");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-b"].includes(userTeam.id), "rebaixado da A cai para a Série B");
  verificaIntegridade(comps, "rebaixamento A→B");
}

// 4) Usuário 19º na Série B → REBAIXADO à Série C.
{
  const ligas = ligasEncerradas("serie-b", 19);
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(resumo.usuarioRebaixado, "19º na B → rebaixado");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-c"].includes(userTeam.id), "rebaixado da B cai para a Série C");
  verificaIntegridade(comps, "rebaixamento B→C");
}

// 5) Meio da tabela: nem sobe nem cai, divisão mantida.
{
  const ligas = ligasEncerradas("serie-b", 10);
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(!resumo.usuarioPromovido && !resumo.usuarioRebaixado, "10º na B: permanece");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-b"].includes(userTeam.id), "10º na B fica na B");
  verificaIntegridade(comps, "permanência");
}

// 6) Série C não rebaixa ninguém (base da pirâmide).
{
  const ligas = ligasEncerradas("serie-c", 20);
  const resumo = resumoTemporada(ligas, userTeam.id);
  ok(!resumo.usuarioRebaixado, "20º na C NÃO é rebaixado (não há Série D)");
  ok(resumo.divisoes.find((d) => d.divisao === "serie-c")!.rebaixadosIds.length === 0,
    "Série C não tem rebaixados");
  const comps = processarResultadoTemporada(ligas, userTeam.id).composicoes;
  ok(comps["serie-c"].includes(userTeam.id), "20º na C permanece na C");
}

// 7) Idempotência do resumo (F5): re-derivar N vezes dá o mesmo resultado.
{
  const ligas = ligasEncerradas("serie-c", 2);
  const r1 = resumoTemporada(ligas, userTeam.id);
  const r2 = resumoTemporada(ligas, userTeam.id);
  ok(JSON.stringify(r1) === JSON.stringify(r2), "resumo é determinístico (seguro pós-F5)");
  // E as ligas concluídas continuam concluídas (não há efeito colateral).
  ok(ligasConcluidas(ligas), "re-derivação não altera as ligas");
}

// 8) divisaoComTime encontra a divisão real do usuário.
{
  const ligas = ligasEncerradas("serie-b", 5);
  ok(divisaoComTime(userTeam.id, ligas) === "serie-b", "divisaoComTime localiza o usuário");
}

// 9) Resumo das 3 divisões: campeões e movimentações corretos em todas.
{
  const ligas = ligasEncerradas("serie-c", 1);
  const resumo = resumoTemporada(ligas, userTeam.id);
  for (const d of resumo.divisoes) {
    ok(Boolean(d.campeaoId), `${d.divisao} tem campeão`);
    ok(d.tabela.length === 20, `${d.divisao} tem tabela completa`);
    if (d.divisao !== "serie-a") ok(d.promovidosIds.length === 2, `${d.divisao} tem 2 promovidos`);
    if (d.divisao !== "serie-c") ok(d.rebaixadosIds.length === 2, `${d.divisao} tem 2 rebaixados`);
  }
  ok(resumo.usuarioCampeao, "usuário campeão da C");
}

// 10) Criação de temporada: 3 ligas com 20 clubes e o usuário na divisão certa.
{
  const composicoes = composicoesIniciais(userTeam, "serie-c");
  const ligas = criarLigasDaTemporada(composicoes, userTeam, "amador");
  ok(!ligasConcluidas(ligas), "temporada nova NÃO está concluída");
  ok(ligas["serie-c"].userTeamId === userTeam.id, "liga ativa aponta o usuário");
  ok(
    timesDaDivisao("serie-c").length === 20,
    "base canônica tem 20 clubes por divisão",
  );
}

console.log(`\n🎉 ${passed} invariantes de temporada OK`);
