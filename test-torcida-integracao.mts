/**
 * Integração torcida ↔ carreira (caminho real do BotaoGame) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-torcida-integracao.mts
 */
import {
  aplicarRodadaTorcida,
  aplicarTitulosDaTemporada,
  formaDoJogador,
  forcasDaTemporada,
  garantirTorcidaUniverso,
  totalTorcedoresUniverso,
} from "./src/components/botao/career/torcidaIntegracao";
import {
  composicoesIniciais,
  criarLigasDaTemporada,
  simularRodadaDivisoes,
} from "./src/components/botao/career/seasonEngine";
import { applyResult, simulateMatch } from "./src/components/botao/tournament";
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

// Carreira mínima (stub — mesmo padrão dos testes anteriores do projeto).
const careerStub = {
  coach: { nome: "Técnico", apelido: "T", sov: 100, titulos: 0, campanhasJogadas: 1 },
  dificuldadeAtual: "amador",
  bonusProximaPartida: 0,
  penaltiesProximaPartida: 0,
  moralTime: 65,
  ultimasEscolhas: [],
  headlines: [],
  ultimaRodadaProcessada: -1,
  eventoPendenteId: null,
  divisao: "serie-c",
  rodadaAtual: 0,
  rodadasDesdeEventoNarrativo: 0,
  temporada: 1,
  conversas: [],
  memoriaRpg: null,
} as unknown as CareerState;

// 1) Universo nasce com 1M e cobre os 61 clubes (60 base + usuário).
let career = garantirTorcidaUniverso(careerStub, userTeam);
ok(Boolean(career.torcida), "torcida criada na carreira");
ok(totalTorcedoresUniverso(career) === TOTAL_TORCEDORES, "universo nasce com 1.000.000");
ok(Boolean(career.torcida!["custom"]), "time do usuário tem torcida");
ok(Object.keys(career.torcida!).length === 61, "61 clubes no universo");

// 2) Idempotente: garantir de novo não recria nem altera.
const career2 = garantirTorcidaUniverso(career, userTeam);
ok(career2 === career, "garantirTorcidaUniverso é idempotente");

// 3) Uma rodada completa: jogo do usuário + simulados migram torcedores.
const composicoes = composicoesIniciais(userTeam, "serie-c");
let ligas = criarLigasDaTemporada(composicoes, userTeam, "amador");
const ligaUser = ligas["serie-c"];
const jogoUser = ligaUser.groupFixtures.find(
  (f) => f.homeId === userTeam.id || f.awayId === userTeam.id,
)!;
const resultadoUser = { homeId: jogoUser.homeId, awayId: jogoUser.awayId, homeGoals: 3, awayGoals: 1 };
applyResult(ligaUser, jogoUser, resultadoUser);
const forcas = forcasDaTemporada(career, userTeam);
ok(Object.keys(forcas).length === 61, "forças efetivas cobrem o universo");
ligas = simularRodadaDivisoes(
  { ...ligas, "serie-c": ligaUser },
  userTeam.id,
  jogoUser.stage,
  "amador",
  forcas,
);
const fansAntes = { ...Object.fromEntries(Object.entries(career.torcida!).map(([k, v]) => [k, v.fans])) };
career = aplicarRodadaTorcida(career, ligas, jogoUser.stage);
ok(totalTorcedoresUniverso(career) === TOTAL_TORCEDORES, "rodada preserva o total (zero-sum)");
const mudaram = Object.entries(career.torcida!).filter(([id, t]) => t.fans !== fansAntes[id]).length;
// Rodada 1: empates com sequências zeradas não migram (regra) — mesmo assim
// a maioria dos 60 clubes em campo se move.
ok(mudaram >= 30, `rodada move o universo (${mudaram} clubes alterados)`);
// Vencedor do jogo do usuário ganhou torcedores.
const vencedorUser = resultadoUser.homeGoals > resultadoUser.awayGoals ? resultadoUser.homeId : resultadoUser.awayId;
ok(
  career.torcida![vencedorUser]!.fans > fansAntes[vencedorUser]!,
  "vencedor do jogo real ganha torcedores",
);

// 4) Fim de temporada: títulos migram para os campeões, zero-sum.
const ligasFim = structuredClone(ligas);
for (const liga of Object.values(ligasFim)) {
  liga.champion = liga.groups[0]!.teamIds[0]!;
}
career = aplicarTitulosDaTemporada(career, ligasFim);
ok(totalTorcedoresUniverso(career) === TOTAL_TORCEDORES, "títulos preservam o total (zero-sum)");

// 5) Forma do jogador derivada da sequência real da torcida.
const forma = formaDoJogador(career, userTeam.id);
ok(
  forma.sequenciaVitorias >= 0 && forma.sequenciaDerrotas >= 0,
  "forma do jogador derivada sem erro",
);
ok(
  typeof forma.invicto === "boolean",
  "invencibilidade calculada",
);

// 6) Simulação usa a força efetiva: clube com torcida gigante joga acima do base.
const forcas2 = forcasDaTemporada(career, userTeam);
const idForte = Object.entries(career.torcida!).sort((a, b) => b[1].fans - a[1].fans)[0]![0];
ok(
  forcas2[idForte]! >= 28 && forcas2[idForte]! <= 99,
  "força efetiva do clube mais popular na faixa",
);
// Determinismo da simulação com overrides (smoke: não lança, resultado válido).
const r = simulateMatch("fla", "pal", "amador", false, forcas2);
ok(r.homeGoals >= 0 && r.awayGoals >= 0, "simulateMatch aceita overrides de força");

console.log(`\n🎉 ${passed} invariantes de integração torcida↔carreira OK`);
