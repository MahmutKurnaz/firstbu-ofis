import * as THREE from 'three';
import { Person } from '../character';
import { NpcSkin } from '../character/npc';
import { loadModel, type ModelName } from '../models';
import { lit } from '../station/kit';
import { mesh } from '../toon';
import type { CaddeKit } from './kit';

// The street's own life: people strolling up and down its southern end (just for show: they're no
// one's workers, and walk through nothing), and steam off the coffee on the café's counter.

/** Where people stroll: back and forth between two points, clear of the meeting table, the benches, the trees and the planters. */
export const LANES: { a: [number, number]; b: [number, number] }[] = [
  { a: [-5.2, 17.5], b: [-5.2, 28] },
  { a: [5.2, 28], b: [5.2, 17.5] },
  { a: [-5.5, 33.6], b: [5.5, 33.6] },
];
/** How fast they stroll (m/s). */
const STROLL = 1.1;

/** Where someone strolling down `lane` is at `t` seconds, and which way they're facing: there and back, over and over. */
export function strollAt(lane: number, t: number): { x: number; z: number; heading: number } {
  const { a, b } = LANES[lane % LANES.length];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const along = (t * STROLL) % (len * 2);
  const back = along > len;
  const k = back ? (len * 2 - along) / len : along / len;
  const [from, to] = back ? [b, a] : [a, b];
  return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, heading: Math.atan2(to[0] - from[0], to[1] - from[1]) };
}

/** Who strolls where: the guide up one side, the courier hurrying down the other (his feet at twice the stroll), the florist across the south. */
const WALKERS: { color: string; look: { skin: number; hair: number; style: number }; lane: number; offset: number; npc: ModelName; height: number; speed: number }[] = [
  { color: '#e76f51', look: { skin: 1, hair: 4, style: 3 }, lane: 0, offset: 0, npc: 'npc-rehber', height: 1.9, speed: 1 },
  { color: '#457b9d', look: { skin: 3, hair: 1, style: 1 }, lane: 1, offset: 6, npc: 'npc-kurye', height: 1.8, speed: 2.2 },
  { color: '#2a9d8f', look: { skin: 2, hair: 2, style: 5 }, lane: 2, offset: 3, npc: 'npc-cicekci', height: 1.2, speed: 0.8 },
];

/** Puts up the passers-by and the steam; returns what moves them each frame, and what frees the steam. */
export function streetLife(kit: CaddeKit): { update(t: number, dt: number): void; dispose(): void } {
  const people = WALKERS.map((w) => {
    const p = new Person('', w.color, w.look);
    kit.group.add(p.root);
    // The little person stands in until its character arrives (and for good if it won't load).
    const entry = { p, skin: null as NpcSkin | null, ...w };
    loadModel(w.npc)
      .then((m) => {
        entry.skin = new NpcSkin(p.root, m, w.height, true);
      })
      .catch(() => console.warn(`cadde: ${w.npc} didn't load`));
    return entry;
  });
  // Steam off the cups on the counter: puffs that rise, swell and fade, over and over.
  const counter = kit.plan.config?.props?.find((q) => q.kind === 'counter');
  const puffs: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; x: number; y: number; z: number; phase: number }[] = [];
  if (counter) {
    const r = counter.rotY ?? 0;
    const w = (counter.width ?? 4) * (counter.scale ?? 1);
    for (let cup = 0; cup < 3; cup++) {
      const across = -w / 2 + 0.6 + cup * 0.25;
      const x = counter.x + Math.cos(r) * across + Math.sin(r) * 0.1;
      const z = counter.z - Math.sin(r) * across + Math.cos(r) * 0.1;
      for (let k = 0; k < 3; k++) {
        const mat = lit('#ffffff', { opacity: 0 });
        const m = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat, x, 1.2, z, false);
        kit.group.add(m);
        puffs.push({ m, mat, x, y: 1.2, z, phase: k / 3 + cup * 0.17 });
      }
    }
  }
  const update = (t: number, dt: number) => {
    for (const w of people) {
      const s = strollAt(w.lane, (t + w.offset) * w.speed);
      w.p.root.position.set(s.x, 0, s.z);
      w.p.root.rotation.y = s.heading;
      w.p.update(dt, t, true, false);
      w.skin?.update(dt, true, w.speed * (STROLL / 1.4));
    }
    for (const f of puffs) {
      const k = (t * 0.35 + f.phase) % 1;
      f.m.position.set(f.x + Math.sin(t + f.phase * 6) * 0.04, f.y + k * 0.55, f.z);
      f.m.scale.setScalar(0.6 + k * 1.6);
      f.mat.opacity = 0.35 * Math.sin(k * Math.PI);
    }
  };
  return { update, dispose: () => puffs.forEach((f) => f.mat.dispose()) };
}
