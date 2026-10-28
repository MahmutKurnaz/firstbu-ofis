import type { Circle, Rect } from '../nav.js';
import { PROP_SIZE, boxFootprint } from './props.js';
import type { PropConfig } from './types.js';

/*
 * The pieces a street-style map (cadde) can put up (MapConfig.props), and how much ground each takes,
 * as ./props.ts has the castle's. How each one looks is the street builder's (world/cadde/).
 *
 * The one that matters most is the `office`: a glass-walled office on the street, its door in the
 * middle of its front. Each one is a zone (see ./zones.ts): the seats inside it are its team's, and
 * the offices of a project's ordu.json go into them in order.
 */

export const CADDE_PROP_KINDS = {
  /** A glass office, `width` across its front and `length` deep, `height` tall, its door facing `rotY`. */
  office: "A team's glass office, its door in the middle of its front",
  /** A street tree in a round bed. */
  tree: 'A street tree',
  /** A street lamp; `light` ones light the street for real at night. */
  lamp: 'A street lamp',
  /** A long planter, `width` long. */
  planter: 'A planter of shrubs',
  /** A park bench along `rotY`. */
  bench: 'A park bench',
  /** A café table under a parasol. */
  parasol: 'A café table under a parasol',
  /** The café's counter, `width` long: E for a coffee, like the office's machine. */
  counter: 'The café counter (the coffee)',
  /** A model from the office's own .glb files, `model` by name, `width` by `length` of ground. */
  glb: 'A model from a .glb file',
  /** The gong a merged pull request rings (one per map). */
  gong: 'The merge gong',
  /** A coffee machine on a stand: E for a cup. */
  dispenser: 'A coffee machine',
  /** A table with nothing to sit at, `width` by `length`. */
  table: 'A table without seats',
} as const;
export type CaddePropKind = keyof typeof CADDE_PROP_KINDS;

/** The size of a tree, a bench and the rest, before `scale`. */
export const CADDE_SIZE = {
  office: { width: 14, length: 16, height: 4.2 },
  tree: 0.8,
  lamp: 0.25,
  planter: { width: 3, depth: 0.8 },
  bench: { width: 2, depth: 0.7 },
  parasol: 1.1,
  counter: { width: 4, depth: 1 },
  dispenser: { width: 1.3, depth: 0.7 },
  glb: 1.5,
} as const;
/** How wide the doorway in an office's front is, and how thick its walls are. */
export const OFFICE_DOOR = 2.4;
export const OFFICE_WALL = 0.2;

/** Where an office is and how big: its middle, its front's width, its depth, and the way its door faces. */
export function officeBox(p: PropConfig): { x: number; z: number; width: number; length: number; height: number; rotY: number } {
  const s = p.scale ?? 1;
  return {
    x: p.x,
    z: p.z,
    width: (p.width ?? CADDE_SIZE.office.width) * s,
    length: (p.length ?? CADDE_SIZE.office.length) * s,
    height: p.height ?? CADDE_SIZE.office.height,
    rotY: p.rotY ?? 0,
  };
}

/** A point `side` across an office's front and `out` toward its door from its middle, in the world. */
export function officePoint(p: PropConfig, side: number, out: number): [number, number] {
  const r = p.rotY ?? 0;
  // Its front faces (sin r, cos r); across it is (cos r, -sin r).
  return [p.x + Math.sin(r) * out + Math.cos(r) * side, p.z + Math.cos(r) * out - Math.sin(r) * side];
}

/** An office's walls, as the ground they take: the back, the two sides, and the front either side of the door. */
export function officeWalls(p: PropConfig): Rect[] {
  const o = officeBox(p);
  const t = OFFICE_WALL;
  const [hw, hl] = [o.width / 2, o.length / 2];
  const piece = (side: number, out: number, w: number, d: number) => {
    const [x, z] = officePoint(p, side, out);
    return boxFootprint(x, z, w, d, o.rotY);
  };
  const leaf = (o.width - OFFICE_DOOR) / 2;
  return [
    piece(0, -hl + t / 2, o.width, t),
    piece(-hw + t / 2, 0, t, o.length),
    piece(hw - t / 2, 0, t, o.length),
    piece(-hw + leaf / 2, hl - t / 2, leaf, t),
    piece(hw - leaf / 2, hl - t / 2, leaf, t),
  ];
}

/** Just outside an office's door, facing it. */
export function officeDoor(p: PropConfig): { x: number; z: number; rotY: number } {
  const o = officeBox(p);
  const [x, z] = officePoint(p, 0, o.length / 2 + 0.9);
  return { x, z, rotY: o.rotY + Math.PI };
}

/** How much ground a street prop takes: boxes, a circle, or none (it's up in the air or underfoot). */
export function caddeFootprint(p: PropConfig): { rect?: Rect; rects?: Rect[]; circle?: Circle } | null {
  const s = p.scale ?? 1;
  const r = p.rotY ?? 0;
  switch (p.kind) {
    case 'office':
      return { rects: officeWalls(p) };
    case 'tree':
      return { circle: [p.x, p.z, CADDE_SIZE.tree * s] };
    case 'lamp':
      return { circle: [p.x, p.z, CADDE_SIZE.lamp * s] };
    case 'parasol':
      return { circle: [p.x, p.z, CADDE_SIZE.parasol * s] };
    case 'planter':
      return { rect: boxFootprint(p.x, p.z, (p.width ?? CADDE_SIZE.planter.width) * s, CADDE_SIZE.planter.depth * s, r) };
    case 'bench':
      return { rect: boxFootprint(p.x, p.z, CADDE_SIZE.bench.width * s, CADDE_SIZE.bench.depth * s, r) };
    case 'counter':
      return { rect: boxFootprint(p.x, p.z, (p.width ?? CADDE_SIZE.counter.width) * s, CADDE_SIZE.counter.depth * s, r) };
    case 'dispenser':
      return { rect: boxFootprint(p.x, p.z, CADDE_SIZE.dispenser.width * s, CADDE_SIZE.dispenser.depth * s, r) };
    case 'glb':
      return { rect: boxFootprint(p.x, p.z, (p.width ?? CADDE_SIZE.glb) * s, (p.length ?? CADDE_SIZE.glb) * s, r) };
    case 'gong':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.gong.width, PROP_SIZE.gong.depth, r) };
    case 'table':
      return { rect: boxFootprint(p.x, p.z, p.width ?? 1.4, p.length ?? 3, r) };
    default:
      return null;
  }
}

/** How high a street prop reaches: an office its roof, the rest stay under any street-style hall's walls. */
export function caddeTop(p: PropConfig): number {
  return p.kind === 'office' ? officeBox(p).height : 0;
}
