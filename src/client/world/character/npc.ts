import * as THREE from 'three';
import type { Model } from '../models';

// One of the street's own people (docs/karakterler.md, the NPCs: the greeter, the barista, the guard, the
// florist, the courier, the old turtle, the guide): a rigged model that stands about or walks, from the clips it
// came with (`idle`, `walk`, `skill`, which it does now and then). Put on a Person (whose little body it puts
// away: its name tag and bubble stay) or on a plain group.

type Clip = 'idle' | 'walk' | 'skill';

/** How long a clip takes to blend into the next (s), and how often the skill is shown (s, from-to). */
const BLEND = 0.25;
const SKILL_EVERY: [number, number] = [9, 18];

export class NpcSkin {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<Clip, THREE.AnimationAction>();
  private playing: Clip | null = null;
  private t = Math.random() * 10;
  private nextSkill = SKILL_EVERY[0] + Math.random() * (SKILL_EVERY[1] - SKILL_EVERY[0]);
  private skillUntil = 0;

  /** `host`: where it stands; `hideBody` puts away the first thing on it (a Person's body). `height` in meters. */
  constructor(host: THREE.Object3D, model: Model, height: number, hideBody = false) {
    const body = model.scene;
    // On the floor at its origin, `height` tall, measured as it's drawn on its bones.
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body, true);
    const k = height / (box.max.y - box.min.y || 1);
    body.scale.setScalar(k);
    body.position.y = -box.min.y * k;
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.userData.outlineParameters = { visible: false };
    });
    this.root.add(body);
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of model.clips) {
      const n = clip.name.toLowerCase();
      const key: Clip | undefined = n.includes('walk') ? 'walk' : n.includes('idle') ? 'idle' : n.includes('skill') ? 'skill' : undefined;
      if (key && !this.actions.has(key)) this.actions.set(key, this.mixer.clipAction(clip));
    }
    const skill = this.actions.get('skill');
    if (skill) {
      skill.setLoop(THREE.LoopOnce, 1);
      skill.clampWhenFinished = true;
    }
    if (hideBody && host.children[0]) host.children[0].visible = false;
    host.add(this.root);
  }

  /** `moving`: it's walking (at `rate` times the clip's own pace, so its feet keep up with the ground). */
  update(dt: number, moving: boolean, rate = 1) {
    this.t += dt;
    let want: Clip = moving ? 'walk' : 'idle';
    if (!moving && this.actions.has('skill')) {
      if (this.skillUntil > this.t) want = 'skill';
      else if (this.t >= this.nextSkill) {
        this.skillUntil = this.t + (this.actions.get('skill')!.getClip().duration || 3);
        this.nextSkill = this.skillUntil + SKILL_EVERY[0] + Math.random() * (SKILL_EVERY[1] - SKILL_EVERY[0]);
        this.actions.get('skill')!.reset();
        want = 'skill';
      }
    }
    if (!this.actions.has(want)) want = 'idle';
    if (want !== this.playing && this.actions.has(want)) {
      const to = this.actions.get(want)!;
      const from = this.playing ? this.actions.get(this.playing) : undefined;
      to.enabled = true;
      to.play();
      if (from) to.crossFadeFrom(from, BLEND, false);
      this.playing = want;
    }
    if (this.playing === 'walk') this.actions.get('walk')!.timeScale = rate;
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}
