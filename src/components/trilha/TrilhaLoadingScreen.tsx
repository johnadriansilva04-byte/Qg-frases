import { useEffect, useRef, useState } from "react";
import { Loader2, Megaphone, Target, Trophy, Gamepad2 } from "lucide-react";
import { AdsterraBanner } from "@/components/AdsterraBanner";
import { sponsorArmado } from "@/lib/sponsorGate";
import {
  selecionarConteudo,
  conteudoDeterministico,
  introsPorDuracao,
  type IntroTexto,
  type LoadingCategoria,
} from "@/data/loadingContent";

/**
 * TrilhaLoadingScreen — Tela de carregamento específica para Trilha.
 * UMA informação por vez: seleciona intros na montagem; nunca troca rápido.
 * Integra anúncios Monetag de forma não-bloqueante.
 */

const PASSOS_TRILHA = [
  "Preparando tabuleiro...",
  "Carregando tropas...",
  "Sincronizando estratégias...",
  "Inicializando IA...",
  "Pronto para batalha!",
];

interface TrilhaLoadingScreenProps {
  /** Título do módulo em transição. */
  titulo?: string;
  /** Subtítulo do módulo em transição. */
  subtitulo?: string;
  /** Mensagens de passo (status) exibidas abaixo da barra. */
  passos?: string[];
  /** Categoria de conteúdo do loadingContent (default: aleatório). */
  categoria?: LoadingCategoria;
  /** Rotação de textos introdutórios/dicas (fallback sobrescrito por categoria). */
  intros?: IntroTexto[];
  /** Duração total alvo em ms (default ~2600ms). */
  duracao?: number;
  /** Callback ao chegar em 100%. */
  onCompleto?: () => void;
}

export function TrilhaLoadingScreen({
  titulo = "Carregando Trilha",
  subtitulo = "Preparando o campo de batalha",
  passos = PASSOS_TRILHA,
  categoria,
  intros,
  duracao = 2600,
  onCompleto,
}: TrilhaLoadingScreenProps) {
  const [pct, setPct] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
  // Primeiro render DETERMINÍSTICO (idêntico ao SSR — Math.random aqui causava
  // hydration mismatch React #418); a seleção aleatória acontece após montar.
  const [selecao, setSelecao] = useState<IntroTexto[]>(() =>
    intros?.length ? intros : conteudoDeterministico(categoria, introsPorDuracao(duracao)),
  );
  useEffect(() => {
    if (!intros?.length) {
      setSelecao(selecionarConteudo(categoria, introsPorDuracao(duracao)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  // Anima a barra de 0 a 100% suavemente (ease-out).
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duracao);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setPct(Math.round(eased * 100));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onCompleto?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duracao, onCompleto]);

  // Rotaciona lentamente (só se houver mais de uma intro selecionada).
  useEffect(() => {
    if (selecao.length <= 1) return;
    const intervalo = duracao / selecao.length;
    const id = setInterval(() => {
      setIntroIdx((i) => (i + 1) % selecao.length);
    }, intervalo);
    return () => clearInterval(id);
  }, [duracao, selecao]);

  const passoIdx = Math.min(passos.length - 1, Math.floor((pct / 100) * passos.length));
  const intro = selecao[introIdx % selecao.length]!;
  const avisoSponsor = sponsorArmado();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/20 p-4 rounded-full">
                <Target className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {titulo}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">{subtitulo}</p>
          </div>

          {/* Barra de progresso */}
          <div className="mb-6">
            <div className="h-2 bg-surface/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span>{pct}%</span>
              </div>
              <span>{passos[passoIdx]}</span>
            </div>
          </div>

          {/* Texto introdutório rotativo */}
          <div className="bg-surface/50 rounded-lg p-4 mb-6" key={introIdx}>
            <p className="font-semibold text-sm text-foreground mb-1">{intro.titulo}</p>
            <p className="text-xs text-muted-foreground">{intro.corpo}</p>
          </div>

          {/* Aviso de patrocinador (ponto estratégico armado) */}
          {avisoSponsor && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2">
              <Megaphone className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-snug text-amber-100">{avisoSponsor.mensagem}</p>
            </div>
          )}

          {/* Adsterra Banner durante loading */}
          <div className="mt-4">
            <AdsterraBanner slotId="trilha-loading-banner" className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
