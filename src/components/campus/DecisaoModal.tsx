import type { Atividade } from "./types";

type Props = {
  atividade: Atividade;
  onEscolher: (idx: number) => void;
  onFechar: () => void;
  salvando?: boolean | undefined;
};

/** Modal de decisão compartilhado (Campus, Comercial, Laboratório). */
export function DecisaoModal({ atividade, onEscolher, onFechar, salvando = false }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {atividade.tipo} · dificuldade {atividade.dificuldade}
        </p>
        <h2 className="mb-2 text-lg font-black text-foreground">{atividade.titulo}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{atividade.descricao}</p>
        <div className="space-y-2">
          {atividade.opcoes.map((op, idx) => (
            <button
              key={idx}
              onClick={() => onEscolher(idx)}
              disabled={salvando}
              className="w-full rounded-lg border border-border bg-surface/50 p-3 text-left text-sm text-foreground transition hover:border-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {op.texto}
            </button>
          ))}
        </div>
        <button
          onClick={onFechar}
          className="mt-3 w-full rounded-lg border border-border/50 p-2 text-xs text-muted-foreground transition hover:bg-muted"
        >
          Pensar melhor (voltar)
        </button>
      </div>
    </div>
  );
}
