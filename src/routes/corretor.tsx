import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/corretor")({
  head: () => ({
    meta: [
      { title: "Corretor de Texto | QG Frases" },
      {
        name: "description",
        content: "Ferramenta de correção de texto. Edite e melhore suas frases antes de usar.",
      },
      { property: "og:title", content: "Corretor de Texto | QG Frases" },
      {
        property: "og:description",
        content: "Ferramenta de correção de texto. Edite e melhore suas frases antes de usar.",
      },
      { property: "og:url", content: "https://pracinha.online/corretor" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Corretor,
});

function Corretor() {
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<any>(null);

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
        if (event.results[i].isFinal) {
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

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("Texto copiado!");
    } catch {
      alert("Erro ao copiar");
    }
  };

  const limpar = () => {
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
      <div className="w-full max-w-3xl">
        <AdSlot rotulo="Banner Topo / Google AdSense" />
      </div>

      <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-6 text-center">
          <h1 className="texto-marca text-4xl font-black tracking-tight md:text-5xl">
            ✏️ Corretor de Texto
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
            Cole ou digite seu texto aqui para editar e corrigir
          </p>
        </header>

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
            onClick={copiar}
            className="botao-marca flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg"
          >
            📋 Copiar Texto
          </button>
          <button
            onClick={limpar}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/70 px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            🗑️ Limpar
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>Caracteres: {texto.length}</p>
        </div>
      </main>

      <div className="w-full max-w-3xl">
        <AdSlot rotulo="Banner Rodapé / Google AdSense" />
      </div>
    </div>
  );
}
