import { useEffect, useRef, useState } from "react";
import { Loader2, Target, Trophy, Gamepad2 } from "lucide-react";
import { MonetagAd } from "@/components/MonetagAd";

/**
 * TrilhaLoadingScreen — Tela de carregamento específica para Trilha
 * Integra anúncios Monetag de forma não-bloqueante
 */

const PASSOS_TRILHA = [
  "Preparando tabuleiro...",
  "Carregando tropas...",
  "Sincronizando estratégias...",
  "Inicializando IA...",
  "Pronto para batalha!",
];

const INTROS_TRILHA = [
  {
    titulo: "Bem-vindo à Trilha!",
    corpo:
      "O jogo de estratégia tática da FEB. Planeje seus movimentos e domine o campo de batalha.",
  },
  {
    titulo: "Dica de Estratégia",
    corpo:
      "Forme trilhas para capturar peças inimigas. Tente criar trilhas duplas para máxima eficiência.",
  },
  {
    titulo: "Sistema de Fases",
    corpo:
      "Complete fases para se tornar o Mestre da Trilha. Cada desafio é mais difícil que o anterior.",
  },
];

interface TrilhaLoadingScreenProps {
  /** Título do módulo em transição. */
  titulo?: string;
  /** Subtítulo do módulo em transição. */
  subtitulo?: string;
  /** Mensagens de passo (status) exibidas abaixo da barra. */
  passos?: string[];
  /** Rotação de textos introdutórios/dicas. */
  intros?: Array<{ titulo: string; corpo: string }>;
  /** Duração total alvo em ms (default ~2000ms). */
  duracao?: number;
  /** Callback ao chegar em 100%. */
  onCompleto?: () => void;
}

export function TrilhaLoadingScreen({
  titulo = "Carregando Trilha",
  subtitulo = "Preparando o campo de batalha",
  passos = PASSOS_TRILHA,
  intros = INTROS_TRILHA,
  duracao = 2000,
  onCompleto,
}: TrilhaLoadingScreenProps) {
  const [pct, setPct] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
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

  // Rotaciona os textos introdutórios durante o carregamento.
  useEffect(() => {
    const intervalo = Math.max(600, Math.floor(duracao / intros.length));
    const id = setInterval(() => {
      setIntroIdx((i) => (i + 1) % intros.length);
    }, intervalo);
    return () => clearInterval(id);
  }, [duracao, intros.length]);

  const passoIdx = Math.min(passos.length - 1, Math.floor((pct / 100) * passos.length));
  const intro = intros[introIdx % intros.length]!;

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

          <MonetagAd />
        </div>
      </div>
    </div>
  );
}
