import type { TimeBotao } from "@/lib/botao/api";

type Props = {
  times: TimeBotao[];
  selecionado?: string | null | undefined;
  onSelecionar: (time: TimeBotao) => void;
  desabilitado?: string | null | undefined;
};

/** Grade de cartelas de times carregada direto do banco. */
export function GradeTimes({ times, selecionado, onSelecionar, desabilitado }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {times.map((time) => {
        const ativo = selecionado === time.id;
        const bloqueado = desabilitado === time.id;
        return (
          <button
            key={time.id}
            type="button"
            disabled={bloqueado}
            onClick={() => onSelecionar(time)}
            className={`surface group flex items-center gap-3 p-3 text-left transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 ${
              ativo ? "border-primary glow" : ""
            }`}
          >
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border"
              style={{ background: time.cores[0] }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: time.cores[1] }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: time.cores[2] }} />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base leading-tight">{time.nome}</span>
              <span className="block truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                {time.abreviacao} · {time.liga}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
