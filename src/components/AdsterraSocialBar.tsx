import { useEffect, useState } from "react";
import { adManager } from "@/lib/adManager";

const SOCIAL_BAR_SRC =
  "https://pl30913394.effectivecpmnetwork.com/2c/11/c4/2c11c437d41b62fa1a87e6cb055a054c.js";
const SOCIAL_BAR_ID = "adsterra-social-script";

/**
 * Componente Social Bar da Adsterra
 * Notificação flutuante de alta conversão
 * Rode apenas client-side (SSR-safe)
 */
export function AdsterraSocialBar() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof document === "undefined") return undefined;

    // Garante a rede da rota /botao sem depender do componente.
    adManager.initForRoute("/botao");

    if (document.getElementById(SOCIAL_BAR_ID)) return undefined;

    const script = document.createElement("script");
    script.id = SOCIAL_BAR_ID;
    script.src = SOCIAL_BAR_SRC;
    script.async = true;
    document.head.appendChild(script);
    console.log("[AdsterraSocialBar] Script carregado");

    return () => {
      document.getElementById(SOCIAL_BAR_ID)?.remove();
      console.log("[AdsterraSocialBar] Script removido");
    };
  }, [isMounted]);

  // Social Bar é injetada pelo script, não precisa de container
  return null;
}
