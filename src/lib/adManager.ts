/**
 * AD MANAGER - Sistema centralizado de monetização
 *
 * Gerencia isolamento entre redes de anúncios:
 * - Google AdSense: Páginas estáticas e menus
 * - Adsterra: Futebol de Botão
 * - Monetag: Trilha e demais jogos de estratégia
 */

export type AdNetwork = "adsense" | "adsterra" | "monetag" | "none";

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
  "/cidadela": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
  "/biblioteca": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/gerador": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/corretor": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/noticias": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/privacidade": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },
  "/termos": { network: "adsense", allowedSlots: ["banner-topo", "banner-rodape"] },

  // Futebol de Botão - Adsterra
  "/botao": { network: "adsterra", allowedSlots: ["native-banner", "interstitial"] },

  // Jogos de estratégia - Monetag
  "/trilha": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
  "/dama": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
  "/xadrez": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
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
  adsterra_social: {
    src: "https://pl30913394.effectivecpmnetwork.com/2c/11/c4/2c11c437d41b62fa1a87e6cb055a054c.js",
    id: "adsterra-social-script",
    containerId: "adsterra-social-container",
  },
  monetag: {
    // Registrado via Service Worker público (/monetag.js) nos slots Monetag.
    src: "",
    id: "monetag-script",
    containerId: "monetag-container",
  },
};

/**
 * Estado do AdManager
 */
class AdManager {
  private currentNetwork: AdNetwork = "none";
  private loadedScripts: Set<string> = new Set();
  private activeContainers: Set<string> = new Set();
  private isFirstVisit: boolean = true;
  private hasPlayedFirstGame: boolean = false;
  private readonly FIRST_VISIT_KEY = "sov_first_visit";
  private readonly FIRST_GAME_KEY = "sov_first_game_played";

  constructor() {
    this.checkFirstVisit();
  }

  /**
   * Verifica se é a primeira visita do usuário
   */
  private checkFirstVisit(): void {
    if (typeof window === "undefined") return;

    const hasVisited = localStorage.getItem(this.FIRST_VISIT_KEY);
    const hasPlayedGame = localStorage.getItem(this.FIRST_GAME_KEY);

    this.isFirstVisit = !hasVisited;
    this.hasPlayedFirstGame = !!hasPlayedGame;

    if (this.isFirstVisit) {
      localStorage.setItem(this.FIRST_VISIT_KEY, Date.now().toString());
    }
  }

  /**
   * Marca que o usuário jogou o primeiro jogo
   */
  markFirstGamePlayed(): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(this.FIRST_GAME_KEY, Date.now().toString());
    this.hasPlayedFirstGame = true;
    this.isFirstVisit = false;
  }

  /**
   * Verifica se anúncios devem ser mostrados
   */
  shouldShowAds(): boolean {
    // Não mostrar anúncios na primeira visita
    if (this.isFirstVisit) {
      console.log("[AdManager] Primeira visita - anúncios bloqueados");
      return false;
    }

    // Só mostrar anúncios após o primeiro jogo
    if (!this.hasPlayedFirstGame) {
      console.log("[AdManager] Primeiro jogo ainda não jogado - anúncios bloqueados");
      return false;
    }

    return true;
  }

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
    if (path.startsWith("/trilha") || path.startsWith("/dama") || path.startsWith("/xadrez")) {
      return "monetag";
    }

    // Padrão: AdSense para páginas estáticas
    return "adsense";
  }

  /**
   * Carrega o script da rede especificada
   */
  loadScript(network: AdNetwork): void {
    // Verifica se deve mostrar anúncios
    if (!this.shouldShowAds()) {
      console.log("[AdManager] Anúncios bloqueados (primeira visita ou primeiro jogo não jogado)");
      return;
    }

    // Verifica se está no browser (SSR-safe)
    if (typeof window === "undefined" || typeof document === "undefined") {
      console.warn("[AdManager] Tentativa de carregar script no SSR - ignorando");
      return;
    }

    if (network === "none") return;
    if (this.loadedScripts.has(network)) {
      console.log(`[AdManager] Script ${network} já carregado, pulando`);
      return;
    }

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
    if (network === "monetag") {
      script.dataset["zone"] = "271263";
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/monetag.js").catch(() => {});
      }
    }

    document.head.appendChild(script);
    this.loadedScripts.add(network);

    console.log(`[AdManager] Script ${network} carregado`);
  }

  /**
   * Remove scripts de outras redes (isolamento)
   */
  private cleanupOtherNetworks(targetNetwork: AdNetwork): void {
    Object.keys(AD_SCRIPTS).forEach((network) => {
      if (network !== targetNetwork && network !== "none" && network !== "adsterra_social") {
        this.removeScript(network as AdNetwork);
      }
    });
  }

  /**
   * Remove um script específico
   */
  removeScript(network: AdNetwork): void {
    // Verifica se está no browser (SSR-safe)
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

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
    // Verifica se está no browser (SSR-safe)
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

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
    // Verifica se está no browser (SSR-safe)
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

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
   * Limpa apenas scripts da Adsterra (incluindo Social Bar)
   */
  cleanupAdsterra(): void {
    this.removeScript("adsterra" as AdNetwork);
    this.removeScript("adsterra_social" as AdNetwork);
    this.cleanupContainers();
    console.log("[AdManager] Cleanup Adsterra completo");
  }

  /**
   * Inicializa anúncios para uma rota
   */
  initForRoute(path: string): void {
    // Verifica se deve mostrar anúncios
    if (!this.shouldShowAds()) {
      console.log(
        `[AdManager] Anúncios desativados para rota ${path} (primeira visita ou primeiro jogo não jogado)`,
      );
      return;
    }

    const network = this.getNetworkForRoute(path);

    // Se a rede mudou, limpa tudo e carrega nova
    if (this.currentNetwork !== network) {
      this.cleanup();
      this.currentNetwork = network;
      this.loadScript(network);
    }

    // Só loga se a rede mudou (evita spam no console)
    if (this.currentNetwork !== network) {
      console.log(`[AdManager] Rota ${path} usando rede ${network}`);
    }
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
    markFirstGamePlayed: () => adManager.markFirstGamePlayed(),
    shouldShowAds: () => adManager.shouldShowAds(),
  };
}
