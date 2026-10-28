// The map editor's pure arithmetic (features/mapedit/logic.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { COPY_OFFSET, GRID, History, MAX_PROPS, PICK_RADIUS, TURN, duplicated, moved, nearestProp, removed, scaled, snap, turned, type Prop } from '../src/client/features/mapedit/logic.js';

const P = (kind: string, x: number, z: number, extra: Record<string, unknown> = {}): Prop => ({ kind, x, z, ...extra });
const list = (): Prop[] => [P('office', 0, 0), P('tree', 5, 5), P('bench', 6, 5), P('lamp', 20, 20)];
const freeze = (l: Prop[]) => {
  l.forEach((p) => Object.freeze(p));
  return Object.freeze(l) as Prop[];
};

test('nearestProp picks the closest movable prop within the radius', () => {
  const l = list();
  assert.equal(nearestProp(l, 5.1, 5), 1);
  assert.equal(nearestProp(l, 5.9, 5), 2);
  assert.equal(nearestProp(l, 20, 19), 3);
});

test('nearestProp ignores offices and returns -1 when nothing is close', () => {
  const l = list();
  assert.equal(nearestProp(l, 0, 0), -1, 'only an office there');
  assert.equal(nearestProp(l, 100, 100), -1);
  assert.equal(nearestProp([], 0, 0), -1);
  assert.equal(nearestProp(l, 5 + PICK_RADIUS + 0.5, 5 - 3), -1);
});

test('nearestProp honours a custom radius', () => {
  const l = list();
  assert.equal(nearestProp(l, 5, 7.5, 1), -1);
  assert.equal(nearestProp(l, 5, 7.5, 3), 1);
  assert.equal(nearestProp(l, 5, 5, 0), 1, 'a click dead on the middle still counts at radius 0');
});

test('nearestProp: on an exact tie the later prop in the list wins (<= comparison)', () => {
  const l = [P('tree', 0, 0), P('bench', 2, 0)];
  assert.equal(nearestProp(l, 1, 0), 1);
  const same = [P('tree', 1, 1), P('bench', 1, 1)];
  assert.equal(nearestProp(same, 1, 1), 1);
});

test('snap rounds to the 0.25 grid, negatives too', () => {
  assert.equal(GRID, 0.25);
  assert.equal(snap(1.1), 1);
  assert.equal(snap(1.13), 1.25);
  assert.equal(snap(-1.1), -1);
  assert.equal(snap(-1.2), -1.25);
  assert.equal(snap(0), 0);
  assert.equal(snap(2.6, 0.5), 2.5);
});

test('moved snaps and never mutates the input', () => {
  const l = freeze(list());
  const out = moved(l, 1, 7.13, -2.1);
  assert.deepEqual(out[1], P('tree', 7.25, -2));
  assert.notEqual(out, l);
  assert.equal(l[1].x, 5);
  assert.equal(out[2], l[2], 'the others are shared untouched');
});

test('moved ignores offices and bad indexes, returning an equal copy', () => {
  const l = freeze(list());
  for (const i of [0, -1, 99]) {
    const out = moved(l, i, 3, 3);
    assert.deepEqual(out, l);
    assert.notEqual(out, l);
  }
});

test('turned adds TURN, wraps into -π..π, and shift turns the other way', () => {
  const l = freeze([P('tree', 1, 1), P('bench', 2, 2, { rotY: 3.1 })]);
  assert.equal(turned(l, 0, TURN)[0].rotY, Math.round(TURN * 1e4) / 1e4);
  assert.equal(turned(l, 0, -TURN)[0].rotY, -Math.round(TURN * 1e4) / 1e4);
  const wrapped = turned(l, 1, TURN)[1].rotY as number;
  assert.ok(wrapped >= -Math.PI && wrapped <= Math.PI);
  assert.ok(wrapped < 0, 'went past π and came round to the negative side');
  assert.equal(wrapped, Math.round((3.1 + TURN - Math.PI * 2) * 1e4) / 1e4);
  const back = turned(l, 1, -TURN * 24 - 0.5)[1].rotY as number;
  assert.ok(back >= -Math.PI && back <= Math.PI);
});

test('turned treats a missing rotY as 0 and rounds to 4 decimals', () => {
  const l = freeze([P('tree', 1, 1)]);
  const r = turned(l, 0, 0.123456789)[0].rotY as number;
  assert.equal(r, 0.1235);
  assert.equal(l[0].rotY, undefined);
  assert.deepEqual(turned(freeze(list()), 0, 1), list());
  assert.deepEqual(turned(l, 5, 1), l);
});

test('scaled clamps 0.3..3, rounds to two decimals, missing scale is 1', () => {
  const l = freeze([P('tree', 1, 1), P('bench', 2, 2, { scale: 2 })]);
  assert.equal(scaled(l, 0, 1.1)[0].scale, 1.1);
  assert.equal(scaled(l, 0, 1 / 3)[0].scale, 0.33);
  assert.equal(scaled(l, 0, 0.01)[0].scale, 0.3);
  assert.equal(scaled(l, 1, 10)[1].scale, 3);
  assert.equal(scaled(l, 1, 0.5)[1].scale, 1);
  assert.equal(scaled(l, 1, 1.0001)[1].scale, 2);
  assert.deepEqual(scaled(freeze(list()), 0, 2), list());
  assert.deepEqual(scaled(l, -1, 2), l);
});

test('removed drops one prop; offices and bad indexes leave an equal copy', () => {
  const l = freeze(list());
  const out = removed(l, 1);
  assert.deepEqual(out.map((p) => p.kind), ['office', 'bench', 'lamp']);
  assert.equal(l.length, 4);
  for (const i of [0, 9, -1]) {
    const same = removed(l, i);
    assert.deepEqual(same, l);
    assert.notEqual(same, l);
  }
});

test('duplicated copies prop i to the end, offset and snapped, without sharing the object', () => {
  const l = freeze([P('office', 0, 0), P('tree', 5.1, 5.1, { scale: 1.5 })]);
  const out = duplicated(l, 1);
  assert.equal(out.length, 3);
  assert.deepEqual(out[1], l[1]);
  assert.equal(out[2].kind, 'tree');
  assert.equal(out[2].scale, 1.5);
  assert.equal(out[2].x, snap(5.1 + COPY_OFFSET));
  assert.equal(out[2].z, snap(5.1 + COPY_OFFSET));
  assert.notEqual(out[2], l[1]);
  assert.equal(l.length, 2);
});

test('duplicated is a no-op for offices, bad indexes and a full list', () => {
  const l = freeze(list());
  assert.deepEqual(duplicated(l, 0), l);
  assert.deepEqual(duplicated(l, 50), l);
  assert.deepEqual(duplicated(l, -1), l);
  const full = Array.from({ length: MAX_PROPS }, (_, i) => P('tree', i, 0));
  const same = duplicated(full, 3);
  assert.equal(same.length, MAX_PROPS);
  assert.notEqual(same, full);
  assert.equal(duplicated(full.slice(0, MAX_PROPS - 1), 3).length, MAX_PROPS);
});

test('History: push, undo and redo walk the states', () => {
  const h = new History();
  const a = [P('tree', 1, 1)];
  const b = [P('tree', 2, 2)];
  const c = [P('tree', 3, 3)];
  assert.equal(h.canUndo, false);
  h.push(a);
  h.push(b);
  assert.equal(h.canUndo, true);
  assert.deepEqual(h.undo(c), b);
  assert.deepEqual(h.undo(b), a);
  assert.equal(h.canUndo, false);
  assert.deepEqual(h.redo(a), b);
  assert.deepEqual(h.redo(b), c);
  assert.equal(h.redo(c), undefined);
  assert.equal(h.canUndo, true);
});

test('History: a new push clears redo, and snapshots are copies', () => {
  const h = new History();
  const a = [P('tree', 1, 1)];
  h.push(a);
  a.push(P('bench', 0, 0));
  assert.equal(h.undo([])!.length, 1, 'pushed list was copied');
  assert.deepEqual(h.redo([P('x', 0, 0)])?.length, 0);
  h.undo([]);
  h.push([P('lamp', 9, 9)]);
  assert.equal(h.redo([]), undefined);
});

test('History: undo on empty returns undefined and does not make a redo', () => {
  const h = new History();
  assert.equal(h.undo([P('tree', 0, 0)]), undefined);
  assert.equal(h.canUndo, false);
  assert.equal(h.redo([]), undefined);
});

test('History keeps at most 100 states', () => {
  const h = new History();
  for (let i = 0; i < 150; i++) h.push([P('tree', i, 0)]);
  let n = 0;
  let last: Prop[] | undefined;
  let now: Prop[] = [P('tree', -1, 0)];
  for (let r = h.undo(now); r; r = h.undo(now)) {
    n++;
    last = r;
    now = r;
  }
  assert.equal(n, 100);
  assert.equal(last![0].x, 50, 'the oldest 50 were dropped');
});
