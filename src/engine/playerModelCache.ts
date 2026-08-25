import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

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
      console.log(`[PlayerModelCache] Carregando modelo base: ${modelPath}`);
      const FBXLoader = await this.getFBXLoader();
      const loader = new FBXLoader();

      // Carrega modelo base
      const baseModel = await loader.loadAsync(modelPath);
      console.log(`[PlayerModelCache] Modelo base baixado e parseado: ${modelPath}`);

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

      console.log(
        `[PlayerModelCache] ✓ Modelo carregado: ${modelPath} com ${baseAnimations.size} animações (${Array.from(baseAnimations.keys()).join(", ") || "nenhuma"})`
      );
    } catch (error) {
      console.error(`[PlayerModelCache] ✗ Erro ao carregar modelo ${modelPath}:`, error);
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
    // Mixamo exporta em centímetros (~178 de altura) — escala para metros.
    // IMPORTANTE: medir ANTES de escalar. Em SkinnedMesh, o Box3 de
    // setFromObject usa o bounding box skinned (calculado com os bones, que já
    // carregam a escala do root) e aplica matrixWorld por cima — medir depois
    // da escala aplica 0.01 DUAS vezes e zera os offsets.
    model.updateWorldMatrix(false, true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    const escala = 0.01;
    model.scale.set(escala, escala, escala);
    // SEM rotação: o Ch38 olha +Z nativamente (prova: mixamorig5LeftToeBase
    // fica em z=+10.2, à frente do tornozelo em z=-3.6). O engine alinha
    // group.rotation.y = heading = atan2(vx, vz), que assume frente=+Z —
    // rotacionar π aqui deixava o boneco correndo de ré.
    model.rotation.y = 0;

    // position é aplicada no espaço do pai (metros) ANTES da escala do
    // conteúdo local: ponto final = position + escala·p, logo os offsets
    // de centro entram negativos e o pé (min.y) sobe para y=0.
    model.position.set(-center.x * escala, -box.min.y * escala, -center.z * escala);
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
      console.warn(`[PlayerModelCache] Modelo ${modelPath} não disponível para clonagem`);
      return null;
    }

    // SkinnedMesh NÃO sobrevive a Object3D.clone() (os bones do clone continuam
    // apontando para o esqueleto original — o modelo fica travado na bind pose).
    // SkeletonUtils.clone re-vincula esqueleto e skinning corretamente.
    const inner = skeletonClone(cached.baseModel) as THREE.Group;

    // Wrapper externo: o MatchEngine sobrescreve position/rotation.y do group a
    // cada frame; a normalização (escala/offset/rotação) fica protegida no inner.
    const wrapper = new THREE.Group();
    wrapper.add(inner);

    const mixer = new THREE.AnimationMixer(inner);

    // Aplica cores do time
    this.applyTeamColors(inner, primaryColor, secondaryColor, isKeeper);

    // Adiciona marker se controlado (no wrapper — fica no chão, fora da escala do modelo)
    let marker: THREE.Mesh | undefined;
    if (isControlled) {
      marker = this.createControlMarker();
      wrapper.add(marker);
    }

    return {
      group: wrapper,
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
      if (!(object instanceof THREE.Mesh) || !object.material) return;
      const meshName = object.name.toLowerCase();
      let target: THREE.Color | null = null;
      if (meshName.includes("shirt")) target = primary;
      else if (meshName.includes("shorts") || meshName.includes("socks")) target = secondary;
      else if (meshName.includes("shoes")) target = secondary.clone().multiplyScalar(0.35);
      if (!target) return; // corpo/cabelo/etc: mantém a textura original

      // O material é COMPARTILHADO entre os meshes do modelo, com o cache e
      // com os outros clones: clonar antes de pintar, senão todos os
      // jogadores ficariam com a cor do último time processado.
      const material = (object.material as THREE.MeshStandardMaterial).clone();
      material.color.copy(target);
      material.userData["ownMaterial"] = true;
      object.material = material;
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

    // Geometria/material próprios (não vêm do cache) — seguros para dispose.
    for (const m of [marker, innerMarker]) {
      m.userData["ownGeometry"] = true;
      (m.material as THREE.Material).userData["ownMaterial"] = true;
    }

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
