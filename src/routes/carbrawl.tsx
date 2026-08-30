import { createFileRoute, Link } from "@tanstack/react-router";
import { CarBrawlGame } from "@/components/carbrawl/CarBrawlGame";

export const Route = createFileRoute("/carbrawl")({
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
