import { useState, useEffect } from "react";

export function CookieBanner() {
  const [aceito, setAceito] = useState(false);

  useEffect(() => {
    const consentimento = localStorage.getItem("cookie-consent");
    if (consentimento === "true") {
      setAceito(true);
    }
  }, []);

  const aceitarCookies = () => {
    localStorage.setItem("cookie-consent", "true");
    setAceito(true);
  };

  if (aceito) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-white/10 p-4 shadow-2xl">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-slate-200">
            🍪 Usamos cookies para melhorar sua experiência e exibir anúncios personalizados.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Ao continuar navegando, você concorda com nossa{" "}
            <a href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={aceitarCookies}
            className="botao-marca px-4 py-2 text-xs font-bold rounded-xl"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
