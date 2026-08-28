import { useRef, useState } from "react";
import { X } from "lucide-react";
import { adManager } from "@/lib/adManager";

type AdState = "idle" | "confirming" | "executing" | "cooldown";

interface ControlledMonetagButtonProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  message?: string;
  /** Chamado logo após o disparo autorizado do anúncio (ex.: abrir recompensa). */
  onDisparado?: (() => void) | undefined;
}

/**
 * CONTROLLED MONETAG BUTTON - Único ponto de entrada autorizado para Monetag
 *
 * Regras:
 * - NENHUM clique global
 * - NENHUM auto-click
 * - NENHUM timer para disparar anúncio
 * - Confirmação explícita do usuário com aviso
 * - Trava síncrona contra execução duplicada
 * - Máquina de estados clara
 * - Carrega script Monetag apenas após confirmação
 */
export function ControlledMonetagButton({
  children,
  className = "",
  disabled = false,
  message = "Uma página de patrocinador pode abrir. Deseja continuar?",
  onDisparado,
}: ControlledMonetagButtonProps) {
  const [adState, setAdState] = useState<AdState>("idle");
  const executionLockRef = useRef(false);

  const handleAdRequest = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("[MONETAG] request");

    if (disabled || executionLockRef.current) {
      console.log("[MONETAG] duplicate-blocked");
      return;
    }

    setAdState("confirming");
    console.log("[MONETAG] confirmation-opened");
  };

  const handleCancel = () => {
    console.log("[MONETAG] confirmation-cancelled");
    setAdState("idle");
  };

  const handleConfirm = async () => {
    if (executionLockRef.current) {
      console.log("[MONETAG] duplicate-blocked");
      return;
    }

    executionLockRef.current = true;
    setAdState("executing");
    console.log("[MONETAG] confirmation-accepted");
    console.log("[MONETAG] execution-start");

    try {
      // Dispara o Monetag UMA vez: a permissão dura 3 segundos e depois o
      // script é removido do DOM — o usuário precisa permitir de novo.
      adManager.dispararMonetagUmaVez(3000);
      console.log("[MONETAG] execution-success");
      onDisparado?.();

      // Cooldown alinhado à janela de permissão (3s): volta a pedir permissão.
      setAdState("cooldown");
      setTimeout(() => {
        executionLockRef.current = false;
        setAdState("idle");
      }, 3000);
    } catch (error) {
      console.error("[MONETAG] execution-error", error);
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
        {children || "Cansou de jogar? Descubra algo novo."}
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

            <p className="mb-6 text-sm text-muted-foreground">{message}</p>

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
