// The map editor's arithmetic (features/mapedit): which prop a point on the ground means, and what moving,
// turning, deleting and copying one makes of the list. Pure, so it can be tested; the list is never changed in place.

import { BENCH_OUT } from '../../../shared/maps';
import { CADDE_SIZE, treeLook } from '../../../shared/maps/cadde-props';
import type { TableConfig } from '../../../shared/maps/types';

export type Prop = Record<string, unknown> & {
  kind: string;
  x: number;
  z: number;
};

/** What the editor doesn't move: the offices (their walls are the plan's, and their teams are in them). */
export const FIXED = new Set(['office']);
/** What can only be moved and turned: a table has its seats, so it isn't made bigger, copied, swapped or taken away. */
export const PINNED = new Set([...FIXED, 'table']);
/** One of the editor's stand-ins for the map's tables (see `editables`): a `table` prop with the index of its table. A real `table` prop of the map isn't. */
export const isTable = (p: Prop) => p.kind === 'table' && typeof p.tableIndex === 'number';
const pinned = (p: Prop) => FIXED.has(p.kind) || isTable(p);

/** How close (m) a click has to be to a prop's middle to mean it. */
export const PICK_RADIUS = 1.8;
/** What a move snaps to (m), and what a turn is (radians). */
export const GRID = 0.25;
export const TURN = Math.PI / 12;
/** How far a copy is put from the original (m). */
export const COPY_OFFSET = 1.2;
/** The most props a map can have (MAP_LIMITS in shared/maps). */
export const MAX_PROPS = 400;

/** A tree that has no `model` yet gets the one it is now (and its turn), so that where it's put doesn't change what it is (see treeLook). */
export function frozen(p: Prop): Prop {
  if (p.kind !== 'tree' || p.model !== undefined) return p;
  const look = treeLook(p);
  return { ...p, model: `meshy-${look.key}`, rotY: Math.round((Number(p.rotY ?? 0) + look.turn) * 1e4) / 1e4 };
}

export const snap = (v: number, step = GRID) => Math.round(v / step) * step;

/** The index of the movable prop nearest (x, z) within `radius`, or -1. */
export function nearestProp(props: readonly Prop[], x: number, z: number, radius = PICK_RADIUS): number {
  let best = -1;
  let bestD = radius;
  props.forEach((p, i) => {
    if (FIXED.has(p.kind)) return;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** The list with prop `i` at (x, z), snapped to the grid (or exactly there, when it was lined up with something: `grid` false). */
export function moved(props: readonly Prop[], i: number, x: number, z: number, grid = true): Prop[] {
  if (!props[i] || FIXED.has(props[i].kind)) return props.slice();
  const at = (v: number) => (grid ? snap(v) : Math.round(v * 1000) / 1000);
  return props.map((p, k) => (k === i ? { ...frozen(p), x: at(x), z: at(z) } : p));
}

/** The list with prop `i` turned by `by` radians (kept in -π…π). */
export function turned(props: readonly Prop[], i: number, by: number): Prop[] {
  if (!props[i] || FIXED.has(props[i].kind)) return props.slice();
  return props.map((p, k) => {
    if (k !== i) return p;
    const r = ((((Number(p.rotY ?? 0) + by + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    return { ...p, rotY: Math.round(r * 1e4) / 1e4 };
  });
}

/** The list with prop `i` scaled by `factor`, within 0.3…3 times. */
export function scaled(props: readonly Prop[], i: number, factor: number): Prop[] {
  if (!props[i] || pinned(props[i])) return props.slice();
  return props.map((p, k) =>
    k === i
      ? {
          ...p,
          scale: Math.round(Math.min(3, Math.max(0.3, Number(p.scale ?? 1) * factor)) * 100) / 100,
        }
      : p,
  );
}

/** The list without prop `i`. */
export function removed(props: readonly Prop[], i: number): Prop[] {
  if (!props[i] || pinned(props[i])) return props.slice();
  return props.filter((_, k) => k !== i);
}

/** The list with a copy of prop `i` beside it (the copy is last), or the list as it was when it's full or fixed. */
export function duplicated(props: readonly Prop[], i: number): Prop[] {
  if (!props[i] || pinned(props[i]) || props.length >= MAX_PROPS) return props.slice();
  return [
    ...props,
    {
      ...props[i],
      x: snap(props[i].x + COPY_OFFSET),
      z: snap(props[i].z + COPY_OFFSET),
    },
  ];
}

/** What the editor can put down: the street's own kinds, and the street's Meshy pieces (a `glb` prop whose `model` is `meshy-<key>`, see world/cadde/props.ts). */
export interface CatalogItem {
  id: string;
  label: string;
  /** The ground it takes (m), for its collision box. */
  width: number;
  length: number;
}

export const CATALOG: readonly CatalogItem[] = [
  { id: 'meshy-agac-genis', label: 'Ağaç (geniş)', width: 3.0, length: 3.0 },
  { id: 'meshy-agac-ince', label: 'Ağaç (ince)', width: 1.6, length: 1.6 },
  { id: 'meshy-cali', label: 'Çalı', width: 0.9, length: 0.9 },
  { id: 'meshy-cop-kutusu', label: 'Çöp kutusu', width: 0.6, length: 0.6 },
  { id: 'meshy-hidrant', label: 'Yangın musluğu', width: 0.6, length: 0.6 },
  { id: 'meshy-kafe-koltuk', label: 'Kafe koltuğu', width: 0.8, length: 0.8 },
  {
    id: 'meshy-kafe-masasi-yuvarlak',
    label: 'Bistro masası',
    width: 0.75,
    length: 0.75,
  },
  { id: 'meshy-kafe-tabure', label: 'Tabure', width: 0.6, length: 0.6 },
  { id: 'meshy-semsiye', label: 'Şemsiye', width: 2.7, length: 2.7 },
  { id: 'meshy-sezlong', label: 'Şezlong', width: 0.75, length: 2.0 },
  { id: 'meshy-bank', label: 'Bank', width: 1.8, length: 0.6 },
  { id: 'meshy-kanepe', label: 'Kanepe', width: 2.0, length: 0.9 },
  { id: 'meshy-sehpa', label: 'Sehpa', width: 1.0, length: 0.6 },
  { id: 'meshy-ayakli-lamba', label: 'Ayaklı lamba', width: 0.6, length: 0.6 },
  { id: 'meshy-puf', label: 'Puf', width: 0.6, length: 0.6 },
  {
    id: 'meshy-yonetici-masa',
    label: 'Yönetici masası',
    width: 1.8,
    length: 0.9,
  },
  { id: 'meshy-ofis-masa', label: 'Ofis masası', width: 1.4, length: 0.7 },
  {
    id: 'meshy-ofis-sandalye',
    label: 'Ofis sandalyesi',
    width: 0.62,
    length: 0.62,
  },
  { id: 'meshy-kitaplik', label: 'Kitaplık', width: 0.9, length: 0.6 },
  { id: 'meshy-fikus', label: 'Fikus', width: 0.9, length: 0.9 },
  { id: 'meshy-cicek-saksi', label: 'Çiçek saksısı', width: 0.7, length: 0.7 },
  { id: 'meshy-saksi', label: 'Uzun saksı', width: 3.0, length: 0.8 },
  { id: 'meshy-kiosk', label: 'Kiosk', width: 0.9, length: 0.7 },
  {
    id: 'meshy-kahve-makinesi',
    label: 'Kahve makinesi',
    width: 0.9,
    length: 0.7,
  },
  { id: 'meshy-heykel', label: 'Heykel', width: 0.9, length: 0.9 },
  { id: 'meshy-kargo-sandik', label: 'Sandık', width: 1.2, length: 0.8 },
  { id: 'meshy-menu-sehpasi', label: 'Menü tabelası', width: 0.6, length: 0.7 },
  { id: 'meshy-kursu', label: 'Kürsü', width: 0.6, length: 0.6 },
];

/** The catalog as the panel shows it: groups of ids from CATALOG, every item in exactly one. */
export const GROUPS: readonly { title: string; ids: readonly string[] }[] = [
  {
    title: '🌳 Bitkiler',
    ids: ['meshy-agac-genis', 'meshy-agac-ince', 'meshy-cali', 'meshy-fikus', 'meshy-cicek-saksi', 'meshy-saksi'],
  },
  {
    title: '🏙️ Cadde',
    ids: ['meshy-cop-kutusu', 'meshy-hidrant', 'meshy-bank', 'meshy-semsiye', 'meshy-sezlong', 'meshy-kiosk', 'meshy-menu-sehpasi', 'meshy-heykel', 'meshy-kargo-sandik'],
  },
  {
    title: '☕ Kafe',
    ids: ['meshy-kafe-koltuk', 'meshy-kafe-masasi-yuvarlak', 'meshy-kafe-tabure', 'meshy-kahve-makinesi'],
  },
  {
    title: '🛋️ Oturma ve salon',
    ids: ['meshy-kanepe', 'meshy-sehpa', 'meshy-puf', 'meshy-ayakli-lamba'],
  },
  {
    title: '💼 Ofis',
    ids: ['meshy-yonetici-masa', 'meshy-ofis-masa', 'meshy-ofis-sandalye', 'meshy-kitaplik', 'meshy-kursu'],
  },
];

/** What the street's own kinds are called on screen. */
export const KIND_NAMES: Record<string, string> = {
  tree: 'Ağaç',
  bench: 'Bank',
  lamp: 'Sokak lambası',
  planter: 'Saksı',
  parasol: 'Şemsiye',
  gong: 'Gong',
  dispenser: 'Otomat',
  counter: 'Tezgâh',
  office: 'Ofis',
};

/** What the street's own kinds cover (m, across × along), when the prop doesn't say: the size of their symbol (see CADDE_SIZE). */
const KIND_SIZES: Record<string, [number, number]> = {
  tree: [CADDE_SIZE.tree * 2.75, CADDE_SIZE.tree * 2.75],
  lamp: [0.6, 0.6],
  parasol: [CADDE_SIZE.parasol * 2, CADDE_SIZE.parasol * 2],
  gong: [0.7, 0.7],
  planter: [CADDE_SIZE.planter.width, CADDE_SIZE.planter.depth],
  bench: [CADDE_SIZE.bench.width, CADDE_SIZE.bench.depth],
  counter: [CADDE_SIZE.counter.width, CADDE_SIZE.counter.depth],
  dispenser: [CADDE_SIZE.dispenser.width, CADDE_SIZE.dispenser.depth],
};

/** What a prop is called on screen: a catalog item's label, a street kind's name, else its kind. */
export function nameOf(p: Prop): string {
  if (p.kind === 'glb') {
    const m = String(p.model ?? '');
    return CATALOG.find((c) => c.id === m)?.label ?? (m.replace(/^meshy-/, '') || 'Model');
  }
  if (isTable(p) && typeof p.name === 'string' && p.name) return p.name;
  return KIND_NAMES[p.kind] ?? p.kind;
}

/** The ground a prop takes (m, width × length) as it is scaled: 1.2 × 1.2 when the map doesn't say; a table's is with its benches. */
export function footprint(p: Prop): [number, number] {
  if (isTable(p)) return [(Number(p.width) > 0 ? Number(p.width) : 1.4) + 2 * (BENCH_OUT + 0.22), Number(p.length) || 1.2];
  const s = Number(p.scale ?? 1) || 1;
  const [dw, dl] = KIND_SIZES[p.kind] ?? [1.2, 1.2];
  const w = Number(p.width);
  const l = Number(p.length);
  return [(w > 0 ? w : dw) * s, (l > 0 ? l : dl) * s];
}

/** The prop a click at (x, z) means: the smallest one whose footprint holds the point, else the nearest within a metre; -1 for none. */
export function pickProp(props: readonly Prop[], x: number, z: number): number {
  let best = -1;
  let bestArea = Infinity;
  props.forEach((p, i) => {
    if (FIXED.has(p.kind)) return;
    const [w, l] = footprint(p);
    const r = Number(p.rotY ?? 0);
    const dx = x - p.x;
    const dz = z - p.z;
    const lx = dx * Math.cos(r) - dz * Math.sin(r);
    const lz = dx * Math.sin(r) + dz * Math.cos(r);
    if (Math.abs(lx) <= w / 2 + 0.15 && Math.abs(lz) <= l / 2 + 0.15 && w * l < bestArea) {
      best = i;
      bestArea = w * l;
    }
  });
  return best >= 0 ? best : nearestProp(props, x, z, 1);
}

/** A new prop of catalog item `item` at (x, z). */
export function made(item: CatalogItem, x: number, z: number): Prop {
  return {
    kind: 'glb',
    model: item.id,
    x: snap(x),
    z: snap(z),
    width: item.width,
    length: item.length,
  };
}

/** The list with prop `i` made another catalog item, where it stands and turned as it was. */
export function swapped(props: readonly Prop[], i: number, item: CatalogItem): Prop[] {
  const p = props[i];
  if (!p || pinned(p)) return props.slice();
  return props.map((q, k) =>
    k === i
      ? {
          ...made(item, p.x, p.z),
          ...(p.rotY !== undefined ? { rotY: p.rotY } : {}),
        }
      : q,
  );
}

/** The list with `prop` added (nothing when it's full). */
export function added(props: readonly Prop[], prop: Prop): Prop[] {
  return props.length >= MAX_PROPS ? props.slice() : [...props, prop];
}

/** The states the editor has been in, for undo and redo. */
export class History {
  private past: Prop[][] = [];
  private future: Prop[][] = [];

  /** `now` is going to be replaced: remember it. */
  push(now: readonly Prop[]) {
    this.past.push(now.slice());
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }

  /** The state before `now`, or undefined when there's none. */
  undo(now: readonly Prop[]): Prop[] | undefined {
    const prev = this.past.pop();
    if (prev) this.future.push(now.slice());
    return prev;
  }

  redo(now: readonly Prop[]): Prop[] | undefined {
    const next = this.future.pop();
    if (next) this.past.push(now.slice());
    return next;
  }

  get canUndo() {
    return this.past.length > 0;
  }
}

/** What the editor works on: the map's props, and its tables that aren't desks as `table` props (with `tableIndex` into the map's list of tables). */
export function editables(config: { props?: readonly Prop[]; tables?: readonly TableConfig[] }): Prop[] {
  const tables = (config.tables ?? []).flatMap((t, i): Prop[] =>
    t.look ? [] : [{ kind: 'table', x: t.x, z: t.z, rotY: t.rotY ?? 0, length: t.length, width: t.width ?? 1.4, name: t.name ?? `Masa ${i + 1}`, tableIndex: i }],
  );
  return [...(config.props ?? []).map((p) => ({ ...p })), ...tables];
}

/** The editor's list split for saving: the real props, and where each table was put. */
export function split(list: readonly Prop[]): { props: Prop[]; tables: { i: number; x: number; z: number; rotY: number }[] } {
  const props: Prop[] = [];
  const tables: { i: number; x: number; z: number; rotY: number }[] = [];
  for (const p of list) {
    if (isTable(p)) tables.push({ i: Number(p.tableIndex), x: p.x, z: p.z, rotY: Number(p.rotY ?? 0) });
    else props.push(p);
  }
  return { props, tables };
}

/** Prop `i` pulled back inside `b` if it's a table (its ends and its benches have to be in the hall), else as it is. */
export function fitted(props: readonly Prop[], i: number, b: { minX: number; maxX: number; minZ: number; maxZ: number }): Prop[] {
  const p = props[i];
  if (!p || !isTable(p)) return props.slice();
  const [w, l] = footprint(p);
  const r = Number(p.rotY ?? 0);
  const hx = (Math.abs(Math.sin(r)) * l + Math.abs(Math.cos(r)) * w) / 2 + 0.3;
  const hz = (Math.abs(Math.cos(r)) * l + Math.abs(Math.sin(r)) * w) / 2 + 0.3;
  const x = Math.min(b.maxX - hx, Math.max(b.minX + hx, p.x));
  const z = Math.min(b.maxZ - hz, Math.max(b.minZ + hz, p.z));
  return x === p.x && z === p.z ? props.slice() : props.map((q, k) => (k === i ? { ...q, x, z } : q));
}

/** A line the dragged prop was lined up on: `x` or `z` at `at` (m). */
export interface Guide {
  axis: 'x' | 'z';
  at: number;
}

/** What a prop covers across and along the ground, turned as it is: its half-widths in x and z. */
function extent(p: Prop): [number, number] {
  const [w, l] = footprint(p);
  const r = Number(p.rotY ?? 0);
  return [(Math.abs(Math.sin(r)) * l + Math.abs(Math.cos(r)) * w) / 2, (Math.abs(Math.cos(r)) * l + Math.abs(Math.sin(r)) * w) / 2];
}

/**
 * Prop `i` put down at (x, z), lined up with the others: its left, middle or right on the left, middle or right of another
 * (so side by side, flush, or in a row), and the same for front, middle and back, when they're within `within` metres.
 * Returns where it ends up and the lines it's on; `aligned` is false when nothing was close (then it's just (x, z)).
 */
export function alignTo(props: readonly Prop[], i: number, x: number, z: number, within = 0.3): { x: number; z: number; guides: Guide[]; aligned: boolean } {
  const me = props[i];
  if (!me) return { x, z, guides: [], aligned: false };
  const [hx, hz] = extent(me);
  const guides: Guide[] = [];
  const best = (center: number, half: number, axis: 'x' | 'z'): number => {
    let delta = 0;
    let gap = within;
    let line: number | null = null;
    props.forEach((o, k) => {
      if (k === i) return;
      const [ox, oz] = extent(o);
      const oc = axis === 'x' ? o.x : o.z;
      const oh = axis === 'x' ? ox : oz;
      for (const mine of [-half, 0, half]) {
        for (const theirs of [-oh, 0, oh]) {
          const d = oc + theirs - (center + mine);
          if (Math.abs(d) < gap) {
            gap = Math.abs(d);
            delta = d;
            line = oc + theirs;
          }
        }
      }
    });
    if (line !== null) guides.push({ axis, at: line });
    return delta;
  };
  const nx = x + best(x, hx, 'x');
  const nz = z + best(z, hz, 'z');
  return { x: nx, z: nz, guides, aligned: guides.length > 0 };
}
