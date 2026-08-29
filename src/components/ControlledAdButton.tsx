import { useRef, useState } from "react";
import { X } from "lucide-react";

type AdState = "idle" | "confirming" | "executing" | "cooldown";

interface ControlledAdButtonProps {
  onAdExecute: () => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * CONTROLLED AD BUTTON - Único ponto de entrada autorizado para anúncios
 *
 * Regras:
 * - NENHUM clique global
 * - NENHUM auto-click
 * - NENHUM timer para disparar anúncio
 * - Confirmação explícita do usuário
 * - Trava síncrona contra execução duplicada
 * - Máquina de estados clara
 */
export function ControlledAdButton({
  onAdExecute,
  children,
  className = "",
  disabled = false,
}: ControlledAdButtonProps) {
  const [adState, setAdState] = useState<AdState>("idle");
  const executionLockRef = useRef(false);

  const handleAdRequest = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("[AD] request");

    if (disabled || executionLockRef.current) {
      console.log("[AD] duplicate-blocked");
      return;
    }

    setAdState("confirming");
    console.log("[AD] confirmation-opened");
  };

  const handleCancel = () => {
    console.log("[AD] confirmation-cancelled");
    setAdState("idle");
  };

  const handleConfirm = async () => {
    if (executionLockRef.current) {
      console.log("[AD] duplicate-blocked");
      return;
    }

    executionLockRef.current = true;
    setAdState("executing");
    console.log("[AD] confirmation-accepted");
    console.log("[AD] execution-start");

    try {
      await onAdExecute();
      console.log("[AD] execution-success");

      // Cooldown de 3 segundos para evitar repetição acidental
      setAdState("cooldown");
      setTimeout(() => {
        executionLockRef.current = false;
        setAdState("idle");
      }, 3000);
    } catch (error) {
      console.error("[AD] execution-error", error);
      executionLockRef.current = false;
      setAdState("idle");
    }
  };

  const isDisabled = disabled || adState === "executing" || adState === "cooldown";

  return (
    <>
      <button
        onClick={handleAdRequest}
        disabled={isDisabled}
        className={`btn-primary ${className}`}
      >
        {children || "Ver anúncio"}
      </button>

      {/* Modal de confirmação */}
      {adState === "confirming" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">ATENÇÃO</h3>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              Você está prestes a abrir um anúncio externo.
              <br />
              Deseja continuar?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                CONTINUAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
