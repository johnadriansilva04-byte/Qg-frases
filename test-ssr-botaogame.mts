/* eslint-disable no-console */
/** test-ssr-botaogame.mts — SSR da raiz BotaoGame (a tela que monta no Futebol). */
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
    Object.defineProperty(g, "navigator", { value: { onLine: true }, configurable: true });
  } catch {
    /* navigator já existe */
  }
  g["localStorage"] = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
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
      console.error((e.stack ?? "").split("\n").slice(1, 14).join("\n"));
    } else console.error(String(e));
  }
}

const { BotaoGame } = await import("./src/components/botao/BotaoGame.tsx");
render("BotaoGame (montagem)", React.createElement(BotaoGame, {}));
render(
  "BotaoGame (com onBack)",
  React.createElement(BotaoGame, { onBack: () => {} }),
);

console.log(falhas === 0 ? "\n== 0 falhas ==" : `\n== ${falhas} FALHAS ==`);
process.exit(falhas === 0 ? 0 : 1);
