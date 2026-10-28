import * as THREE from 'three';
import type { Model } from '../models';
import type { Worker } from './worker';

// A worker dressed as one of our own characters (the lion lead and the rest, F4): its little Claude
// body is put away and the character stands in for it, sitting at the desk, walking when it walks and
// idling when it stands, from the clips its model came with (`idle`, `walk`, `sit`). The worker's name
// tag, bubble and globe stay as they are, over the character's head.

/** How tall the characters stand (m), whatever the seat or hall scales the little workers to: the lead a little taller than you (1.7 m), as Mahmut asked. */
export const ANIMAL_HEIGHT = 1.85;
/** How far the little worker's feet are above its root, which the office stands its root that far under the floor for (court.ts's FEET): the character's feet go there too. */
const FEET = 0.07;
/** How far over the seat's anchor (the little worker's hips) the character's hips go when it sits: on the seat's top. */
const SEAT_UP = 0.1;
/** How tall it is sat down, of its height standing; and how far over its head its name tag goes (m). */
const SITTING = 0.8;
const TAG_GAP = 0.2;
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
  /** Its hips' bone, which sitting puts on the seat. */
  private hips: THREE.Object3D | undefined;

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
    body.traverse((o) => {
      if (!this.hips && /hips/i.test(o.name) && (o as THREE.Bone).isBone) this.hips = o;
    });
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
    this.mixer.update(dt);
    // Its own size wherever it is: the little workers are drawn smaller sat at a desk (a seat's scale),
    // the character isn't.
    const scale = Math.max(0.01, this.worker.root.getWorldScale(this.tmp).y);
    this.root.scale.setScalar(1 / scale);
    if (this.playing === 'sit' && this.hips) {
      // Its hips on the seat: the clip's hips are wherever its chair was, so it's moved up or down to
      // put them on this one (the seat's anchor is where the little worker's hips go, just under its top).
      this.root.position.y = 0;
      this.root.updateMatrixWorld(true);
      const seat = this.worker.root.getWorldPosition(this.tmp).y + SEAT_UP;
      const hips = this.hips.getWorldPosition(this.tmp).y;
      this.root.position.y = (seat - hips) / scale;
    } else {
      // On its feet, down where the little worker's feet would be.
      this.root.position.y = FEET;
    }
    // Its name tag and bubble (the worker's sprites, which it places for its own height each frame) up
    // over the character's head: everything moved up by as much as the lowest one is under it.
    const sat = this.playing === 'sit';
    const floor = this.worker.root.getWorldPosition(this.tmp).y;
    const top = sat ? (ANIMAL_HEIGHT * SITTING - floor) / scale : FEET + ANIMAL_HEIGHT / scale;
    const tags = this.worker.root.children.filter((c): c is THREE.Sprite => (c as THREE.Sprite).isSprite && c.visible);
    const lift = Math.max(0, top + TAG_GAP / scale - Math.min(...tags.map((c) => c.position.y)));
    if (tags.length && lift > 0) for (const c of tags) c.position.y += lift;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.worker.root.children[0].visible = true;
  }
}
