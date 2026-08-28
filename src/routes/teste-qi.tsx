import { createFileRoute, Link } from "@tanstack/react-router";
import { IQTestComponent } from "@/components/campus/desenvolvimento-brio/teste-qi";

export const Route = createFileRoute("/teste-qi")({
  head: () => ({
    meta: [
      { title: "Exercícios de QI | Teste de QI — Desenvolvimento do Brio" },
      {
        name: "description",
        content:
          "Exercícios de QI (modo ensino): matrizes de raciocínio lógico geradas proceduralmente (motor I-RAVEN), com explicação das regras ocultas e recompensas em SALVE.",
      },
      { property: "og:title", content: "Exercícios de QI | Teste de QI" },
      {
        property: "og:description",
        content: "Desafios de raciocínio lógico com explicações pedagógicas e recompensas em SALVE.",
      },
      { property: "og:url", content: "https://pracinha.online/teste-qi" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: TesteQI,
});

function TesteQI() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center p-4 md:p-8">
        <header className="mb-6 w-full text-center">
          <Link
            to="/teste-de-qi"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
              <path d="M40 12 L24 32 L40 52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Teste de QI
          </Link>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            EXERCÍCIOS · ENSINO
          </span>
          <h1 className="mb-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
            TESTE DE QI
          </h1>
          <p className="text-sm text-slate-400">
            Treine no seu ritmo · matrizes de raciocínio lógico · explicação das regras · recompensas em SALVE
          </p>
        </header>

        <main className="w-full rounded-2xl border border-slate-700/50 bg-slate-900/50 p-3 backdrop-blur-sm md:p-5">
          <IQTestComponent showSolution={true} />
        </main>

        <div className="mt-6 text-center">
          <Link to="/teste-de-qi" className="text-sm text-slate-400 transition-colors hover:text-emerald-400">
            ← Voltar para o módulo Teste de QI
          </Link>
        </div>
      </div>
    </div>
  );
}
