import * as THREE from "three";

export interface FieldDims {
  halfLength: number; // x
  halfWidth: number; // z
  goalHalfWidth: number;
  goalHeight: number;
  penaltyBoxDepth: number;
  penaltyBoxHalfWidth: number;
  smallBoxDepth: number;
  smallBoxHalfWidth: number;
  centerCircle: number;
  penaltySpot: number; // |x|
}

/** Campo oficial 11x11. */
export const FIELD: FieldDims = {
  halfLength: 52.5, // x
  halfWidth: 34, // z
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  penaltyBoxDepth: 16.5,
  penaltyBoxHalfWidth: 20.16,
  smallBoxDepth: 5.5,
  smallBoxHalfWidth: 9.16,
  centerCircle: 9.15,
  penaltySpot: 41.5, // |x|
};

/**
 * Quadra reduzida para o formato 3x3 (~40% do campo oficial):
 * arena pequena, disputa constante da bola, gol estilo futsal.
 */
export const FIELD_3V3: FieldDims = {
  halfLength: 21,
  halfWidth: 13.5,
  goalHalfWidth: 1.6,
  goalHeight: 1.5,
  penaltyBoxDepth: 6.6,
  penaltyBoxHalfWidth: 8,
  smallBoxDepth: 2.2,
  smallBoxHalfWidth: 3.7,
  centerCircle: 3.7,
  penaltySpot: 16, // |x|
};

const LINE_Y = 0.02;

function lineMaterial() {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
}

function addPath(group: THREE.Group, pts: [number, number][], close = false) {
  const arr: number[] = [];
  const list = close ? [...pts, pts[0]!] : pts;
  for (const [x, z] of list) arr.push(x, LINE_Y, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  group.add(new THREE.Line(geo, lineMaterial()));
}

function addCircle(group: THREE.Group, cx: number, cz: number, r: number, seg = 48) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  addPath(group, pts);
}

function addDot(group: THREE.Group, cx: number, cz: number) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 12),
    new THREE.MeshBasicMaterial({ color: 0xf2f7f2 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(cx, LINE_Y, cz);
  group.add(m);
}

function buildGoal(sign: number, dims: FieldDims): THREE.Group {
  const g = new THREE.Group();
  const { halfLength, goalHalfWidth: gw, goalHeight: gh } = dims;
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    metalness: 0.3, 
    roughness: 0.2 
  });
  const postGeo = new THREE.CylinderGeometry(0.09, 0.09, gh, 16);
  for (const z of [-gw, gw]) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(sign * halfLength, gh / 2, z);
    post.castShadow = true;
    post.receiveShadow = true;
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, gw * 2, 16), mat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(sign * halfLength, gh, 0);
  bar.castShadow = true;
  bar.receiveShadow = true;
  g.add(bar);

  // Net (back + sides + top) as cheap transparent grids.
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    wireframe: true,
  });
  const depth = 2;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, gh, 16, 8), netMat);
  back.position.set(sign * (halfLength + depth), gh / 2, 0);
  g.add(back);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, depth, 16, 4), netMat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(sign * (halfLength + depth / 2), gh, 0);
  g.add(top);
  for (const z of [-gw, gw]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, gh, 4, 8), netMat);
    side.rotation.y = Math.PI / 2;
    side.position.set(sign * (halfLength + depth / 2), gh / 2, z);
    g.add(side);
  }
  return g;
}

/** Builds pitch, lines, goals, nets, corner flags, stands and lighting. */
export function buildField(scene: THREE.Scene, quality: "low" | "high", dims: FieldDims = FIELD) {
  const { halfLength: L, halfWidth: W } = dims;

  // Dramatic sunset/stadium lighting
  const skyColor = new THREE.Color(0x1a2a3a);
  const groundColor = new THREE.Color(0x1a3d2e);
  scene.background = skyColor;
  scene.fog = new THREE.FogExp2(skyColor, 0.008);

  // Enhanced grass texture with more detail
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  
  // Base grass color
  ctx.fillStyle = "#2d8a4e";
  ctx.fillRect(0, 0, 64, 64);
  
  // Mowed stripes pattern
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#267a44" : "#349658";
    ctx.fillRect(i * 8, 0, 8, 64);
  }
  
  // Add some noise/texture
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#3da866" : "#1f6a3a";
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 16);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.anisotropy = quality === "high" ? 4 : 1;

  const grassMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.8,
    metalness: 0.0,
  });
  
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry((L + 6) * 2, (W + 6) * 2, 32, 32),
    grassMat
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  const lines = new THREE.Group();
  addPath(lines, [
    [-L, -W],
    [L, -W],
    [L, W],
    [-L, W],
  ], true);
  addPath(lines, [
    [0, -W],
    [0, W],
  ]);
  addCircle(lines, 0, 0, dims.centerCircle);
  addDot(lines, 0, 0);

  for (const s of [-1, 1]) {
    const pb = dims.penaltyBoxDepth;
    const pw = dims.penaltyBoxHalfWidth;
    addPath(lines, [
      [s * L, -pw],
      [s * (L - pb), -pw],
      [s * (L - pb), pw],
      [s * L, pw],
    ]);
    const sb = dims.smallBoxDepth;
    const sw = dims.smallBoxHalfWidth;
    addPath(lines, [
      [s * L, -sw],
      [s * (L - sb), -sw],
      [s * (L - sb), sw],
      [s * L, sw],
    ]);
    addDot(lines, s * dims.penaltySpot, 0);
    // Penalty arc
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      const x = s * dims.penaltySpot - s * Math.cos(a) * dims.centerCircle;
      const z = Math.sin(a) * dims.centerCircle;
      if (Math.abs(x) < L - pb) pts.push([x, z]);
    }
    if (pts.length > 1) addPath(lines, pts);
    // Corner arcs
    for (const zs of [-1, 1]) {
      const arc: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * (Math.PI / 2);
        arc.push([s * (L - Math.cos(a) * 1), zs * (W - Math.sin(a) * 1)]);
      }
      addPath(lines, arc);
    }
  }
  scene.add(lines);

  scene.add(buildGoal(1, dims));
  scene.add(buildGoal(-1, dims));

  // Corner flags
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.3 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.1, roughness: 0.8 });
  for (const s of [-1, 1])
    for (const z of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), poleMat);
      pole.position.set(s * L, 0.9, z * W);
      pole.castShadow = true;
      scene.add(pole);
      
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), flagMat);
      flag.position.set(s * L + 0.15, 1.6, z * W);
      flag.rotation.y = s > 0 ? Math.PI / 4 : -Math.PI / 4;
      scene.add(flag);
    }

  // Enhanced stadium stands with lighting
  const standMat = new THREE.MeshStandardMaterial({ 
    color: 0x1e3a5f, 
    metalness: 0.1, 
    roughness: 0.9 
  });
  const mk = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 12, d, 4, 1, 4), standMat);
    m.position.set(x, 6, z);
    m.receiveShadow = true;
    scene.add(m);
  };
  mk((L + 16) * 2, 12, 0, W + 14);
  mk((L + 16) * 2, 12, 0, -(W + 14));
  mk(12, (W + 8) * 2, L + 14, 0);
  mk(12, (W + 8) * 2, -(L + 14), 0);

  // Enhanced lighting setup
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.6);
  scene.add(hemiLight);
  
  // Main sun light with warmer color
  const sun = new THREE.DirectionalLight(0xfff5e6, 1.5);
  sun.position.set(50, 80, 40);
  
  if (quality === "high") {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0001;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);
  
  // Rim light for dramatic effect
  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
  rimLight.position.set(-30, 20, -50);
  scene.add(rimLight);
  
  // Fill light
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
  fillLight.position.set(-20, 30, 20);
  scene.add(fillLight);
}
