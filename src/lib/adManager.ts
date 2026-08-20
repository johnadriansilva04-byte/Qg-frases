/**
 * AD MANAGER - Sistema centralizado de monetização
 *
 * Gerencia isolamento entre redes de anúncios:
 * - Google AdSense: Páginas estáticas e menus
 * - Adsterra: Futebol de Botão
 * - Monetag: Trilha e demais jogos de estratégia
 *
 * CONFIGURAÇÃO: as zonas/scripts podem ser sobrescritos por env vars
 * (VITE_ADSENSE_CLIENT, VITE_ADSTERRA_INVOKE_URL, VITE_MONETAG_SRC,
 * VITE_MONETAG_ZONE). Se o anúncio não aparecer:
 *  1) Confirme o domínio aprovado no painel da rede (Adsterra/Monetag).
 *  2) Verifique bloqueadores de anúncio / CSP.
 *  3) Rode `adManager.diagnostico()` no console do navegador.
 */

import { useCallback } from "react";
import { cancelarAutorizacao, initAdClickGuard, liberarPopupUnico } from "./adClickGuard";

const ENV = (typeof import.meta !== "undefined" ? import.meta.env : undefined) as
  | Record<string, string | undefined>
  | undefined;

export const ADSENSE_CLIENT = ENV?.["VITE_ADSENSE_CLIENT"] ?? "ca-pub-2783546143377409";
export const ADSTERRA_INVOKE_URL =
  ENV?.["VITE_ADSTERRA_INVOKE_URL"] ??
  "https://pl30913396.effectivecpmnetwork.com/0ad480fbab555d4ab76b3d9548942579/invoke.js";
export const MONETAG_SRC = ENV?.["VITE_MONETAG_SRC"] ?? "https://al5sm.com/tag.min.js";
export const MONETAG_ZONE = ENV?.["VITE_MONETAG_ZONE"] ?? "11607595";

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

  // Jogos de estratégia - Monetag (carregado apenas sob demanda via ControlledMonetagButton)
  "/trilha": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
  "/dama": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
  "/xadrez": { network: "monetag", allowedSlots: ["inpage-push", "loading"] },
};

/**
 * Scripts de cada rede de anúncios
 */
const AD_SCRIPTS: Record<string, { src: string; id: string; containerId: string; zone?: string }> = {
  adsense: {
    src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
    id: "adsense-script",
    containerId: "adsense-container",
  },
  adsterra: {
    src: ADSTERRA_INVOKE_URL,
    id: "adsterra-script",
    containerId: "container-0ad480fbab555d4ab76b3d9548942579",
  },
  // REMOVIDO: adsterra_social - causava disparos indevidos em cliques globais
  monetag: {
    // Tag script do Monetag — carregado apenas sob demanda via ControlledMonetagButton
    src: MONETAG_SRC,
    id: "monetag-script",
    containerId: "monetag-container",
    zone: MONETAG_ZONE,
  },
};

/**
 * Estado do AdManager
 */
class AdManager {
  private currentNetwork: AdNetwork = "none";
  private loadedScripts: Set<string> = new Set();
  private activeContainers: Set<string> = new Set();
  private readonly FIRST_GAME_KEY = "sov_first_game_played";
  private monetagTimer: number | null = null;

  constructor() {
    initAdClickGuard();
    this.unregisterLegacyMonetagSW();
  }

  /**
   * Desregistra o SW legado do Monetag: a tag antiga responde com MIME
   * `text/plain` e quebra o importScripts — só gerava erro no console.
   */
  private unregisterLegacyMonetagSW(): void {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          if (reg.active?.scriptURL.includes("/monetag.js")) {
            void reg.unregister();
          }
        }
      })
      .catch(() => {});
  }

  /**
   * Mantido por compatibilidade com chamadas legadas; não abre/fecha ads.
   */
  markFirstGamePlayed(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.FIRST_GAME_KEY, Date.now().toString());
  }

  /**
   * Anúncios nunca são bloqueados por "primeira visita/primeiro jogo".
   * O único critério é a rota (rede configurada em ROUTE_CONFIG).
   */
  shouldShowAds(): boolean {
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
   * MODIFICADO: Monetag não é carregado automaticamente - requer ação explícita do usuário
   */
  loadScript(network: AdNetwork, forceLoad = false): void {
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

    // Monetag só carrega se forceLoad=true (ação explícita do usuário)
    if (network === "monetag" && !forceLoad) {
      console.log("[AdManager] Monetag requer carregamento explícito via ControlledMonetagButton");
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
    if (network === "monetag" && config.zone) {
      // Zona exigida pela tag script do Monetag
      script.dataset["zone"] = config.zone;
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
      if (network !== targetNetwork && network !== "none") {
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
   * Limpa apenas scripts da Adsterra
   */
  cleanupAdsterra(): void {
    this.removeScript("adsterra" as AdNetwork);
    this.cleanupContainers();
    console.log("[AdManager] Cleanup Adsterra completo");
  }

  /**
   * Carrega script Monetag sob demanda (apenas quando usuário confirma)
   */
  loadMonetagOnDemand(): void {
    this.loadScript("monetag", true);
  }

  /**
   * Dispara o Monetag UMA vez por permissão: carrega a tag, deixa a zona
   * on-click ativa por `janelaMs` (padrão 3s) e então REMOVE o script do DOM.
   * Sem isso, a tag fica ouvindo cliques globais e dispara sem parar depois
   * da primeira liberação. Após a janela, a "permissão" expira e o usuário
   * precisa confirmar de novo para um novo disparo.
   */
  dispararMonetagUmaVez(janelaMs = 3000): void {
    if (typeof window === "undefined") return;
    // Autoriza a PRÓXIMA navegação externa e só ela: a tag do Monetag
    // mantém listeners globais mesmo sem o <script>; sem este portão,
    // cada clique do usuário disparava de novo (bug dos disparos infinitos).
    liberarPopupUnico(janelaMs);
    // Garante recarga limpa caso um disparo anterior ainda esteja no DOM.
    this.removeScript("monetag");
    this.loadScript("monetag", true);
    if (this.monetagTimer !== null) {
      window.clearTimeout(this.monetagTimer);
    }
    this.monetagTimer = window.setTimeout(() => {
      this.removeScript("monetag");
      cancelarAutorizacao();
      this.monetagTimer = null;
      console.log("[AdManager] Monetag: janela de permissão expirada — script removido");
    }, janelaMs);
  }

  /**
   * Fonte do script da Adsterra (env var VITE_ADSTERRA_INVOKE_URL sobrescreve).
   */
  getAdsterraSrc(): string {
    return ADSTERRA_INVOKE_URL;
  }

  /**
   * Diagnóstico no console: rede ativa, scripts carregados, containers e
   * configuração efetiva. Use no DevTools: `adManager.diagnostico()`.
   */
  diagnostico(): void {
    if (typeof window === "undefined") return;
    const caminho = window.location.pathname;
    const info = {
      rota: caminho,
      redeCalculada: this.getNetworkForRoute(caminho),
      redeAtiva: this.currentNetwork,
      scriptsCarregados: [...this.loadedScripts],
      containersAtivos: [...this.activeContainers],
      config: {
        adsenseClient: ADSENSE_CLIENT,
        adsterraInvokeUrl: ADSTERRA_INVOKE_URL,
        monetagSrc: MONETAG_SRC,
        monetagZone: MONETAG_ZONE,
      },
      scriptsNoDOM: {
        adsense: !!document.getElementById("adsense-script"),
        adsterra: !!document.getElementById("adsterra-script"),
        monetag: !!document.getElementById("monetag-script"),
      },
      bloqueadorDetectado: !document.querySelector("#adsense-script") && this.currentNetwork === "adsense",
    };
    console.table(info.config);
    console.log("[AdManager][diagnostico]", info);
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

// Expõe no console do navegador para diagnóstico (console.log(adManager)).
if (typeof window !== "undefined") {
  (window as unknown as { adManager: AdManager }).adManager = adManager;
}

/**
 * Hook React para usar o AdManager. Callbacks são estáveis por `path` —
 * evita re-execução infinita de efeitos (loop de carregar/remover scripts).
 */
export function useAdManager(path: string) {
  const init = useCallback(() => {
    adManager.initForRoute(path);
  }, [path]);

  const cleanup = useCallback(() => {
    adManager.cleanup();
  }, []);

  const createContainer = useCallback(
    (slotId: string) => {
      const network = adManager.getNetworkForRoute(path);
      return adManager.createContainer(network, slotId);
    },
    [path],
  );

  return {
    init,
    cleanup,
    createContainer,
    getNetwork: useCallback(() => adManager.getNetworkForRoute(path), [path]),
    isSlotAllowed: useCallback((slotId: string) => adManager.isSlotAllowed(path, slotId), [path]),
    markFirstGamePlayed: useCallback(() => adManager.markFirstGamePlayed(), []),
    shouldShowAds: useCallback(() => adManager.shouldShowAds(), []),
  };
}
