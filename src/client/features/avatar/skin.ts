import * as THREE from 'three';
import { polishCharacter, toPhysical } from '../../world/character/polish';
import type { Model } from '../../world/models';
import { AVATAR_HEIGHT, FIDGET_EVERY, clipOf, gaitFor, type Clip } from './logic';

/** How long one clip takes to blend into the next (s). */
const BLEND = 0.2;

const UP = new THREE.Vector3(0, 1, 0);

/** The library's clips start with the hips turned a little (the idle by 40°): turn each back so its first frame faces forward. */
function faceForward(clip: THREE.AnimationClip) {
  for (const track of clip.tracks) {
    if (!track.name.endsWith('Hips.quaternion')) continue;
    const v = track.values;
    const first = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(v[0], v[1], v[2], v[3]), 'YXZ');
    const fix = new THREE.Quaternion().setFromAxisAngle(UP, -first.y);
    const q = new THREE.Quaternion();
    for (let i = 0; i < v.length; i += 4) {
      q.set(v[i], v[i + 1], v[i + 2], v[i + 3]).premultiply(fix);
      v[i] = q.x;
      v[i + 1] = q.y;
      v[i + 2] = q.z;
      v[i + 3] = q.w;
    }
  }
}

/** Your character: a rigged model standing where you stand, walking, running and jumping as you do. */
export class PlayerAvatar {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<Clip, THREE.AnimationAction>();
  private playing: Clip | null = null;
  private hips: THREE.Object3D | undefined;
  /** Seconds stood still, when the next wave is due, and until when the one being waved lasts. */
  private still = 0;
  private nextFidget = FIDGET_EVERY[0] + Math.random() * (FIDGET_EVERY[1] - FIDGET_EVERY[0]);
  private waving = 0;

  constructor(model: Model) {
    const body = model.scene;
    // Stood on the floor at its origin, AVATAR_HEIGHT tall, measured as it's drawn on its bones.
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body, true);
    const k = AVATAR_HEIGHT / (box.max.y - box.min.y || 1);
    body.scale.setScalar(k);
    body.position.y = -box.min.y * k;
    toPhysical(body);
    polishCharacter(body);
    this.root.add(body);
    body.traverse((o) => {
      if (!this.hips && /hips/i.test(o.name) && (o as THREE.Bone).isBone) this.hips = o;
    });
    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of model.clips) {
      const key = clipOf(clip.name);
      if (!key || this.actions.has(key)) continue;
      faceForward(clip);
      this.actions.set(key, this.mixer.clipAction(clip));
    }
    const wave = this.actions.get('wave');
    if (wave) {
      wave.setLoop(THREE.LoopOnce, 1);
      wave.clampWhenFinished = true;
    }
    const jump = this.actions.get('jump');
    if (jump) {
      jump.setLoop(THREE.LoopOnce, 1);
      jump.clampWhenFinished = true;
    }
  }

  /** `speed` is how fast you're moving over the ground (m/s), `grounded` whether your feet are on it. */
  /** `seated`: sitting on a seat, which `seatOn` then puts its hips on. */
  update(dt: number, speed: number, grounded: boolean, seated = false) {
    const gait = gaitFor(speed, grounded);
    let { clip: want, rate } = seated ? { clip: 'sit' as Clip, rate: 1 } : gait;
    // Stood still a while: a wave, now and then.
    this.still = want === 'idle' ? this.still + dt : 0;
    if (this.waving > 0) {
      this.waving -= dt;
      if (want === 'idle') want = 'wave';
      else this.waving = 0;
    } else if (want === 'idle' && this.actions.has('wave') && this.still >= this.nextFidget) {
      this.waving = this.actions.get('wave')!.getClip().duration;
      this.nextFidget = this.still + FIDGET_EVERY[0] + Math.random() * (FIDGET_EVERY[1] - FIDGET_EVERY[0]);
      this.actions.get('wave')!.reset();
      want = 'wave';
    }
    const next = this.actions.has(want) ? want : this.actions.has('idle') ? 'idle' : null;
    if (next && next !== this.playing) {
      const to = this.actions.get(next)!;
      const from = this.playing ? this.actions.get(this.playing) : undefined;
      to.reset().play();
      if (from) to.crossFadeFrom(from, BLEND, false);
      this.playing = next;
    }
    if (this.playing) this.actions.get(this.playing)!.timeScale = rate;
    this.mixer.update(dt);
  }

  /** Moves it so its hips are at `at` (world): on the seat's cushion, whatever the clip's own chair was. Call after update, at its seat. */
  seatOn(at: THREE.Vector3) {
    if (!this.hips) return;
    this.root.updateMatrixWorld(true);
    const now = this.hips.getWorldPosition(new THREE.Vector3());
    this.root.position.add(at).sub(now);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }
}
