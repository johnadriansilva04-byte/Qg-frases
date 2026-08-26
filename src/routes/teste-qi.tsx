import { createFileRoute, Link } from "@tanstack/react-router";
import { IQTestComponent } from "@/components/campus/desenvolvimento-brio/teste-qi";

export const Route = createFileRoute("/teste-qi")({
  head: () => ({
    meta: [
      { title: "Teste de QI | Desenvolvimento do Brio" },
      {
        name: "description",
        content:
          "Matrizes de raciocínio lógico geradas proceduralmente (motor I-RAVEN), com explicação das regras ocultas e recompensas em SALVE.",
      },
      { property: "og:title", content: "Teste de QI | Desenvolvimento do Brio" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center p-4 md:p-8">
        <header className="mb-6 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
            TESTE DE QI
          </h1>
          <p className="text-sm text-slate-400">
            Desenvolvimento do Brio · matrizes de raciocínio lógico · recompensas em SALVE
          </p>
        </header>

        <main className="w-full rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 backdrop-blur-sm md:p-6">
          <IQTestComponent showSolution={true} />
        </main>

        <div className="mt-6 text-center">
          <Link to="/brio" className="text-sm text-slate-400 transition-colors hover:text-emerald-400">
            ← Voltar para o Desenvolvimento do Brio
          </Link>
        </div>
      </div>
    </div>
  );
}
