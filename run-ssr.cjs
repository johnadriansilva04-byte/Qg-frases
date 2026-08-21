/* eslint-disable no-console */
// run-ssr.cjs — bundle o teste SSR (fluxo Futebol→Carreira→Celular) com a API
// do rolldown e executa com node. Alias "@" → ./src igual ao vite.config.
const { rolldown } = require("rolldown");
const path = require("node:path");

(async () => {
  const input = process.argv[2] || "test-ssr-flow.mts";
  const outFile = input.replace(/\.mts?$/, "") + ".bundle.mjs";
  const build = await rolldown({
    input,
    platform: "node",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      extensions: [".tsx", ".ts", ".mts", ".jsx", ".js", ".json"],
    },
    external: ["react", "react-dom", "react-dom/server", "@tanstack/react-router"],
    output: {
      file: outFile,
      format: "esm",
      codeSplitting: false,
    },
  });
  await build.write({
    file: outFile,
    format: "esm",
    codeSplitting: false,
  });
  console.log("bundle ok");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
