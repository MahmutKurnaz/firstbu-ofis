import * as THREE from 'three';
import { loadModel } from '../models';
import { glow, type CaddeKit } from './kit';

// The nearer row of the city: our own buildings (blender/scripts/build_buildings.py, models/sehir-binalari.glb),
// modelled to real size, in place of the KayKit boxes. Their glass (`win`) is lit at night like the offices'.

/** Where a building stands, and how big it is next to its modelled size (the shell gives 1.5-1.9, for the old boxes). */
export interface Spot {
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

const KEYS = 'ABCDEFGH';
let pack: Promise<THREE.Object3D | null> | null = null;

function root(): Promise<THREE.Object3D | null> {
  pack ??= loadModel('sehir-binalari')
    .then((m) => m.scene)
    .catch(() => {
      console.warn("cadde: sehir-binalari didn't load");
      pack = null;
      return null;
    });
  return pack;
}

/** Puts the spots' buildings up, each a type by its place in the row, a little taller or shorter by its scale. */
export function skylineOwn(kit: CaddeKit, spots: Spot[]) {
  const matte = new Map<THREE.Material, THREE.Material>();
  const glass = glow(kit, '#ffd89a', 0.12, 1);
  glass.color.set('#8fb8d4');
  const look = (m: THREE.Material): THREE.Material => {
    if (m.name === 'win') return glass;
    let t = matte.get(m);
    if (!t) {
      const src = m as THREE.MeshStandardMaterial;
      // (a little darker: the street's bright light and fog wash a pale wall to white)
      t = new THREE.MeshStandardMaterial({ color: src.color.clone().multiplyScalar(0.7), roughness: 0.95, metalness: 0, envMapIntensity: 0.3 });
      t.userData.outlineParameters = { visible: false };
      matte.set(m, t);
    }
    return t;
  };
  void root().then((r) => {
    if (!r) return;
    spots.forEach((s, i) => {
      const src = r.getObjectByName(`building_${KEYS[i % KEYS.length]}`);
      if (!src) return;
      const copy = src.clone();
      copy.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(look) : look(mesh.material);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData.shared = true;
      });
      const holder = new THREE.Group();
      holder.position.set(s.x, 0, s.z);
      holder.rotation.y = s.rotY;
      // 1.5-1.9 in the shell: from 0.9 to 1.2 times, so no two in a row are alike.
      holder.scale.set(1, 0.9 + (s.scale - 1.5) * 0.75, 1);
      holder.add(copy);
      kit.group.add(holder);
    });
  });
}
