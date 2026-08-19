/**
 * AD CLICK GUARD — a zona OnClick do Monetag abre pop em QUALQUER clique.
 *
 * Bloqueia todos os redirecionamentos externos não autorizados.
 * Intercepta: window.open, location.assign, e eventos de clique globais
 */

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

function markOpen(now: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // sem storage: gate segue mandando
  }
}

export function initAdClickGuard(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  // Intercepta window.open
  const originalOpen = window.open.bind(window);

  window.open = function (url?: string | URL, target?: string, features?: string) {
    const urlStr = String(url ?? "");
    if (isInternal(urlStr)) return originalOpen(url, target, features);

    console.log("[AdGuard] Pop externo bloqueado");
    return null;
  };

  // Intercepta location.assign - com verificação de segurança
  try {
    if (typeof Location !== "undefined" && Location.prototype && window.location) {
      const originalAssign = Location.prototype.assign;

      Location.prototype.assign = function (url: string | URL) {
        const urlStr = String(url);
        if (isInternal(urlStr)) return originalAssign.call(this, url);

        console.log("[AdGuard] Redirecionamento externo bloqueado");
        return;
      };
    }
  } catch (error) {
    console.warn("[AdGuard] Não foi possível interceptar location.assign:", error);
  }

  // Intercepta todos os cliques no documento para bloquear redirecionamentos
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a");

    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    if (isInternal(href)) return;

    console.log("[AdGuard] Clique em link externo bloqueado");
    event.preventDefault();
    event.stopPropagation();
  }, true); // Use capture phase para interceptar antes de outros handlers

  // Intercepta window.location.href setter
  try {
    if (window.location) {
      const originalDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, "href");

      Object.defineProperty(window.location, "href", {
        get() {
          return originalDescriptor?.get?.call(this) ?? window.location.href;
        },
        set(url: string) {
          if (isInternal(url)) {
            if (originalDescriptor?.set) {
              originalDescriptor.set.call(this, url);
            } else {
              window.location.href = url;
            }
            return;
          }

          console.log("[AdGuard] Redirecionamento via href bloqueado");
        },
        configurable: true,
      });
    }
  } catch (error) {
    console.warn("[AdGuard] Não foi possível interceptar window.location.href:", error);
  }

  console.log("[AdGuard] Proteção contra redirecionamentos ativada");
}
