import * as THREE from 'three';

// What makes a Meshy character look as it does in Meshy's own viewer, in the office's scene: its own
// texture on a physical material (not the toon bands and the black outline the rest of the world has),
// soft light from the sky (scene.environment, dimmed at night by world/sky.ts), a little sheen on cloth and
// fur so the light catches its edges, and the texture sharp from the side.

const done = new WeakSet<THREE.Material>();

/** Puts `root`'s materials in that look. Safe to call twice on the same model. */
export function polishCharacter(root: THREE.Object3D, renderer?: THREE.WebGLRenderer) {
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    // Skinned and big: never culled by a stale bounding box.
    m.frustumCulled = false;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (done.has(mat)) continue;
      done.add(mat);
      mat.userData.outlineParameters = { visible: false };
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) {
        std.map.anisotropy = aniso;
        std.map.colorSpace = THREE.SRGBColorSpace;
      }
      if ('roughness' in std) {
        // Meshy's own (unlit) textures come with a flat roughness of 1: a little less, so the sky shows in it.
        std.roughness = Math.min(std.roughness, 0.62);
        std.metalness = Math.min(std.metalness, 0.12);
        std.envMapIntensity = 1.6;
      }
      const phys = mat as THREE.MeshPhysicalMaterial;
      if ('sheen' in phys) {
        phys.sheen = 0.6;
        phys.sheenRoughness = 0.5;
        phys.sheenColor = new THREE.Color('#ffffff');
      }
      mat.needsUpdate = true;
    }
  });
}

/** A material as a MeshPhysicalMaterial, so it can have a sheen: copies a standard one over (the texture is shared). */
export function toPhysical(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const swap = (mat: THREE.Material): THREE.Material => {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial || (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return mat;
      // (not Material.copy: a physical one's copy reads fields a standard material doesn't have)
      const p = new THREE.MeshPhysicalMaterial({
        name: std.name,
        map: std.map,
        color: std.color,
        roughness: std.roughness,
        metalness: std.metalness,
        normalMap: std.normalMap,
        roughnessMap: std.roughnessMap,
        metalnessMap: std.metalnessMap,
        aoMap: std.aoMap,
        emissive: std.emissive,
        emissiveMap: std.emissiveMap,
        transparent: std.transparent,
        opacity: std.opacity,
        alphaTest: std.alphaTest,
        side: std.side,
      });
      return p;
    };
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
}
