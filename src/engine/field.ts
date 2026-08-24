import * as THREE from "three";

export const FIELD = {
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

const LINE_Y = 0.02;

function lineMaterial() {
  return new THREE.LineBasicMaterial({ color: 0xf2f7f2, transparent: true, opacity: 0.9 });
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

function buildGoal(sign: number): THREE.Group {
  const g = new THREE.Group();
  const { halfLength, goalHalfWidth: gw, goalHeight: gh } = FIELD;
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const postGeo = new THREE.CylinderGeometry(0.09, 0.09, gh, 8);
  for (const z of [-gw, gw]) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(sign * halfLength, gh / 2, z);
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, gw * 2, 8), mat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(sign * halfLength, gh, 0);
  g.add(bar);

  // Net (back + sides + top) as cheap transparent grids.
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    wireframe: true,
  });
  const depth = 2;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, gh, 12, 6), netMat);
  back.position.set(sign * (halfLength + depth), gh / 2, 0);
  g.add(back);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, depth, 12, 3), netMat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(sign * (halfLength + depth / 2), gh, 0);
  g.add(top);
  for (const z of [-gw, gw]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, gh, 3, 6), netMat);
    side.rotation.y = Math.PI / 2;
    side.position.set(sign * (halfLength + depth / 2), gh / 2, z);
    g.add(side);
  }
  return g;
}

/** Builds pitch, lines, goals, nets, corner flags, stands and lighting. */
export function buildField(scene: THREE.Scene, quality: "low" | "high") {
  const { halfLength: L, halfWidth: W } = FIELD;

  scene.background = new THREE.Color(0x0a1420);
  scene.fog = new THREE.Fog(0x0a1420, 90, 190);

  // Grass with mowed stripes baked into a tiny canvas texture.
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2f7d43";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#2a7139";
  ctx.fillRect(0, 0, 8, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 1);
  tex.magFilter = THREE.LinearFilter;

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry((L + 6) * 2, (W + 6) * 2),
    new THREE.MeshLambertMaterial({ map: tex })
  );
  grass.rotation.x = -Math.PI / 2;
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
  addCircle(lines, 0, 0, FIELD.centerCircle);
  addDot(lines, 0, 0);

  for (const s of [-1, 1]) {
    const pb = FIELD.penaltyBoxDepth;
    const pw = FIELD.penaltyBoxHalfWidth;
    addPath(lines, [
      [s * L, -pw],
      [s * (L - pb), -pw],
      [s * (L - pb), pw],
      [s * L, pw],
    ]);
    const sb = FIELD.smallBoxDepth;
    const sw = FIELD.smallBoxHalfWidth;
    addPath(lines, [
      [s * L, -sw],
      [s * (L - sb), -sw],
      [s * (L - sb), sw],
      [s * L, sw],
    ]);
    addDot(lines, s * FIELD.penaltySpot, 0);
    // Penalty arc
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      const x = s * FIELD.penaltySpot - s * Math.cos(a) * FIELD.centerCircle;
      const z = Math.sin(a) * FIELD.centerCircle;
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

  scene.add(buildGoal(1));
  scene.add(buildGoal(-1));

  // Corner flags
  const flagMat = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  for (const s of [-1, 1])
    for (const z of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), flagMat);
      pole.position.set(s * L, 0.75, z * W);
      scene.add(pole);
    }

  // Simple stands so the camera never sees the void.
  const standMat = new THREE.MeshLambertMaterial({ color: 0x121e2c });
  const mk = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), standMat);
    m.position.set(x, 4, z);
    scene.add(m);
  };
  mk((L + 16) * 2, 12, 0, W + 14);
  mk((L + 16) * 2, 12, 0, -(W + 14));
  mk(12, (W + 8) * 2, L + 14, 0);
  mk(12, (W + 8) * 2, -(L + 14), 0);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x2b4a2f, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(40, 70, 30);
  if (quality === "high") {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const cam = sun.shadow.camera as THREE.OrthographicCamera;
    cam.left = -70;
    cam.right = 70;
    cam.top = 50;
    cam.bottom = -50;
    cam.far = 200;
  }
  scene.add(sun);
}
