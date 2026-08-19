import { useEffect, useState } from "react";
import { adManager } from "@/lib/adManager";
import { sponsorArmado, onSponsorChange } from "@/lib/sponsorGate";

const SOCIAL_BAR_SRC =
  "https://pl30913394.effectivecpmnetwork.com/2c/11/c4/2c11c437d41b62fa1a87e6cb055a054c.js";
const SOCIAL_BAR_ID = "adsterra-social-script";

/**
 * Componente Social Bar da Adsterra
 * Notificação flutuante de alta conversão
 * Só carrega quando um ponto estratégico está armado (sponsorGate)
 * Rode apenas client-side (SSR-safe)
 */
export function AdsterraSocialBar() {
  const [isMounted, setIsMounted] = useState(false);
  const [gateArmado, setGateArmado] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return undefined;

    // Inscreve para mudanças no sponsorGate
    const unsubscribe = onSponsorChange((armado) => {
      setGateArmado(!!armado);
    });

    // Verifica estado inicial
    setGateArmado(!!sponsorArmado());

    return unsubscribe;
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || !gateArmado || typeof document === "undefined") return undefined;

    // Garante a rede da rota /botao sem depender do componente.
    adManager.initForRoute("/botao");

    if (document.getElementById(SOCIAL_BAR_ID)) return undefined;

    const script = document.createElement("script");
    script.id = SOCIAL_BAR_ID;
    script.src = SOCIAL_BAR_SRC;
    script.async = true;
    document.head.appendChild(script);
    console.log("[AdsterraSocialBar] Script carregado (gate armado)");

    return () => {
      document.getElementById(SOCIAL_BAR_ID)?.remove();
      console.log("[AdsterraSocialBar] Script removido");
    };
  }, [isMounted, gateArmado]);

  // Social Bar é injetada pelo script, não precisa de container
  return null;
}
