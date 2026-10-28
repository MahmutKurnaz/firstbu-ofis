import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { CADDE_SIZE, type CaddePropKind } from '../../../shared/maps/cadde-props';
import { loadModel, type ModelName } from '../models';
import { tree as streetTree } from '../outside';
import { PROPS as STATION_PROPS } from '../station/props';
import { box, collide, placed } from '../station/kit';
import type { Interactable } from '../types';
import { mesh, roundedBox, textPlane, toon } from '../toon';
import { MAX_LAMPS, glow, lightOnly, type CaddeKit } from './kit';
import { meshy } from './meshy';
import { buildOffice } from './offices';

// The props a street-style map places (see shared/maps/cadde-props.ts): its offices (./offices.ts),
// trees, lamps, planters, benches, the café's parasols and counter, a .glb model, and the station's
// gong, coffee machine and plain table, each put up by its entry in PROPS.

const at = (p: PropConfig) => placed(p.x, 0, p.z, p.rotY ?? 0);
const CANOPIES = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653'];
let canopy = 0;

/** A street tree in a round bed with a stone curb. */
function tree(kit: CaddeKit, p: PropConfig) {
  const s = p.scale ?? 1;
  const g = at(p);
  g.add(mesh(new THREE.CylinderGeometry(CADDE_SIZE.tree * s, CADDE_SIZE.tree * s, 0.12, 20), kit.street.curb, 0, 0.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(CADDE_SIZE.tree * s - 0.1, CADDE_SIZE.tree * s - 0.1, 0.13, 20), kit.street.soil, 0, 0.07, 0, false));
  const t = streetTree(0.72 * s);
  t.rotation.y = (p.x * 7 + p.z * 3) % 6.28;
  g.add(t);
  // Its own tree, in its own round bed, in their place (a 4 m street tree, its bed 2.2 m across: blender/furniture.json).
  meshy(g, 'agac', { scale: s, turn: t.rotation.y, replaces: [...g.children] });
  kit.still.add(g);
  kit.colliders.push({ minX: p.x - 0.3, maxX: p.x + 0.3, minZ: p.z - 0.3, maxZ: p.z + 0.3, top: 99 });
}

/** A street lamp: a dark post, an arm out over the street, and a globe that lights up at night. */
function lamp(kit: CaddeKit, p: PropConfig) {
  const g = at(p);
  const H = 4.6;
  const ink = kit.street.frame;
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 10), ink, 0, 0.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, H, 8), ink, 0, H / 2, 0));
  g.add(mesh(box(0.06, 0.06, 1.0), ink, 0, H - 0.05, 0.45));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.34, 0.2, 14), ink, 0, H - 0.1, 0.9));
  g.add(mesh(new THREE.SphereGeometry(0.17, 12, 8), glow(kit, '#ffd89a', 0.05, 1.2), 0, H - 0.27, 0.9, false));
  const halo = mesh(new THREE.SphereGeometry(0.38, 12, 8), lightOnly(kit, '#ffcf8a'), 0, H - 0.3, 0.9, false);
  g.add(halo);
  // Its own lamp, its arm out over the street where the globe was; the light stays at the globe.
  meshy(g, 'lamba', { scale: 1, turn: Math.PI / 2, replaces: g.children.filter((c) => c !== halo) });
  kit.group.add(g);
  kit.colliders.push({ minX: p.x - 0.18, maxX: p.x + 0.18, minZ: p.z - 0.18, maxZ: p.z + 0.18, top: 99 });
  if (p.light && kit.night.lamps.length < MAX_LAMPS) {
    const light = new THREE.PointLight('#ffcf8a', 0, 14, 1.6);
    light.position.set(0, H - 0.5, 0.55);
    g.add(light);
    kit.night.lamps.push(light);
  }
}

/** A long planter of round shrubs. */
function planter(kit: CaddeKit, p: PropConfig) {
  const s = p.scale ?? 1;
  const w = (p.width ?? CADDE_SIZE.planter.width) * s;
  const d = CADDE_SIZE.planter.depth * s;
  const g = at(p);
  g.add(mesh(roundedBox(w, 0.55, d, 0.05), toon('#c9c2b6'), 0, 0.275, 0));
  g.add(mesh(box(w - 0.12, 0.05, d - 0.12), kit.street.soil, 0, 0.53, 0, false));
  const n = Math.max(2, Math.round(w / 0.7));
  for (let i = 0; i < n; i++) g.add(mesh(new THREE.SphereGeometry(0.34, 10, 8), toon(i % 2 ? '#4f9d58' : '#3f8a4a'), -w / 2 + (i + 0.5) * (w / n), 0.78, 0));
  meshy(g, 'saksi', { scale: w / 3, replaces: [...g.children] });
  kit.still.add(g);
  collide(kit, p.x, p.z, w, d, p.rotY ?? 0, 0.55);
}

/** A park bench, its seat along `rotY`'s across. */
function bench(kit: CaddeKit, p: PropConfig) {
  const s = p.scale ?? 1;
  const { width: w, depth: d } = CADDE_SIZE.bench;
  const g = at(p);
  g.scale.setScalar(s);
  for (let i = 0; i < 3; i++) g.add(mesh(box(w, 0.05, 0.14), kit.street.wood, 0, 0.45, -0.2 + i * 0.17));
  for (let i = 0; i < 2; i++) g.add(mesh(box(w, 0.12, 0.05), kit.street.wood, 0, 0.62 + i * 0.16, -0.31));
  for (const sx of [-1, 1]) {
    g.add(mesh(box(0.06, 0.45, d - 0.1), kit.street.frame, sx * (w / 2 - 0.15), 0.22, 0));
    g.add(mesh(box(0.06, 0.5, 0.06), kit.street.frame, sx * (w / 2 - 0.15), 0.65, -0.31));
  }
  // Its own bench: the seat faces +z, like the one it replaces (its back at -z).
  meshy(g, 'bank', { scale: w / 1.8, replaces: [...g.children] });
  kit.still.add(g);
  collide(kit, p.x, p.z, w * s, d * s, p.rotY ?? 0, 0.45);
}

/** A round café table under a parasol, with stools round it. */
function parasol(kit: CaddeKit, p: PropConfig) {
  const s = p.scale ?? 1;
  const g = at(p);
  g.scale.setScalar(s);
  const color = p.color ?? CANOPIES[canopy++ % CANOPIES.length];
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), kit.mats.white, 0, 0.74, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), kit.street.frame, 0, 0.37, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), kit.street.frame, 0, 0.015, 0, false));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), kit.street.frame, 0, 1.6, 0, false));
  g.add(mesh(new THREE.ConeGeometry(1.45, 0.55, 12, 1, true), toon(color), 0, 2.55, 0));
  g.add(mesh(new THREE.ConeGeometry(1.45, 0.55, 12, 1, true).rotateX(Math.PI), toon(color), 0, 2.55 - 0.001, 0, false));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 12), kit.street.wood, Math.sin(a) * 0.85, 0.225, Math.cos(a) * 0.85));
  }
  // Its own table under a striped parasol, stools round it.
  meshy(g, 'kafe-masasi', { scale: s, replaces: [...g.children] });
  kit.still.add(g);
  kit.colliders.push({ minX: p.x - 0.55 * s, maxX: p.x + 0.55 * s, minZ: p.z - 0.55 * s, maxZ: p.z + 0.55 * s, top: 0.76 });
}

/** The café's counter: a wooden front, a white top, a menu over it, and a coffee for whoever asks (E). */
function counter(kit: CaddeKit, p: PropConfig): Interactable {
  const s = p.scale ?? 1;
  const w = (p.width ?? CADDE_SIZE.counter.width) * s;
  const d = CADDE_SIZE.counter.depth * s;
  const g = at(p);
  g.add(mesh(box(w, 1.0, d), kit.street.wood, 0, 0.5, 0));
  g.add(mesh(roundedBox(w + 0.1, 0.06, d + 0.12, 0.03), kit.mats.white, 0, 1.03, 0));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 12), kit.mats.white, -w / 2 + 0.6 + i * 0.25, 1.115, 0.1, false));
  g.add(mesh(box(0.5, 0.45, 0.4), kit.mats.metalDark, w / 2 - 0.6, 1.285, -0.05));
  const menu = textPlane('☕ Kahve · Çay · Limonata', { bg: '#2f343b', color: '#fff6e5', border: '#b98a5e', size: 48 });
  menu.scale.multiplyScalar(0.7);
  menu.position.set(0, 2.2, -d / 2 - 0.05);
  g.add(menu);
  for (const sx of [-1, 1]) g.add(mesh(box(0.06, 2.3, 0.06), kit.street.frame, sx * (w / 2 - 0.2), 1.15, -d / 2 - 0.08));
  // Its own counter, with its espresso machine, cups and menu board, in place of all that.
  meshy(g, 'kahve-tezgahi', { scale: w / 4, replaces: [...g.children] });
  kit.group.add(g);
  const r = p.rotY ?? 0;
  collide(kit, p.x, p.z, w, d, r, 1.06);
  const it: Interactable = { kind: 'coffee', label: '☕ Kafe tezgâhı', x: p.x + Math.sin(r) * 1.2, z: p.z + Math.cos(r) * 1.2, radius: 1.6 };
  g.userData.interact = it;
  return it;
}

/** A model from the office's own .glb files, loaded when it's wanted; one that won't load just isn't there. */
function glb(kit: CaddeKit, p: PropConfig) {
  const g = at(p);
  g.scale.setScalar(p.scale ?? 1);
  kit.group.add(g);
  collide(kit, p.x, p.z, (p.width ?? CADDE_SIZE.glb) * (p.scale ?? 1), (p.length ?? CADDE_SIZE.glb) * (p.scale ?? 1), p.rotY ?? 0, 99);
  const name = p.model as ModelName;
  void loadModel(name)
    .then((m) => {
      // Our own models come with their own materials: they keep them, and cast shadows like the rest.
      m.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
      });
      g.add(m.scene);
    })
    .catch(() => console.warn(`cadde: no model "${p.model}"`));
}

/** Each kind of prop, put up (every kind there is has one: see CADDE_PROP_KINDS). */
export const PROPS: Record<CaddePropKind, (kit: CaddeKit, p: PropConfig, index: number) => void> = {
  office: (kit, p, i) => buildOffice(kit, p, i),
  tree,
  lamp,
  planter,
  bench,
  parasol,
  counter: (kit, p) => kit.interactables.push(counter(kit, p)),
  glb,
  gong: STATION_PROPS.gong,
  dispenser: (kit, p) => {
    const before = new Set([...kit.group.children, ...kit.still.children]);
    STATION_PROPS.dispenser(kit, p);
    // Its own coffee machine in place of the dispenser's box (the cup from it is still the same E).
    const made = [...kit.group.children, ...kit.still.children].filter((c) => !before.has(c));
    for (const g of made) meshy(g, 'kahve-makinesi', { scale: 1, replaces: g.children.filter((c) => (c as THREE.Mesh).isMesh) });
  },
  table: STATION_PROPS.table,
};
