/**
 * AD CLICK GUARD — a zona OnClick do Monetag abre pop em QUALQUER clique.
 *
 * Regra: pop externo só passa quando um ponto estratégico foi "armado" pelo
 * sponsorGate (intervalo/fim de partida, entrada no Modo Carreira, fim de
 * jogo da Trilha) e o usuário foi avisado. Sem gate: bloqueado sempre.
 *
 * NÃO sobrescrevemos location.assign — read-only, derrubava o módulo.
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
}
