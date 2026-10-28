import * as THREE from 'three';
import type { Model } from '../models';
import type { Worker } from './worker';

// A worker dressed as one of our own characters (the lion lead and the rest, F4): its little Claude
// body is put away and the character stands in for it, sitting at the desk, walking when it walks and
// idling when it stands, from the clips its model came with (`idle`, `walk`, `sit`). The worker's name
// tag, bubble and globe stay as they are, over the character's head.

/** How tall the characters stand (m): the worker's height, so they sit at the desks the same way. */
export const ANIMAL_HEIGHT = 1.15;
/** How far the little worker's feet are above its root, which the office stands its root that far under the floor for (court.ts's FEET): the character's feet go there too. */
const FEET = 0.07;
/** How long one clip takes to blend into the next (s). */
const BLEND = 0.25;

export type AnimalClip = 'idle' | 'walk' | 'sit';

/** Which clip a worker should be playing: walking, sat at its desk (its root is in a seat), or standing about. */
export function clipFor(walking: boolean, seated: boolean): AnimalClip {
  return walking ? 'walk' : seated ? 'sit' : 'idle';
}

export class AnimalSkin {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<AnimalClip, THREE.AnimationAction>();
  private playing: AnimalClip | null = null;
  private readonly tmp = new THREE.Vector3();

  constructor(
    private worker: Worker,
    model: Model,
    /** Whether the worker's root is in its seat right now (the views know: it's parented to the desk's seat). */
    private seated: () => boolean,
  ) {
    const body = model.scene;
    // Stood on the floor at its origin, as tall as a worker. Measured as it's drawn, skinned on its
    // bones: a rig can be in other units than its mesh (Meshy's armature is in centimeters).
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body, true);
    const h = box.max.y - box.min.y || 1;
    body.scale.setScalar(ANIMAL_HEIGHT / h);
    body.position.y = -box.min.y * (ANIMAL_HEIGHT / h);
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = m.receiveShadow = true;
    });
    this.root.add(body);
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of model.clips) {
      const name = clip.name.toLowerCase();
      const key: AnimalClip | undefined = name.includes('walk') ? 'walk' : name.includes('sit') ? 'sit' : name.includes('idle') ? 'idle' : undefined;
      if (key && !this.actions.has(key)) this.actions.set(key, this.mixer.clipAction(clip));
    }
    // Its own body put away (it's the first thing on its root): the character is the worker now.
    worker.root.children[0].visible = false;
    worker.root.add(this.root);
  }

  update(dt: number) {
    const want = clipFor(this.worker.walking, this.seated());
    const next = this.actions.has(want) ? want : this.actions.has('idle') ? 'idle' : null;
    if (next && next !== this.playing) {
      const to = this.actions.get(next)!;
      const from = this.playing ? this.actions.get(this.playing) : undefined;
      to.reset().play();
      if (from) to.crossFadeFrom(from, BLEND, false);
      this.playing = next;
    }
    // Sat down, the seat is under its hips: down to the floor so its feet are on it. On its feet, up
    // to where the little worker's feet would be.
    this.root.position.y = this.playing === 'sit' ? -this.worker.root.getWorldPosition(this.tmp).y / Math.max(0.01, this.worker.root.getWorldScale(this.tmp).y) : FEET;
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.worker.root.children[0].visible = true;
  }
}
