import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Renders the Ch49 FBX character statically in the center of the screen.
 * Uses fetch + FBXLoader.parse() for reliable loading of large files.
 * Falls back to Ch38 if Ch49 fails.
 */
export function Character3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState("init");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    console.log("[Character3D] Montando cena...", { w, h });

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 200);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x8899cc, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 4, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6677aa, 0.5);
    fill.position.set(-2, 2, -1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x4488cc, 0.4);
    rim.position.set(0, 1, -3);
    scene.add(rim);

    let disposed = false;
    let mixer: THREE.AnimationMixer | null = null;

    async function loadModel() {
      console.log("[Character3D] Iniciando loadModel...");
      try {
        setStatus("importing");
        const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
        console.log("[Character3D] FBXLoader importado OK");
        if (disposed) return;

        // Try models in order: Ch49 first, then Ch38 as fallback
        const models = ["/Ch49_nonPBR.fbx", "/Ch38_nonPBR.fbx"];
        let group: THREE.Group | null = null;

        for (const modelPath of models) {
          if (disposed) return;
          console.log(`[Character3D] Tentando ${modelPath}...`);
          setStatus(`fetching ${modelPath.split("/").pop()}`);
          try {
            const response = await fetch(modelPath);
            if (!response.ok) {
              console.warn(`[Character3D] HTTP ${response.status} para ${modelPath}`);
              continue;
            }
            const buf = await response.arrayBuffer();
            console.log(`[Character3D] Download OK: ${modelPath} (${buf.byteLength} bytes)`);
            if (disposed) return;

            setStatus("parsing");
            const loader = new FBXLoader();
            group = loader.parse(buf, "");
            console.log(`[Character3D] Parse OK:`, { children: group.children.length, anims: group.animations?.length ?? 0 });
            break;
          } catch (err) {
            console.warn(`[Character3D] Falha em ${modelPath}:`, err instanceof Error ? err.message : err);
            continue;
          }
        }

        if (!group || disposed) {
          setStatus("error: nenhum modelo carregado");
          return;
        }

        setStatus("processing");

        // Normalize scale
        group.scale.set(0.008, 0.008, 0.008);

        // Center + ground
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.x = -center.x * 0.008;
        group.position.z = -center.z * 0.008;
        group.position.y = -box.min.y * 0.008;

        console.log("[Character3D] Posição:", {
          center: [center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1)],
          minY: (box.min.y * 0.008).toFixed(3),
        });

        group.rotation.y = Math.PI;
        scene.add(group);

        if (group.animations?.length) {
          mixer = new THREE.AnimationMixer(group);
          const clip = group.animations.find(c => c.name.toLowerCase().includes("idle")) ?? group.animations[0];
          if (clip) {
            mixer.clipAction(clip).play();
            console.log("[Character3D] Idle anim reproduzida");
          }
        }

        setStatus("ready");
        console.log("[Character3D] ✓ Modelo pronto");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`error: ${msg}`);
        console.error("[Character3D] ✗ ERRO:", err);
      }
    }

    loadModel();

    console.log("[Character3D] Iniciando render loop");
    const clock = new THREE.Clock();
    let frames = 0;
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      renderer.render(scene, camera);
      frames++;
      if (frames === 1) console.log("[Character3D] Primeiro frame OK");
    }
    rafRef.current = requestAnimationFrame(animate);

    function onResize() {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
    };
  }, []);

  return (
    <div className="relative w-full h-full pointer-events-none" style={{ minHeight: 200 }}>
      <div ref={containerRef} className="w-full h-full" />
      {status.startsWith("error") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[8px] text-red-400/60 text-center px-2">{status}</p>
        </div>
      )}
      {status !== "ready" && !status.startsWith("error") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
