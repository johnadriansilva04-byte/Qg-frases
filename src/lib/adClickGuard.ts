/**
 * AD CLICK GUARD — limita pop-unders/onclick ads a 1 por 5 minutos.
 *
 * Zonas "OnClick" (Monetag, Adsterra Social) instalam handler global que abre
 * nova janela em QUALQUER clique. Interceptamos window.open + location.assign
 * e bloqueamos quando o cooldown está ativo.
 */

const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY = "ad_popguard_last_open";
const AD_DOMAINS = new Set([
  "quge5.com",
  "al5sm.com",
  "effectivecpmnetwork.com",
  "effectivecpmrate.com",
  "propellerads.com",
  "monetag.com",
]);

let patched = false;

function isAdUrl(url: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url, window.location.href).hostname.toLowerCase();
    return AD_DOMAINS.has(host) || [...AD_DOMAINS].some((d) => host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function isInternal(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("about:")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

function lastOpen(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function markOpen(now: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // sem storage: não bloqueia novamente nesta sessão
  }
}

export function initAdClickGuard(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalOpen = window.open.bind(window);
  const originalAssign = window.location.assign?.bind(window.location);

  window.open = function (url?: string | URL, target?: string, features?: string) {
    const urlStr = String(url ?? "");
    if (isInternal(urlStr)) return originalOpen(url, target, features);

    const now = Date.now();
    const last = lastOpen();

    if (last > 0 && now - last < COOLDOWN_MS) {
      const restante = Math.ceil((COOLDOWN_MS - (now - last)) / 60000);
      console.log(`[AdGuard] Pop bloqueado — próximo em ~${restante} min`);
      return null;
    }

    markOpen(now);
    console.log("[AdGuard] Pop liberado (cooldown de 5 min iniciado)");
    return originalOpen(url, target, features);
  };

  if (originalAssign) {
    window.location.assign = function (url: string) {
      if (isAdUrl(url)) {
        const now = Date.now();
        const last = lastOpen();
        if (last > 0 && now - last < COOLDOWN_MS) {
          console.log("[AdGuard] Redirect de anúncio bloqueado (cooldown)");
          return;
        }
        markOpen(now);
      }
      return originalAssign(url);
    };
  }
}
