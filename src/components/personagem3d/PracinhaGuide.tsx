/**
 * PRACINHA GUIDE — Gerenciador de tours contextuais por módulo.
 *
 * Exibe o Pracinha 3D no canto inferior esquerdo quando o usuário
 * entra num módulo pela primeira vez. Tour step-by-step com overlay
 * de destaque (borda neon amarela + overlay fosco).
 *
 * Persistência: visitedModules no onboarding engine (useOnboarding).
 * Se o módulo já foi visitado, NÃO aparece.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { PracinhaCharacter3D } from "./PracinhaCharacter3D";
import { PRACINHA_TOURS, type TourModule, type TourStep } from "./pracinhaTourData";

interface Props {
  modulo: TourModule;
  userId: string | null;
  /** Se true, o tour NÃO aparece (conta já tem carreira/histórico). */
  contaExistente?: boolean;
  /** Chave global para persistir módulos visitados no localStorage. */
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = "pracinha:visitedModules";

function carregarVisitados(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarVisitados(key: string, mods: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(mods));
  } catch { /* quota */ }
}

/**
 * PRACINHA GUIDE — tour contextual por módulo.
 *
 * 1. Ao montar, verifica se `modulo` já foi visitado (localStorage).
 * 2. Se não foi → mostra o tour (passos com overlay de destaque).
 * 3. Ao finalizar → marca como visitado e desaparece.
 * 4. Botão "?" no canto re-executa o tour (override).
 */
export function PracinhaGuide({ modulo, userId, contaExistente = false, storageKey = DEFAULT_STORAGE_KEY }: Props) {
  const [tourAtivo, setTourAtivo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [destacar, setDestacar] = useState<string | null>(null);

  const passos = useMemo(() => PRACINHA_TOURS[modulo] ?? [], [modulo]);
  const storageKeyResolved = useMemo(
    () => (userId ? `${storageKey}:${userId}` : storageKey),
    [userId, storageKey],
  );

  // Verificar se é primeira visita (só contas novas)
  // Verifica se QUALQUER módulo já foi visitado — se sim, é conta existente.
  useEffect(() => {
    if (contaExistente) return; // prop direta: conta já tem carreira
    // Checagem robusta: percorre TODAS as chaves do localStorage que
    // começam com o prefixo do storage. Se QUALQUER uma tiver registros,
    // significa que o usuário já passou pelo tour anteriormente.
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(storageKey)) {
          const mods: string[] = JSON.parse(localStorage.getItem(k) || "[]");
          if (mods.length > 0) return; // já visitou algum módulo antes
        }
      }
    } catch { /* ignore */ }
    const visitados = carregarVisitados(storageKeyResolved);
    if (!visitados.includes(modulo) && passos.length > 0) {
      setTourAtivo(true);
      setIndice(0);
    }
  }, [modulo, passos.length, storageKeyResolved, contaExistente, storageKey]);

  // Avançar para o próximo passo
  const avancar = useCallback(() => {
    const proximo = indice + 1;
    if (proximo >= passos.length) {
      // Tour concluído — marcar como visitado
      const visitados = carregarVisitados(storageKeyResolved);
      if (!visitados.includes(modulo)) {
        visitados.push(modulo);
        salvarVisitados(storageKeyResolved, visitados);
      }
      setTourAtivo(false);
      setDestacar(null);
      return;
    }
    setIndice(proximo);
    setDestacar(passos[proximo]?.alvo ?? null);
  }, [indice, passos, modulo, storageKeyResolved]);

  // Pular tour
  const pular = useCallback(() => {
    const visitados = carregarVisitados(storageKeyResolved);
    if (!visitados.includes(modulo)) {
      visitados.push(modulo);
      salvarVisitados(storageKeyResolved, visitados);
    }
    setTourAtivo(false);
    setDestacar(null);
  }, [modulo, storageKeyResolved]);



  // Aplicar highlight no elemento alvo
  useEffect(() => {
    if (!destacar) {
      // Remover destaqes anteriores
      document.querySelectorAll("[data-pracinha-highlight]").forEach((el) => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
        (el as HTMLElement).style.boxShadow = "";
        el.removeAttribute("data-pracinha-highlight");
      });
      return;
    }

    const alvo = document.querySelector(`[data-tour="${destacar}"]`);
    if (!alvo) return;

    (alvo as HTMLElement).setAttribute("data-pracinha-highlight", "true");
    (alvo as HTMLElement).style.outline = "2px solid #fbbf24";
    (alvo as HTMLElement).style.outlineOffset = "4px";
    (alvo as HTMLElement).style.boxShadow = "0 0 20px rgba(251,191,36,0.3)";
    (alvo as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      (alvo as HTMLElement).style.outline = "";
      (alvo as HTMLElement).style.outlineOffset = "";
      (alvo as HTMLElement).style.boxShadow = "";
      alvo.removeAttribute("data-pracinha-highlight");
    };
  }, [destacar]);

  const passoAtual = passos[indice] as TourStep | undefined;
  const pose = !tourAtivo ? "idle" : passoAtual?.alvo ? "pointing" : "talking";

  if (passos.length === 0) return null;

  return (
    <>


      {/* Overlay de destaque (fosco escuro) */}
      {tourAtivo && (
        <div className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-[2px] pointer-events-none" />
      )}

      {/* Tour ativo: Pracinha + balão */}
      {tourAtivo && passoAtual && (
        <div className="fixed bottom-4 left-4 z-[80] flex items-end gap-3 max-w-[calc(100vw-2rem)]">
          {/* Pracinha 3D */}
          <div className="shrink-0">
            <PracinhaCharacter3D pose={pose} size={90} />
          </div>

          {/* Balão do tour */}
          <div className="relative mb-4 rounded-2xl border border-amber-500/25 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4 pr-10 backdrop-blur-md shadow-2xl shadow-black/40 max-w-xs">
            {/* Seta do balão */}
            <div className="absolute -left-2 bottom-6 h-0 w-0 border-t-[6px] border-r-[8px] border-b-[6px] border-t-transparent border-r-amber-500/25 border-b-transparent" />

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-2">
              {passos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === indice
                      ? "w-4 bg-amber-400"
                      : i < indice
                        ? "w-2 bg-amber-400/50"
                        : "w-2 bg-white/10"
                  }`}
                />
              ))}
              <span className="ml-auto text-[9px] text-slate-500 font-mono">
                {indice + 1}/{passos.length}
              </span>
            </div>

            <h4 className="font-display text-sm font-black text-white mb-1">
              {passoAtual.titulo}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {passoAtual.texto}
            </p>

            {/* Botões */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={pular}
                className="text-[10px] text-slate-500 hover:text-white transition"
              >
                Pular Tour
              </button>
              <button
                onClick={avancar}
                className="ml-auto flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:from-amber-500 hover:to-amber-400 active:scale-95"
              >
                {indice < passos.length - 1 ? "Avançar" : "Entendi!"}
                <ChevronRight className="size-3" />
              </button>
            </div>

            {/* Botão fechar */}
            <button
              onClick={pular}
              className="absolute top-2 right-2 text-slate-600 hover:text-white transition"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
