import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Target, Dice2, Skull, CircleDot, Gamepad2 } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { TrilhaGame } from "@/components/trilha/TrilhaGame";

export const Route = createFileRoute("/cidadela")({
  head: () => ({
    meta: [
      { title: "Cidadela de Jogos | QG Frases" },
      {
        name: "description",
        content: "Conheça nossa cidadela de jogos clássicos. Trilha, dado, forca, jogo da velha e muito mais.",
      },
      { property: "og:title", content: "Cidadela de Jogos | QG Frases" },
      {
        property: "og:description",
        content: "Conheça nossa cidadela de jogos clássicos. Trilha, dado, forca, jogo da velha e muito mais.",
      },
      { property: "og:url", content: "https://pracinha.online/cidadela" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Cidadela,
});

type Game = "trilha" | "dado" | "forca" | "velha" | "snake" | null;

const GAMES = [
  { id: "trilha" as Game, label: "Trilha", description: "Jogo de estratégia tática", icon: Target, status: "disponível" },
  { id: "dado" as Game, label: "Dado Virtual", description: "Role o dado da sorte", icon: Dice2, status: "em breve" },
  { id: "forca" as Game, label: "Jogo da Forca", description: "Adivinhe a palavra secreta", icon: Skull, status: "em breve" },
  { id: "velha" as Game, label: "Jogo da Velha", description: "Clássico de estratégia", icon: CircleDot, status: "em breve" },
  { id: "snake" as Game, label: "Snake", description: "Relíquia da Nokia", icon: Gamepad2, status: "em breve" },
];

function Cidadela() {
  const [activeGame, setActiveGame] = useState<Game>(null);

  if (activeGame === "trilha") {
    return <TrilhaGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <div className="w-full max-w-3xl">
        <AdSlot rotulo="Banner Topo / Google AdSense" />
      </div>

      <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-6 text-center">
          <h1 className="texto-marca text-4xl font-black tracking-tight md:text-5xl">
            🏰 Cidadela de Jogos
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
            Conheça nossa cidadela de jogos clássicos
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Entre no mundo dos jogos e divirta-se
          </p>
        </header>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Jogos Disponíveis</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {GAMES.map((game) => {
              const Icon = game.icon;
              const isAvailable = game.status === "disponível";
              return (
                <button
                  key={game.id}
                  onClick={() => isAvailable && setActiveGame(game.id)}
                  disabled={!isAvailable}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    isAvailable
                      ? "border-border bg-surface/50 hover:bg-primary/10 hover:border-primary cursor-pointer"
                      : "border-border/50 bg-surface/30 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${isAvailable ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground">{game.label}</h3>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                    <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                      isAvailable ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {game.status === "disponível" ? "Disponível" : "Em breve"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Mais jogos em breve! Fique ligado.</p>
        </div>
      </main>

      <div className="w-full max-w-3xl">
        <AdSlot rotulo="Banner Rodapé / Google AdSense" />
      </div>

      <footer className="my-4 text-center text-xs text-muted-foreground/70">
        <p>© 2026 QG Frases — Seu mural de frases rápidas.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/privacidade" className="hover:text-primary transition">
            Privacidade
          </Link>
          <Link to="/termos" className="hover:text-primary transition">
            Termos
          </Link>
        </div>
      </footer>
    </div>
  );
}
