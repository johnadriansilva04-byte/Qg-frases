import { createFileRoute, Link } from "@tanstack/react-router";
import { SimulacaoIQ } from "@/components/campus/desenvolvimento-brio/simulacao-qi/SimulacaoIQ";

export const Route = createFileRoute("/simulacao-qi")({
  head: () => ({
    meta: [
      { title: "Simulação de Teste de QI | Desenvolvimento do Brio" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="relative z-10 flex min-h-screen flex-col items-center px-3 py-4 md:py-6">
        <SimulacaoIQ />
        <div className="mt-4 text-center">
          <Link to="/brio" className="text-xs text-slate-500 transition-colors hover:text-indigo-400">
            ← Voltar para o Desenvolvimento do Brio
          </Link>
        </div>
      </div>
    </div>
  );
}