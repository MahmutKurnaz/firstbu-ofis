import * as THREE from 'three';
import type { CaddeKit } from './kit';

// Specks of dust and pollen drifting in the light over the café's square and the street: a few hundred
// soft points that float up and sideways, fade in and out and start over, so the air isn't empty.

const COUNT = 220;

/** Puts the specks up; returns what moves them each frame (`day` is 0 at night, 1 at noon: by night they fade) and what frees them. */
export function streetDust(kit: CaddeKit): { update(t: number, day: number): void; dispose(): void } {
  const b = kit.plan.bounds;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    seed[i * 3] = Math.random();
    seed[i * 3 + 1] = Math.random();
    seed[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: '#fff2d0', size: 0.07, transparent: true, opacity: 0.45, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  kit.group.add(points);
  const w = Math.min(14, b.maxX - b.minX);
  const l = Math.min(34, b.maxZ - b.minZ);
  return {
    update(t, day) {
      for (let i = 0; i < COUNT; i++) {
        const a = seed[i * 3];
        const c = seed[i * 3 + 1];
        const d = seed[i * 3 + 2];
        const life = (t * 0.03 + d) % 1;
        pos[i * 3] = (a - 0.5) * w + Math.sin(t * 0.3 + c * 20) * 0.6;
        pos[i * 3 + 1] = 0.3 + life * 4.2;
        pos[i * 3 + 2] = (c - 0.5) * l + Math.cos(t * 0.25 + a * 20) * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.12 + 0.4 * day;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
