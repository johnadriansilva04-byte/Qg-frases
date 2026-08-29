import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

type BackButtonProps = {
  /** Rota de destino. Se omitido, volta uma página no histórico do SPA. */
  to?: string;
  /** Label opcional ao lado do ícone. */
  label?: string;
};

/**
 * Botão de voltar padronizado: fixo no canto superior esquerdo, estilo card,
 * visível e profissional. Aparece em todas as páginas internas.
 * No desktop é um card com texto; no mobile, apenas ícone.
 */
export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      // Volta para a rota anterior usando o TanStack Router (mantém SPA)
      // @ts-expect-error -- navigate(-1) é suportado pelo hook mas
      // a tipagem pode não incluir índice numérico em todas as versões
      navigate(-1);
    } else {
      navigate({ to: "/" });
    }
  }, [navigate]);

  const content = (
    <span className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:shadow-xl active:scale-95">
      <ArrowLeft className="size-4 shrink-0" />
      <span className="hidden sm:inline">{label ?? "Voltar"}</span>
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="fixed left-3 top-3 z-[80]"
        aria-label="Voltar"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={handleBack}
      className="fixed left-3 top-3 z-[80]"
      aria-label="Voltar"
    >
      {content}
    </button>
  );
}
