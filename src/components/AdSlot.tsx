import { useEffect, useRef, type ReactNode } from "react";

type Props = { rotulo: string; nota?: string; altura?: string; children?: ReactNode };

/**
 * ESPAÇO DE ANÚNCIO (Google AdSense / Ad Manager).
 */
export function AdSlot({ rotulo, nota, altura = "min-h-[90px]" }: Props) {
  const adSlot = rotulo === "Banner Topo" ? "9981926633" : rotulo === "Banner Rodapé" ? "7935061808" : rotulo;
  const adRef = useRef<HTMLDivElement>(null);
  const adLoadedRef = useRef(false);

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

    // Pequeno delay para garantir que o DOM esteja pronto
    const timer = setTimeout(loadAd, 300);
    
    return () => clearTimeout(timer);
  }, [adSlot]);

  return (
    <div ref={adRef} className={`w-full ${altura} flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 px-4 py-3 text-center backdrop-blur-md my-6`}>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2783546143377409"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
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
