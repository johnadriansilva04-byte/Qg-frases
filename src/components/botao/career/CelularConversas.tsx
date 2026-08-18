import { useState } from "react";
import { Smartphone, ChevronLeft, Trash2, Send, MessageSquare } from "lucide-react";
import type { ConversaCelular } from "./types";

type Props = {
  conversas: ConversaCelular[];
  onEnviarMensagem: (conversaId: string, texto: string) => void;
  onExcluirConversa: (conversaId: string) => void;
  onVoltar: () => void;
};

export function CelularConversas({ conversas, onEnviarMensagem, onExcluirConversa, onVoltar }: Props) {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [textoInput, setTextoInput] = useState("");

  const conversaAtiva = conversas.find((c) => c.id === conversaSelecionada);

  const handleEnviar = () => {
    if (!textoInput.trim() || !conversaSelecionada) return;
    onEnviarMensagem(conversaSelecionada, textoInput);
    setTextoInput("");
  };

  if (conversaAtiva) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="phone-frame">
          <div className="phone-notch" />

          <div className="phone-screen">
            {/* Cabeçalho da conversa */}
            <div className="phone-chat-head">
              <button onClick={() => setConversaSelecionada(null)} className="phone-back" aria-label="Voltar">
                <ChevronLeft className="size-5" />
              </button>
              <div className="phone-avatar">{conversaAtiva.avatar}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{conversaAtiva.nome}</p>
                <p className="truncate text-[10px] text-amber-300">{conversaAtiva.cargo}</p>
              </div>
              <button 
                onClick={() => onExcluirConversa(conversaAtiva.id)}
                className="text-slate-400 hover:text-red-400 transition"
                aria-label="Excluir conversa"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Mensagens */}
            <div className="phone-chat-body">
              {conversaAtiva.mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`phone-bubble-wrap ${
                    msg.remetente === "eu" ? "phone-bubble-me" : "phone-bubble-them"
                  }`}
                >
                  <div className="phone-bubble">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{msg.texto}</p>
                  </div>
                  <span className="phone-bubble-time">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Input de mensagem */}
            <div className="phone-chat-input">
              <input
                type="text"
                value={textoInput}
                onChange={(e) => setTextoInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleEnviar()}
                placeholder="Digite sua mensagem..."
                className="phone-input"
              />
              <button 
                onClick={handleEnviar}
                disabled={!textoInput.trim()}
                className="phone-send"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="phone-frame">
        <div className="phone-notch" />

        <div className="phone-screen">
          {/* Cabeçalho */}
          <div className="phone-chat-head">
            <button onClick={onVoltar} className="phone-back" aria-label="Voltar">
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">Mensagens</p>
              <p className="truncate text-[10px] text-slate-400">{conversas.length} conversas</p>
            </div>
            <Smartphone className="size-4 text-slate-400" />
          </div>

          {/* Lista de conversas */}
          <div className="phone-chat-body">
            {conversas.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="size-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhuma conversa</p>
                <p className="text-xs text-slate-500 mt-1">As mensagens aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversas.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setConversaSelecionada(conv.id)}
                    className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="phone-avatar">{conv.avatar}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-100">{conv.nome}</p>
                          {conv.naoLida && (
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.cargo}</p>
                        {conv.mensagens.length > 0 && (
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {conv.mensagens[conv.mensagens.length - 1]?.texto}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
