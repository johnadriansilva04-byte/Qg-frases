/**
 * AD CLICK GUARD — portão de autorização ÚNICA para zonas OnClick.
 *
 * Problema original: a tag do Monetag instala listeners globais que
 * SOBREVIVEM à remoção do <script> — depois da primeira liberação, cada
 * clique do usuário disparava de novo. Aqui, toda navegação externa
 * (window.open, location.assign, location.href, âncoras target=_blank)
 * passa por `consumirAutorizacao()`: só a ÚNICA navegação dentro da
 * janela autorizada é liberada; o resto é bloqueado até nova confirmação.
 */

let patched = false;
let autorizadoAte = 0;
let disparado = false;

function isInternal(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("about:")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

/** Libera exatamente UMA navegação externa dentro da janela `janelaMs`. */
export function liberarPopupUnico(janelaMs = 5000): void {
  autorizadoAte = Date.now() + janelaMs;
  disparado = false;
  console.log("[AdGuard] Autorização única liberada por", janelaMs, "ms");
}

/** Fecha o portão imediatamente (ex.: janela expirou, script removido). */
export function cancelarAutorizacao(): void {
  autorizadoAte = 0;
  disparado = false;
}

/**
 * Semântica "uma vez": true só para a PRIMEIRA navegação externa dentro
 * da janela autorizada; as demais são bloqueadas até nova liberação.
 */
function consumirAutorizacao(): boolean {
  const agora = Date.now();
  if (agora > autorizadoAte || disparado) return false;
  disparado = true;
  autorizadoAte = 0;
  console.log("[AdGuard] Navegação externa autorizada (consumida)");
  return true;
}

export function initAdClickGuard(): void {
  if (patched || typeof window === "undefined" || typeof document === "undefined") return;
  patched = true;

  // window.open — o caminho clássico das zonas OnClick
  const originalOpen = window.open.bind(window);
  window.open = function (url?: string | URL, target?: string, features?: string) {
    const urlStr = String(url ?? "");
    if (isInternal(urlStr)) return originalOpen(url, target, features);
    if (consumirAutorizacao()) return originalOpen(url, target, features);
    console.log("[AdGuard] Pop externo bloqueado");
    return null;
  };

  // location.assign — redirecionamento na mesma aba
  try {
    const originalAssign = Location.prototype.assign;
    Location.prototype.assign = function (url: string | URL) {
      const urlStr = String(url);
      if (isInternal(urlStr)) return originalAssign.call(this, url);
      if (consumirAutorizacao()) return originalAssign.call(this, url);
      console.log("[AdGuard] Redirecionamento externo (assign) bloqueado");
    };
  } catch (error) {
    console.warn("[AdGuard] Não foi possível interceptar location.assign:", error);
  }

  // Âncoras target=_blank — disparadas via click() programático da tag
  document.addEventListener(
    "click",
    (event) => {
      const alvo = event.target instanceof Element ? event.target : null;
      const ancora = alvo?.closest("a[href]");
      if (!(ancora instanceof HTMLAnchorElement)) return;
      const href = ancora.getAttribute("href") ?? "";
      if (ancora.target !== "_blank" || isInternal(href)) return;
      if (!consumirAutorizacao()) {
        console.log("[AdGuard] Clique em âncora externa (_blank) bloqueado");
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  console.log("[AdGuard] Portão de autorização única ativado");
}
