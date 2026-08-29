// Monetag legado — stub no-op.
// A tag antiga (quge5.com) responde com MIME inválido (text/plain) e quebra
// importScripts em todos os navegadores. Este arquivo substitui o SW antigo
// e se auto-desregistra ao ativar. A remoção definitiva é feita via
// navigator.serviceWorker.getRegistrations().unregister() no AdManager.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
