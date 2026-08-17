import { AlertTriangle } from "lucide-react";
import type { Choice, ChoiceEvent } from "./types";

type Props = {
  evento: ChoiceEvent;
  onChoose: (choice: Choice) => void;
};

export function ChoiceModal({ evento, onChoose }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="choice-modal">
      <div className="panel border-primary/30">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
          <AlertTriangle className="size-4" />
          <span>Decisão do treinador</span>
        </div>
        <h3 className="font-display text-2xl">{evento.titulo}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{evento.descricao}</p>

        <div className="mt-5 grid gap-2">
          {evento.escolhas.map((c) => (
            <button
              key={c.id}
              data-testid={`choice-${c.id}`}
              onClick={() => onChoose(c)}
              className={`rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5 ${
                c.riscoAlto ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-base">{c.texto}</span>
                {c.riscoAlto && (
                  <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
                    Risco alto
                  </span>
                )}
              </div>
              {c.descricao && <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
