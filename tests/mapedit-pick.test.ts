// The map editor's panel groups, names, footprints and footprint-aware picking (features/mapedit/logic.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, GROUPS, footprint, nameOf, pickProp, type Prop } from '../src/client/features/mapedit/logic.js';

const P = (kind: string, x: number, z: number, extra: Record<string, unknown> = {}): Prop => ({ kind, x, z, ...extra });

test('GROUPS: every catalog id is in exactly one group', () => {
  const seen = new Map<string, number>();
  for (const g of GROUPS) for (const id of g.ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  for (const c of CATALOG) assert.equal(seen.get(c.id), 1, `${c.id} should be in exactly one group`);
});

test('GROUPS: no id outside the catalog, and titles are not empty', () => {
  const ids = new Set(CATALOG.map((c) => c.id));
  for (const g of GROUPS) {
    assert.ok(g.title.trim().length > 0, 'empty group title');
    assert.ok(g.ids.length > 0, `${g.title} is empty`);
    for (const id of g.ids) assert.ok(ids.has(id), `${id} (in ${g.title}) is not in CATALOG`);
  }
});

test('nameOf: a catalog glb gives its label', () => {
  assert.equal(nameOf(P('glb', 0, 0, { model: 'meshy-bank' })), 'Bank');
  assert.equal(nameOf(P('glb', 0, 0, { model: 'meshy-agac-genis' })), 'Ağaç (geniş)');
});

test('nameOf: an unknown glb model loses its meshy- prefix', () => {
  assert.equal(nameOf(P('glb', 0, 0, { model: 'meshy-bilinmeyen-sey' })), 'bilinmeyen-sey');
  assert.equal(nameOf(P('glb', 0, 0, { model: 'baska' })), 'baska');
});

test('nameOf: known kinds are named, unknown kinds are themselves', () => {
  assert.equal(nameOf(P('tree', 0, 0)), 'Ağaç');
  assert.equal(nameOf(P('bench', 0, 0)), 'Bank');
  assert.equal(nameOf(P('zeplin', 0, 0)), 'zeplin');
});

test('footprint: 1.2 x 1.2 when width and length are missing', () => {
  assert.deepEqual(footprint(P('tree', 0, 0)), [1.2, 1.2]);
});

test('footprint: width and length are used, and scale multiplies both', () => {
  assert.deepEqual(footprint(P('glb', 0, 0, { width: 2, length: 0.5 })), [2, 0.5]);
  assert.deepEqual(footprint(P('glb', 0, 0, { width: 2, length: 0.5, scale: 2 })), [4, 1]);
  assert.deepEqual(footprint(P('tree', 0, 0, { scale: 2 })), [2.4, 2.4]);
});

test('pickProp: a point inside a footprint picks that prop', () => {
  const l = [P('glb', 10, 10, { width: 2, length: 2 }), P('lamp', 30, 30)];
  assert.equal(pickProp(l, 10.8, 9.3), 0);
});

test('pickProp: of two nested props the smaller footprint wins, whatever the order', () => {
  const big = P('glb', 5, 5, { width: 4, length: 4 });
  const small = P('glb', 5, 5, { width: 0.6, length: 0.6 });
  assert.equal(pickProp([big, small], 5, 5), 1);
  assert.equal(pickProp([small, big], 5, 5), 0);
  assert.equal(pickProp([big, small], 6.5, 5), 0, 'outside the small one, still inside the big');
});

test('pickProp: a bench turned by pi/2 is long along z, not x', () => {
  const l = [P('glb', 10, 10, { width: 3, length: 0.6, rotY: Math.PI / 2 })];
  assert.equal(pickProp(l, 10, 11.4), 0, 'on the long axis (z)');
  assert.equal(pickProp(l, 10, 8.6), 0, 'on the long axis, other end');
  assert.equal(pickProp(l, 11.4, 10), -1, 'on the old long axis (x) it is now off the bench');
  const flat = [P('glb', 10, 10, { width: 3, length: 0.6 })];
  assert.equal(pickProp(flat, 11.4, 10), 0, 'unturned: long along x');
  assert.equal(pickProp(flat, 10, 11.4), -1);
});

test('pickProp: outside the footprint but within a metre picks the nearest', () => {
  const l = [P('glb', 0, 0, { width: 1, length: 1 }), P('glb', 3, 0, { width: 1, length: 1 })];
  // the fallback measures from a prop's middle (1 m), the footprint test from its edge (+0.15 m)
  assert.equal(pickProp(l, 0.9, 0), 0, 'outside the 1x1 footprint (0.65) but 0.9 m from the middle');
  assert.equal(pickProp(l, 2.1, 0), 1);
  assert.equal(pickProp(l, 1.5, 0), -1, 'more than a metre from both middles');
});

test('pickProp: far away is -1', () => {
  assert.equal(pickProp([P('tree', 5, 5)], 20, 20), -1);
});

test('pickProp: an office is never picked, even over its middle', () => {
  const l = [P('office', 0, 0, { width: 10, length: 10 })];
  assert.equal(pickProp(l, 0, 0), -1);
  assert.equal(pickProp(l, 1, 1), -1);
  const mixed = [P('office', 0, 0, { width: 10, length: 10 }), P('tree', 2, 2)];
  assert.equal(pickProp(mixed, 0, 0), -1, 'the tree is too far from the origin');
  assert.equal(pickProp(mixed, 2, 2), 1);
});

test('pickProp: an empty list is -1', () => {
  assert.equal(pickProp([], 0, 0), -1);
});
