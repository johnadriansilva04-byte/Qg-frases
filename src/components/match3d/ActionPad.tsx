import type { EngineAction } from "@/engine/input";

interface Props {
  onAction: (a: EngineAction) => void;
  onSprint: (active: boolean) => void;
}

const btn =
  "flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border border-hud-line bg-hud/70 text-lg font-bold text-foreground backdrop-blur-sm active:scale-95 active:bg-accent/40 transition";

/** Mobile buttons wired to the exact same actions as the keyboard keys. */
export function ActionPad({ onAction, onSprint }: Props) {
  return (
    <div className="relative h-40 w-40 select-none">
      {/* A = carrinho (BACKSPACE) */}
      <button
        type="button"
        aria-label="Carrinho"
        className={`${btn} absolute bottom-0 left-1/2 -translate-x-1/2`}
        onPointerDown={() => onAction("tackle")}
      >
        A
      </button>
      {/* X = passe (ESPAÇO) */}
      <button
        type="button"
        aria-label="Passe"
        className={`${btn} absolute left-0 top-1/2 -translate-y-1/2`}
        onPointerDown={() => onAction("pass")}
      >
        X
      </button>
      {/* B = chute (ENTER) */}
      <button
        type="button"
        aria-label="Chute"
        className={`${btn} absolute right-0 top-1/2 -translate-y-1/2`}
        onPointerDown={() => onAction("shoot")}
      >
        B
      </button>
      {/* Y = sprint (SHIFT) */}
      <button
        type="button"
        aria-label="Sprint"
        className={`${btn} absolute left-1/2 top-0 -translate-x-1/2`}
        onPointerDown={() => onSprint(true)}
        onPointerUp={() => onSprint(false)}
        onPointerCancel={() => onSprint(false)}
        onPointerLeave={() => onSprint(false)}
      >
        Y
      </button>
    </div>
  );
}
