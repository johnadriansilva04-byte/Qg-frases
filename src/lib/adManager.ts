/**
 * AD MANAGER - Sistema centralizado de monetização
 * 
 * Gerencia isolamento entre redes de anúncios:
 * - Google AdSense: Páginas estáticas e menus
 * - Adsterra: Futebol de Botão
 * - PropellerAds: Trilha
 */

export type AdNetwork = "adsense" | "adsterra" | "propeller" | "none";

export interface AdRouteConfig {
  network: AdNetwork;
  allowedSlots: string[];
}

/**
 * Configuração de rotas e redes de anúncios
 */
const ROUTE_CONFIG: Record<string, AdRouteConfig> = {
  // Rotas estáticas - Google AdSense
  "/": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/cidadela": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/biblioteca": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/gerador": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/corretor": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/noticias": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/privacidade": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/termos": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },

  // Futebol de Botão - Adsterra
  "/botao": { network: "adsterra", allowedSlots: ["native-banner", "interstitial"] },

  // Trilha - PropellerAds
  "/trilha": { network: "propeller", allowedSlots: ["inpage-push", "interstitial"] },
};

/**
 * Scripts de cada rede de anúncios
 */
const AD_SCRIPTS: Record<string, { src: string; id: string; containerId: string }> = {
  adsense: {
    src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    id: "adsense-script",
    containerId: "adsense-container",
  },
  adsterra: {
    src: "https://pl30913396.effectivecpmnetwork.com/0ad480fbab555d4ab76b3d9548942579/invoke.js",
    id: "adsterra-script",
    containerId: "container-0ad480fbab555d4ab76b3d9548942579",
  },
  propeller: {
    // Script placeholder para PropellerAds
    src: "",
    id: "propeller-script",
    containerId: "propeller-container",
  },
};

/**
 * Estado do AdManager
 */
class AdManager {
  private currentNetwork: AdNetwork = "none";
  private loadedScripts: Set<string> = new Set();
  private activeContainers: Set<string> = new Set();

  /**
   * Determina qual rede usar baseado na rota atual
   */
  getNetworkForRoute(path: string): AdNetwork {
    // Verifica rotas exatas
    if (ROUTE_CONFIG[path]) {
      return ROUTE_CONFIG[path].network;
    }

    // Verifica rotas que começam com prefixo
    if (path.startsWith("/botao")) {
      return "adsterra";
    }
    if (path.startsWith("/trilha")) {
      return "propeller";
    }

    // Padrão: AdSense para páginas estáticas
    return "adsense";
  }

  /**
   * Carrega o script da rede especificada
   */
  loadScript(network: AdNetwork): void {
    if (network === "none") return;
    if (this.loadedScripts.has(network)) return;

    const config = AD_SCRIPTS[network];
    if (!config || !config.src) return;

    // Remove scripts de outras redes (isolamento)
    this.cleanupOtherNetworks(network);

    // Cria e injeta o script
    const script = document.createElement("script");
    script.id = config.id;
    script.src = config.src;
    script.async = true;
    script.setAttribute("data-cfasync", "false");

    document.head.appendChild(script);
    this.loadedScripts.add(network);

    console.log(`[AdManager] Script ${network} carregado`);
  }

  /**
   * Remove scripts de outras redes (isolamento)
   */
  private cleanupOtherNetworks(targetNetwork: AdNetwork): void {
    Object.keys(AD_SCRIPTS).forEach((network) => {
      if (network !== targetNetwork && network !== "none") {
        this.removeScript(network as AdNetwork);
      }
    });
  }

  /**
   * Remove um script específico
   */
  removeScript(network: AdNetwork): void {
    const config = AD_SCRIPTS[network];
    if (!config) return;

    const script = document.getElementById(config.id);
    if (script) {
      script.remove();
      this.loadedScripts.delete(network);
      console.log(`[AdManager] Script ${network} removido`);
    }
  }

  /**
   * Cria container para anúncio
   */
  createContainer(network: AdNetwork, slotId: string): HTMLElement | null {
    if (network === "none") return null;

    const config = AD_SCRIPTS[network];
    if (!config) return null;

    // Remove container existente se houver
    const existing = document.getElementById(config.containerId);
    if (existing) {
      existing.remove();
    }

    // Cria novo container
    const container = document.createElement("div");
    container.id = config.containerId;
    container.className = "ad-container";
    container.setAttribute("data-slot", slotId);

    this.activeContainers.add(config.containerId);

    return container;
  }

  /**
   * Remove todos os containers de anúncios
   */
  cleanupContainers(): void {
    this.activeContainers.forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.remove();
      }
    });
    this.activeContainers.clear();
    console.log("[AdManager] Todos os containers removidos");
  }

  /**
   * Limpa tudo (scripts e containers)
   */
  cleanup(): void {
    Object.keys(AD_SCRIPTS).forEach((network) => {
      this.removeScript(network as AdNetwork);
    });
    this.cleanupContainers();
    this.currentNetwork = "none";
    console.log("[AdManager] Cleanup completo");
  }

  /**
   * Inicializa anúncios para uma rota
   */
  initForRoute(path: string): void {
    const network = this.getNetworkForRoute(path);

    // Se a rede mudou, limpa tudo e carrega nova
    if (this.currentNetwork !== network) {
      this.cleanup();
      this.currentNetwork = network;
      this.loadScript(network);
    }

    console.log(`[AdManager] Rota ${path} usando rede ${network}`);
  }

  /**
   * Verifica se um slot é permitido na rota atual
   */
  isSlotAllowed(path: string, slotId: string): boolean {
    const config = ROUTE_CONFIG[path];
    if (!config) {
      // Se não houver config específica, permite slots padrão
      return slotId === "banner-topo" || slotId === "banner-rodape";
    }
    return config.allowedSlots.includes(slotId);
  }
}

// Singleton instance
export const adManager = new AdManager();

/**
 * Hook React para usar o AdManager
 */
export function useAdManager(path: string) {
  const init = () => {
    adManager.initForRoute(path);
  };

  const cleanup = () => {
    adManager.cleanup();
  };

  const createContainer = (slotId: string) => {
    const network = adManager.getNetworkForRoute(path);
    return adManager.createContainer(network, slotId);
  };

  return {
    init,
    cleanup,
    createContainer,
    getNetwork: () => adManager.getNetworkForRoute(path),
    isSlotAllowed: (slotId: string) => adManager.isSlotAllowed(path, slotId),
  };
}
