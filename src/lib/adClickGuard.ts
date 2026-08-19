/**
 * AD CLICK GUARD — limita pop-unders/onclick ads a 1 por 5 minutos.
 *
 * Zonas "OnClick" (Monetag, Adsterra Social Bar etc.) instalam handler global
 * de clique e abrem nova janela em QUALQUER clique do usuário. A lib externa
 * não expõe controle de frequência, então interceptamos `window.open`:
 * chamadas externas ficam bloqueadas enquanto o cooldown não passou.
 */

const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY = "ad_popguard_last_open";
let patched = false;

function isInternal(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("about:")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

export function initAdClickGuard(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalOpen = window.open.bind(window);

  window.open = function (url?: string | URL, target?: string, features?: string) {
    const urlStr = String(url ?? "");
    if (isInternal(urlStr)) return originalOpen(url, target, features);

    let last = 0;
    try {
      last = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
    } catch {
      last = 0;
    }

    const now = Date.now();
    if (last > 0 && now - last < COOLDOWN_MS) {
      const restante = Math.ceil((COOLDOWN_MS - (now - last)) / 60000);
      console.log(`[AdGuard] Pop bloqueado — próximo ads em ~${restante} min`);
      return null;
    }

    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // sem storage: deixa passar e marca em memória
    }
    console.log("[AdGuard] Pop liberado (cooldown de 5 min iniciado)");
    return originalOpen(url, target, features);
  };
}
