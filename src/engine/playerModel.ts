import * as THREE from "three";
import { playerModelCache, FBX_PATHS, type FBXPlayerRig } from "./playerModelCache";

export interface PlayerRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  marker?: THREE.Mesh | undefined;
  // Propriedades opcionais para suporte a FBX
  mixer?: THREE.AnimationMixer;
  fbxRig?: FBXPlayerRig;
  currentAction?: THREE.AnimationAction;
}

const skinMat = new THREE.MeshStandardMaterial({ 
  color: 0xc98b62, 
  roughness: 0.7, 
  metalness: 0.0 
});

/** Human-like footballer with cylindrical limbs and realistic proportions. */
export function createPlayerRig(
  primary: string,
  secondary: string,
  isControlled: boolean,
  isKeeper: boolean
): PlayerRig {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ 
    color: new THREE.Color(isKeeper ? "#f5c542" : primary), 
    roughness: 0.6, 
    metalness: 0.1 
  });
  const shorts = new THREE.MeshStandardMaterial({ 
    color: new THREE.Color(isKeeper ? "#1b1b1b" : secondary), 
    roughness: 0.7, 
    metalness: 0.0 
  });

  // Torso - cylindrical body
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.65, 12),
    shirt
  );
  torso.position.y = 1.2;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Head - flattened sphere for more human look
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    skinMat
  );
  head.scale.set(1, 1.15, 1);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // Legs - cylindrical with better proportions
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8);
  legGeo.translate(0, -0.35, 0);
  const legL = new THREE.Mesh(legGeo, shorts);
  legL.position.set(-0.12, 0.85, 0);
  legL.castShadow = true;
  legL.receiveShadow = true;
  const legR = new THREE.Mesh(legGeo, shorts);
  legR.position.set(0.12, 0.85, 0);
  legR.castShadow = true;
  legR.receiveShadow = true;
  group.add(legL, legR);

  // Arms - thinner cylindrical arms
  const armGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.5, 8);
  armGeo.translate(0, -0.25, 0);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.28, 1.35, 0);
  armL.rotation.z = 0.2;
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.28, 1.35, 0);
  armR.rotation.z = -0.2;
  armR.castShadow = true;
  group.add(armL, armR);

  // Shoulders for more human silhouette
  const shoulderGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const shoulderL = new THREE.Mesh(shoulderGeo, shirt);
  shoulderL.position.set(-0.25, 1.45, 0);
  shoulderL.castShadow = true;
  const shoulderR = new THREE.Mesh(shoulderGeo, shirt);
  shoulderR.position.set(0.25, 1.45, 0);
  shoulderR.castShadow = true;
  group.add(shoulderL, shoulderR);

  let marker: THREE.Mesh | undefined;
  if (isControlled) {
    // Outer glow ring
    marker = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 32),
      new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.6, 
        side: THREE.DoubleSide 
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.05;
    group.add(marker);
    
    // Inner bright ring
    const innerMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.8, 
        side: THREE.DoubleSide 
      })
    );
    innerMarker.rotation.x = -Math.PI / 2;
    innerMarker.position.y = 0.06;
    group.add(innerMarker);
  }

  return { group, torso, legL, legR, armL, armR, marker };
}

export function createBallMesh(): THREE.Mesh {
  // Create procedural soccer ball pattern
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // White base
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 64, 64);

  // Black pentagon pattern
  ctx.fillStyle = "#1a1a1a";
  const pentagons = [
    {x: 16, y: 16}, {x: 48, y: 16}, {x: 32, y: 32}, {x: 16, y: 48}, {x: 48, y: 48}
  ];
  pentagons.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 24, 16),
    new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x111111,
      emissiveIntensity: 0.1
    })
  );
  mesh.castShadow = true;
  return mesh;
}

/**
 * Tenta criar um PlayerRig usando o modelo FBX.
 * Se o modelo não estiver carregado ou falhar, retorna null para usar fallback procedural.
 * @param primary Cor primária do time
 * @param secondary Cor secundária do time
 * @param isControlled Se é o jogador controlado
 * @param isKeeper Se é goleiro
 */
export function createPlayerRigFBX(
  primary: string,
  secondary: string,
  isControlled: boolean,
  isKeeper: boolean
): PlayerRig | null {
  // Verifica se o modelo FBX está carregado
  if (!playerModelCache.isLoaded(FBX_PATHS.BASE_MODEL)) {
    return null;
  }

  // Tenta clonar o rig FBX
  const fbxRig = playerModelCache.cloneRig(
    FBX_PATHS.BASE_MODEL,
    primary,
    secondary,
    isControlled,
    isKeeper
  );

  if (!fbxRig) {
    return null;
  }

  // Cria um PlayerRig compatível com a interface existente
  // Os meshes procedurais (torso, legL, etc.) ficam como null pois o FBX não os tem
  return {
    group: fbxRig.group,
    torso: null as any, // FBX não tem mesh individual de torso
    legL: null as any, // FBX não tem mesh individual de perna
    legR: null as any,
    armL: null as any,
    armR: null as any,
    marker: fbxRig.marker,
    mixer: fbxRig.mixer,
    fbxRig,
  };
}

/**
 * Cria um PlayerRig tentando usar FBX primeiro, com fallback para procedural.
 * @param primary Cor primária do time
 * @param secondary Cor secundária do time
 * @param isControlled Se é o jogador controlado
 * @param isKeeper Se é goleiro
 * @param useFBX Se deve tentar usar FBX (default: true)
 */
export function createPlayerRigWithFallback(
  primary: string,
  secondary: string,
  isControlled: boolean,
  isKeeper: boolean,
  useFBX: boolean = true
): PlayerRig {
  // Tenta FBX primeiro se habilitado
  if (useFBX) {
    console.log("[createPlayerRigWithFallback] Tentando usar FBX...");
    const fbxRig = createPlayerRigFBX(primary, secondary, isControlled, isKeeper);
    if (fbxRig) {
      console.log("[createPlayerRigWithFallback] ✓ Modelo FBX carregado com sucesso");
      return fbxRig;
    }
    console.log("[createPlayerRigWithFallback] ✗ FBX não disponível, usando fallback procedural");
  } else {
    console.log("[createPlayerRigWithFallback] FBX desabilitado, usando procedural");
  }

  // Fallback para o modelo procedural
  console.log("[createPlayerRigWithFallback] Criando modelo procedural");
  return createPlayerRig(primary, secondary, isControlled, isKeeper);
}
