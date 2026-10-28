// The map editor's group operations: aligned, distributed, inBox, removedMany (features/mapedit/logic.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aligned, centered, distributed, inBox, removedMany, footprint, type AlignMode, type Prop } from '../src/client/features/mapedit/logic.js';

/** A sized glb prop: its footprint is exactly w × l (no scale). */
const G = (x: number, z: number, w: number, l: number, extra: Record<string, unknown> = {}): Prop => ({ kind: 'glb', model: 'x', x, z, width: w, length: l, ...extra });
const O = (x: number, z: number): Prop => ({ kind: 'office', x, z });
const close = (a: number, b: number, eps = 1e-3, msg?: string) => assert.ok(Math.abs(a - b) <= eps, msg ?? `${a} should be within ${eps} of ${b}`);
/** Half-extents (x, z) of a prop, from its footprint and turn. */
const half = (p: Prop): [number, number] => {
  const [w, l] = footprint(p);
  const r = Number(p.rotY ?? 0);
  return [(Math.abs(Math.sin(r)) * l + Math.abs(Math.cos(r)) * w) / 2, (Math.abs(Math.cos(r)) * l + Math.abs(Math.sin(r)) * w) / 2];
};
const lo = (p: Prop, ax: 'x' | 'z') => p[ax] - half(p)[ax === 'x' ? 0 : 1];
const hi = (p: Prop, ax: 'x' | 'z') => p[ax] + half(p)[ax === 'x' ? 0 : 1];
const frozenList = (a: Prop[]) => a.map((p) => Object.freeze({ ...p })) as Prop[];

test('aligned: left/right edges of different sizes meet exactly (bank 2×0.7 and lamp 0.6)', () => {
  const props = [G(3, 1, 2, 0.7), { kind: 'lamp', x: 7, z: 4 } as Prop, G(5, 9, 1, 1)];
  const L = aligned(props, [0, 1, 2], 'left');
  const left = Math.min(...props.map((p) => lo(p, 'x')));
  for (const p of L) close(lo(p, 'x'), left);
  const R = aligned(props, [0, 1, 2], 'right');
  const right = Math.max(...props.map((p) => hi(p, 'x')));
  for (const p of R) close(hi(p, 'x'), right);
  // z is untouched in x modes
  L.forEach((p, i) => assert.equal(p.z, props[i].z));
});

test('aligned: top/bottom use z, top = smaller z', () => {
  const props = [G(0, 2, 2, 0.7), G(4, 8, 0.6, 0.6), G(9, 5, 1, 3)];
  const T = aligned(props, [0, 1, 2], 'top');
  const top = Math.min(...props.map((p) => lo(p, 'z')));
  for (const p of T) close(lo(p, 'z'), top);
  const B = aligned(props, [0, 1, 2], 'bottom');
  const bottom = Math.max(...props.map((p) => hi(p, 'z')));
  for (const p of B) close(hi(p, 'z'), bottom);
  T.forEach((p, i) => assert.equal(p.x, props[i].x));
});

test('aligned: hcenter / vcenter put every middle at the middle of the combined box', () => {
  const props = [G(0, 0, 2, 2), G(10, 6, 4, 1), G(3, 3, 1, 1)];
  const H = aligned(props, [0, 1, 2], 'hcenter');
  const mid = (Math.min(...props.map((p) => lo(p, 'x'))) + Math.max(...props.map((p) => hi(p, 'x')))) / 2;
  for (const p of H) close(p.x, mid);
  const V = aligned(props, [0, 1, 2], 'vcenter');
  const midz = (Math.min(...props.map((p) => lo(p, 'z'))) + Math.max(...props.map((p) => hi(p, 'z')))) / 2;
  for (const p of V) close(p.z, midz);
});

test('aligned: turned props use the rotated half-extent', () => {
  const a = G(0, 0, 2, 0.5, { rotY: Math.PI / 2 }); // half x = 0.25, half z = 1
  const b = G(5, 0, 1, 1);
  const L = aligned([a, b], [0, 1], 'left');
  close(lo(L[0], 'x'), lo(L[1], 'x'));
  close(L[0].x, -0.25 + 0.25); // its own left edge -0.25 stays: x = 0
  close(L[1].x, 0.25 + 0.5 - 0.5 + 0); // b's left edge meets -0.25 -> x = 0.25
  const T = aligned([a, b], [0, 1], 'top');
  close(lo(T[0], 'z'), -1);
  close(lo(T[1], 'z'), -1);
  close(T[1].z, -0.5);
});

test('aligned: result rounded to 1e-3', () => {
  const props = [G(0, 0, 1, 1), G(1.23456, 0, 0.3333, 1)];
  const R = aligned(props, [0, 1], 'hcenter');
  for (const p of R) assert.equal(p.x, Math.round(p.x * 1000) / 1000);
});

test('aligned: fewer than two movable -> equal copy (not the same array)', () => {
  const props = [G(0, 0, 1, 1), G(5, 5, 1, 1), O(9, 9)];
  for (const ids of [[], [0], [0, 0], [0, 0, 0], [0, 99], [0, -1], [0, 2], [2], [1.5, 0]]) {
    const r = aligned(props, ids, 'left');
    assert.notEqual(r, props);
    assert.deepEqual(r, props);
  }
  assert.deepEqual(aligned([], [0, 1], 'left'), []);
});

test('aligned: an office in the group is not moved and does not count; the others still line up', () => {
  const props = [G(0, 0, 1, 1), O(-50, 3), G(6, 4, 3, 1)];
  const r = aligned(props, [0, 1, 2], 'left');
  assert.deepEqual(r[1], props[1]);
  close(lo(r[0], 'x'), -0.5);
  close(lo(r[2], 'x'), -0.5); // the office at -50 did not drag the group
  // duplicates count once
  const d = aligned(props, [0, 0, 2, 2, 1], 'right');
  close(hi(d[0], 'x'), 7.5);
  close(hi(d[2], 'x'), 7.5);
});

test('aligned: does not change input (frozen list and objects) and leaves non-members alone', () => {
  const props = frozenList([G(0, 0, 1, 1), G(5, 5, 2, 1), G(20, 20, 1, 1), O(1, 1)]);
  const ids = Object.freeze([0, 1]) as unknown as number[];
  const before = JSON.parse(JSON.stringify(props));
  const r = aligned(props, ids, 'bottom');
  assert.deepEqual(JSON.parse(JSON.stringify(props)), before);
  assert.notEqual(r, props);
  assert.equal(r[2], props[2]);
  assert.equal(r[3], props[3]);
  assert.notEqual(r[1], props[1]);
});

test('aligned: a tree without model is frozen like moved does; other fields are kept', () => {
  const tree: Prop = { kind: 'tree', x: 0, z: 0, name: 'keep', seed: 7 };
  const other = G(10, 0, 1, 1);
  const r = aligned([tree, other], [0, 1], 'top');
  assert.ok(typeof r[0].model === 'string' && String(r[0].model).startsWith('meshy-'));
  assert.equal(typeof r[0].rotY, 'number');
  assert.equal(r[0].name, 'keep');
  assert.equal(r[0].seed, 7);
  assert.equal(r[0].kind, 'tree');
  assert.equal(tree.model, undefined); // the original is untouched
  // a tree that already has a model keeps it
  const t2: Prop = { kind: 'tree', x: 0, z: 0, model: 'meshy-cali', rotY: 0.5 };
  const r2 = aligned([t2, other], [0, 1], 'left');
  assert.equal(r2[0].model, 'meshy-cali');
  assert.equal(r2[0].rotY, 0.5);
});

test('aligned: every mode is idempotent', () => {
  const props = [G(0, 0, 2, 0.7), G(4, 8, 0.6, 0.6, { rotY: 0.4 }), G(9, 5, 1, 3)];
  const modes: AlignMode[] = ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'];
  for (const m of modes) {
    const once = aligned(props, [0, 1, 2], m);
    const twice = aligned(once, [0, 1, 2], m);
    twice.forEach((p, i) => {
      close(p.x, once[i].x);
      close(p.z, once[i].z);
    });
  }
});

test('distributed: fewer than three -> equal copy', () => {
  const props = [G(0, 0, 1, 1), G(5, 0, 1, 1), G(9, 0, 1, 1), O(3, 3)];
  for (const ids of [[], [0], [0, 1], [0, 1, 1], [0, 1, 3], [0, 1, 77]]) {
    const r = distributed(props, ids, 'x');
    assert.notEqual(r, props);
    assert.deepEqual(r, props);
  }
});

test('distributed: gaps between sides are equal on x, ends stay, order is by position not by list', () => {
  // list order scrambled: positions 10 (wide), 0, 3 (tiny), 4 (wide)
  const props = [G(10, 0, 2, 1), G(0, 0, 1, 1), G(3, 5, 0.6, 1), G(4, 7, 3, 1)];
  const r = distributed(props, [0, 1, 2, 3], 'x');
  const order = [1, 2, 3, 0]; // by x
  assert.equal(r[1].x, 0);
  assert.equal(r[0].x, 10);
  const gaps: number[] = [];
  for (let k = 0; k < order.length - 1; k++) gaps.push(lo(r[order[k + 1]], 'x') - hi(r[order[k]], 'x'));
  const span = lo(props[0], 'x') - 0 - 0.5; // left of last minus right of first
  const sizes = 0.6 + 3;
  const expected = (span - sizes) / 3;
  for (const g of gaps) close(g, expected);
  // z untouched
  r.forEach((p, i) => assert.equal(p.z, props[i].z));
});

test('distributed: z axis, turned props use their rotated extent', () => {
  const props = [G(0, 0, 1, 1), G(0, 2, 2, 0.5, { rotY: Math.PI / 2 }), G(0, 3, 1, 1), G(0, 10, 1, 2)];
  const r = distributed(props, [0, 1, 2, 3], 'z');
  const order = [0, 1, 2, 3].sort((a, b) => props[a].z - props[b].z);
  const gaps: number[] = [];
  for (let k = 0; k < order.length - 1; k++) gaps.push(lo(r[order[k + 1]], 'z') - hi(r[order[k]], 'z'));
  for (const g of gaps) close(g, gaps[0]);
  assert.equal(r[0].z, 0);
  assert.equal(r[3].z, 10);
  r.forEach((p, i) => assert.equal(p.x, props[i].x));
});

test('distributed: ignores office and duplicates, does not change input, tree gets frozen', () => {
  const tree: Prop = { kind: 'tree', x: 4, z: 0 };
  const props = frozenList([G(0, 0, 1, 1), tree, G(10, 0, 1, 1), O(5, 0), G(50, 0, 1, 1)]);
  const before = JSON.parse(JSON.stringify(props));
  const r = distributed(props, [0, 0, 1, 2, 3], 'x');
  assert.deepEqual(JSON.parse(JSON.stringify(props)), before);
  assert.equal(r[3], props[3]);
  assert.equal(r[4], props[4]);
  assert.equal(r[0].x, 0);
  assert.equal(r[2].x, 10);
  assert.ok(String(r[1].model).startsWith('meshy-'));
  const g1 = lo(r[1], 'x') - hi(r[0], 'x');
  const g2 = lo(r[2], 'x') - hi(r[1], 'x');
  close(g1, g2);
  // already even: stays (idempotent)
  const again = distributed(r, [0, 1, 2], 'x');
  again.forEach((p, i) => close(p.x, r[i].x));
});

test('inBox: either corner order, boundary inclusive, offices out, sorted indexes', () => {
  const props = [G(1, 1, 1, 1), O(2, 2), G(3, 3, 1, 1), G(5, 5, 1, 1), G(2, 2, 1, 1), { kind: 'table', x: 2.5, z: 2.5, tableIndex: 0 } as Prop];
  assert.deepEqual(inBox(props, 1, 1, 3, 3), [0, 2, 4, 5]);
  assert.deepEqual(inBox(props, 3, 3, 1, 1), [0, 2, 4, 5]);
  assert.deepEqual(inBox(props, 3, 1, 1, 3), [0, 2, 4, 5]);
  assert.deepEqual(inBox(props, 1, 3, 3, 1), [0, 2, 4, 5]);
  assert.deepEqual(inBox(props, 0.999, 0.999, 2.999, 2.999), [0, 4, 5]);
  assert.deepEqual(inBox(props, 10, 10, 20, 20), []);
  assert.deepEqual(inBox([], 0, 0, 1, 1), []);
  // a point box
  assert.deepEqual(inBox(props, 5, 5, 5, 5), [3]);
  // only the middle counts, not the footprint
  assert.deepEqual(inBox([G(0, 0, 100, 100)], 10, 10, 20, 20), []);
});

test('removedMany: takes away the free ones, keeps office / table / throne, ignores bad and repeated indexes', () => {
  const props: Prop[] = [
    G(0, 0, 1, 1),
    O(1, 1),
    { kind: 'table', x: 2, z: 2, tableIndex: 0 },
    { kind: 'throne', x: 3, z: 3 },
    G(4, 4, 1, 1),
    { kind: 'table', x: 5, z: 5 }, // a real table prop (no tableIndex)
    G(6, 6, 1, 1),
  ];
  const r = removedMany(props, [0, 0, 1, 2, 3, 5, 99, -1, 4]);
  assert.deepEqual(r, [props[1], props[2], props[3], props[6]]);
  // nothing to remove -> equal copy
  const same = removedMany(props, [1, 2, 3, 42]);
  assert.notEqual(same, props);
  assert.deepEqual(same, props);
  assert.deepEqual(removedMany(props, []), props);
});

test('removedMany: does not change the input', () => {
  const props = frozenList([G(0, 0, 1, 1), G(1, 1, 1, 1), G(2, 2, 1, 1)]);
  const ids = Object.freeze([0, 2]) as unknown as number[];
  const r = removedMany(props, ids);
  assert.equal(props.length, 3);
  assert.deepEqual(r, [props[1]]);
});

const HALL = { minX: -4, maxX: 20, minZ: 2, maxZ: 12 }; // middle (8, 7)
const boxMid = (ps: Prop[], ax: 'x' | 'z') => (Math.min(...ps.map((p) => lo(p, ax))) + Math.max(...ps.map((p) => hi(p, ax)))) / 2;

test('centered: the middle of the group box goes to the middle of the hall (x and z), the group keeps its shape', () => {
  const props = [G(0, 0, 2, 1), G(5, 3, 0.6, 2), G(9, 1, 1, 1)];
  const X = centered(props, [0, 1, 2], 'x', HALL);
  close(boxMid(X, 'x'), 8);
  for (let i = 1; i < 3; i++) close(X[i].x - X[0].x, props[i].x - props[0].x);
  X.forEach((p, i) => assert.equal(p.z, props[i].z));
  const Z = centered(props, [0, 1, 2], 'z', HALL);
  close(boxMid(Z, 'z'), 7);
  for (let i = 1; i < 3; i++) close(Z[i].z - Z[0].z, props[i].z - props[0].z);
  Z.forEach((p, i) => assert.equal(p.x, props[i].x));
});

test('centered: a single prop is centered too', () => {
  const r = centered([G(1, 1, 3, 1), G(50, 50, 1, 1)], [0], 'x', HALL);
  close(r[0].x, 8);
  assert.equal(r[0].z, 1);
  assert.equal(r[1].x, 50);
});

test('centered: turned props use the rotated extent', () => {
  const a = G(0, 0, 4, 1, { rotY: Math.PI / 2 }); // half x 0.5, half z 2
  const b = G(3, 0, 1, 1);
  const X = centered([a, b], [0, 1], 'x', HALL);
  close(boxMid(X, 'x'), 8);
  const Z = centered([a, b], [0, 1], 'z', HALL);
  close(boxMid(Z, 'z'), 7);
  close(Z[0].z, 7);
});

test('centered: office, bad and repeated indexes are ignored; nothing movable -> equal copy', () => {
  const props = [G(0, 0, 2, 2), O(100, 100), G(4, 0, 2, 2)];
  const r = centered(props, [0, 0, 1, 2, 2, 77, -1], 'x', HALL);
  assert.deepEqual(r[1], props[1]);
  close(boxMid([r[0], r[2]], 'x'), 8);
  close(r[2].x - r[0].x, 4);
  for (const ids of [[], [1], [77], [-1, 1]]) {
    const c = centered(props, ids, 'x', HALL);
    assert.notEqual(c, props);
    assert.deepEqual(c, props);
  }
});

test('centered: rounded to 1e-3, input (frozen) unchanged, tree gets frozen', () => {
  const tree: Prop = { kind: 'tree', x: 0.1234, z: 0, name: 'keep' };
  const props = frozenList([tree, G(1.11111, 0, 0.3333, 1)]);
  const before = JSON.parse(JSON.stringify(props));
  const ids = Object.freeze([0, 1]) as unknown as number[];
  const r = centered(props, ids, 'x', { minX: 0, maxX: 7.77777, minZ: 0, maxZ: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(props)), before);
  for (const p of r) assert.equal(p.x, Math.round(p.x * 1000) / 1000);
  assert.ok(String(r[0].model).startsWith('meshy-'));
  assert.equal(typeof r[0].rotY, 'number');
  assert.equal(r[0].name, 'keep');
  assert.equal(props[0].model, undefined);
});

test('centered(distributed(...)): equal gaps and the row in the middle of the hall', () => {
  const props = [G(10, 0, 2, 1), G(0, 0, 1, 1), G(3, 0, 0.6, 1)];
  const r = centered(distributed(props, [0, 1, 2], 'x'), [0, 1, 2], 'x', HALL);
  const order = [1, 2, 0].sort((a, b) => r[a].x - r[b].x);
  const g1 = lo(r[order[1]], 'x') - hi(r[order[0]], 'x');
  const g2 = lo(r[order[2]], 'x') - hi(r[order[1]], 'x');
  close(g1, g2);
  assert.ok(g1 > 0);
  close(boxMid(r, 'x'), 8);
});
