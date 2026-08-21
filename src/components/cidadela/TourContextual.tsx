import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";

export type PassoTour = {
  /** data-tour do elemento real a destacar; sem alvo = balão centralizado. */
  alvo?: string;
  titulo: string;
  texto: string;
};

type Props = {
  userId: string | null;
  passos: PassoTour[];
};

type Rect = { x: number; y: number; w: number; h: number } | null;

const CLAMP = 12;

/**
 * TOUR CONTEXTUAL (bolhas ancoradas em elementos reais) — substitui o tour
 * full-screen dentro do celular. Elemento real → balão explicativo. Overlay
 * com pointer-events-none: nenhum clique é bloqueado. Conclusão persiste no
 * onboarding engine (Supabase + espelho local); o botão "?" re-executa.
 */
export function TourContextual({ userId, passos }: Props) {
  const onboarding = useOnboarding(userId);
  const [rearmado, setRearmado] = useState(false);
  const [indice, setIndice] = useState(0);
  const [rect, setRect] = useState<Rect>(null);
  const [view, setView] = useState<{ w: number; h: number }>(
    typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : { w: 1024, h: 768 },
  );

  const ativo = passos.length > 0 && (rearmado || (!onboarding.carregando && !onboarding.concluido));
  const passo = ativo ? passos[Math.min(indice, passos.length - 1)] : undefined;

  useEffect(() => {
    const medir = () => {
      setView({ w: window.innerWidth, h: window.innerHeight });
      if (!passo?.alvo) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    medir();
    const id = window.setTimeout(medir, 250); // elementos que montam depois
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [passo?.alvo, ativo]);

  if (!ativo) {
    if (passos.length === 0) return null;
    if (onboarding.concluido && !rearmado) {
      // Re-executável: botão discreto religa o tour (§"possível rodar de novo").
      return (
        <button
          onClick={() => {
            setIndice(0);
            setRearmado(true);
          }}
          className="fixed bottom-20 left-3 z-40 flex size-8 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-900/80 text-emerald-300 shadow-lg transition hover:bg-slate-800"
          aria-label="Rever tour"
          title="Rever tour"
        >
          <CircleHelp className="size-4" />
        </button>
      );
    }
    return null;
  }
  if (!passo) return null;

  const ultimo = indice >= passos.length - 1;
  const fechar = (persistir: boolean) => {
    if (persistir) onboarding.concluir();
    setRearmado(false);
    setIndice(0);
  };

  const bubbleLeft = rect
    ? Math.min(Math.max(rect.x + rect.w / 2 - 140, CLAMP), view.w - 304 - CLAMP)
    : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_4px_rgba(52,211,153,0.35)] transition-all duration-300"
          style={{ left: rect.x - 4, top: rect.y - 4, width: rect.w + 8, height: rect.h + 8 }}
        />
      )}
      <div
        className="pointer-events-auto absolute w-[280px] rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 shadow-2xl"
        style={
          rect
            ? {
                left: bubbleLeft,
                top: Math.min(rect.y + rect.h + 14, view.h - 180),
              }
            : { left: "50%", top: "20%", transform: "translateX(-50%)" }
        }
      >
        <button
          onClick={() => fechar(false)}
          className="absolute top-2 right-2 text-slate-500 hover:text-slate-300"
          aria-label="Fechar tour"
        >
          <X className="size-4" />
        </button>
        <p className="text-[11px] font-bold tracking-wide text-emerald-300 uppercase">
          {passo.titulo}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">{passo.texto}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {indice + 1}/{passos.length}
          </span>
          <button
            onClick={() => (ultimo ? fechar(true) : setIndice((i) => i + 1))}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
          >
            {ultimo ? "Concluir" : "Próxima"}
          </button>
        </div>
      </div>
    </div>
  );
}
