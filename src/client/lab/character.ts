// The character lab, for checking our own characters by eye (Vite dev only, it isn't built:
// http://localhost:5173/lab/character.html). A plain Claude worker for scale, then the character
// (`?model=aslan`, the default) worn by a worker standing, walking and sat on a bench-high seat, as
// the office draws them (world/character/animal.ts). `t=<seconds>` steps to t and draws one frame,
// for screenshots. Once it has drawn, window.__ready says how tall each one stands.

import * as THREE from 'three';
import { AnimalSkin } from '../world/character/animal';
import { Worker } from '../world/character';
import { loadModel, type ModelName } from '../world/models';
import { stage } from './stage';

const q = new URLSearchParams(location.search);
const name = (q.get('model') ?? 'aslan') as ModelName;
const stepTo = q.has('t') ? Number(q.get('t')) : null;
const { effect, scene, camera } = stage(document.getElementById('c') as HTMLCanvasElement);
camera.position.set(0.6, 1.6, 5.2);
camera.lookAt(0.6, 0.6, 0);

/** A bench-high seat, as the street's tables have (BENCH_TOP 0.45, the worker 0.08 below its top). */
const SEAT = 0.37;
const plain = new Worker('Claude', '#e07a5f');
plain.root.position.set(-1.8, 0, 0);
scene.add(plain.root);
const acts = [
  { label: 'idle', x: -0.4, walking: false, seated: false },
  { label: 'walk', x: 1.0, walking: true, seated: false },
  { label: 'sit', x: 2.4, walking: false, seated: true },
] as const;
const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, SEAT, 0.5), new THREE.MeshToonMaterial({ color: '#5a6170' }));
seat.position.set(2.4, SEAT / 2, -0.15);
scene.add(seat);

void loadModel(name).then(async () => {
  const skins = await Promise.all(
    acts.map(async (a) => {
      const w = new Worker(a.label, '#3d5a80');
      w.root.position.set(a.x, a.seated ? SEAT : 0, 0);
      w.walking = a.walking;
      scene.add(w.root);
      const skin = new AnimalSkin(w, await loadModel(name), () => a.seated);
      return { a, w, skin };
    }),
  );
  (window as unknown as { __skins: unknown }).__skins = skins;
  const clock = new THREE.Clock();
  const tick = (dt: number, t: number) => {
    plain.update(dt, t);
    for (const s of skins) {
      s.w.update(dt, t);
      s.skin.update(dt);
    }
  };
  const report = () => {
    const out: Record<string, number> = {};
    for (const s of skins) {
      s.skin.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(s.skin.root, true);
      out[s.a.label] = +(box.max.y - box.min.y).toFixed(2);
      out[`${s.a.label}_feet`] = +box.min.y.toFixed(2);
    }
    (window as unknown as { __ready: unknown }).__ready = out;
  };
  if (stepTo !== null) {
    for (let t = 0; t < stepTo; t += 1 / 60) tick(1 / 60, t);
    effect.render(scene, camera);
    report();
    return;
  }
  const frame = () => {
    tick(Math.min(0.1, clock.getDelta()), clock.elapsedTime);
    effect.render(scene, camera);
    requestAnimationFrame(frame);
  };
  frame();
  report();
});
