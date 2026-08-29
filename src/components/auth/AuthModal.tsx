import { useAuth, type ModalTipo } from "./AuthProvider";
import { AuthScreen } from "@/components/botao/components/AuthScreen";
import { ProfileSetup } from "@/components/botao/career/ProfileSetup";
import { X } from "lucide-react";

type Props = {
  tipo: ModalTipo;
  onFechar: () => void;
  onLogin: (p?: import("@/components/botao/online/auth").Perfil) => void;
  perfil: import("@/components/botao/online/auth").Perfil | null;
};

export function AuthModal({ tipo, onFechar, onLogin, perfil }: Props) {
  if (!tipo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header com botão fechar */}
        <button
          onClick={onFechar}
          className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>

        <div className="p-5 pt-6">
          {tipo === "login" && (
            <AuthScreen onPronto={(p) => onLogin(p)} />
          )}
          {tipo === "editar" && perfil && (
            <ProfileSetup
              perfil={perfil}
              timeLocal={null}
              onSalvarTimeLocal={() => {}}
              onPronto={() => onFechar()}
              onBack={onFechar}
            />
          )}
        </div>

        {/* Footer: continuar sem conta */}
        {tipo === "login" && (
          <div className="border-t border-border px-5 py-3 text-center">
            <button
              onClick={onFechar}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Continuar sem conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
