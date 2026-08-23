/**
 * Promoção/rebaixamento aplicada na NOVA temporada (bug: subir/descer não
 * mudava as ligas; nomes desincronizados) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/promocao-rebaixamento.test.mts
 */
import {
  composicoesIniciais,
  criarLigasDaTemporada,
  ligasConcluidas,
  processarResultadoTemporada,
  simularTemporadaCompleta,
} from "../src/components/botao/career/seasonEngine";
import { teamByIdSync, timeDesconhecido, TEAMS, type Team } from "../src/components/botao/data/teams";
import { garantirTorcidaUniverso } from "../src/components/botao/career/torcidaIntegracao";
import { normalizarCareer } from "../src/components/botao/career/careerStorage";
import type { CareerState } from "../src/components/botao/career/types";
import type { Fixture, MatchResult } from "../src/components/botao/types";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

const userTeam: Team = {
  id: "custom",
  name: "Rookie FC",
  short: "RFC",
  city: "Cidadela",
  primary: "#00ff00",
  secondary: "#ff0000",
  power: 75,
};

/** Usuário vence tudo (garante promoção) ou perde tudo (garante queda). */
const venceSempre = (f: Fixture): MatchResult => ({
  homeId: f.homeId,
  awayId: f.awayId,
  homeGoals: f.homeId === "custom" ? 3 : 0,
  awayGoals: f.awayId === "custom" ? 3 : 0,
});
const perdeSempre = (f: Fixture): MatchResult => ({
  homeId: f.homeId,
  awayId: f.awayId,
  homeGoals: f.homeId === "custom" ? 0 : 3,
  awayGoals: f.awayId === "custom" ? 0 : 3,
});

/* ---- Cenário 1: usuário domina a Série C → sobe para a B na temporada 2 ---- */
{
  const comp1 = composicoesIniciais(userTeam, "serie-c");
  const ligas1 = criarLigasDaTemporada(comp1, userTeam, "normal");
  const fim = simularTemporadaCompleta(ligas1, "custom", "normal", venceSempre);
  ok(ligasConcluidas(fim), "T1: temporada simulada até o fim (todas as divisões)");
  const res = processarResultadoTemporada(fim, "custom");
  ok(res.promovido === true && res.novaDivisao === "serie-b", "T1: usuário promovido C → B");
  ok(res.composicoes["serie-b"].includes("custom"), "T1: composição da B contém o time do jogador");
  ok(!res.composicoes["serie-c"].includes("custom"), "T1: time do jogador SAI da C");
  ok(res.composicoes["serie-a"].length === 20 && res.composicoes["serie-b"].length === 20 && res.composicoes["serie-c"].length === 20, "T1: divisões mantêm 20 clubes");

  // O FIX do startNextSeason: a temporada 2 nasce com as NOVAS composições.
  const comp2 = res.composicoes;
  const ligas2 = criarLigasDaTemporada(comp2, userTeam, "normal");
  const ativa = ligas2["serie-b"];
  ok(ativa.groups[0]!.teamIds.includes("custom"), "T2: liga ativa do jogador é a SÉRIE B");
  ok(ligas2["serie-c"].groups[0]!.teamIds.every((id) => id !== "custom"), "T2: jogador não aparece na C");
  const idsB = ativa.groups[0]!.teamIds;
  ok(idsB.length === 20, "T2: Série B com 20 clubes");

  // Nomes: todos os clubes das novas ligas resolvem um nome COERENTE com o id.
  for (const divisao of ["serie-a", "serie-b", "serie-c"] as const) {
    for (const id of ligas2[divisao].groups[0]!.teamIds) {
      if (id === "custom") continue;
      const t = teamByIdSync(id);
      ok(t.id === id, `T2: nome resolvido corresponde ao id (${id} ≠ fallback)`);
      ok(t.name !== TEAMS[0]!.name || id === TEAMS[0]!.id, `T2: ${id} nunca vira Rubro-Negro por fallback`);
    }
  }

  // Fallback honesto: id desconhecido vira "Clube XXX", nunca TEAMS[0].
  const desconhecido = teamByIdSync("clube-inexistente-xyz");
  ok(desconhecido.id === "clube-inexistente-xyz", "fallback: id desconhecido preservado");
  ok(desconhecido.name.startsWith("Clube"), "fallback: nome genérico do próprio id");
  ok(desconhecido.name !== TEAMS[0]!.name, "fallback: NUNCA vira Rubro-Negro Carioca");
}

/* ---- Cenário 2: usuário afunda na Série B → desce para a C ---- */
{
  const comp1 = composicoesIniciais(userTeam, "serie-b");
  const ligas1 = criarLigasDaTemporada(comp1, userTeam, "normal");
  const fim = simularTemporadaCompleta(ligas1, "custom", "normal", perdeSempre);
  const res = processarResultadoTemporada(fim, "custom");
  ok(res.rebaixado === true && res.novaDivisao === "serie-c", "T1(B): usuário rebaixado B → C");
  const ligas2 = criarLigasDaTemporada(res.composicoes, userTeam, "normal");
  ok(ligas2["serie-c"].groups[0]!.teamIds.includes("custom"), "T2: liga ativa volta a ser a C");
}

/* ---- Cenário 3: duas temporadas seguidas vencendo → C → B → A ---- */
{
  const comp1 = composicoesIniciais(userTeam, "serie-c");
  let ligas = criarLigasDaTemporada(comp1, userTeam, "normal");
  ligas = simularTemporadaCompleta(ligas, "custom", "normal", venceSempre);
  const r1 = processarResultadoTemporada(ligas, "custom");
  ok(r1.novaDivisao === "serie-b", "ano 1: C → B");
  ligas = criarLigasDaTemporada(r1.composicoes, userTeam, "normal");
  ligas = simularTemporadaCompleta(ligas, "custom", "normal", venceSempre);
  const r2 = processarResultadoTemporada(ligas, "custom");
  ok(r2.novaDivisao === "serie-a" && r2.promovido, "ano 2: B → A (chegada à elite)");
  const ligasA = criarLigasDaTemporada(r2.composicoes, userTeam, "normal");
  ok(ligasA["serie-a"].groups[0]!.teamIds.includes("custom"), "ano 3: jogando a SÉRIE A");
}

/* ---- Cenário 4: torcida migra junto com o time na troca de divisão ---- */
{
  const careerBase = normalizarCareer({
    coach: { nome: "Rookie", apelido: "Rookie", cidade: "X", estilo: "equilibrado", bio: "", sov: 100, campanhasJogadas: 0, titulos: 0, criadoEm: new Date().toISOString() },
    temporada: 1,
    rodadaAtual: 0,
    divisao: "serie-c",
  } as Partial<CareerState>);
  const comTorcida = garantirTorcidaUniverso(careerBase, userTeam);
  const mapa = comTorcida.torcida ?? {};
  const soma = Object.values(mapa).reduce((acc, t) => acc + (t?.fans ?? 0), 0);
  ok(soma === 1_000_000, `universo zero-sum (Σ=${soma})`);
  ok((mapa["custom"]?.fans ?? 0) > 0, "time do jogador tem torcida própria");
}

console.log(`\n🎉 ${passed} invariantes de promoção/rebaixamento OK`);
