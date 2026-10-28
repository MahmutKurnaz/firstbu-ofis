import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { OFFICE_DOOR, OFFICE_WALL, officeBox, officeDoor, officeWalls } from '../../../shared/maps/cadde-props';
import { plant } from '../office';
import { box, placed } from '../station/kit';
import type { Interactable } from '../types';
import { mesh, textPlane, toonUnique } from '../toon';
import { glow, type CaddeKit } from './kit';

// A team's office on the street (an `office` prop, see shared/maps/cadde-props.ts): glass on three
// sides in a dark frame, its door in the middle of the front, a wall in the team's color at the back,
// a flat roof with a band of that color round it and the team's name over the door, plants in the
// corners and lights in the ceiling that come on at dusk. Its door is where you look in on the team
// (E, see features/ordu/door.ts): the office is a zone of the map (shared/maps/zones.ts).

/** What setZones repaints: the office's colors and its sign. */
export interface OfficeView {
  index: number;
  accent: THREE.MeshToonMaterial;
  sign: THREE.Group;
  signAt: THREE.Vector3;
  name: string;
  color: string;
  door: Interactable;
}

const BAY = 2.2;
const NEUTRAL = '#8a94a6';

/** Puts up the `index`th office, and keeps what's to be repainted on kit.offices. */
export function buildOffice(kit: CaddeKit & { offices?: OfficeView[] }, p: PropConfig, index: number) {
  const o = officeBox(p);
  const { frame, glass } = kit.street;
  const [hw, hl, H] = [o.width / 2, o.length / 2, o.height];
  const g = placed(o.x, 0, o.z, o.rotY);
  // What never changes is merged with the rest of the street (see kit.still), so it's placed the same way on its own.
  const solid = placed(o.x, 0, o.z, o.rotY);
  const accent = toonUnique(NEUTRAL);
  // The floor: pale oak, a step up from the street.
  solid.add(mesh(box(o.width - 0.1, 0.04, o.length - 0.1), kit.street.wood, 0, 0.02, 0, false));
  // The back: a wall in the team's color inside, plain outside.
  solid.add(mesh(box(o.width, H, OFFICE_WALL), kit.mats.hull, 0, H / 2, -hl + OFFICE_WALL / 2));
  g.add(mesh(box(o.width - 0.4, H - 0.6, 0.04), accent, 0, H / 2 - 0.1, -hl + OFFICE_WALL + 0.02, false));
  // Glass down the sides and across the front either side of the door, in bays of dark frame.
  const pane = (len: number, at: (u: number) => [number, number], along: 'x' | 'z') => {
    const n = Math.max(1, Math.round(len / BAY));
    for (let i = 0; i <= n; i++) {
      const [px, pz] = at(-len / 2 + (i * len) / n);
      solid.add(mesh(box(0.09, H, 0.09), frame, px, H / 2, pz));
    }
    const [cx, cz] = at(0);
    const sheet = along === 'x' ? box(len, H - 0.2, 0.03) : box(0.03, H - 0.2, len);
    g.add(mesh(sheet, glass, cx, H / 2, cz, false));
    solid.add(mesh(along === 'x' ? box(len, 0.08, 0.1) : box(0.1, 0.08, len), frame, cx, 0.04, cz, false));
  };
  for (const sx of [-1, 1]) pane(o.length, (u) => [sx * (hw - OFFICE_WALL / 2), u], 'z');
  const leaf = (o.width - OFFICE_DOOR) / 2;
  for (const sx of [-1, 1]) pane(leaf, (u) => [sx * (OFFICE_DOOR / 2 + leaf / 2) + u, hl - OFFICE_WALL / 2], 'x');
  // The doorway's frame, and the roof: a slab, the team's band round its edge.
  solid.add(mesh(box(OFFICE_DOOR + 0.2, 0.25, 0.2), frame, 0, H - 0.6, hl - 0.1));
  solid.add(mesh(box(o.width + 0.3, 0.3, o.length + 0.3), kit.mats.hull, 0, H + 0.15, 0));
  for (const sz of [-1, 1]) g.add(mesh(box(o.width + 0.34, 0.14, 0.04), accent, 0, H + 0.12, sz * (hl + 0.17), false));
  for (const sx of [-1, 1]) g.add(mesh(box(0.04, 0.14, o.length + 0.34), accent, sx * (hw + 0.17), H + 0.12, 0, false));
  // Lights in the ceiling, which come on at dusk.
  const panel = glow(kit, '#fff4dc', 0.15, 1);
  for (let x = -hw + 2.2; x <= hw - 2.2; x += 3.4) for (let z = -hl + 2.5; z <= hl - 2.5; z += 4) g.add(mesh(box(1.4, 0.04, 0.5), panel, x, H - 0.04, z, false));
  // Plants in the back corners and either side of the door.
  for (const sx of [-1, 1]) {
    const back = plant(sx < 0 ? 'monstera' : 'ficus', 1.3);
    back.position.set(sx * (hw - 0.7), 0.04, -hl + 0.8);
    g.add(back);
    const front = plant('snake_plant', 1.1);
    front.position.set(sx * (OFFICE_DOOR / 2 + 0.6), 0.04, hl - 0.6);
    g.add(front);
  }
  kit.still.add(solid);
  kit.group.add(g);
  for (const [minX, maxX, minZ, maxZ] of officeWalls(p)) kit.colliders.push({ minX, maxX, minZ, maxZ, top: H });
  // The roof, overhead: the camera stays under it inside.
  const [x0, x1, z0, z1] = officeWalls(p).reduce((a, r) => [Math.min(a[0], r[0]), Math.max(a[1], r[1]), Math.min(a[2], r[2]), Math.max(a[3], r[3])], [Infinity, -Infinity, Infinity, -Infinity]);
  kit.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, bottom: H, top: H + 0.3 });
  // The door: where you look in on the team.
  const d = officeDoor(p);
  const door: Interactable = { kind: 'ofis', zone: index, x: d.x, z: d.z, radius: 2 };
  kit.interactables.push(door);
  const signAt = new THREE.Vector3(0, H + 0.75, hl + 0.16);
  const view: OfficeView = { index, accent, sign: new THREE.Group(), signAt, name: '', color: NEUTRAL, door };
  g.add(view.sign);
  paintOffice(view, `Ofis ${index + 1}`, NEUTRAL);
  (kit.offices ??= []).push(view);
}

/** Paints an office in its team's color, and puts its name over the door. */
export function paintOffice(v: OfficeView, name: string, color: string) {
  if (v.name === name && v.color === color) return;
  v.name = name;
  v.color = color;
  v.accent.color.set(color);
  for (const old of [...v.sign.children]) {
    old.removeFromParent();
    const m = old as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    m.geometry.dispose();
    m.material.map?.dispose();
    m.material.dispose();
  }
  const sign = textPlane(`🏢 ${name}`, { bg: '#2f343b', color: '#ffffff', border: color, size: 72 });
  sign.scale.multiplyScalar(1.3);
  sign.position.copy(v.signAt);
  sign.userData.interact = v.door;
  v.sign.add(sign);
}
