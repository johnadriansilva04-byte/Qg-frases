import type { ReactNode } from "react";

type Props = { rotulo: string; nota?: string; altura?: string; children?: ReactNode };

/**
 * ESPAÇO DE ANÚNCIO (Google AdSense / Ad Manager).
 */
export function AdSlot({ rotulo, nota, altura = "min-h-[90px]" }: Props) {
  const adSlot = rotulo === "Banner Topo" ? "9981926633" : rotulo === "Banner Rodapé" ? "7935061808" : rotulo;

  return (
    <div className={`w-full ${altura} flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 px-4 py-3 text-center backdrop-blur-md`}>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2783546143377409"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script dangerouslySetInnerHTML={{ __html: "(adsbygoogle = window.adsbygoogle || []).push({});" }} />
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
