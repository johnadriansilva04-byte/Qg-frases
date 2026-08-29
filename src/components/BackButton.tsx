import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

type BackButtonProps = {
  /** Rota de destino. Se omitido, detecta automaticamente a melhor rota pai. */
  to?: string;
  /** Label opcional ao lado do ícone. */
  label?: string;
};

/**
 * Botão de voltar padronizado: fixo no canto superior esquerdo, estilo card,
 * visível e profissional. Aparece em todas as páginas internas.
 * No desktop é um card com texto; no mobile, apenas ícone.
 *
 * Detecta a rota atual:
 *  - Em /cidadela (ou sub-rotas como jogos): volta para /cidadela?hub=1
 *  - Em qualquer outra rota interna: volta para /
 */
export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = useCallback(() => {
    if (to) {
      navigate({ to });
      return;
    }
    // Se estamos na Cidadela (ou em jogos internos), volta para o hub
    // com ?hub=1 para sinalizar que deve mostrar a seleção de jogos.
    if (location.pathname.startsWith("/cidadela")) {
      navigate({ to: "/cidadela", search: { hub: "1" } });
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, to, location.pathname]);

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
