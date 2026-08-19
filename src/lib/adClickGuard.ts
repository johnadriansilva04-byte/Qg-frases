/**
 * AD CLICK GUARD — a zona OnClick do Monetag abre pop em QUALQUER clique.
 *
 * Regra: pop externo só passa quando um ponto estratégico foi "armado" pelo
 * sponsorGate (intervalo/fim de partida, entrada no Modo Carreira, fim de
 * jogo da Trilha) e o usuário foi avisado. Sem gate: bloqueado sempre.
 *
 * Intercepta: window.open, location.assign, window.location.href
 */

import { consumirSponsorGate } from "./sponsorGate";

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

    // Único caminho legítimo: gate armado em ponto estratégico.
    if (consumirSponsorGate()) {
      markOpen(Date.now());
      console.log("[AdGuard] Pop de patrocinador liberado (ponto estratégico)");
      return originalOpen(url, target, features);
    }

    console.log("[AdGuard] Pop externo bloqueado (nenhum ponto estratégico armado)");
    return null;
  };

  // Intercepta location.assign - com verificação de segurança
  try {
    if (typeof Location !== "undefined" && Location.prototype && window.location) {
      const originalAssign = Location.prototype.assign;

      Location.prototype.assign = function (url: string | URL) {
        const urlStr = String(url);
        if (isInternal(urlStr)) return originalAssign.call(this, url);

        // Único caminho legítimo: gate armado em ponto estratégico.
        if (consumirSponsorGate()) {
          markOpen(Date.now());
          console.log("[AdGuard] Redirecionamento liberado (ponto estratégico)");
          return originalAssign.call(this, url);
        }

        console.log("[AdGuard] Redirecionamento externo bloqueado (nenhum ponto estratégico armado)");
        return;
      };
    }
  } catch (error) {
    console.warn("[AdGuard] Não foi possível interceptar location.assign:", error);
  }

  // Intercepta window.location.href setter - com verificação de segurança
  try {
    if (window.location) {
      let currentHref = window.location.href;
      const originalDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, "href");

      Object.defineProperty(window.location, "href", {
        get() {
          return originalDescriptor?.get?.call(this) ?? currentHref;
        },
        set(url: string) {
          if (isInternal(url)) {
            if (originalDescriptor?.set) {
              originalDescriptor.set.call(this, url);
            } else {
              currentHref = url;
              window.location.href = url;
            }
            return;
          }

          // Único caminho legítimo: gate armado em ponto estratégico.
          if (consumirSponsorGate()) {
            markOpen(Date.now());
            console.log("[AdGuard] Redirecionamento via href liberado (ponto estratégico)");
            if (originalDescriptor?.set) {
              originalDescriptor.set.call(this, url);
            } else {
              currentHref = url;
              window.location.href = url;
            }
            return;
          }

          console.log("[AdGuard] Redirecionamento via href bloqueado (nenhum ponto estratégico armado)");
        },
        configurable: true,
      });
    }
  } catch (error) {
    console.warn("[AdGuard] Não foi possível interceptar window.location.href:", error);
  }

  console.log("[AdGuard] Proteção contra redirecionamentos ativada");
}
