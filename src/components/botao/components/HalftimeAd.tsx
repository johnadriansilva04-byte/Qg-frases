import { useEffect, useRef, useState } from "react";
import { Tv, Play } from "lucide-react";

type Props = {
  /** Rótulo do intervalo exibido no "visor" da TV. */
  rotulo?: string;
  /** Callback ao continuar após o intervalo. */
  onContinue: () => void;
};

/**
 * Container de anúncio do intervalo (halftime) — em formato de TV/tela.
 *
 * No intervalo de cada partida de botão, este componente exibe um "televisor"
 * que executa automaticamente um anúncio do Google AdSense (ins.adsbygoogle).
 * Caso o AdSense não esteja carregado (ambiente local/sem rede), mostra um
 * placeholder de TV com countdown automático, sem bloquear o jogo.
 *
 * O anúncio é disparado de forma automática (auto-play) assim que o container
 * é montado, respeitando o formato horizontal padrão do AdSense.
 */
export function HalftimeAd({ rotulo = "Intervalo", onContinue }: Props) {
  const adRef = useRef<HTMLDivElement>(null);
  const adLoadedRef = useRef(false);
  const [countdown, setCountdown] = useState(6);
  const [podeContinuar, setPodeContinuar] = useState(false);

  // Dispara o anúncio automaticamente ao montar (auto-play do AdSense).
  useEffect(() => {
    if (adLoadedRef.current) return;
    const pushAd = () => {
      if (!adRef.current || adLoadedRef.current) return;
      try {
        if (typeof window !== "undefined" && (window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
          adLoadedRef.current = true;
        }
      } catch (e) {
        // Silencioso: o placeholder permanece visível.
        console.warn("[HalftimeAd] AdSense indisponível:", e);
      }
    };
    const t = setTimeout(pushAd, 80);
    return () => clearTimeout(t);
  }, []);

  // Countdown automático — libera "Continuar" após ~6s (anúncio curto).
  useEffect(() => {
    if (countdown <= 0) {
      setPodeContinuar(true);
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  return (
    <div
      className="halftime-overlay"
      role="dialog"
      aria-label="Intervalo — anúncio"
      data-testid="halftime-ad"
    >
      <div className="halftime-tv">
        {/* Moldura de TV */}
        <div className="halftime-tv-frame">
          <div className="halftime-tv-bar">
            <span className="halftime-tv-tag">
              <Tv className="size-3.5" />
              {rotulo}
            </span>
            <span className="halftime-tv-live">
              <span className="halftime-tv-live-dot" />
              ANÚNCIO
            </span>
          </div>

          {/* Visor: container AdSense (formato horizontal/TV) */}
          <div ref={adRef} className="halftime-tv-screen">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "100%" }}
              data-ad-client="ca-pub-2783546143377409"
              data-ad-slot="9981926633"
              data-ad-format="horizontal"
              data-full-width-responsive="false"
            />
            {/* Placeholder quando o AdSense não carrega */}
            <div className="halftime-tv-placeholder">
              <Play className="size-7" />
              <span>Anúncio em execução…</span>
            </div>
          </div>
        </div>

        {/* Ação ao fim do anúncio */}
        <div className="halftime-actions">
          <button
            onClick={onContinue}
            disabled={!podeContinuar}
            className="btn-primary halftime-continue"
            data-testid="halftime-continue"
          >
            {podeContinuar ? (
              "Continuar partida →"
            ) : (
              <>
                <span className="halftime-spinner" /> Aguarde… {countdown}s
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
