import { X } from "lucide-react";

interface Props {
  onTecnico: () => void;
  onJogador: () => void;
  onClose: () => void;
}

/**
 * Modal rápido e discreto para escolha do modo de jogo.
 * Técnico = futebol de botão (fluxo atual).
 * Jogador = motor 3D (futuro implementação).
 */
export function ModoJogoModal({ onTecnico, onJogador, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <h2 className="mb-6 text-center font-display text-xl font-bold">
          COMO VOCÊ QUER JOGAR?
        </h2>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onTecnico}
            className="w-full rounded-xl border-2 border-emerald-600 bg-emerald-600/10 px-6 py-4 text-left transition hover:bg-emerald-600/20"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <p className="font-bold text-emerald-600">TÉCNICO</p>
                <p className="text-xs text-muted-foreground">
                  Futebol de botão - estratégia e gestão
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onJogador}
            className="w-full rounded-xl border-2 border-sky-600 bg-sky-600/10 px-6 py-4 text-left transition hover:bg-sky-600/20"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <p className="font-bold text-sky-600">JOGADOR</p>
                <p className="text-xs text-muted-foreground">
                  Partida 3D - controle seu jogador
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
