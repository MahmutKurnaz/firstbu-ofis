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
  office: 'Bir ekibin cam ofisi, kapısı cephesinin ortasında',
  /** A street tree in a round bed. */
  tree: 'Bir sokak ağacı',
  /** A street lamp; `light` ones light the street for real at night. */
  lamp: 'Bir sokak lambası',
  /** A long planter, `width` long. */
  planter: 'Çalılık bir saksılık',
  /** A park bench along `rotY`. */
  bench: 'Bir park bankı',
  /** A café table under a parasol. */
  parasol: 'Şemsiyenin altında bir kafe masası',
  /** The café's counter, `width` long: E for a coffee, like the office's machine. */
  counter: 'Kafe tezgâhı (kahve)',
  /** A model from the office's own .glb files, `model` by name, `width` by `length` of ground. */
  glb: 'Bir .glb dosyasından model',
  /** The gong a merged pull request rings (one per map). */
  gong: 'Merge gongu',
  /** A coffee machine on a stand: E for a cup. */
  dispenser: 'Bir kahve makinesi',
  /** A table with nothing to sit at, `width` by `length`. */
  table: 'Oturağı olmayan bir masa',
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
/**
 * Which model a street tree is and how it's turned (inside its own `rotY`): the prop's own once it has a `model` (the editor
 * gives one to a tree it moves, so it stays what it was), else worked out from where it stands, which is how a map's trees vary.
 */
export function treeLook(p: { x: number; z: number; model?: unknown }): { key: 'agac-ince' | 'agac-genis'; turn: number } {
  if (p.model === 'meshy-agac-ince' || p.model === 'meshy-agac-genis') return { key: p.model.slice(6) as 'agac-ince' | 'agac-genis', turn: 0 };
  const h = p.x * 7 + p.z * 3;
  return { key: Math.floor(Math.abs(h)) % 3 === 0 ? 'agac-ince' : 'agac-genis', turn: h % 6.28 };
}
/** How wide the doorway in an office's front is, and how thick its walls are. */
export const OFFICE_DOOR = 2.4;
export const OFFICE_WALL = 0.2;

/** Whether `rotY` is a quarter turn (0, ±π/2, π…): an office's walls are only ever square to the street. */
export function quarterTurn(rotY = 0): boolean {
  const k = rotY / (Math.PI / 2);
  return Math.abs(k - Math.round(k)) < 1e-3;
}

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

/** A room of the executive suite: across its office from `from` to `to`, its door at `door` (null: open to the lobby), and which team's color it wears (an index into the template's offices, or -1). */
export interface SuiteRoom {
  id: string;
  label: string;
  from: number;
  to: number;
  door: number | null;
  team: number;
}

/**
 * The executive suite (an `office` with style `yonetim`, 60 m across and 10 deep: see shared/maps/cadde.ts): a row of rooms
 * along its back, each sized to who sits in it (the lead's the biggest, then yours, the managers' a single's each, the
 * assistant's a pair's, a meeting room for ten), glass between them in brass frames, and a lobby along its front. In
 * the office's own frame (u across, v from its middle toward its door): the rooms are v `back`..`front`, the lobby `front`..5.
 */
export const SUITE = {
  width: 60,
  length: 10,
  thick: 0.12,
  back: -4.8,
  front: 0.6,
  /** How wide a doorway in a partition is. */
  gate: 1.4,
  rooms: [
    { id: 'you', label: '⭐ Mahmut’un odası', from: -29.8, to: -23, door: -26.4, team: -1 },
    { id: 'lead', label: '🦁 Aslan Lider', from: -23, to: -14, door: -18.5, team: 0 },
    { id: 'asst', label: '🐼 Asistan', from: -14, to: -9, door: -11.5, team: 0 },
    { id: 'fe', label: '🦦 Frontend müdürü', from: -9, to: -5, door: -7, team: 2 },
    { id: 'be', label: '🐯 Backend müdürü', from: -5, to: -1, door: -3, team: 3 },
    { id: 'bug', label: '🐰 Hata avı müdürü', from: -1, to: 3, door: 1, team: 4 },
    { id: 'verify', label: '🦌 Doğrulama müdürü', from: 3, to: 7, door: 5, team: 5 },
    { id: 'coffee', label: '☕ Kahve köşesi', from: 7, to: 13, door: null, team: -1 },
    { id: 'meeting', label: '🤝 Toplantı odası', from: 13, to: 25, door: 19, team: -1 },
    { id: 'archive', label: '🗄️ Arşiv', from: 25, to: 29.8, door: 27.4, team: 1 },
  ] as SuiteRoom[],
  /** The assistant's room opens into the lead's too: a doorway in the wall between them, from v to v. */
  between: { u: -14, from: -3.2, to: -1.8 },
};

/** The partitions along the lobby (v = `front`): what's left of each room's front either side of its door. */
function frontsOf(rooms: SuiteRoom[]): [number, number][] {
  return rooms.flatMap((r): [number, number][] => (r.door === null ? [] : [[r.from, r.door - SUITE.gate / 2], [r.door + SUITE.gate / 2, r.to]]));
}

/** The walls between the rooms, from the back one to the lobby's: across (u) and from-to (v), the lead's with its doorway to the assistant's. */
function dividersOf(rooms: SuiteRoom[]): { u: number; from: number; to: number }[] {
  return rooms.slice(1).flatMap((r) =>
    r.from === SUITE.between.u
      ? [
          { u: r.from, from: SUITE.back, to: SUITE.between.from },
          { u: r.from, from: SUITE.between.to, to: SUITE.front },
        ]
      : [{ u: r.from, from: SUITE.back, to: SUITE.front }],
  );
}

export const SUITE_FRONTS = frontsOf(SUITE.rooms);
export const SUITE_DIVIDERS = dividersOf(SUITE.rooms);

/** The suite's partitions as ground, in the office's own frame turned into the world's. */
function suiteWalls(p: PropConfig): Rect[] {
  const o = officeBox(p);
  const at = (side: number, out: number, w: number, d: number) => {
    const [x, z] = officePoint(p, side, out);
    return boxFootprint(x, z, w, d, o.rotY);
  };
  return [
    ...SUITE_FRONTS.map(([a, b]) => at((a + b) / 2, SUITE.front, b - a, SUITE.thick)),
    ...SUITE_DIVIDERS.map((d) => at(d.u, (d.from + d.to) / 2, SUITE.thick, d.to - d.from)),
  ];
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
    ...(p.style === 'yonetim' ? suiteWalls(p) : []),
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
