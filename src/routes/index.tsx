import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIAS, buscarFrases, fraseAleatoria, totalDeFrases } from "@/data/frases";
import { AdSlot, AdVideoSlot } from "@/components/AdSlot";
import { AnuncioPessoal } from "@/components/AnuncioPessoal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QG Frases | Frases de Motivação, Status e Legendas" },
      {
        name: "description",
        content:
          "Sorteie frases prontas para Reels, status, versículos bíblicos, cantadas, indiretas e motivação. Copie em um clique, de graça. Milhões de frases prontas.",
      },
      { property: "og:title", content: "QG Frases | Frases de Motivação, Status e Legendas" },
      {
        property: "og:description",
        content: "Milhões de frases para copiar: legendas, versículos, cantadas e motivação.",
      },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});

function Index() {
  const [categoria, setCategoria] = useState<string>("biblia");
  const [busca, setBusca] = useState("");
  const [frase, setFrase] = useState("Carregando frase...");
  const [copiado, setCopiado] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);

  const total = useMemo(() => totalDeFrases(), []);

  const sortear = useCallback(
    (catId = categoria, termo = busca) => {
      if (termo.trim()) {
        const achadas = buscarFrases(termo);
        setFrase(
          achadas.length > 0
            ? (achadas[Math.floor(Math.random() * achadas.length)] as string)
            : 'Nenhuma frase encontrada. Tente palavras como "Deus", "foco" ou "amor".',
        );
        return;
      }
      setFrase(fraseAleatoria(catId));
    },
    [categoria, busca],
  );

  useEffect(() => {
    setFrase(fraseAleatoria("biblia"));
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(frase);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
      setTimeout(() => setMostrarVideo(true), 1000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <div className="w-full max-w-3xl">
        <AdSlot rotulo="Banner Topo / Google AdSense" />
      </div>

      <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-6 text-center">
          <h1 className="texto-marca text-4xl font-black tracking-tight md:text-5xl">
            QG Frases
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
            Encontre a legenda, frase ou mensagem perfeita em um clique
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {total.toLocaleString("pt-BR")} combinações de frases disponíveis
          </p>
        </header>

        <div className="relative mb-6">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-primary">
            🔍
          </span>
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              sortear(categoria, e.target.value);
            }}
            placeholder="Digite o que precisa (ex: Deus, praia, motivação, amor)..."
            aria-label="Buscar frase"
            className="w-full rounded-2xl border border-border bg-background/60 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground/70 shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 md:text-base"
          />
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {CATEGORIAS.map((c) => {
            const ativo = c.id === categoria && !busca.trim();
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoria(c.id);
                  setBusca("");
                  sortear(c.id, "");
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition md:text-sm ${
                  ativo
                    ? "botao-marca shadow-md"
                    : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.emoji} {c.nome}
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-border bg-background/50 p-6 text-center shadow-inner">
          <p className="max-w-xl text-lg font-medium leading-relaxed text-foreground md:text-2xl">
            {frase}
          </p>
        </div>

        <div className="mb-3 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => sortear()}
            className="botao-marca flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg"
          >
            🎲 Sortear Outra
          </button>
          <button
            onClick={copiar}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/70 px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            📋 Copiar Frase
          </button>
        </div>

        <div className="h-6 text-center">
          <span
            className={`text-xs font-medium text-success transition-opacity duration-300 md:text-sm ${
              copiado ? "opacity-100" : "opacity-0"
            }`}
          >
            ✓ Frase copiada para a área de transferência!
          </span>
        </div>

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <AnuncioPessoal indice={0} />
          {mostrarVideo && <AdVideoSlot />}
        </div>

        <nav className="mt-6 text-center">
          <Link to="/biblioteca" className="text-sm font-semibold text-primary hover:underline">
            📚 Ir para a Biblioteca de livros →
          </Link>
        </nav>
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
