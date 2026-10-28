import * as THREE from 'three';
import type { Model } from '../models';
import { polishCharacter, toPhysical } from './polish';
import { glance, look, reach, straighten } from './animal-pose';
import type { Worker } from './worker';

// A worker dressed as one of our own characters (the lion lead and the rest, F4): its little Claude
// body is put away and the character stands in for it, sitting at the desk, walking when it walks and
// idling when it stands, from the clips its model came with (`idle`, `walk`, `sit`). The worker's name
// tag, bubble and globe stay as they are, over the character's head.

/** How tall the characters stand (m), whatever the seat or hall scales the little workers to: the lead a little taller than you (1.7 m), as Mahmut asked. */
/** The lead lion's height, and what a character without one of its own stands at (m). */
export const ANIMAL_HEIGHT = 1.85;
/** How far the little worker's feet are above its root, which the office stands its root that far under the floor for (court.ts's FEET): the character's feet go there too. */
const FEET = 0.07;
/** How far over the seat's anchor (the little worker's hips) the lion's hips go when it sits: on the seat's top. Smaller and taller characters have their hips lower and higher by their height. */
const SEAT_UP = 0.24;
/** How far toward its table it sits (m), so its hands reach the keyboard. */
const SIT_FORWARD = 0.1;
/** Where its hands go on the keyboard while it works, from its seat's anchor (m): out to each side, up (over the floor: the desk's 0.76 m and the laptop's thickness), and forward (a 16 inch laptop's keys). */
const KEYS = { side: 0.1, up: 0.785, forward: 0.72 };
/** How tall it is sat down, of its height standing; and how far over its head its name tag goes (m). */
const SITTING = 0.92;
const TAG_GAP = 0.2;
/** How long one clip takes to blend into the next (s). */
const BLEND = 0.25;

export type AnimalClip = 'idle' | 'walk' | 'sit' | 'drink' | 'skill';
/** How often it stops for a sip of coffee, sat at its desk (s): somewhere between these. */
const SIP_EVERY: [number, number] = [25, 45];

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
  /** Shoulder to hand, each side; and its head. */
  private arms: THREE.Object3D[][] = [];
  private head: THREE.Object3D | undefined;
  private spine: THREE.Object3D | undefined;
  private neck: THREE.Object3D | undefined;
  private readonly ahead = new THREE.Vector3();
  private t = Math.random() * 10;
  /** When its next sip of coffee is due (its own clock, see t), and when the one it's having is over. */
  private nextSip = SIP_EVERY[0] * Math.random();
  private sipping = 0;
  /** When its next gesture is due, and until when the one it's making lasts. */
  private nextSkill = 6 + Math.random() * 12;
  private skilling = 0;
  /** The cup in its right hand while it drinks. */
  private cup: THREE.Group | null = null;
  private readonly key = new THREE.Vector3();

  constructor(
    private worker: Worker,
    model: Model,
    /** Whether the worker's root is in its seat right now (the views know: it's parented to the desk's seat). */
    private seated: () => boolean,
    /** How tall it stands (m): each character its own, from docs/karakterler.md. */
    private readonly height = ANIMAL_HEIGHT,
  ) {
    const body = model.scene;
    // Stood on the floor at its origin, as tall as a worker. Measured as it's drawn, skinned on its
    // bones: a rig can be in other units than its mesh (Meshy's armature is in centimeters).
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body, true);
    const h = box.max.y - box.min.y || 1;
    body.scale.setScalar(this.height / h);
    body.position.y = -box.min.y * (this.height / h);
    toPhysical(body);
    polishCharacter(body);
    this.root.add(body);
    body.traverse((o) => {
      if (!this.hips && /hips/i.test(o.name) && (o as THREE.Bone).isBone) this.hips = o;
      if (o.name === 'Head' && (o as THREE.Bone).isBone) this.head = o;
      if (o.name === 'Spine02' && (o as THREE.Bone).isBone) this.spine = o;
      if (o.name === 'neck' && (o as THREE.Bone).isBone) this.neck = o;
    });
    for (const side of ['Left', 'Right']) {
      const chain = ['Arm', 'ForeArm', 'Hand'].map((b) => body.getObjectByName(side + b));
      if (chain.every(Boolean)) this.arms.push(chain as THREE.Object3D[]);
    }
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of model.clips) {
      const name = clip.name.toLowerCase();
      const key: AnimalClip | undefined = name.includes('drink') ? 'drink' : name.includes('skill') ? 'skill' : name.includes('walk') ? 'walk' : name.includes('sit') ? 'sit' : name.includes('idle') ? 'idle' : undefined;
      if (key && !this.actions.has(key)) this.actions.set(key, this.mixer.clipAction(clip));
    }
    const gesture = this.actions.get('skill');
    if (gesture) {
      gesture.setLoop(THREE.LoopOnce, 1);
      gesture.clampWhenFinished = true;
    }
    // A sip is played once through, then it's back to work, a cup in its hand meanwhile.
    const sip = this.actions.get('drink');
    const hand = body.getObjectByName('RightHand');
    if (sip) {
      sip.setLoop(THREE.LoopOnce, 1);
      sip.clampWhenFinished = true;
    }
    if (sip && hand) {
      this.cup = new THREE.Group();
      const white = new THREE.MeshToonMaterial({ color: '#f4f1ea' });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.1, 14), white);
      const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: '#5b3a24' }));
      coffee.position.y = 0.045;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), white);
      handle.position.x = 0.05;
      this.cup.add(cup, coffee, handle);
      this.cup.position.set(0, 0.06, 0.04);
      this.cup.visible = false;
      hand.add(this.cup);
    }
    // Its own body put away (it's the first thing on its root): the character is the worker now.
    worker.root.children[0].visible = false;
    worker.root.add(this.root);
  }

  update(dt: number) {
    this.t += dt;
    let want: AnimalClip = clipFor(this.worker.walking, this.seated());
    // Sat at its desk, now and then a sip of coffee.
    const sip = this.actions.get('drink');
    if (want === 'sit' && sip) {
      if (this.sipping > this.t) want = 'drink';
      else if (this.t >= this.nextSip) {
        this.sipping = this.t + sip.getClip().duration;
        this.nextSip = this.sipping + SIP_EVERY[0] + Math.random() * (SIP_EVERY[1] - SIP_EVERY[0]);
        want = 'drink';
      }
    } else this.sipping = 0;
    // On its feet and waiting: now and then its own gesture (the role's skill clip), once through.
    const skill = this.actions.get('skill');
    if (skill && want === 'idle') {
      if (this.skilling > this.t) want = 'skill';
      else if (this.t >= this.nextSkill) {
        this.skilling = this.t + skill.getClip().duration;
        this.nextSkill = this.skilling + 10 + Math.random() * 14;
        skill.reset();
        want = 'skill';
      }
    }
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
    const sat = this.playing === 'sit' || this.playing === 'drink';
    if (sat && this.hips) {
      // Its hips on the seat: the clip's hips are wherever its chair was, so it's moved up or down to
      // put them on this one (the seat's anchor is where the little worker's hips go, just under its top).
      this.root.position.y = 0;
      this.root.updateMatrixWorld(true);
      const seat = this.worker.root.getWorldPosition(this.tmp).y + SEAT_UP * (this.height / ANIMAL_HEIGHT);
      const hips = this.hips.getWorldPosition(this.tmp).y;
      this.root.position.y = (seat - hips) / scale;
      this.root.position.z = SIT_FORWARD / scale;
      this.root.updateMatrixWorld(true);
      // The clip sits hunched over its knees, which at a desk would put that big head on the table: up straight.
      if (this.spine && this.neck) straighten(this.spine, this.neck, this.ahead.set(0, 0, 1).transformDirection(this.worker.root.matrixWorld));
      // At work: hands on the keyboard, tapping away, eyes on the screen but for a glance now and then.
      // (Not while it's drinking: its hands are on the cup.)
      const working = this.worker.status === 'working' && this.playing === 'sit';
      if (working) {
        const floor = this.worker.root.getWorldPosition(this.tmp).y;
        this.arms.forEach((chain, i) => {
          const side = i === 0 ? 1 : -1;
          const tap = Math.max(0, Math.sin(this.t * 14 + i * 1.7)) * 0.018;
          this.key.set((side * KEYS.side) / scale, (KEYS.up - floor + tap) / scale, KEYS.forward / scale);
          reach(chain, this.worker.root.localToWorld(this.key));
        });
      }
      if (this.head) look(this.head, glance(this.t, working));
    } else {
      this.root.position.z = 0;
      // On its feet, down where the little worker's feet would be.
      this.root.position.y = FEET;
    }
    // Its name tag and bubble (the worker's sprites, which it places for its own height each frame) up
    // over the character's head: everything moved up by as much as the lowest one is under it.
    // The cup, only while it drinks, its own size whatever the hand's bones are scaled to.
    if (this.cup) {
      this.cup.visible = this.playing === 'drink';
      if (this.cup.visible) this.cup.scale.setScalar(1 / Math.max(1e-4, this.cup.parent!.getWorldScale(this.tmp).x));
    }
    const floor = this.worker.root.getWorldPosition(this.tmp).y;
    const top = sat ? (this.height * SITTING - floor) / scale : FEET + this.height / scale;
    const tags = this.worker.root.children.filter((c): c is THREE.Sprite => (c as THREE.Sprite).isSprite && c.visible);
    const lift = Math.max(0, top + TAG_GAP / scale - Math.min(...tags.map((c) => c.position.y)));
    if (tags.length && lift > 0) for (const c of tags) c.position.y += lift;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.cup?.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    this.cup?.removeFromParent();
    this.root.removeFromParent();
    this.worker.root.children[0].visible = true;
  }
}
