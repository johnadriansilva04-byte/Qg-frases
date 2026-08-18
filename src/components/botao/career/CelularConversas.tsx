import { useState } from "react";
import { Smartphone, ChevronLeft, Trash2, Send, MessageSquare } from "lucide-react";
import type { ConversaCelular, DesafioPatrocinador } from "./types";

type Props = {
  conversas: ConversaCelular[];
  /** Desafio de patrocinador ativo: vira uma conversa "virtual" no topo. */
  desafioPatrocinador?: DesafioPatrocinador | null;
  onEnviarMensagem: (conversaId: string, texto: string) => void;
  onExcluirConversa: (conversaId: string) => void;
  onVoltar: () => void;
};

export function CelularConversas({
  conversas,
  desafioPatrocinador,
  onEnviarMensagem,
  onExcluirConversa,
  onVoltar,
}: Props) {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [textoInput, setTextoInput] = useState("");
  // IDs de conversas já abertas nesta sessão — limpa o indicador de "não lida"
  // ao abrir, evitando um ponto verde travado que nunca some.
  const [lidas, setLidas] = useState<Set<string>>(new Set());

  // Conversa virtual do patrocinador (desafio ativo), quando houver. É montada
  // a partir do estado real — nunca gera mensagem automática sem evento.
  const convPatrocinador: ConversaCelular | null = desafioPatrocinador && !desafioPatrocinador.concluido
    ? {
        id: "conv-patrocinador",
        tipo: "patrocinador",
        nome: desafioPatrocinador.patrocinador,
        avatar: "💰",
        cargo: "Patrocinador",
        mensagens: [
          {
            id: "pat-msg",
            texto: `${desafioPatrocinador.mensagem}\n\nRecompensa: +${desafioPatrocinador.recompensa} de soberania.`,
            remetente: "outro",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          },
        ],
        naoLida: true,
      }
    : null;

  // Filtra conversas malformadas (sem mensagens) que poderiam quebrar a UI ao
  // clicar — só exibe conversas válidas com ao menos 1 mensagem.
  const conversasValidas = conversas.filter((c) => c && c.mensagens && c.mensagens.length > 0);
  const todasConversas = convPatrocinador
    ? [convPatrocinador, ...conversasValidas]
    : conversasValidas;

  const conversaAtiva = todasConversas.find((c) => c.id === conversaSelecionada) ?? null;

  const abrirConversa = (id: string) => {
    setConversaSelecionada(id);
    setLidas((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleEnviar = () => {
    if (!textoInput.trim() || !conversaSelecionada || conversaSelecionada === "conv-patrocinador")
      return;
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
              {conversaAtiva.id !== "conv-patrocinador" && (
                <button
                  onClick={() => {
                    onExcluirConversa(conversaAtiva.id);
                    setConversaSelecionada(null);
                  }}
                  className="text-slate-400 hover:text-red-400 transition"
                  aria-label="Excluir conversa"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
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

            {/* Input de mensagem (apenas para conversas do usuário, não a virtual do patrocinador) */}
            {conversaAtiva.id !== "conv-patrocinador" ? (
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
            ) : (
              <div className="phone-chat-input">
                <button onClick={onVoltar} className="btn-ghost w-full text-xs">
                  Entendido — voltar
                </button>
              </div>
            )}
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
              <p className="truncate text-[10px] text-slate-400">
                {todasConversas.length} conversa{todasConversas.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Smartphone className="size-4 text-slate-400" />
          </div>

          {/* Lista de conversas */}
          <div className="phone-chat-body">
            {todasConversas.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="size-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Celular limpo</p>
                <p className="text-xs text-slate-500 mt-1">
                  As notificações chegam sozinhas conforme sua carreira avança.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todasConversas.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => abrirConversa(conv.id)}
                    className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="phone-avatar">{conv.avatar}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-100">{conv.nome}</p>
                          {conv.naoLida && !lidas.has(conv.id) && (
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.cargo}</p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {conv.mensagens[conv.mensagens.length - 1]?.texto}
                        </p>
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
