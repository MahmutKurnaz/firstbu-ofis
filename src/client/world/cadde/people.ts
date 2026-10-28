import * as THREE from 'three';
import { THRONE_SIZE } from '../../../shared/maps';
import { Person } from '../character';
import { box, collide, placed } from '../station/kit';
import type { Interactable } from '../types';
import { mesh, roundedBox, toon } from '../toon';
import type { World } from '../world';
import type { CaddeKit } from './kit';

// The café's own: your armchair at the head of it (the map's throne), and whoever's behind the
// counter, who takes on a new worker when you speak to them (the map's herald).

/** Your armchair: deep, padded, in a warm leather, where the plan has the throne. */
export function buildArmchair(kit: CaddeKit): Interactable | undefined {
  const t = kit.plan.throne;
  if (!t) return undefined;
  const leather = toon('#8c4a2f');
  const g = placed(t.x, 0, t.z, t.rotY);
  g.add(mesh(roundedBox(1.15, 0.42, 1.0, 0.1), leather, 0, 0.3, 0));
  g.add(mesh(roundedBox(1.0, 0.14, 0.86, 0.06), toon('#a35a3a'), 0, 0.58, 0.05));
  g.add(mesh(roundedBox(1.15, 0.9, 0.22, 0.1), leather, 0, 0.85, -0.42));
  for (const sx of [-1, 1]) g.add(mesh(roundedBox(0.2, 0.36, 0.95, 0.08), leather, sx * 0.5, 0.65, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(0.06, 0.1, 0.06), kit.street.frame, sx * 0.5, 0.05, sz * 0.4, false));
  kit.still.add(g);
  collide(kit, t.x - Math.sin(t.rotY) * 0.2, t.z - Math.cos(t.rotY) * 0.2, THRONE_SIZE.width * 0.7, THRONE_SIZE.depth * 0.7, t.rotY, 99);
  const seat: Interactable = { kind: 'seat', seatId: t.id, x: t.x, y: t.y, z: t.z, radius: 1.7 };
  kit.interactables.push(seat);
  return seat;
}

/** The barista: an apron over a striped shirt, where the plan has the herald. */
export function buildBarista(kit: CaddeKit): World['herald'] {
  const hd = kit.plan.herald;
  if (!hd) return undefined;
  const person = new Person(hd.name, '#2a9d8f', { skin: 2, hair: 3, style: 2 });
  person.root.position.set(hd.x, 0, hd.z);
  person.root.rotation.y = hd.rotY;
  person.setLabel(hd.name, null);
  person.setDoing(hd.says);
  const apron = mesh(
    new THREE.LatheGeometry(
      [
        [0.32, 0.3],
        [0.31, 0.62],
        [0.29, 0.92],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      20,
      -0.9,
      1.8,
    ),
    toon('#3d2b1f'),
  );
  person.wear(apron, 'body');
  kit.group.add(person.root);
  const interactable: Interactable = { kind: 'herald', x: hd.x + Math.sin(hd.rotY) * 0.9, y: 0, z: hd.z + Math.cos(hd.rotY) * 0.9, radius: 1.9 };
  person.root.userData.interact = interactable;
  kit.interactables.push(interactable);
  kit.colliders.push({ minX: hd.x - 0.35, maxX: hd.x + 0.35, minZ: hd.z - 0.35, maxZ: hd.z + 0.35, top: 99 });
  return { person, interactable };
}
