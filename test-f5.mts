/**
 * Teste do ciclo F5: carreira → JSONB (Supabase) → normalizarCareer → estado
 * restaurado SEM perda (torcida, ligas, veredito derivado) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-f5.mts
 */
import { normalizarCareer } from "./src/components/botao/career/careerStorage";
import {
  composicoesIniciais,
  criarLigasDaTemporada,
  ligasConcluidas,
  resumoTemporada,
} from "./src/components/botao/career/seasonEngine";
import { avaliarFimTemporada } from "./src/components/botao/career/competitionApi";
import { garantirTorcidaUniverso, totalTorcedoresUniverso } from "./src/components/botao/career/torcidaIntegracao";
import { createCustomTeam } from "./src/components/botao/data/teams";
import { TOTAL_TORCEDORES } from "./src/components/botao/career/torcidaEngine";
import type { CareerState } from "./src/components/botao/career/types";

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

// Carreira em andamento: rodada 5, torcida já evoluída, ligas vivas.
const composicoes = composicoesIniciais(userTeam, "serie-c");
const ligas = criarLigasDaTemporada(composicoes, userTeam, "amador");
const careerBase = {
  coach: { nome: "Técnico", apelido: "T", sov: 137, titulos: 1, campanhasJogadas: 2 },
  dificuldadeAtual: "amador",
  bonusProximaPartida: 0,
  penaltiesProximaPartida: 0,
  moralTime: 72,
  ultimasEscolhas: [],
  headlines: [],
  ultimaRodadaProcessada: 4,
  eventoPendenteId: null,
  divisao: "serie-c",
  rodadaAtual: 5,
  rodadasDesdeEventoNarrativo: 1,
  temporada: 2,
  conversas: [],
  ligas,
  composicoes,
  memoriaRpg: null,
} as unknown as CareerState;
const careerComTorcida = garantirTorcidaUniverso(careerBase, userTeam);

// 1) Round-trip JSONB: JSON.stringify/parse simula o transporte do Supabase.
const jsonb = JSON.parse(JSON.stringify(careerComTorcida));
const restaurada = normalizarCareer(jsonb);
ok(Boolean(restaurada.torcida), "torcida sobrevive ao F5");
ok(totalTorcedoresUniverso(restaurada) === TOTAL_TORCEDORES, "total de 1M preservado no F5");
ok(restaurada.divisao === "serie-c", "divisão restaurada");
ok(restaurada.temporada === 2, "temporada restaurada");
ok(restaurada.rodadaAtual === 5, "rodada restaurada");
ok(restaurada.coach.sov === 137, "cache de soberania restaurado");
ok(Boolean(restaurada.ligas), "ligas restauradas");
ok(!ligasConcluidas(restaurada.ligas!), "temporada em andamento NÃO dispara veredito");

// 2) F5 no FIM da temporada: veredito DERIVADO das ligas concluídas.
const ligasFim = structuredClone(ligas);
for (const [divisao, liga] of Object.entries(ligasFim)) {
  for (const f of liga.groupFixtures) {
    f.played = true;
    f.result = { homeId: f.homeId, awayId: f.awayId, homeGoals: 1, awayGoals: 0 };
  }
  // Usuário em 1º na Série C (cenário de campeão); demais divisões na ordem base.
  const ids =
    divisao === "serie-c"
      ? [userTeam.id, ...liga.groups[0]!.teamIds.filter((id) => id !== userTeam.id)]
      : liga.groups[0]!.teamIds;
  liga.groups[0]!.table = ids.map((id, i) => ({
    teamId: id, p: 100 - i, j: 38, v: 30, e: 8, d: 0, gp: 80 - i, gc: 20 + i,
  }));
  liga.champion = ids[0]!;
  liga.phase = "fim";
}
const careerFim = normalizarCareer(
  JSON.parse(JSON.stringify({ ...careerComTorcida, ligas: ligasFim })),
);
ok(ligasConcluidas(careerFim.ligas!), "F5 detecta temporada concluída");
// Mesma derivação que a hidratação faz (BotaoGame):
const veredito = avaliarFimTemporada(careerFim.coach.sov, careerFim.divisao);
ok(veredito.continua, "veredito derivado pós-F5 permite continuar (sov 137 >= 50)");
const resumo = resumoTemporada(careerFim.ligas!, userTeam.id);
ok(resumo.usuarioCampeao, "resumo pós-F5 mostra o usuário campeão");
ok(resumo.usuarioPromovido, "resumo pós-F5 mostra promoção");

// 3) Torcida corrompida no JSONB é saneada sem derrubar a carreira.
const corrompida = JSON.parse(JSON.stringify(careerComTorcida));
corrompida.torcida["custom"] = { fans: -50, seq: "abc" };
corrompida.torcida["clube-x"] = { fans: Number.NaN, seq: 2 };
corrompida.torcida["lixo"] = null;
const saneada = normalizarCareer(corrompida);
// Entradas corrompidas são REMOVIDAS — a hidratação (garantirTorcidaUniverso)
// as recria corretamente, mantendo o zero-sum.
ok(!("custom" in saneada.torcida!), "clube com fans negativos removido para recriação");
ok(!("clube-x" in saneada.torcida!), "clube com fans NaN removido");
ok(!("lixo" in saneada.torcida!), "entrada nula removida");
const recuperada = garantirTorcidaUniverso(saneada, userTeam);
ok(Boolean(recuperada.torcida!["custom"]), "clube removido é recriado na hidratação");
ok(totalTorcedoresUniverso(recuperada) === TOTAL_TORCEDORES, "total volta a 1M após recuperação");

// 4) Carreira ANTIGA (sem torcida — antes da feature) carrega normal.
const antiga = JSON.parse(JSON.stringify(careerComTorcida));
delete antiga.torcida;
const antigaOk = normalizarCareer(antiga);
ok(antigaOk.torcida === undefined, "carreira antiga sem torcida não quebra");
// E a hidratação cobre com garantirTorcidaUniverso (caminho do BotaoGame):
const coberta = garantirTorcidaUniverso(antigaOk, userTeam);
ok(totalTorcedoresUniverso(coberta) === TOTAL_TORCEDORES, "carreira antiga ganha o universo na hidratação");

console.log(`\n🎉 ${passed} invariantes do ciclo F5 OK`);
