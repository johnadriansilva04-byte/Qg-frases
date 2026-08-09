import type { ReactNode } from "react";

type Props = { rotulo: string; nota?: string; altura?: string; children?: ReactNode };

/**
 * ESPAÇO DE ANÚNCIO (Google AdSense / Ad Manager).
 * Para ativar: cole aqui o bloco <ins class="adsbygoogle" ...> do seu AdSense
 * no lugar do placeholder, e adicione o script do AdSense no __root.tsx.
 */
export function AdSlot({ rotulo, nota, altura = "min-h-[90px]" }: Props) {
  return (
    <div
      data-ad-slot={rotulo}
      className={`w-full ${altura} flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 px-4 py-3 text-center backdrop-blur-md`}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Publicidade
      </span>
      <span className="mt-1 text-xs text-muted-foreground">{nota ?? `[ ${rotulo} ]`}</span>
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
