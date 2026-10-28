// The map editor's arithmetic (features/mapedit): which prop a point on the ground means, and what moving,
// turning, deleting and copying one makes of the list. Pure, so it can be tested; the list is never changed in place.

export type Prop = Record<string, unknown> & { kind: string; x: number; z: number };

/** What the editor doesn't move: the offices (their walls are the plan's, and their teams are in them). */
export const FIXED = new Set(['office']);

/** How close (m) a click has to be to a prop's middle to mean it. */
export const PICK_RADIUS = 1.8;
/** What a move snaps to (m), and what a turn is (radians). */
export const GRID = 0.25;
export const TURN = Math.PI / 12;
/** How far a copy is put from the original (m). */
export const COPY_OFFSET = 1.2;
/** The most props a map can have (MAP_LIMITS in shared/maps). */
export const MAX_PROPS = 400;

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

/** The list with prop `i` at (x, z), snapped to the grid. */
export function moved(props: readonly Prop[], i: number, x: number, z: number): Prop[] {
  if (!props[i] || FIXED.has(props[i].kind)) return props.slice();
  return props.map((p, k) => (k === i ? { ...p, x: snap(x), z: snap(z) } : p));
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
  if (!props[i] || FIXED.has(props[i].kind)) return props.slice();
  return props.map((p, k) => (k === i ? { ...p, scale: Math.round(Math.min(3, Math.max(0.3, Number(p.scale ?? 1) * factor)) * 100) / 100 } : p));
}

/** The list without prop `i`. */
export function removed(props: readonly Prop[], i: number): Prop[] {
  if (!props[i] || FIXED.has(props[i].kind)) return props.slice();
  return props.filter((_, k) => k !== i);
}

/** The list with a copy of prop `i` beside it (the copy is last), or the list as it was when it's full or fixed. */
export function duplicated(props: readonly Prop[], i: number): Prop[] {
  if (!props[i] || FIXED.has(props[i].kind) || props.length >= MAX_PROPS) return props.slice();
  return [...props, { ...props[i], x: snap(props[i].x + COPY_OFFSET), z: snap(props[i].z + COPY_OFFSET) }];
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
