import { createFileRoute, Link } from "@tanstack/react-router";
import { SimulacaoIQ } from "@/components/campus/desenvolvimento-brio/simulacao-qi/SimulacaoIQ";

export const Route = createFileRoute("/simulacao-qi")({
  head: () => ({
    meta: [
      { title: "Simulação de Teste de QI | Teste de QI — Cidadela do Pracinha" },
      {
        name: "description",
        content:
          "Simulação experimental de raciocínio não verbal: 32 questões inéditas, 25 minutos, dificuldade progressiva e resultado apenas ao final.",
      },
      { property: "og:title", content: "Simulação de Teste de QI" },
      {
        property: "og:description",
        content: "Avaliação experimental de raciocínio — inspirada no estilo de avaliações não verbais.",
      },
      { property: "og:url", content: "https://pracinha.online/simulacao-qi" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: SimulacaoQI,
});

function SimulacaoQI() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      <div className="absolute right-1/4 top-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-3 py-4 md:py-8">
        <SimulacaoIQ />
        <div className="mt-4 text-center">
          <Link to="/teste-de-qi" className="text-xs text-slate-500 transition-colors hover:text-indigo-400">
            ← Voltar para o módulo Teste de QI
          </Link>
        </div>
      </div>
    </div>
  );
}