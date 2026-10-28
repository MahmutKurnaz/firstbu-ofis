import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Court, seekSpots } from '../src/client/world/court.js';
import { NavGrid } from '../src/shared/nav.js';
import { planOf } from '../src/shared/maps/index.js';
import type { DeskView } from '../src/client/world/types.js';
import type { Worker } from '../src/client/world/character.js';

// Court's "they come to you" (F3): where those asking stand is worked out from where you were when they
// last set off, and re-worked only when you've moved 2.5 m on or the number of askers changes.

const plan = planOf('cadde');
const root = new THREE.Group();
const court = new Court(root, plan, new NavGrid(plan.bounds, plan.obstacles!), () => 0, () => undefined);

function seat(i: number) {
  const group = new THREE.Group();
  root.add(group);
  const seatAnchor = new THREE.Object3D();
  group.add(seatAnchor);
  const model = { root: new THREE.Group(), pace: 1, walking: false, gait: 1, stopDancing() {} } as unknown as Worker;
  const def = plan.desks[i];
  seatAnchor.position.set(def.x, 0, def.z);
  group.add(model.root);
  model.root.position.set(def.x, 0, def.z);
  court.add(`w${i}`, model, { def, group, seatAnchor } as unknown as DeskView);
  return `w${i}`;
}
const target = (id: string) => (court as unknown as { people: Map<string, { target?: { x: number; z: number; rotY: number } }> }).people.get(id)!.target;

test('those asking walk to spots in front of you; small moves do not move the goalposts, a second asker does', () => {
  const a = seat(0);
  const b = seat(1);
  const anchor = { x: 0, z: 0, rotY: 0 };
  court.follow(anchor);
  court.line([a], new Set([a]));
  assert.ok(court.seeking(a));
  assert.ok(court.away(a));
  const t1 = { ...target(a)! };
  const want1 = seekSpots(anchor, 1)[0];
  assert.ok(Math.hypot(t1.x - want1.x, t1.z - want1.z) < 1e-6, 'one asker stands straight ahead');

  // Moved a metre: every other worker's news calls line() again, and it must not change where they head.
  court.follow({ x: 1, z: 0.5, rotY: 0 });
  court.line([a], new Set([a]));
  assert.deepEqual(target(a), t1, 'unchanged while you have moved less than 2.5 m');

  // A second asker: the first moves over to the two-wide arrangement, from where you were when they set off.
  court.line([a, b], new Set([a, b]));
  const two = seekSpots(anchor, 2);
  const ta = target(a)!;
  assert.ok(Math.hypot(ta.x - two[0].x, ta.z - two[0].z) < 1e-6, 'the first takes the first of two spots');
  assert.ok(Math.hypot(target(b)!.x - two[1].x, target(b)!.z - two[1].z) < 1e-6);
  assert.notDeepEqual(ta, t1);

  // Moved well on: they set off after you.
  const far = { x: 6, z: 3, rotY: 0 };
  court.follow(far);
  const tf = seekSpots(far, 2);
  assert.ok(Math.hypot(target(a)!.x - tf[0].x, target(a)!.z - tf[0].z) < 1e-6, 'follows once moved past 2.5 m');

  // Sat down again: back to their seats.
  court.follow(null);
  assert.ok(!court.seeking(a) && !court.seeking(b));
  assert.equal(target(a), undefined);
  assert.ok(court.whereIs(a), 'still up, walking back');
});
