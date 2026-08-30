import { createFileRoute, Link } from "@tanstack/react-router";
import { CarBrawlGame } from "@/components/carbrawl/CarBrawlGame";

export const Route = createFileRoute("/carbrawl")({
  head: () => ({
    meta: [
      { title: "Car Brawl | Cidadela do Pracinha" },
      {
        name: "description",
        content:
          "Car Brawl: jogo de batalha de carrinhos. Monte seu veículo, escolha arenas e empurre adversários para fora da arena.",
      },
      { property: "og:title", content: "Car Brawl | Cidadela do Pracinha" },
      {
        property: "og:description",
        content:
          "Jogo de batalha de carrinhos com física realista. Monte seu veículo, escolha arenas e empurre adversários para fora.",
      },
      { property: "og:url", content: "https://pracinha.online/carbrawl" },
      { property: "og:image", content: "https://pracinha.online/artes/cidadela-icon-og.jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Car Brawl | Cidadela do Pracinha" },
      {
        name: "twitter:description",
        content:
          "Jogo de batalha de carrinhos com física realista. Monte seu veículo, escolha arenas e empurre adversários para fora.",
      },
      { name: "twitter:image", content: "https://pracinha.online/artes/cidadela-icon-og.jpeg" },
    ],
  }),
  component: CarBrawl,
});

function CarBrawl() {
  return (
    <div className="h-screen bg-[#0a0e1a] text-white">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="text-xs font-bold text-white/50 hover:text-white/80">
          ← Voltar
        </Link>
      </div>
      <CarBrawlGame onBack={() => window.history.back()} />
    </div>
  );
}
