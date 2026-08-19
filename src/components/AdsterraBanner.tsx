import { useEffect, useRef, useState } from "react";
import { adManager, useAdManager } from "@/lib/adManager";

interface AdsterraBannerProps {
  slotId?: string;
  className?: string;
}

/**
 * Componente Native Banner da Adsterra
 * Uso exclusivo no Futebol de Botão
 * Rode apenas client-side (SSR-safe)
 */
export function AdsterraBanner({ slotId = "native-banner", className = "" }: AdsterraBannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createContainer, getNetwork } = useAdManager("/botao");

  useEffect(() => {
    // Garante que rode apenas no client-side
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || hasError) return;

    try {
      // Verifica se a rede correta está ativa
      const network = getNetwork();
      if (network !== "adsterra") {
        console.warn("[AdsterraBanner] Rede incorreta ativa:", network);
        return;
      }

      // Cria container para o anúncio
      const container = createContainer(slotId);
      if (!container || !containerRef.current) return;

      // Adiciona container ao DOM
      containerRef.current.appendChild(container);

      // Carrega script Adsterra apenas se não existir (evita recarregar)
      const script = document.getElementById("adsterra-script");
      if (!script) {
        const newScript = document.createElement("script");
        newScript.id = "adsterra-script";
        newScript.src =
          "https://pl30913396.effectivecpmnetwork.com/0ad480fbab555d4ab76b3d9548942579/invoke.js";
        newScript.async = true;
        newScript.setAttribute("data-cfasync", "false");
        newScript.onerror = () => {
          console.warn("[AdsterraBanner] Erro ao carregar script");
          setHasError(true);
        };
        document.head.appendChild(newScript);
      }

      return () => {
        // Cleanup ao desmontar
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    } catch (error) {
      console.error("[AdsterraBanner] Erro:", error);
      setHasError(true);
    }

    return undefined;
  }, [slotId, createContainer, getNetwork, isMounted, hasError]);

  // Não renderiza nada durante SSR ou se houver erro
  if (!isMounted || hasError) {
    return (
      <div
        className={`adsterra-banner-container w-full min-h-[90px] flex items-center justify-center ${className}`}
        style={{ display: "block" }}
      >
        <div className="text-xs text-muted-foreground">Publicidade</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`adsterra-banner-container w-full min-h-[90px] flex items-center justify-center ${className}`}
      style={{ display: "block" }}
    >
      {/* Container será injetado aqui pelo AdManager */}
      <div className="text-xs text-muted-foreground">Publicidade</div>
    </div>
  );
}
