import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = { rotulo: string; nota?: string; altura?: string; children?: ReactNode };

/**
 * ESPAÇO DE ANÚNCIO (Google AdSense / Ad Manager).
 */
export function AdSlot({ rotulo, nota, altura = "min-h-[90px]" }: Props) {
  const adSlot = rotulo === "Banner Topo" ? "9981926633" : rotulo === "Banner Rodapé" ? "7935061808" : rotulo;
  const adRef = useRef<HTMLDivElement>(null);
  const adLoadedRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (adLoadedRef.current) return;
    
    const loadAd = () => {
      if (!adRef.current || adLoadedRef.current) return;
      
      // Verifica se o elemento tem largura antes de tentar carregar o anúncio
      const rect = adRef.current.getBoundingClientRect();
      if (rect.width === 0) {
        console.warn('[AdSense] Slot com largura 0, adiando carregamento...');
        setTimeout(loadAd, 500);
        return;
      }

      try {
        if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
          adLoadedRef.current = true;
        }
      } catch (error) {
        console.error('[AdSense] Erro ao carregar anúncio:', error);
      }
    };

    // Usar IntersectionObserver para carregar apenas quando visível
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !adLoadedRef.current) {
            // Pequeno delay para garantir que o DOM esteja pronto
            setTimeout(loadAd, 100);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [adSlot]);

  return (
    <div 
      ref={adRef} 
      className={`w-full max-w-[728px] ${altura} flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 px-4 py-3 text-center backdrop-blur-md my-6 mx-auto`}
      style={{ display: 'block', maxWidth: '728px', maxHeight: '90px' }}
    >
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2783546143377409"
        data-ad-slot={adSlot}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </div>
  );
}

/** Bloco reservado para vídeo-anúncio 15s–30s (VAST / outstream). */
export function AdVideoSlot() {
  return (
    <div
      data-ad-slot="video-outstream"
      className="flex min-h-[180px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-primary/25 bg-surface/80 p-4 text-center"
    >
      <span className="text-xs font-semibold text-primary">Destaque do Sponsor / Vídeo</span>
      <span className="text-xs text-muted-foreground">
        [ Bloco preparado para anúncios em vídeo 15s–30s / Google VAST ]
      </span>
    </div>
  );
}

/** Indicador visual para anúncios com botão de pontos */
export function AdPointsIndicator({ onWatchVideo }: { onWatchVideo: () => Promise<boolean> }) {
  const [visible, setVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
  };

  const handleWatchVideo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onWatchVideo();
      
      if (success) {
        // Vídeo assistido com sucesso, fecha o indicador
        setVisible(false);
      } else {
        // Não há vídeo disponível
        setError("Não temos vídeo no momento, infelizmente.");
        // Fecha após 3 segundos
        setTimeout(() => setVisible(false), 3000);
      }
    } catch (err) {
      setError("Erro ao carregar vídeo.");
      setTimeout(() => setVisible(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Assista vídeo para ganhar</span>
          <span className="text-sm font-bold text-primary">+5 Pontos</span>
        </div>
        <button
          onClick={handleWatchVideo}
          disabled={loading}
          className="btn-primary px-3 py-1 text-xs disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Assistir"}
        </button>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground p-1"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Google automático aqui</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-xs">({timeLeft}s)</span>
      </div>
    </div>
  );
}
