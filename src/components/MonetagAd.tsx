import { useEffect, useState } from "react";

const MONETAG_ZONE_ID = "271263";

interface MonetagAdProps {
  className?: string;
}

/** Banner/In-page push da Monetag usado nas telas de transição fora do Botão. */
export function MonetagAd({ className = "" }: MonetagAdProps) {
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/monetag.js").catch(() => setErro(true));
  }, []);

  return (
    <div
      className={`min-h-[90px] w-full overflow-hidden rounded-lg border border-border/50 bg-surface/30 p-3 ${className}`}
      data-monetag-zone={MONETAG_ZONE_ID}
    >
      <p className="mb-2 text-center text-xs text-muted-foreground">Publicidade</p>
      <div id="monetag-loading-ad" className="flex min-h-[50px] items-center justify-center">
        {erro && <span className="text-xs text-muted-foreground">Anúncio indisponível</span>}
      </div>
    </div>
  );
}
