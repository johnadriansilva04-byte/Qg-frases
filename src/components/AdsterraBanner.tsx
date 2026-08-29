import { useCallback, useEffect, useRef, useState } from "react";
import { adManager, useAdManager } from "@/lib/adManager";
import { ControlledAdButton } from "./ControlledAdButton";

interface AdsterraBannerProps {
  slotId?: string;
  className?: string;
  /** Se true, mostra botão controlado (carrega sob clique) em vez do banner direto. */
  showButton?: boolean;
}

/**
 * Componente Native Banner da Adsterra
 * Uso exclusivo no Futebol de Botão
 * Rode apenas client-side (SSR-safe)
 *
 * Comportamento:
 * - showButton=false (padrão): o banner nativo é carregado ao montar — seguro,
 *   pois o invoke.js só preenche o container, sem pop-ups ou redirecionamentos.
 * - showButton=true: renderiza botão com aviso e carrega somente após clique.
 */
export function AdsterraBanner({ slotId = "native-banner", className = "", showButton = false }: AdsterraBannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createContainer, getNetwork } = useAdManager("/botao");

  const loadAdsterraScript = useCallback(async () => {
    if (scriptLoaded || hasError) return;
    console.log("[AD] loading-adsterra-script");

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

      // O invoke script da Adsterra executa UMA vez ao carregar e preenche o
      // container que existir naquele instante. Como o container é recriado a
      // cada montagem (navegação/novo fim de partida), o script precisa ser
      // REANEXADO para rodar de novo — antes, remount deixava o banner vazio
      // ("carrega em alguns lugares e em outros não").
      document.getElementById("adsterra-script")?.remove();
      const newScript = document.createElement("script");
      newScript.id = "adsterra-script";
      newScript.src = adManager.getAdsterraSrc();
      newScript.async = true;
      newScript.setAttribute("data-cfasync", "false");
      newScript.onerror = () => {
        console.warn("[AdsterraBanner] Erro ao carregar script");
        setHasError(true);
      };
      document.head.appendChild(newScript);

      setScriptLoaded(true);
      console.log("[AD] adsterra-script-loaded");
    } catch (error) {
      console.error("[AdsterraBanner] Erro:", error);
      setHasError(true);
    }
  }, [scriptLoaded, hasError, getNetwork, createContainer, slotId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Banner nativo: carrega ao montar (seguro — preenche apenas o container).
  useEffect(() => {
    if (!isMounted || showButton || hasError) return;
    void loadAdsterraScript();

    return () => {
      // Cleanup ao desmontar
      if (containerRef.current && containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [isMounted, showButton, hasError, loadAdsterraScript]);

  // Se showButton, renderiza botão controlado em vez de carregar automaticamente
  if (showButton) {
    return (
      <div className={`w-full ${className}`}>
        <ControlledAdButton onAdExecute={loadAdsterraScript} className="w-full">
          Ver anúncio
        </ControlledAdButton>
      </div>
    );
  }

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
