import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BackButtonProps = {
  /** Rota de destino. Se omitido, detecta automaticamente a melhor rota pai. */
  to?: string;
  /** Label opcional ao lado do ícone. */
  label?: string;
};

/**
 * Botão de voltar inteligente e global.
 *
 * Comportamento:
 *  - Na página raiz (/): NÃO renderiza.
 *  - Na Cidadela com jogo ativo: volta para o hub (/cidadela).
 *  - Na Cidadela no hub: volta para home (/).
 *  - Em qualquer outra rota interna: volta para home (/).
 *
 * Utiliza um CustomEvent ("cidadela:game-changed") para sincronizar
 * o estado do jogo ativo sem acoplamento direto entre componentes.
 */
export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Escuta mudanças do jogo ativo na Cidadela para re-renderizar
  const [, setGameTick] = useState(0);
  useEffect(() => {
    const handler = () => setGameTick((t) => t + 1);
    window.addEventListener("cidadela:game-changed", handler);
    return () => window.removeEventListener("cidadela:game-changed", handler);
  }, []);

  // Determina se um jogo/módulo está ativo no sessionStorage
  const isGameActive = (() => {
    try {
      const salvo = window.sessionStorage.getItem("cidadela:jogo-ativo:v1");
      return !!salvo && salvo !== "null";
    } catch {
      return false;
    }
  })();

  // Determina o destino correto
  const destination = (() => {
    if (to) return to;
    if (pathname.startsWith("/cidadela") && isGameActive) return "/cidadela";
    if (pathname.startsWith("/cidadela")) return "/";
    return "/";
  })();

  const handleBack = useCallback(() => {
    navigate({ to: destination });
  }, [navigate, destination]);

  // NÃO renderiza na página raiz
  if (pathname === "/") return null;

  const content = (
    <span className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:shadow-xl active:scale-95">
      <ArrowLeft className="size-4 shrink-0" />
      <span className="hidden sm:inline">{label ?? "Voltar"}</span>
    </span>
  );

  return (
    <Link
      to={destination}
      className="fixed left-3 top-3 z-[80]"
      aria-label="Voltar"
      onClick={(e) => {
        e.preventDefault();
        handleBack();
      }}
    >
      {content}
    </Link>
  );
}
