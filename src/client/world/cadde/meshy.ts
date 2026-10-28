import * as THREE from 'three';
import { loadModel } from '../models';

// The street's own furniture and things, made with Meshy (blender/scripts/build_meshy_props.py packs them
// into models/meshy-props.glb): a tree in its bed, a lamp, a bench, a café table under its parasol, the
// counter, the coffee machine, planters, and the office furniture. Each is a root of its own, named by its
// key, on the floor at the origin, sized in meters, its front toward +z. What's built in code stands in
// until a model arrives (and for good if it won't load), then `meshy` swaps it for the model.

/** What's in the pack: a contract with the Blender script and tests/meshy-props.test.ts. */
export const MESHY_KEYS = [
  'agac',
  'lamba',
  'bank',
  'kafe-masasi',
  'kahve-tezgahi',
  'kahve-makinesi',
  'saksi',
  'ofis-masa',
  'cicek-saksi',
  'ofis-sandalye',
  'yonetici-masa',
  'yonetici-koltuk',
  'kanepe',
  'kitaplik',
  'fikus',
  'toplanti-sandalye',
] as const;
export type MeshyKey = (typeof MESHY_KEYS)[number];

let pack: Promise<THREE.Object3D | null> | null = null;
const toons = new Map<THREE.Material, THREE.Material>();

function root(): Promise<THREE.Object3D | null> {
  pack ??= loadModel('meshy-props')
    .then((m) => m.scene)
    .catch(() => {
      console.warn("cadde: meshy-props didn't load");
      return null;
    });
  return pack;
}

/**
 * The look of a piece's own material: its texture (with the occlusion baked into it) on a physical material, so it's
 * lit softly and takes a little shine from the sky rather than the street's toon bands, and with no outline.
 */
function lookOf(m: THREE.Material): THREE.Material {
  let t = toons.get(m);
  if (!t) {
    const src = m as THREE.MeshStandardMaterial;
    t = new THREE.MeshStandardMaterial({ map: src.map ?? null, color: src.color ?? new THREE.Color('#ffffff'), roughness: 0.72, metalness: 0.04 });
    t.userData.outlineParameters = { visible: false };
    toons.set(m, t);
  }
  return t;
}

export interface MeshyOptions {
  /** Times its size in the pack. */
  scale?: number;
  /** Turned (radians) from its front toward +z. */
  turn?: number;
  /** Raised off the floor of `parent`. */
  y?: number;
  /** What stood in for it: removed from its parent once the model is there. */
  replaces?: THREE.Object3D[];
}

/** Puts `key` into `parent` once the pack is loaded; with `replaces`, in place of those. Returns the group it'll be in. */
export function meshy(parent: THREE.Object3D, key: MeshyKey, o: MeshyOptions = {}): THREE.Group {
  const g = new THREE.Group();
  g.scale.setScalar(o.scale ?? 1);
  g.rotation.y = o.turn ?? 0;
  g.position.y = o.y ?? 0;
  parent.add(g);
  void root().then((r) => {
    const src = r?.getObjectByName(key);
    if (!src) return;
    const copy = src.clone();
    copy.position.set(0, 0, 0);
    copy.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(lookOf) : lookOf(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
      // Its geometry and materials are every copy's: the street's dispose leaves them be.
      mesh.userData.shared = true;
    });
    g.add(copy);
    for (const old of o.replaces ?? []) old.removeFromParent();
  });
  return g;
}
