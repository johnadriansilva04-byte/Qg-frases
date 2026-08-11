import { useEffect, useRef, type ReactNode } from "react";

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
