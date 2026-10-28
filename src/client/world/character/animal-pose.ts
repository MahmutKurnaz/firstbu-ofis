import * as THREE from 'three';

// What a character does on top of its clips (see animal.ts), posed bone by bone each frame: its hands
// reaching for the keyboard while it works, typing, and its head turning to look about. Its clips come
// from a library that has no typing, so the arms are put where they should be (a small IK) instead.

const a = new THREE.Vector3();
const e = new THREE.Vector3();
const t = new THREE.Vector3();
const q = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();
const worldQ = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

/** Turns `bone` by `turn` (a rotation in world space), keeping where it hangs from. */
function turnInWorld(bone: THREE.Object3D, turn: THREE.Quaternion) {
  bone.getWorldQuaternion(worldQ);
  if (bone.parent) bone.parent.getWorldQuaternion(parentQ);
  else parentQ.identity();
  // local' = parent⁻¹ · turn · world
  bone.quaternion.copy(parentQ.invert().multiply(turn).multiply(worldQ));
  bone.updateMatrixWorld(true);
}

/**
 * Reaches the end of `chain` (shoulder to hand: its bones from the top down, the last one the end) for
 * `target`, a point in the world, by turning each joint in turn toward it a few times over (CCD).
 */
export function reach(chain: THREE.Object3D[], target: THREE.Vector3, passes = 6) {
  const end = chain[chain.length - 1];
  for (let p = 0; p < passes; p++) {
    for (let i = chain.length - 2; i >= 0; i--) {
      const joint = chain[i];
      joint.getWorldPosition(a);
      end.getWorldPosition(e);
      t.copy(target).sub(a).normalize();
      e.sub(a).normalize();
      if (e.lengthSq() < 1e-8 || t.lengthSq() < 1e-8) continue;
      turnInWorld(joint, q.setFromUnitVectors(e, t));
    }
  }
}

/**
 * Sits it up straight: turns `spine` (the first bone up from the hips) so that the line from it to
 * `neck` leans forward no more than `lean` radians from upright, toward `forward` (a world direction).
 */
export function straighten(spine: THREE.Object3D, neck: THREE.Object3D, forward: THREE.Vector3, lean = 0.12) {
  spine.getWorldPosition(a);
  neck.getWorldPosition(e);
  e.sub(a).normalize();
  t.copy(up).multiplyScalar(Math.cos(lean)).addScaledVector(forward, Math.sin(lean)).normalize();
  turnInWorld(spine, q.setFromUnitVectors(e, t));
}

/** Turns `head` by `yaw` about the world's up, and tips it by `pitch` (radians) about its own side. */
export function look(head: THREE.Object3D, yaw: number, pitch = 0) {
  turnInWorld(head, q.setFromAxisAngle(up, yaw));
  if (pitch) {
    head.getWorldQuaternion(worldQ);
    turnInWorld(head, q.setFromAxisAngle(t.set(1, 0, 0).applyQuaternion(worldQ), pitch));
  }
}

/** How far the head turns `t` seconds in: a slow look about, now and then (0 most of the time while it works). */
export function glance(t: number, working: boolean): number {
  if (!working) return Math.sin(t * 0.45) * 0.55;
  // Every 9 s or so, a quick look to one side and back.
  const k = (t % 9) / 9;
  return k > 0.82 ? Math.sin(((k - 0.82) / 0.18) * Math.PI) * 0.6 * (Math.floor(t / 9) % 2 ? 1 : -1) : 0;
}
