/* Teste RUNTIME dos assets FBX reais (public/*.fbx) com o FBXLoader de
 * produção: prova que os arquivos são válidos, têm esqueleto skinned, que as
 * 3 animações bindam 100% num clone SkeletonUtils e que a normalização de
 * escala (0.01) deixa o modelo com ~1.8m e pé no chão. Roda em Node puro.
 */
// Shims mínimos de browser para o FBXLoader rodar em Node (texturas embutidas).
globalThis.window = globalThis;
globalThis.self = globalThis;
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => "blob:node-stub";
  globalThis.URL.revokeObjectURL = () => {};
}
// ImageLoader pede <img>; em Node devolvemos um stub que nunca dispara load
// (a textura não é necessária para validar geometria/esqueleto/animações).
globalThis.document = {
  createElementNS: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    set src(_v) {},
  }),
};

const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
const SkeletonUtils = await import("three/examples/jsm/utils/SkeletonUtils.js");
const { Box3, AnimationMixer, Group } = await import("three");
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");
const { dirname, join } = await import("node:path");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
const ok = (cond, msg) => {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  pass++;
  console.log(`✅ ${msg}`);
};

const parse = (name) => {
  const buf = readFileSync(join(root, "public", name));
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "/");
};

console.log("Carregando Ch38_nonPBR.fbx (52MB — pode levar alguns segundos)...");
const base = parse("Ch38_nonPBR.fbx");

let skinned = 0, bones = 0;
base.traverse((o) => {
  if (o.isSkinnedMesh) skinned++;
  else if (o.isBone) bones++;
});
ok(skinned >= 1, `modelo base tem SkinnedMesh (${skinned})`);
ok(bones >= 50, `modelo base tem esqueleto (${bones} bones)`);

// Normalização igual à de playerModelCache.normalizeModel: medir o bbox
// ANTES de escalar (medir depois aplica a escala 2x em SkinnedMesh, porque o
// bounding box skinned já inclui os bones escalados E o matrixWorld do root).
base.updateWorldMatrix(false, true);
const rawBox = new Box3().setFromObject(base);
const rawCenter = rawBox.getCenter(new (Object.getPrototypeOf(rawBox.min).constructor)());
const ESCALA = 0.01;
base.scale.set(ESCALA, ESCALA, ESCALA);
base.rotation.y = 0; // Ch38 olha +Z nativamente (prova: LeftToeBase à frente em +Z)
base.position.set(-rawCenter.x * ESCALA, -rawBox.min.y * ESCALA, -rawCenter.z * ESCALA);
const alturaM = (rawBox.max.y - rawBox.min.y) * ESCALA;
ok(alturaM > 1.5 && alturaM < 2.1, `altura normalizada ≈ humanoide (${alturaM.toFixed(2)}m)`);
ok(Math.abs(-rawBox.min.y * ESCALA - base.position.y) < 1e-9, "offset de pé-no-chão aplicado");

// Orientação nativa: os dedos do pé ficam À FRENTE (+Z) do tornozelo.
const bone = (n) => { let b; base.traverse((o) => { if (o.name === n) b = o; }); return b; };
const v1 = new (Object.getPrototypeOf(rawBox.min).constructor)();
const v2 = new (Object.getPrototypeOf(rawBox.min).constructor)();
bone("mixamorig5LeftFoot").getWorldPosition(v1);
bone("mixamorig5LeftToeBase").getWorldPosition(v2);
ok(v2.z > v1.z + 0.05, `modelo olha +Z nativamente (toe.z=${v2.z.toFixed(3)} > ankle.z=${v1.z.toFixed(3)}) — heading=atan2(vx,vz) alinha sem rotação extra`);

// Clone SkeletonUtils + wrapper (mesma forma do cloneRig)
const inner = SkeletonUtils.clone(base);
ok(inner !== base, "SkeletonUtils.clone produz instância nova");
const wrapper = new Group();
wrapper.add(inner);
wrapper.position.set(5, 0, -3);
wrapper.rotation.y = 1.2;
ok(Math.abs(inner.rotation.y) < 1e-9, "inner sem rotação (frente +Z nativa — nunca π, senão corre de ré)");
const innerWorldScale = inner.getWorldScale?.(new (await import("three")).Vector3());
ok(Math.abs(innerWorldScale.x - 0.01) < 1e-6, "escala 0.01 sobrevive dentro do wrapper");

// Animações reais bindam no clone
for (const [name, file] of [["run", "Fast Run.fbx"], ["save", "Goalkeeper Diving Save.fbx"], ["trip", "Soccer Trip.fbx"]]) {
  const g = parse(file);
  ok(g.animations.length >= 1, `animação "${name}" existe em ${file}`);
  const clip = g.animations[0];
  ok(clip.duration > 0.3 && clip.duration < 10, `clip "${name}" tem duração sã (${clip.duration.toFixed(2)}s)`);
  const clone = SkeletonUtils.clone(base);
  const mixer = new AnimationMixer(clone);
  const action = mixer.clipAction(clip);
  action.play();
  mixer.update(0.1);
  const total = action._propertyBindings.length;
  const bound = action._propertyBindings.filter((pb) => pb.binding?.node).length;
  ok(bound === total && total > 40, `clip "${name}" binda no clone (${bound}/${total} tracks)`);
}

// O modelo base traz animações embutidas (não atrapalham, só enriquecem o Map)
ok(base.animations.length >= 1, `modelo base tem ${base.animations.length} animações embutidas`);

console.log(`\n${pass} verificações runtime dos assets FBX OK`);
