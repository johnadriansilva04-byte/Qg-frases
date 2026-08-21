/* eslint-disable no-console */
/**
 * test-ssr-flow.mts — reproduz o fluxo Futebol → Carreira → Celular via SSR
 * (react-dom/server). React #130 ("element type is invalid") dispara aqui com
 * nome do componente e stack, sem precisar do browser/Supabase.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";

// Shim mínimo de browser para hooks que tocam window/document no render.
const g = globalThis as Record<string, unknown>;
if (!g["window"]) {
  const win = globalThis as { open?: unknown; addEventListener?: unknown; removeEventListener?: unknown };
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
    Object.defineProperty(g, "navigator", { value: { onLine: true }, configurable: true });
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

const { CareerHub } = await import("./src/components/botao/career/CareerHub.tsx");
const { CelularConversas } = await import(
  "./src/components/botao/career/CelularConversas.tsx"
);
const { CelularFixo } = await import("./src/components/CelularFixo.tsx");
const { SubornoStory } = await import("./src/components/botao/career/SubornoStory.tsx");
const { NarrativeModal } = await import("./src/components/botao/career/NarrativeModal.tsx");
const { ChoiceModal } = await import("./src/components/botao/career/ChoiceModal.tsx");
const { EMPTY_CAREER } = await import("./src/components/botao/career/careerStorage.ts");
const { garantirContatosRpg } = await import("./src/components/botao/career/rpg/rpgEngine.ts");
const { createLeague } = await import("./src/components/botao/tournament.ts");
const { TEAMS, createCustomTeam } = await import("./src/components/botao/data/teams.ts");
const { SUBORNO_INICIAL } = await import("./src/components/botao/career/subornoEngine.ts");
const { gerarNarrativa, cenaDaNarrativa } = await import(
  "./src/components/botao/career/narrativeEngine.ts"
);
const { CHOICE_EVENTS } = await import("./src/components/botao/career/choicesEngine.ts");
const { missoesTrilha } = await import("./src/components/botao/career/trilhaIntegracao.ts");

let falhas = 0;
function render(nome: string, el: React.ReactNode) {
  try {
    const html = renderToString(React.createElement(React.Fragment, null, el));
    console.log(`OK   ${nome} (${html.length}b)`);
  } catch (e) {
    falhas++;
    console.error(`FALHOU ${nome}`);
    console.error(String(e));
    if (e instanceof Error && e.stack) {
      console.error(e.stack.split("\n").slice(0, 12).join("\n"));
    }
  }
}

const userTeam = createCustomTeam("Meu Time", ["#FF0000", "#00FF00", "#0000FF"]);
const npcs = TEAMS.filter((t) => t.id !== userTeam.id).slice(0, 19);
const tour = createLeague([userTeam, ...npcs], "facil", userTeam.id);

const career = garantirContatosRpg({
  ...EMPTY_CAREER,
  coach: { ...EMPTY_CAREER.coach, nome: "Treinador Teste", sov: 50 },
});

// 1) Hub do Modo Carreira (o que renderiza logo após "Continuar Campanha").
render(
  "CareerHub (hub)",
  React.createElement(CareerHub, {
    tour,
    userTeam,
    career,
    ligas: undefined,
    onPlay: () => {},
    onExit: () => {},
    onOpenClassificacao: () => {},
    onOpenCalendario: () => {},
    onOpenEconomia: () => {},
  }),
);

// 2) Celular fechado→aberto: CelularConversas com dados reais da carreira.
render(
  "CelularConversas (menu apps)",
  React.createElement(CelularConversas, {
    conversas: career.conversas,
    desafioPatrocinador: null,
    feed: career.feedCidadela ?? [],
    trilhaMissoes: missoesTrilha(career),
    npcDigitandoId: null,
    onEnviarMensagem: () => {},
    onExcluirConversa: () => {},
    onEscolhaRpg: () => {},
    onVoltar: () => {},
    userId: null,
    nomeJogador: "Treinador Teste",
    onLogin: undefined,
    perfilCidadela: null,
    historia: career.historia,
    onRegistrarPosicao: undefined,
    statsCarreira: { decisoes: 0, entrevistas: 0 },
    abaInicial: null,
    saldoSov: 50,
    bolsa: undefined,
  }),
);

// 3) CelularFixo (fechado — botão flutuante).
render(
  "CelularFixo (fechado)",
  React.createElement(CelularFixo, {
    userId: null,
    nomeJogador: "Treinador Teste",
    conversas: career.conversas,
  }),
);

// 4) Prioridades do celular (suborno / narrativa / choice).
const careerSuborno = { ...career, suborno: SUBORNO_INICIAL };
const narrativa = gerarNarrativa(career);
const cena = cenaDaNarrativa(narrativa);
render(
  "SubornoStory (prioridade)",
  React.createElement(SubornoStory, {
    state: SUBORNO_INICIAL,
    onAvancar: () => {},
    onFechar: () => {},
  }),
);
render(
  "SubornoStory nodeAtual=aprox1 (REPRO #130)",
  React.createElement(SubornoStory, {
    state: { ...SUBORNO_INICIAL, oferta: 1, nodeAtual: "aprox1" },
    onAvancar: () => {},
    onFechar: () => {},
  }),
);
if (cena) {
  render(
    "NarrativeModal (prioridade)",
    React.createElement(NarrativeModal, {
      state: narrativa,
      cena,
      onAvancar: () => {},
      onBack: () => {},
    }),
  );
}
const ev = CHOICE_EVENTS[0]!;
render(
  "ChoiceModal (prioridade)",
  React.createElement(ChoiceModal, {
    evento: ev,
    onChoose: () => {},
    onBack: () => {},
  }),
);

// 5) CelularFixo com prioridade — caminho real do crash (§15).
render(
  "CelularFixo + prioridade suborno",
  React.createElement(CelularFixo, {
    userId: null,
    nomeJogador: "Treinador Teste",
    conversas: careerSuborno.conversas,
    prioridade: React.createElement(SubornoStory, {
      state: SUBORNO_INICIAL,
      onAvancar: () => {},
      onFechar: () => {},
    }),
  }),
);

console.log(falhas === 0 ? "\n== 0 falhas ==" : `\n== ${falhas} FALHAS ==`);
process.exit(falhas === 0 ? 0 : 1);
