import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AIService } from "@/components/botao/ai/AIService";

/**
 * PracinhaGuide — o Robozinho da Cidadela.
 * Aparece por rota com dicas contextuais, conquistas e avisos.
 * Flutuante, discreto, mobile-first.
 */

type DicaPorRota = Record<string, string>;

const DICAS: DicaPorRota = {
  "/cidadela": "Bem-vindo à Cidadela! Escolha um jogo e comece a acumular SOV.",
  "/botao": "Master Liga: cuide da moral do time e responda o celular antes de entrar em campo.",
  "/trilha": "Na Trilha, forme linhas de 3 para capturar peças. Paciência vence pressa.",
  "/": "Explore a Cidadela: jogos, rede social e o Mercado de Pergaminhos esperam por você.",
  "/biblioteca": "A Biblioteca guarda frases para todas as ocasiões. Copie e brilhe.",
  "/corretor": "O Corretor ajusta seus textos em tempo real. Escreva com confiança.",
  "/gerador": "Gere frases únicas para cada momento. A IA está a postos.",
  "/noticias": "O Portal de Notícias mostra o que a Cidadela está comentando agora.",
};

const FALLBACK = "Olá! Sou o Pracinha Robozinho, seu guia na Cidadela. Toque em mim para dicas!";

export function PracinhaGuide() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(FALLBACK);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const dica = DICAS[pathname] ?? FALLBACK;
    setTexto(dica);

    // Só abre automaticamente na primeira visita à rota nesta sessão
    const key = `pracinha_guide_${pathname}`;
    if (!sessionStorage.getItem(key)) {
      setAberto(true);
      sessionStorage.setItem(key, "true");
    }

    // Tenta enriquecer com IA (fire-and-forget)
    void AIService.generateText({ coach: "Recruta", categoria: "dica" }, "pracinha")
      .then((t) => {
        if (t.trim()) setTexto(t);
      })
      .catch(() => undefined);
  }, [pathname, dismissed]);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {aberto && (
        <div className="max-w-[260px] rounded-2xl border border-emerald-400/30 bg-slate-950/90 p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              Pracinha Robozinho
            </span>
            <button
              onClick={() => setAberto(false)}
              className="rounded-full p-1 text-slate-400 hover:text-white"
              aria-label="Fechar dica"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{texto}</p>
        </div>
      )}

      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/90 px-4 py-2.5 text-sm font-bold text-emerald-300 shadow-lg shadow-emerald-950/30 backdrop-blur-md transition hover:scale-105 hover:bg-emerald-950/80 active:scale-95"
        aria-label="Abrir guia Pracinha"
      >
        <Bot className="size-5" />
        <span className="hidden sm:inline">Robozinho</span>
      </button>

      <button
        onClick={() => setDismissed(true)}
        className="text-[10px] text-slate-500 underline-offset-2 hover:text-slate-300"
      >
        Ocultar guia nesta sessão
      </button>
    </div>
  );
}
