import * as THREE from "three";

/**
 * Sistema de cache e carregamento de modelos FBX para jogadores.
 * Carrega o modelo base uma vez e clona para múltiplos jogadores.
 */

export interface AnimationState {
  name: string;
  clip: THREE.AnimationClip;
}

export interface FBXPlayerRig {
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  animations: Map<string, THREE.AnimationClip>;
  marker?: THREE.Mesh | undefined;
}

interface CacheEntry {
  baseModel: THREE.Group;
  baseAnimations: Map<string, THREE.AnimationClip>;
  loaded: boolean;
  error: boolean;
}

class PlayerModelCache {
  private cache: Map<string, CacheEntry> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  /**
   * Carrega dinamicamente o FBXLoader (evita dependência adicional)
   */
  private async getFBXLoader(): Promise<any> {
    const module = await import("three/examples/jsm/loaders/FBXLoader.js");
    return module.FBXLoader;
  }

  /**
   * Carrega o modelo base e animações de um personagem.
   * @param modelPath Caminho para o arquivo FBX do modelo base
   * @param animationPaths Map de nome -> caminho para animações FBX
   */
  async loadModel(
    modelPath: string,
    animationPaths: Map<string, string> = new Map()
  ): Promise<void> {
    const cacheKey = modelPath;

    // Se já está carregando, aguarda a mesma promise
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Se já está carregado, retorna imediatamente
    const cached = this.cache.get(cacheKey);
    if (cached?.loaded) {
      return Promise.resolve();
    }

    // Se houve erro anterior, não tenta novamente
    if (cached?.error) {
      return Promise.reject(new Error(`Modelo ${modelPath} falhou anteriormente`));
    }

    // Inicia carregamento
    const loadPromise = this.doLoadModel(modelPath, animationPaths, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async doLoadModel(
    modelPath: string,
    animationPaths: Map<string, string>,
    cacheKey: string
  ): Promise<void> {
    try {
      const FBXLoader = await this.getFBXLoader();
      const loader = new FBXLoader();

      // Carrega modelo base
      const baseModel = await loader.loadAsync(modelPath);

      // Normaliza escala e orientação
      this.normalizeModel(baseModel);

      // Carrega animações
      const baseAnimations = new Map<string, THREE.AnimationClip>();

      for (const [name, path] of animationPaths) {
        try {
          const animGroup = await loader.loadAsync(path);
          if (animGroup.animations && animGroup.animations.length > 0) {
            baseAnimations.set(name, animGroup.animations[0]);
          }
        } catch (err) {
          console.warn(`Falha ao carregar animação ${name} de ${path}:`, err);
        }
      }

      // Extrai animações do próprio modelo se existirem
      if (baseModel.animations && baseModel.animations.length > 0) {
        for (const clip of baseModel.animations) {
          if (!baseAnimations.has(clip.name)) {
            baseAnimations.set(clip.name, clip);
          }
        }
      }

      // Cacheia resultado
      this.cache.set(cacheKey, {
        baseModel,
        baseAnimations,
        loaded: true,
        error: false,
      });

      console.log(`Modelo carregado: ${modelPath} com ${baseAnimations.size} animações`);
    } catch (error) {
      console.error(`Erro ao carregar modelo ${modelPath}:`, error);
      this.cache.set(cacheKey, {
        baseModel: new THREE.Group(),
        baseAnimations: new Map(),
        loaded: false,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Normaliza o modelo para escala e orientação consistentes
   */
  private normalizeModel(model: THREE.Group): void {
    // Ajuste de escala baseado no modelo Ch38
    model.scale.set(0.01, 0.01, 0.01);

    // Centraliza o modelo
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Ajusta altura para que o pé fique no Y=0
    model.position.y = -box.min.y * 0.01;

    // Rotação padrão para facing +Z
    model.rotation.y = Math.PI;
  }

  /**
   * Clona o modelo base para um novo jogador com AnimationMixer independente.
   * @param modelPath Caminho do modelo base (deve ter sido carregado antes)
   * @param primaryColor Cor primária do time (camisa)
   * @param secondaryColor Cor secundária do time (calção)
   * @param isControlled Se é o jogador controlado (adiciona marker)
   * @param isKeeper Se é goleiro
   */
  cloneRig(
    modelPath: string,
    primaryColor: string,
    secondaryColor: string,
    isControlled: boolean,
    isKeeper: boolean
  ): FBXPlayerRig | null {
    const cacheKey = modelPath;
    const cached = this.cache.get(cacheKey);

    if (!cached || !cached.loaded || cached.error) {
      console.warn(`Modelo ${modelPath} não disponível para clonagem`);
      return null;
    }

    // Clona o modelo base com skeleton e skinning
    const clonedGroup = cached.baseModel.clone(true);
    const mixer = new THREE.AnimationMixer(clonedGroup);

    // Aplica cores do time
    this.applyTeamColors(clonedGroup, primaryColor, secondaryColor, isKeeper);

    // Adiciona marker se controlado
    let marker: THREE.Mesh | undefined;
    if (isControlled) {
      marker = this.createControlMarker();
      clonedGroup.add(marker);
    }

    return {
      group: clonedGroup,
      mixer,
      animations: new Map(cached.baseAnimations),
      marker,
    };
  }

  /**
   * Aplica as cores do time aos materiais do modelo
   */
  private applyTeamColors(
    group: THREE.Group,
    primaryColor: string,
    secondaryColor: string,
    isKeeper: boolean
  ): void {
    const primary = new THREE.Color(isKeeper ? "#f5c542" : primaryColor);
    const secondary = new THREE.Color(isKeeper ? "#1b1b1b" : secondaryColor);

    group.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const material = object.material as THREE.MeshStandardMaterial;

        // Preserva texturas existentes, modifica apenas a cor base
        if (material.map) {
          // Tem textura - mantém e apenas ajusta tint se necessário
          material.color.setHex(0xffffff);
        } else {
          // Sem textura - aplica cor sólida
          // Heurística: materiais com nome contendo "shirt", "body", "torso" -> primary
          // "shorts", "pants", "legs" -> secondary
          const name = material.name?.toLowerCase() || "";
          if (name.includes("shirt") || name.includes("body") || name.includes("torso")) {
            material.color.copy(primary);
          } else if (name.includes("short") || name.includes("pant") || name.includes("leg")) {
            material.color.copy(secondary);
          }
        }
      }
    });
  }

  /**
   * Cria o marcador visual para o jogador controlado
   */
  private createControlMarker(): THREE.Mesh {
    // Outer glow ring
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.05;

    // Inner bright ring
    const innerMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    innerMarker.rotation.x = -Math.PI / 2;
    innerMarker.position.y = 0.06;
    marker.add(innerMarker);

    return marker;
  }

  /**
   * Verifica se um modelo está carregado e disponível
   */
  isLoaded(modelPath: string): boolean {
    const cached = this.cache.get(modelPath);
    return cached?.loaded === true && !cached.error;
  }

  /**
   * Limpa o cache (útil para testes ou reload)
   */
  clear(): void {
    this.cache.forEach((entry) => {
      entry.baseModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton global
export const playerModelCache = new PlayerModelCache();

/**
 * Caminhos para os arquivos FBX
 */
export const FBX_PATHS = {
  BASE_MODEL: "/Ch38_nonPBR.fbx",
  ANIMATIONS: {
    run: "/Fast Run.fbx",
    save: "/Goalkeeper Diving Save.fbx",
    trip: "/Soccer Trip.fbx",
  },
} as const;
