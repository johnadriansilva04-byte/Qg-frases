import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Renders the Ch49 FBX character statically in the center of the screen.
 * Uses raw Three.js with FBXLoader (same pattern as playerModelCache).
 */
export function Character3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera — front-facing, slightly elevated
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 200);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0.8, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;
    el.appendChild(renderer.domElement);

    // Lighting — subtle blue-tinted to match the page
    const ambient = new THREE.AmbientLight(0x8899cc, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 4, 3);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x6677aa, 0.5);
    fill.position.set(-2, 2, -1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x4488cc, 0.4);
    rim.position.set(0, 1, -3);
    scene.add(rim);

    // Load FBX model
    let disposed = false;
    let mixer: THREE.AnimationMixer | null = null;

    async function loadModel() {
      try {
        const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
        if (disposed) return;

        const loader = new FBXLoader();
        const group = await loader.loadAsync("/Ch49_nonPBR.fbx");
        if (disposed) {
          group.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry?.dispose();
              if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
              else o.material?.dispose();
            }
          });
          return;
        }

        // Normalize scale (FBX models are typically in cm)
        group.scale.set(0.008, 0.008, 0.008);

        // Center horizontally
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.x = -center.x * 0.008;
        group.position.z = -center.z * 0.008;

        // Place feet on ground
        const minY = box.min.y * 0.008;
        group.position.y = -minY;

        // Face camera
        group.rotation.y = Math.PI;

        scene.add(group);

        // Set up animation mixer if model has animations
        if (group.animations && group.animations.length > 0) {
          mixer = new THREE.AnimationMixer(group);
          const idleClip = group.animations.find(
            (c) => c.name.toLowerCase().includes("idle")
          ) ?? group.animations[0];
          if (idleClip) {
            const action = mixer.clipAction(idleClip);
            action.play();
          }
        }

        console.log(
          `[Character3D] Modelo carregado: ${group.children.length} children, ` +
          `${group.animations?.length ?? 0} animações`
        );
      } catch (err) {
        console.error("[Character3D] Erro ao carregar modelo:", err);
      }
    }

    loadModel();

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      renderer.render(scene, camera);
    }
    rafRef.current = requestAnimationFrame(animate);

    // Resize handler
    function onResize() {
      if (!el) return;
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
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
    <div
      ref={containerRef}
      className="w-full h-full pointer-events-none"
      style={{ minHeight: 200 }}
    />
  );
}
