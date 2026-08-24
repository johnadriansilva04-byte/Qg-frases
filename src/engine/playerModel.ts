import * as THREE from "three";

export interface PlayerRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  marker?: THREE.Mesh | undefined;
}

const skinMat = new THREE.MeshLambertMaterial({ color: 0xc98b62 });

/** Cheap low-poly footballer (~10 triangles worth of boxes) with a leg rig. */
export function createPlayerRig(
  primary: string,
  secondary: string,
  isControlled: boolean,
  isKeeper: boolean
): PlayerRig {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: new THREE.Color(isKeeper ? "#f5c542" : primary) });
  const shorts = new THREE.MeshLambertMaterial({ color: new THREE.Color(isKeeper ? "#1b1b1b" : secondary) });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirt);
  torso.position.y = 1.15;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), skinMat);
  head.position.y = 1.66;
  group.add(head);

  const legGeo = new THREE.BoxGeometry(0.18, 0.78, 0.2);
  legGeo.translate(0, -0.39, 0);
  const legL = new THREE.Mesh(legGeo, shorts);
  legL.position.set(-0.14, 0.8, 0);
  const legR = new THREE.Mesh(legGeo, shorts);
  legR.position.set(0.14, 0.8, 0);
  group.add(legL, legR);

  const armGeo = new THREE.BoxGeometry(0.13, 0.6, 0.15);
  armGeo.translate(0, -0.3, 0);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.34, 1.45, 0);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.34, 1.45, 0);
  group.add(armL, armR);

  let marker: THREE.Mesh | undefined;
  if (isControlled) {
    marker = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 20),
      new THREE.MeshBasicMaterial({ color: 0x37ffd1, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.05;
    group.add(marker);
  }

  return { group, torso, legL, legR, armL, armR, marker };
}

export function createBallMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 })
  );
  return mesh;
}
