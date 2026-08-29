import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  /** Rota de destino. Se omitido, usa history.back(). */
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
      onClick={() => window.history.back()}
      className="fixed left-3 top-3 z-[80]"
      aria-label="Voltar"
    >
      {content}
    </button>
  );
}
