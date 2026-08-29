import { useEffect } from "react";

const MONETAG_ZONE_ID = "11607595";

interface MonetagAdProps {
  className?: string;
}

/** Placeholder visual nas telas de transição fora do Botão.
 *  O Monetag agora é a tag script async (zona 271263), carregada pelo
 *  `adManager` por rota (/trilha, /cidadela) — sem Service Worker.
 *  Registros do SW legado (`quge5.com`) são removidos aqui. */
export function MonetagAd({ className = "" }: MonetagAdProps) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          if (reg.active?.scriptURL.includes("/monetag.js")) {
            void reg.unregister();
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className={`min-h-[90px] w-full overflow-hidden rounded-lg border border-border/50 bg-surface/30 p-3 ${className}`}
      data-monetag-zone={MONETAG_ZONE_ID}
    >
      <p className="mb-2 text-center text-xs text-muted-foreground">Publicidade</p>
      <div id="monetag-loading-ad" className="flex min-h-[50px] items-center justify-center" />
    </div>
  );
}
