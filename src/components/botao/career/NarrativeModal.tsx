import { useState } from "react";
import { Smartphone, Send, ChevronLeft, AlertTriangle } from "lucide-react";
import type { NarrativaCena, NarrativaEscolha, NarrativaState } from "./narrativeEngine";

type Props = {
  state: NarrativaState;
  cena: NarrativaCena;
  onAvancar: (escolha: NarrativaEscolha) => void;
  onBack?: () => void;
};

/**
 * Tela do celular: histórias dinâmicas (suspense/drama) chegam como mensagens
 * pessoais, em primeira pessoa, como num chat real. Cada resposta ramifica a
 * narrativa para um desfecho único com consequências reais.
 */
export function NarrativeModal({ state, cena, onAvancar, onBack }: Props) {
  const sender = state.remetente;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleChoose = (c: NarrativaEscolha) => {
    setConfirmId(c.id);
    setTimeout(() => onAvancar(c), 260);
  };

  if (!sender) return null;
  const isFinal = !!cena.final;

  return (
    <div className="mx-auto max-w-md px-4 py-6" data-testid="narrative-modal">
      <div className="phone-frame">
        <div className="phone-notch" />

        <div className="phone-screen">
          {/* Cabeçalho do chat */}
          <div className="phone-chat-head">
            {onBack && (
              <button onClick={onBack} className="phone-back" aria-label="Voltar">
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="phone-avatar phone-avatar-narrative">{sender.initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{sender.nome}</p>
              <p className="truncate text-[10px] text-amber-300">● online · {sender.cargo}</p>
            </div>
            <Smartphone className="size-4 text-slate-400" />
          </div>

          {/* Conversa */}
          <div className="phone-chat-body">
            <div className="phone-chat-day">{state.categoria ?? "Mensagem"}</div>

            <div className="phone-bubble-wrap phone-bubble-them">
              <div className="phone-bubble">
                <p className="whitespace-pre-line text-sm leading-relaxed">{cena.mensagem}</p>
              </div>
              <span className="phone-bubble-time">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {!isFinal && (
              <div className="phone-chat-quick">
                <span className="phone-quick-label">Responder:</span>
                <div className="space-y-2">
                  {cena.escolhas.map((c) => (
                    <button
                      key={c.id}
                      data-testid={`narrative-${c.id}`}
                      onClick={() => handleChoose(c)}
                      disabled={confirmId !== null}
                      className={`phone-reply ${confirmId === c.id ? "phone-reply-sent" : ""} ${
                        c.riscoAlto ? "phone-reply-risk" : ""
                      }`}
                    >
                      <span className="phone-reply-text">{c.texto}</span>
                      {c.riscoAlto && <span className="phone-reply-flag">risco</span>}
                      {confirmId === c.id && <Send className="size-3.5 text-amber-300" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {confirmId && (
              <div className="phone-bubble-wrap phone-bubble-me">
                <div className="phone-bubble">
                  {cena.escolhas.find((c) => c.id === confirmId)?.texto}
                </div>
              </div>
            )}

            {isFinal && cena.desfecho && (
              <div className="phone-bubble-wrap phone-bubble-me phone-bubble-desfecho">
                <AlertTriangle className="size-4 text-amber-400" />
                <span className="text-xs uppercase tracking-widest text-amber-300">
                  Desfecho registrado
                </span>
              </div>
            )}

            {isFinal && (
              <button
                data-testid="narrative-concluir"
                onClick={() =>
                  onAvancar(
                    cena.desfecho
                      ? {
                          id: "concluir",
                          texto: "Concluir",
                          descricao: "",
                          desfecho: cena.desfecho,
                          efeitos: {},
                        }
                      : { id: "concluir", texto: "Concluir", descricao: "", efeitos: {} },
                  )
                }
                disabled={confirmId !== null}
                className="phone-reply phone-reply-sent mt-2"
              >
                <span className="phone-reply-text">Concluir e voltar ao hub</span>
                {confirmId === "concluir" && <Send className="size-3.5 text-amber-300" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
