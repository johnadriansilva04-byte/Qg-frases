import { useEffect, useState } from "react";
import { useAdManager } from "@/lib/adManager";

/**
 * Componente Social Bar da Adsterra
 * Notificação flutuante de alta conversão
 * Rode apenas client-side (SSR-safe)
 */
export function AdsterraSocialBar() {
  const [isMounted, setIsMounted] = useState(false);
  const { init, getNetwork } = useAdManager("/botao");

  useEffect(() => {
    // Garante que rode apenas no client-side
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return undefined;

    // Inicializa AdManager para rota /botao
    init();

    // Verifica se a rede correta está ativa
    const network = getNetwork();
    if (network !== "adsterra") {
      console.warn("[AdsterraSocialBar] Rede incorreta ativa:", network);
      return undefined;
    }

    // Carrega script da Social Bar
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const script = document.createElement("script");
      script.id = "adsterra-social-script";
      script.src = "https://pl30913394.effectivecpmnetwork.com/2c/11/c4/2c11c437d41b62fa1a87e6cb055a054c.js";
      script.async = true;
      document.head.appendChild(script);

      console.log("[AdsterraSocialBar] Script carregado");

      return () => {
        // Cleanup ao desmontar
        const socialScript = document.getElementById("adsterra-social-script");
        if (socialScript) {
          socialScript.remove();
          console.log("[AdsterraSocialBar] Script removido");
        }
      };
    }

    return undefined;
  }, [init, getNetwork, isMounted]);

  // Não renderiza nada durante SSR
  if (!isMounted) {
    return null;
  }

  return null; // Social Bar é injetada pelo script, não precisa de container
}
