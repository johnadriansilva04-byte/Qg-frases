import { useState } from "react";
import { Smartphone, Send, ChevronLeft } from "lucide-react";
import type { Choice, ChoiceEvent } from "./types";

type Props = {
  evento: ChoiceEvent;
  onChoose: (choice: Choice) => void;
  onBack?: () => void;
};

/** Remetente e tom em primeira pessoa para cada tipo de decisão. */
const SENDER: Record<string, { nome: string; cargo: string; initials: string }> = {
  "craque-dor": { nome: "Dr. Maurício", cargo: "Departamento Médico", initials: "DM" },
  coletiva: { nome: "Carlos", cargo: "Assessoria de Imprensa", initials: "AI" },
  "escalar-jovem": { nome: "Sebastião", cargo: "Coordenador da Base", initials: "CB" },
  torcida: { nome: "Beto", cargo: "Líder da Torcida", initials: "LT" },
  "treino-intensivo": { nome: "Professor Léo", cargo: "Preparador Físico", initials: "PF" },
};

function senderFor(evento: ChoiceEvent) {
  return SENDER[evento.id] ?? { nome: "Diretoria", cargo: "Clube", initials: "CL" };
}

/**
 * Tela do celular: decisões chegam como mensagens de comunicação pessoal,
 * em primeira pessoa, como num bate-papo corporativo do clube — nunca como
 * narração genérica em terceira pessoa.
 */
export function ChoiceModal({ evento, onChoose, onBack }: Props) {
  const sender = senderFor(evento);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleChoose = (c: Choice) => {
    setConfirmId(c.id);
    // Pequeno delay para o usuário ver o "envio" da resposta.
    setTimeout(() => onChoose(c), 220);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6" data-testid="choice-modal">
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
            <div className="phone-avatar">{sender.initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{sender.nome}</p>
              <p className="truncate text-[10px] text-emerald-300">● online · {sender.cargo}</p>
            </div>
            <Smartphone className="size-4 text-slate-400" />
          </div>

          {/* Conversa */}
          <div className="phone-chat-body">
            <div className="phone-chat-day">Hoje</div>

            <Bubble sender="them" titulo={evento.titulo}>
              {evento.descricao}
            </Bubble>

            <div className="phone-chat-quick">
              <span className="phone-quick-label">Responder:</span>
              <div className="space-y-2">
                {evento.escolhas.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`choice-${c.id}`}
                    onClick={() => handleChoose(c)}
                    disabled={confirmId !== null}
                    className={`phone-reply ${confirmId === c.id ? "phone-reply-sent" : ""} ${
                      c.riscoAlto ? "phone-reply-risk" : ""
                    }`}
                  >
                    <span className="phone-reply-text">{c.texto}</span>
                    {c.riscoAlto && <span className="phone-reply-flag">risco</span>}
                    {confirmId === c.id && <Send className="size-3.5 text-emerald-300" />}
                  </button>
                ))}
              </div>
            </div>

            {confirmId && (
              <Bubble sender="me">
                {evento.escolhas.find((c) => c.id === confirmId)?.texto}
              </Bubble>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  sender,
  children,
  titulo,
}: {
  sender: "me" | "them";
  children: React.ReactNode;
  titulo?: string;
}) {
  return (
    <div className={`phone-bubble-wrap ${sender === "me" ? "phone-bubble-me" : "phone-bubble-them"}`}>
      <div className="phone-bubble">
        {titulo && <p className="phone-bubble-title">{titulo}</p>}
        <p className="whitespace-pre-line text-sm leading-relaxed">{children}</p>
      </div>
      <span className="phone-bubble-time">
        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

