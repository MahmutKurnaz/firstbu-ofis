import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { officeBox, officePoint } from '../../../shared/maps/cadde-props';
import { loadModel, type ModelName } from '../models';
import { collide, placed } from '../station/kit';
import { toon } from '../toon';
import type { CaddeKit } from './kit';

// The street's CC0 drafts: pieces of Kay Lousberg's KayKit packs (blender/scripts/build_kaykit.py),
// placed round the street and in its offices until our own models (F4) take their place. They load
// only when the street is up, and come in a moment after it: what's built in code is there first.
// Unlike the office's own models they keep their texture atlas, on a toon material so they're lit
// and outlined like everything else.

type Pack = Extract<ModelName, 'kaykit-city' | 'kaykit-furniture' | 'kaykit-cafe'>;

/** The size each pack is modelled at, to the street's meters. */
const SCALE: Record<Pack, number> = { 'kaykit-city': 5, 'kaykit-furniture': 0.5, 'kaykit-cafe': 0.5 };

const packs = new Map<Pack, Promise<THREE.Object3D | null>>();
const toons = new Map<THREE.Material, THREE.Material>();

/** A pack's pieces, each a root named after its file; null if it didn't load. */
function pack(name: Pack): Promise<THREE.Object3D | null> {
  let p = packs.get(name);
  if (!p) {
    p = loadModel(name)
      .then((m) => m.scene)
      .catch(() => {
        console.warn(`cadde: ${name} didn't load`);
        return null;
      });
    packs.set(name, p);
  }
  return p;
}

/** The toon look of a piece's own material: its atlas and color kept. */
function toonOf(m: THREE.Material): THREE.Material {
  let t = toons.get(m);
  if (!t) {
    const src = m as THREE.MeshStandardMaterial;
    t = new THREE.MeshToonMaterial({ map: src.map ?? null, color: src.color ?? new THREE.Color('#ffffff'), gradientMap: (toon('#fff') as THREE.MeshToonMaterial).gradientMap });
    toons.set(m, t);
  }
  return t;
}

/**
 * Puts `part` of `name` at (x, z) on the street, turned `rotY` (its front, +z, toward it), `scale`
 * times its street size. Returns its group straight away; the piece comes into it once loaded.
 */
export function kay(kit: CaddeKit, name: Pack, part: string, x: number, z: number, rotY = 0, scale = 1, y = 0): THREE.Group {
  const g = placed(x, y, z, rotY);
  g.scale.setScalar(SCALE[name] * scale);
  kit.group.add(g);
  void pack(name).then((root) => {
    const src = root?.getObjectByName(part);
    if (!src) return;
    const copy = src.clone();
    copy.position.set(0, 0, 0);
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toonOf) : toonOf(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
      // Its geometry and materials are every copy's: the street's dispose leaves them be.
      mesh.userData.shared = true;
    });
    g.add(copy);
  });
  return g;
}

/** Something to bump into, `w` by `d` round (x, z), turned `rotY`: the drafts aren't on the plan, so only you walk round them. */
function solid(kit: CaddeKit, x: number, z: number, w: number, d: number, top: number, rotY = 0) {
  collide(kit, x, z, w, d, rotY, top);
}

/**
 * Furnishes an office: a sofa, a low table and a lamp on a rug in a front corner (out of the way of
 * its door and its table); the back wall is the team's (./interiors.ts).
 */
export function furnish(kit: CaddeKit, p: PropConfig, index: number) {
  const o = officeBox(p);
  const [hw, hl] = [o.width / 2, o.length / 2];
  // The lounge goes on the side toward the head of the street (offices facing each other mirror each other).
  const s = index % 2 ? 1 : -1;
  const at = (side: number, out: number) => officePoint(p, side, out);
  const put = (name: Pack, part: string, side: number, out: number, turn = 0, scale = 1) => {
    const [x, z] = at(side, out);
    return kay(kit, name, part, x, z, o.rotY + turn, scale);
  };
  const ls = s * (hw - 1.9);
  const lo = hl - 2.6;
  put('kaykit-furniture', 'rug_rectangle_stripes_A', ls, lo, Math.PI / 2, 0.9);
  // The sofa along the side wall, facing across the office; the table in front of it.
  put('kaykit-furniture', 'couch_pillows', s * (hw - 0.6), lo, -s * (Math.PI / 2));
  put('kaykit-furniture', 'table_low', ls + -s * 0.4, lo, Math.PI / 2, 0.8);
  put('kaykit-furniture', 'lamp_standing', s * (hw - 0.6), lo - 1.6);
  for (const [side, out, w, d] of [
    [s * (hw - 0.6), lo, 0.9, 1.6],
    [ls - s * 0.4, lo, 0.8, 1.0],
  ])
    solid(kit, ...at(side, out), w, d, 0.6, o.rotY);
}

/** The street's furniture: bushes by the office doors, hydrants and bins by the benches, the café's fridge, menu and crate by its counter. */
export function dress(kit: CaddeKit, props: PropConfig[]) {
  for (const p of props.filter((q) => q.kind === 'office')) {
    const o = officeBox(p);
    for (const side of [-1, 1]) {
      // Out on the pavement, clear of the glass: a bush is about a meter across and two high.
      const [x, z] = officePoint(p, side * (o.width / 2 - 0.8), o.length / 2 + 1.1);
      kay(kit, 'kaykit-city', 'bush', x, z, 0, 1);
      solid(kit, x, z, 0.8, 0.8, 1.5);
    }
  }
  for (const side of [-1, 1]) {
    kay(kit, 'kaykit-city', 'firehydrant', side * 8.6, 22, 0, 1.2);
    kay(kit, 'kaykit-city', 'trash_A', side * 8.4, 16.6, 0, 1.6);
    solid(kit, side * 8.6, 22, 0.6, 0.6, 1);
  }
  // Behind the counter: the fridge and a crate; the menu stand out front. (No counter, none of them.)
  const c = props.find((q) => q.kind === 'counter');
  if (!c) return;
  const r = c.rotY ?? 0;
  const by = (across: number, out: number): [number, number] => [c.x + Math.cos(r) * across + Math.sin(r) * out, c.z - Math.sin(r) * across + Math.cos(r) * out];
  const w = (c.width ?? 4) * (c.scale ?? 1);
  const fridge = by(-w / 2 + 0.2, -1.2);
  kay(kit, 'kaykit-cafe', 'fridge_A_decorated', ...fridge, r, 0.9);
  solid(kit, ...fridge, 1, 1, 2, r);
  kay(kit, 'kaykit-cafe', 'crate_carrots', ...by(w / 2, -1.2), r + 0.3, 0.6);
  kay(kit, 'kaykit-cafe', 'menu', ...by(w / 2 + 0.2, 1.8), r + 0.5, 1.6);
}

/** The city's nearer row: KayKit buildings facing the street from beyond its edges, at `scale` their street size. */
export function skyline(kit: CaddeKit, spots: { x: number; z: number; rotY: number; scale: number }[]) {
  spots.forEach((s, i) => kay(kit, 'kaykit-city', `building_${'ABCDEFGH'[i % 8]}`, s.x, s.z, s.rotY, s.scale));
}
