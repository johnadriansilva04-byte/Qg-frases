import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdsterraBanner } from "@/components/AdsterraBanner";

/**
 * LoadingScreen — Tela de carregamento leve, 100% código (CSS/JS), zero
 * imagens. Usada em transições do jogo: início de carreira, entrada em campo,
 * consultas ao Supabase e inicialização da IA.
 *
 * Mostra:
 *  - barra de progresso 0→100% com indicador animado;
 *  - textos de boas-vindas/dicas REAIS do jogo (relacionados às mecânicas
 *    ativas: soberania, celular, W.O., portal de notícias).
 */

const PASSOS_PADRAO = [
  "Conectando ao banco Futebol SQL…",
  "Carregando times e botões do clube…",
  "Inicializando a IA Comentarista…",
  "Preparando a mesa de futebol de botão…",
  "Tudo pronto! Boa partida, treinador.",
];

export interface IntroTexto {
  titulo: string;
  corpo: string;
}

const INTROS_PADRAO: IntroTexto[] = [
  {
    titulo: "Bem-vindo à sua jornada de treinador!",
    corpo:
      "Conquiste títulos, suba de divisão, pague os salários do seu elenco e acumule " +
      "Soberania para se tornar uma lenda do Futebol de Botão.",
  },
  {
    titulo: "Este não é apenas um jogo de futebol.",
    corpo:
      "No seu celular de treinador, você receberá chamadas da diretoria, empresários, " +
      "torcedores e propostas obscuras. Cada resposta sua mudará o rumo da sua carreira.",
  },
  {
    titulo: "Alerta de impacto real",
    corpo:
      "Cuidado ao responder no celular: decisões mal pensadas afetam a moral dos botões, " +
      "provocam desfalques, perdas financeiras e até derrotas por W.O.",
  },
  {
    titulo: "Dica de Soberania",
    corpo:
      "Manter a Soberania alta protege seu time de crises, atrai patrocinadores melhores " +
      "e evita esquemas de suborno dos adversários.",
  },
  {
    titulo: "Segredo da carreira",
    corpo:
      "Fique atento ao Portal de Notícias: fofocas e vazamentos de bastidores dão pistas " +
      "sobre o clima no vestiário antes de você entrar em campo.",
  },
];

interface LoadingScreenProps {
  /** Mensagens de passo (status) exibidas abaixo da barra. */
  passos?: string[];
  /** Rotação de textos introdutórios/dicas (boas-vindas). */
  intros?: IntroTexto[];
  /** Duração total alvo em ms (default ~2200ms). A barra preenche suavemente. */
  duracao?: number;
  /** Quando false, a barra permanece em 100% até o backend estar pronto. */
  pronto?: boolean;
  /** Callback ao chegar em 100%. */
  onCompleto?: () => void;
}

export function LoadingScreen({
  passos = PASSOS_PADRAO,
  intros = INTROS_PADRAO,
  duracao = 2200,
  pronto = true,
  onCompleto,
}: LoadingScreenProps) {
  const [pct, setPct] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
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

export { INTROS_PADRAO, PASSOS_PADRAO };
