/* eslint-disable no-console */
/**
 * test-ssr-futebol.mts — render SSR de TODAS as telas do Futebol com carreira
 * completamente carregada (campos que só existem em contas reais: ligas, bolsa,
 * torcida, narrativa, história). React #130 = element type inválido.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";

const g = globalThis as Record<string, unknown>;
if (!g["window"]) {
  const win = globalThis as {
    open?: unknown;
    addEventListener?: unknown;
    removeEventListener?: unknown;
  };
  win.open = () => null;
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  (globalThis as unknown as { window: unknown }).window = globalThis;
  g["document"] = {
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: "visible",
    head: { appendChild: () => {} },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ style: {}, setAttribute: () => {} }),
  };
  try {
    Object.defineProperty(g, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
  } catch {
    /* navigator já existe */
  }
  g["localStorage"] = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  g["sessionStorage"] = g["localStorage"];
  g["location"] = { href: "http://localhost/", pathname: "/" };
  g["requestAnimationFrame"] = (cb: () => void) => setTimeout(cb, 0);
  g["cancelAnimationFrame"] = (id: number) => clearTimeout(id);
}

const { EMPTY_CAREER } = await import("./src/components/botao/career/careerStorage.ts");
const { garantirContatosRpg } = await import("./src/components/botao/career/rpg/rpgEngine.ts");
const { createLeague, applyResult, buildKnockout } = await import("./src/components/botao/tournament.ts");
const { TEAMS, createCustomTeam } = await import("./src/components/botao/data/teams.ts");
const { gerarNarrativa } = await import("./src/components/botao/career/narrativeEngine.ts");
const { CHOICE_EVENTS } = await import("./src/components/botao/career/choicesEngine.ts");
const { gerarDesafioPatrocinador } = await import("./src/components/botao/career/patrocinadorEngine.ts");
const { garantirBolsa } = await import("./src/components/botao/career/bolsaEngine.ts");
const { HISTORIA_INICIAL } = await import("./src/components/botao/career/historia/types.ts");
const { gerarCopaBrasil } = await import("./src/components/botao/career/competitionApi.ts");
const { missoesTrilha } = await import("./src/components/botao/career/trilhaIntegracao.ts");

let falhas = 0;
function render(nome: string, el: React.ReactNode) {
  try {
    const html = renderToString(React.createElement(React.Fragment, null, el));
    console.log(`OK   ${nome} (${html.length}b)`);
  } catch (e) {
    falhas++;
    console.error(`FALHOU ${nome}`);
    if (e instanceof Error) {
      console.error(e.message);
      console.error((e.stack ?? "").split("\n").slice(1, 10).join("\n"));
    } else console.error(String(e));
  }
}

const noop = () => {};
const userTeam = createCustomTeam("Meu Time", ["#FF0000", "#00FF00", "#0000FF"]);
const npcs = TEAMS.filter((t) => t.id !== userTeam.id);
const tour = createLeague(userTeam.id, "facil", 20, userTeam);
// Simula uma rodada real para popular gols/moral.
const primeira = tour.groupFixtures[0]!;
applyResult(tour, primeira, { homeGoals: 2, awayGoals: 1 });

const base = garantirContatosRpg({
  ...EMPTY_CAREER,
  coach: { ...EMPTY_CAREER.coach, nome: "Treinador Teste", sov: 50 },
  rodadaAtual: 6,
  moralTime: 80,
});
const career = {
  ...base,
  titulo: "Carreira cheia",
  copaBrasil: gerarCopaBrasil(userTeam, tour.difficulty),
  narrativa: gerarNarrativa(base),
  eventoPendenteId: CHOICE_EVENTS[0]!.id,
  desafioPatrocinador: gerarDesafioPatrocinador(base),
  bolsa: garantirBolsa(undefined),
  historia: { ...HISTORIA_INICIAL, capitulo: 3 },
  marcoLiderTemporada: 1,
  memoriaRpg: null,
} as typeof base;

const { CareerHub } = await import("./src/components/botao/career/CareerHub.tsx");
render(
  "CareerHub (carreira cheia)",
  React.createElement(CareerHub, {
    tour, userTeam, career, ligas: undefined,
    onPlay: noop, onExit: noop,
    onOpenClassificacao: noop, onOpenCalendario: noop, onOpenEconomia: noop,
  }),
);

const { ClassificacaoScreen, ZoneLegend } = await import(
  "./src/components/botao/career/ClassificacaoScreen.tsx"
);
render(
  "ClassificacaoScreen",
  React.createElement(ClassificacaoScreen, {
    tour, userTeam, currentDivisao: career.divisao,
    ligas: undefined, copaBrasil: career.copaBrasil, onBack: noop,
  }),
);
render("ZoneLegend", React.createElement(ZoneLegend));

const { EconomiaScreen } = await import("./src/components/botao/career/EconomiaScreen.tsx");
render(
  "EconomiaScreen",
  React.createElement(EconomiaScreen, {
    career, onComprar: noop, onVender: noop, onBack: noop,
  }),
);

const { CalendarView } = await import("./src/components/botao/career/CalendarView.tsx");
render(
  "CalendarView",
  React.createElement(CalendarView, {
    tour, userTeam, currentDivisao: career.divisao, copaBrasil: career.copaBrasil,
  }),
);

const { CareerMenu } = await import("./src/components/botao/career/CareerMenu.tsx");
render(
  "CareerMenu",
  React.createElement(CareerMenu, {
    career, onLoadCareer: noop, onNewCareer: noop, onSaveCampaign: noop,
    onDeleteCareer: noop, onBack: noop,
  }),
);

const { SeasonEndScreen } = await import("./src/components/botao/career/SeasonEndScreen.tsx");
const { resumoTemporada, criarLigasDaTemporada, composicoesIniciais } = await import(
  "./src/components/botao/career/seasonEngine.ts"
);
const ligas = criarLigasDaTemporada(
  composicoesIniciais(userTeam, "serie-c"),
  userTeam,
  "facil",
);
render(
  "SeasonEndScreen (veredito renova)",
  React.createElement(SeasonEndScreen, {
    resumo: resumoTemporada(ligas, userTeam.id),
    veredito: {
      soberaniaFinal: 120,
      custoManutencao: 50,
      sobrou: 70,
      continua: true,
      motivo: "ok",
      temporadasInadimplente: 0,
    },
    temporada: 1,
    userTeam,
    onContinuar: noop,
    onReiniciar: noop,
  }),
);

const { MatchEndScreen } = await import("./src/components/botao/components/MatchEndScreen.tsx");
render(
  "MatchEndScreen",
  React.createElement(MatchEndScreen, {
    dados: {
      partidaId: "p1",
      resultado: "vitoria",
      placarUser: 2,
      placarAdv: 1,
      timeUserNome: userTeam.name,
      timeAdvNome: npcs[0]!.name,
      competicao: "Brasileirão",
      rodada: "Rodada 1",
      sovDelta: 3,
      moralDelta: 5,
      posicaoTabela: 4,
    },
    onContinuar: noop,
    onPatrocinio: noop,
    patrocinioPago: false,
    entrevistaAberta: false,
  }),
);

const { EntrevistaColetiva } = await import("./src/components/botao/components/EntrevistaColetiva.tsx");
render(
  "EntrevistaColetiva",
  React.createElement(EntrevistaColetiva, {
    partidaId: "p1",
    userTeam,
    rivalTeam: npcs[0]!,
    golsPor: 2,
    golsContra: 1,
    onConcluir: noop,
  }),
);

const { TitleCeremony } = await import("./src/components/botao/career/TitleCeremony.tsx");
render(
  "TitleCeremony",
  React.createElement(TitleCeremony, {
    coach: career.coach, timeName: userTeam.name, difficulty: tour.difficulty,
    soberaniaAdd: 100, onContinue: noop,
  }),
);

const { CoachSetup } = await import("./src/components/botao/career/CoachSetup.tsx");
render(
  "CoachSetup",
  React.createElement(CoachSetup, {
    timeName: userTeam.name, onFinish: noop, onBack: noop,
  }),
);

const { ProfileSetup } = await import("./src/components/botao/career/ProfileSetup.tsx");
render(
  "ProfileSetup",
  React.createElement(ProfileSetup, { perfil: null, onPronto: noop, onBack: noop }),
);

const { CareerIntro } = await import("./src/components/botao/career/CareerIntro.tsx");
render(
  "CareerIntro",
  React.createElement(CareerIntro, { userId: null, onEscolher: noop, onBack: noop }),
);

const { CelularConversas } = await import(
  "./src/components/botao/career/CelularConversas.tsx"
);
render(
  "CelularConversas (carreira cheia)",
  React.createElement(CelularConversas, {
    conversas: career.conversas,
    desafioPatrocinador: career.desafioPatrocinador,
    feed: [],
    trilhaMissoes: missoesTrilha(career),
    npcDigitandoId: null,
    onEnviarMensagem: noop,
    onExcluirConversa: noop,
    onEscolhaRpg: noop,
    onVoltar: noop,
    userId: "00000000-0000-0000-0000-000000000000",
    nomeJogador: "Treinador Teste",
    onLogin: undefined,
    perfilCidadela: null,
    historia: career.historia,
    onRegistrarPosicao: noop,
    statsCarreira: { decisoes: 1, entrevistas: 1 },
    abaInicial: null,
    saldoSov: 50,
    bolsa: career.bolsa,
  }),
);

const { MatchView } = await import("./src/components/botao/components/MatchView.tsx");
render(
  "MatchView (partida)",
  React.createElement(MatchView, {
    homeId: userTeam.id, awayId: npcs[0]!.id, userSide: "home",
    difficulty: tour.difficulty, knockout: false, turns: 24,
    stageLabel: "Brasileirão", onFinish: noop, onQuit: noop,
    customTeam: userTeam, formation: undefined, aiContext: undefined,
  }),
);

console.log(falhas === 0 ? "\n== 0 falhas ==" : `\n== ${falhas} FALHAS ==`);
process.exit(falhas === 0 ? 0 : 1);
