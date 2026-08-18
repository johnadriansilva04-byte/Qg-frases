import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

export type ChatMsg = {
  autorId: string;
  autorNome: string;
  texto: string;
  enviadoEm: number;
  eu: boolean;
};

const RESPOSTAS_PRONTAS = [
  "Boa jogada!",
  "Boa partida!",
  "Vamos lá!",
  "Golaaaço! 🔥",
  "Tá fácil! 😎",
  "Sorte a sua...",
  "Próxima!",
  "GG",
  "Nossa, que defesa!",
  "Calma, ainda dá!",
];

type Props = {
  mensagens: ChatMsg[];
  onEnviar: (texto: string) => void;
  meuNome: string;
};

/**
 * Chat overlay do amistoso online: botão flutuante (ícone de balão) sobre o
 * campo. Ao clicar, abre um painel com respostas prontas + campo de digitação.
 * Não atrapalha a partida — fica posicionado à direita, acima do campo.
 */
export function ChatOverlay({ mensagens, onEnviar, meuNome }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto && listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensagens, aberto]);

  const enviar = (t: string) => {
    const limpo = t.trim();
    if (!limpo) return;
    onEnviar(limpo);
    setTexto("");
  };

  return (
    <>
      {/* Botão flutuante — não abre sobre a área de mira do campo */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="absolute right-2 top-2 z-20 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
          title="Abrir chat"
        >
          <MessageCircle className="size-4" />
          {mensagens.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-red-500 ring-2 ring-background" />
          )}
        </button>
      )}

      {/* Painel de chat */}
      {aberto && (
        <div className="absolute right-2 top-2 z-30 flex h-72 w-64 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-display text-sm">Chat</span>
            <button onClick={() => setAberto(false)} className="btn-ghost p-1" title="Fechar">
              <X className="size-3.5" />
            </button>
          </div>

          <div ref={listaRef} className="flex-1 space-y-1.5 overflow-y-auto p-2 text-sm">
            {mensagens.length === 0 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Sem mensagens ainda. Mande um oi! 👋
              </p>
            )}
            {mensagens.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                  m.eu
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground"
                }`}
              >
                {!m.eu && <p className="mb-0.5 font-semibold opacity-80">{m.autorNome}</p>}
                <p className="break-words">{m.texto}</p>
              </div>
            ))}
          </div>

          {/* Respostas prontas */}
          <div className="flex flex-wrap gap-1 border-t border-border p-1.5">
            {RESPOSTAS_PRONTAS.slice(0, 6).map((r) => (
              <button
                key={r}
                onClick={() => enviar(r)}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] transition hover:bg-primary hover:text-primary-foreground"
              >
                {r}
              </button>
            ))}
          </div>

          {/* Digitação */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-center gap-1 border-t border-border p-1.5"
          >
            <input
              className="field-input h-8 flex-1 text-xs"
              maxLength={120}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite..."
            />
            <button
              type="submit"
              disabled={!texto.trim()}
              className="btn-primary flex size-8 shrink-0 items-center justify-center p-0 disabled:opacity-50"
              title="Enviar"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatOverlay;
