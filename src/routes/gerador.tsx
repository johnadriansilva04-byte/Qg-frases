import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CATEGORIAS, buscarFrases, fraseAleatoria, totalDeFrases } from "@/data/frases";
import { AdSlot, AdVideoSlot } from "@/components/AdSlot";
import { AnuncioPessoal } from "@/components/AnuncioPessoal";
import { NewsModule } from "@/components/NewsModule";
import { OnboardingGate } from "@/components/cidadela/OnboardingGate";

export const Route = createFileRoute("/gerador")({
  head: () => ({
    meta: [
      { title: "Gerador de Texto | Cidadela do Pracinha" },
      {
        name: "description",
        content:
          "Gerador de frases e corretor de texto em um só lugar. Frases prontas para status, correção de texto e muito mais.",
      },
      { property: "og:title", content: "Gerador de Texto | Cidadela do Pracinha" },
      {
        property: "og:description",
        content: "Frases prontas e correção de texto em um só lugar.",
      },
      { property: "og:url", content: "https://pracinha.online/gerador" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Gerador,
});

type Tab = "frases" | "corretor";

function GeradorView() {
  const [activeTab, setActiveTab] = useState<Tab>("frases");

  // Estados do gerador de frases
  const [categoria, setCategoria] = useState<string>("biblia");
  const [busca, setBusca] = useState("");
  const [frase, setFrase] = useState("Carregando frase...");
  const [copiado, setCopiado] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);

  // Estados do corretor de texto
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    if (activeTab === "frases") {
      setFrase(fraseAleatoria("biblia"));
    }
  }, [activeTab]);

  const copiarFrase = async () => {
    try {
      await navigator.clipboard.writeText(frase);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
      setTimeout(() => setMostrarVideo(true), 1000);
    } catch {
      setCopiado(false);
    }
  };

  const iniciarGravacao = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Seu navegador não suporta reconhecimento de voz. Tente usar Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let textoTranscrito = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i]?.isFinal && event.results[i][0]?.transcript) {
          textoTranscrito += event.results[i][0].transcript + ' ';
        }
      }
      setTexto(prev => prev + textoTranscrito);
    };

    recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento de voz:', event.error);
      setGravando(false);
    };

    recognition.onend = () => {
      setGravando(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setGravando(true);
  };

  const pararGravacao = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setGravando(false);
    }
  };

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("Texto copiado!");
    } catch {
      alert("Erro ao copiar");
    }
  };

  const limparTexto = () => {
    setTexto("");
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-6 text-center">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            ← Voltar para a Cidadela
          </Link>
          <h1 className="texto-marca mt-3 text-4xl font-black tracking-tight md:text-5xl">
            ✨ Gerador de Texto
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
            Frases e correção
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total.toLocaleString("pt-BR")} combinações
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("frases")}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "frases"
                ? "botao-marca shadow-md"
                : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            🎲 Gerador de Frases
          </button>
          <button
            onClick={() => setActiveTab("corretor")}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "corretor"
                ? "botao-marca shadow-md"
                : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            ✏️ Corretor de Texto
          </button>
        </div>

        {/* Gerador de Frases */}
        {activeTab === "frases" && (
          <>
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
                onClick={copiarFrase}
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
          </>
        )}

        {/* Corretor de Texto */}
        {activeTab === "corretor" && (
          <>
            <div className="mb-6">
              <div className="relative">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="w-full min-h-[200px] rounded-2xl border border-border bg-background/50 p-4 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder="Cole ou digite seu texto aqui..."
                />
                <button
                  onClick={gravando ? pararGravacao : iniciarGravacao}
                  className={`absolute bottom-4 right-4 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    gravando
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {gravando ? "🔴 Parar" : "🎤 Falar"}
                </button>
              </div>
              {gravando && (
                <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                  🎙️ Gravando... Fale agora
                </p>
              )}
            </div>

            <div className="mb-3 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={copiarTexto}
                className="botao-marca flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg"
              >
                📋 Copiar Texto
              </button>
              <button
                onClick={limparTexto}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/70 px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                🗑️ Limpar
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              <p>Caracteres: {texto.length}</p>
            </div>
          </>
        )}

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <AnuncioPessoal indice={0} />
          {mostrarVideo && <AdVideoSlot />}
          <NewsModule />
        </div>
      </main>

      <footer className="my-4 text-center text-xs text-muted-foreground/70">
        <p>© 2026 Cidadela do Pracinha — Seu universo digital.</p>
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

// OnboardingGate: tour obrigatório do iniciante antes do gerador (§2).
function Gerador() {
  return (
    <OnboardingGate destinoInicial="gerador">
      <GeradorView />
    </OnboardingGate>
  );
}
