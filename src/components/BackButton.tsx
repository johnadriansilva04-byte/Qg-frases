import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useMemo } from "react";

type BackButtonProps = {
  /** Rota de destino. Se omitido, volta para a rota pai ou home. */
  to?: string;
  /** Label opcional ao lado do ícone. */
  label?: string;
};

/**
 * Botão de voltar padronizado: fixo no canto superior esquerdo, estilo card,
 * visível e profissional. Aparece em todas as páginas internas.
 * No desktop é um card com texto; no mobile, apenas ícone.
 *
 * Em rotas que gerenciam navegação interna (como /cidadela), o botão
 * fica oculto — os componentes de jogo já possuem seus próprios
 * botões de voltar.
 */
export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Rotas que gerenciam navegação interna via state (sem mudar URL).
  // Nestas rotas, o BackButton global NÃO deve aparecer — os
  // componentes internos cuidam do voltar.
  const routesWithInternalNav = useMemo(() => ["/cidadela"], []);
  const hideBackButton = routesWithInternalNav.includes(location.pathname);

  const handleBack = useCallback(() => {
    if (to) {
      navigate({ to });
      return;
    }
    navigate({ to: "/" });
  }, [navigate, to]);

  if (hideBackButton) return null;

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
