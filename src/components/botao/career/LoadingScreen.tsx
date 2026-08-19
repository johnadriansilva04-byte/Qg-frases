import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdsterraBanner } from "@/components/AdsterraBanner";
import {
  selecionarConteudo,
  introsPorDuracao,
  type IntroTexto,
  type LoadingCategoria,
} from "@/data/loadingContent";

/**
 * LoadingScreen — Tela de carregamento leve, 100% código (CSS/JS), zero
 * imagens. UMA informação por vez: quando o carregamento é curto (≈2–3s),
 * escolhemos UMA intro aleatória e deixamos tempo de leitura; quando é longa,
 * 2 intros com intervalo confortable. A publicidade nunca bloqueia.
 */

const PASSOS_PADRAO = [
  "Conectando ao banco Futebol SQL…",
  "Carregando times e botões do clube…",
  "Inicializando a IA Comentarista…",
  "Preparando a mesa de futebol de botão…",
  "Tudo pronto! Boa partida, treinador.",
];

export interface LoadingScreenProps {
  /** Mensagens de passo (status) exibidas abaixo da barra. */
  passos?: string[];
  /** Categoria de conteúdo do loadingContent (default: aleatório). */
  categoria?: LoadingCategoria;
  /** Rotação de textos introdutórios/dicas (fallback sobrescrito por categoria). */
  intros?: IntroTexto[];
  /** Duração total alvo em ms (default ~2600ms). */
  duracao?: number;
  /** Quando false, a barra permanece em 100% até o backend estar pronto. */
  pronto?: boolean;
  /** Callback ao chegar em 100%. */
  onCompleto?: () => void;
}

export function LoadingScreen({
  passos = PASSOS_PADRAO,
  categoria,
  intros,
  duracao = 2600,
  pronto = true,
  onCompleto,
}: LoadingScreenProps) {
  const [pct, setPct] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
  // Seleciona a intro(s) UMA vez na montagem: nunca fica mudando a cada tick.
  const [selecao] = useState<IntroTexto[]>(() =>
    intros?.length ? intros : selecionarConteudo(categoria, introsPorDuracao(duracao)),
  );

  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const readyRef = useRef(pronto);
  const doneRef = useRef(false);

  useEffect(() => {
    readyRef.current = pronto;
  }, [pronto]);

  // Anima a barra de 0 a 100% suavemente (ease-out).
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duracao);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setPct(Math.round(eased * 100));
      if (t < 1 || !readyRef.current) {
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

  return (
    <div className="splash-overlay" role="status" aria-live="polite">
      <div className="splash-card">
        <div className="splash-brand">
          <span className="logo-chip splash-logo">FB</span>
          <div className="splash-brand-text">
            <span className="splash-title">Futebol de Botão</span>
            <span className="splash-sub">Copa dos Botões · Master Liga</span>
          </div>
        </div>

        {/* Barra de progresso + percentual */}
        <div className="splash-bar-wrap">
          <div className="splash-bar">
            <span className="splash-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="splash-bar-meta">
            <Loader2 className="size-3.5 animate-spin text-emerald-300" />
            <span className="splash-bar-pct">{pct}%</span>
            <span className="splash-bar-step">{passos[passoIdx]}</span>
          </div>
        </div>

        {/* Texto introdutório/dica rotativo */}
        <div className="splash-intro" key={introIdx}>
          <p className="splash-intro-title">{intro.titulo}</p>
          <p className="splash-intro-corpo">{intro.corpo}</p>
        </div>

        {/* Adsterra Banner durante loading */}
        <div className="mt-4">
          <AdsterraBanner slotId="loading-banner" className="w-full" />
        </div>
      </div>
    </div>
  );
}

export { PASSOS_PADRAO };
