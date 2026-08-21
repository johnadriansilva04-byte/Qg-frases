/* eslint-disable no-console */
/**
 * test-ssr-celular.mts — render SSR de todos os apps internos do celular e
 * hubs da Cidadela (o que monta ao clicar em cada ícone do menu do celular).
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
const { SovMarket } = await import("./src/components/financial/SovMarket.tsx");
render("SovMarket", React.createElement(SovMarket, { userId: null, compact: true }));

const { SovBankApp } = await import("./src/components/financial/SovBankApp.tsx");
render(
  "SovBankApp",
  React.createElement(SovBankApp, { userId: "00000000-0000-0000-0000-000000000000" }),
);

const { BolsaResumoCard } = await import("./src/components/financial/BolsaResumoCard.tsx");
render("BolsaResumoCard", React.createElement(BolsaResumoCard, { bolsa: undefined }));

const { ArquivoApp } = await import(
  "./src/components/botao/career/historia/ArquivoApp.tsx"
);
const { HISTORIA_INICIAL } = await import("./src/components/botao/career/historia/types.ts");
render(
  "ArquivoApp",
  React.createElement(ArquivoApp, {
    historia: { ...HISTORIA_INICIAL, capitulo: 2 },
    onRegistrarPosicao: noop,
  }),
);

const { PerfilApp } = await import("./src/components/cidadela/PerfilApp.tsx");
render(
  "PerfilApp",
  React.createElement(PerfilApp, {
    userId: "00000000-0000-0000-0000-000000000000",
    meuUserId: "00000000-0000-0000-0000-000000000000",
    extras: { decisoes: 2, entrevistas: 1, sov: 50 },
    onVoltar: noop,
  }),
);

const { PainelReputacao } = await import("./src/components/cidadela/PainelReputacao.tsx");
const { PainelMundo } = await import("./src/components/cidadela/PainelMundo.tsx");
const { PROFISSOES_PADRAO } = await import("./src/lib/cidadela/profissoes.ts").catch(() => ({
  PROFISSOES_PADRAO: null,
}));
const perfilCidadela = {
  user_id: "00000000-0000-0000-0000-000000000000",
  nome: "Teste",
  bio: null,
  profissao_atual: "tecnico",
  nivel_cidadela: 1,
  reputacao_global: 50,
  estado: null,
} as never;
render("PainelReputacao", React.createElement(PainelReputacao, { perfil: perfilCidadela }));
render("PainelMundo", React.createElement(PainelMundo, { perfil: perfilCidadela }));

const { AuthScreen } = await import("./src/components/botao/components/AuthScreen.tsx");
render("AuthScreen (celular login)", React.createElement(AuthScreen, { onPronto: noop }));

const { TourContextual } = await import("./src/components/cidadela/TourContextual.tsx");
render(
  "TourContextual",
  React.createElement(TourContextual, {
    userId: null,
    passos: [{ alvo: "carreira", titulo: "t", texto: "x" }],
  }),
);

// Hubs da Cidadela (ações ao clicar em jogos)
const { EmpresarioHub } = await import("./src/components/comercial/EmpresarioHub.tsx");
render(
  "EmpresarioHub",
  React.createElement(EmpresarioHub, {
    userId: null, perfil: null, onPerfilAtualizado: noop, onVoltar: noop,
  }),
);
const { LaboratorioHub } = await import("./src/components/laboratorio/LaboratorioHub.tsx");
render(
  "LaboratorioHub",
  React.createElement(LaboratorioHub, {
    userId: null, perfil: null, onPerfilAtualizado: noop, onVoltar: noop,
  }),
);
const { CampusHub } = await import("./src/components/campus/CampusHub.tsx");
render(
  "CampusHub",
  React.createElement(CampusHub, {
    userId: null, perfil: null, onPerfilAtualizado: noop, onVoltar: noop,
  }),
);

// TrilhaGame (outro módulo que precisa continuar funcionando)
const { TrilhaGame } = await import("./src/components/trilha/TrilhaGame.tsx");
render("TrilhaGame", React.createElement(TrilhaGame, { onBack: noop }));



console.log(falhas === 0 ? "\n== 0 falhas ==" : `\n== ${falhas} FALHAS ==`);
process.exit(falhas === 0 ? 0 : 1);
