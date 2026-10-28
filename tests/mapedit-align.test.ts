// The map editor's alignment while dragging (alignTo) and the grid switch of moved (features/mapedit/logic.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { alignTo, moved, type Prop } from '../src/client/features/mapedit/logic.js';

/** A sized glb prop: its footprint is exactly w × l (no scale), so the lines it offers are easy to count. */
const G = (x: number, z: number, w: number, l: number, extra: Record<string, unknown> = {}): Prop => ({ kind: 'glb', model: 'x', x, z, width: w, length: l, ...extra });
const close = (a: number, b: number, eps = 1e-9, msg?: string) => assert.ok(Math.abs(a - b) <= eps, msg ?? `${a} should be within ${eps} of ${b}`);

test('alignTo: nothing near -> not aligned, x/z exactly as given, no guides', () => {
  const props = [G(0, 0, 1, 1), G(50, 50, 1, 1), G(7.123, 31.4, 1, 1)];
  const r = alignTo(props, 2, 7.123, 31.4);
  assert.equal(r.aligned, false);
  assert.equal(r.x, 7.123);
  assert.equal(r.z, 31.4);
  assert.deepEqual(r.guides, []);
});

test('alignTo: middle lines line up on x, and z is independent', () => {
  const A = G(5, 5, 4, 4); // x lines 3, 5, 7; z lines 3, 5, 7
  const me = G(5.1, 20, 1, 1);
  const C = G(40, 20.1, 4, 4); // z lines 18.1, 20.1, 22.1
  const onlyX = alignTo([A, me], 1, 5.1, 20);
  assert.equal(onlyX.aligned, true);
  close(onlyX.x, 5);
  assert.equal(onlyX.z, 20);
  assert.deepEqual(onlyX.guides.length, 1);
  assert.equal(onlyX.guides[0].axis, 'x');
  close(onlyX.guides[0].at, 5);

  const both = alignTo([A, me, C], 1, 5.1, 20);
  assert.equal(both.aligned, true);
  close(both.x, 5);
  close(both.z, 20.1);
  const gx = both.guides.find((g) => g.axis === 'x');
  const gz = both.guides.find((g) => g.axis === 'z');
  assert.ok(gx && gz);
  close(gx.at, 5);
  close(gz.at, 20.1);
  assert.equal(both.guides.length, 2);
});

test('alignTo: two lamps side by side snap to the nearest line (a lamp is 0.6 wide: its left edge 4.9 meets the middle of the other, 5)', () => {
  const props = [{ kind: 'lamp', x: 5, z: 5 }, { kind: 'lamp', x: 5.2, z: 9 }] as Prop[];
  const r = alignTo(props, 1, 5.2, 9);
  assert.equal(r.aligned, true);
  close(r.x, 5.3); // the smallest shift (0.1) lines the left edge up with the other lamp's middle
  assert.equal(r.z, 9);
});

test('alignTo: edge to edge makes two benches flush', () => {
  const B1 = G(0, 0, 1.8, 0.6); // right edge 0.9
  const me = G(2.0, 5, 1.8, 0.6); // left edge 1.1
  const r = alignTo([B1, me], 1, 2.0, 5);
  assert.equal(r.aligned, true);
  close(r.x, 1.8); // left edge 0.9
  assert.equal(r.z, 5);
  close(r.guides[0].at, 0.9);
  assert.equal(r.guides[0].axis, 'x');
});

test('alignTo: a bench turned a quarter swaps its x and z half-widths (the other one)', () => {
  const B1 = G(0, 0, 1.8, 0.6, { rotY: Math.PI / 2 }); // covers x ±0.3, z ±0.9
  const me = G(1.3, 5, 1.8, 0.6); // left edge 0.4
  const r = alignTo([B1, me], 1, 1.3, 5);
  assert.equal(r.aligned, true, 'with the turn taken into account the edges are 0.1 apart');
  close(r.x, 1.2);
  close(r.guides[0].at, 0.3);
});

test('alignTo: the dragged bench turned a quarter uses its own turned extent', () => {
  const B1 = G(0, 0, 1.8, 0.6); // right edge 0.9, front edge 0.3
  const me = G(1.3, 100, 1.8, 0.6, { rotY: Math.PI / 2 }); // half-width in x is 0.3: left edge 1.0
  const rx = alignTo([B1, me], 1, 1.3, 100);
  assert.equal(rx.aligned, true);
  close(rx.x, 1.2); // left edge 0.9
  const mz = G(100, 1.3, 1.8, 0.6, { rotY: Math.PI / 2 }); // half-length in z is 0.9: near edge 0.4
  const rz = alignTo([B1, mz], 1, 100, 1.3);
  assert.equal(rz.aligned, true);
  close(rz.z, 1.2); // near edge 0.3
  assert.equal(rz.x, 100);
});

test('alignTo: beyond `within` nothing changes; exactly at it does not count (strictly less)', () => {
  const A = G(4, 0, 4, 4); // x lines 2, 4, 6
  const me = G(4.5, 50, 2, 2); // x lines 3.5, 4.5, 5.5: every gap to a line is 0.5 or more (all exact in binary)
  const far = alignTo([A, me], 1, 4.5, 50, 0.3);
  assert.equal(far.aligned, false);
  assert.equal(far.x, 4.5);
  const edge = alignTo([A, me], 1, 4.5, 50, 0.5);
  assert.equal(edge.aligned, false, 'a gap equal to `within` is not aligned');
  assert.equal(edge.x, 4.5);
  assert.deepEqual(edge.guides, []);
  const inside = alignTo([A, me], 1, 4.5, 50, 0.5001);
  assert.equal(inside.aligned, true);
  close(Math.abs(inside.x - 4.5), 0.5);
  const dflt = alignTo([A, G(4.29, 50, 2, 2)], 1, 4.29, 50);
  assert.equal(dflt.aligned, true, 'the default within is 0.3 (0.29 away is aligned)');
});

test('alignTo: the nearest candidate wins, whatever the order', () => {
  const near = G(10.2, 0, 0.01, 0.01);
  const far = G(10, 30, 0.01, 0.01);
  const me = G(10.12, 15, 0.01, 0.01);
  for (const [props, i] of [[[far, near, me], 2], [[me, near, far], 0], [[near, far, me], 2]] as [Prop[], number][]) {
    const r = alignTo(props, i, 10.12, 15);
    assert.equal(r.aligned, true);
    close(r.x, 10.2, 0.011);
    assert.ok(Math.abs(r.x - 10) > 0.15, 'not pulled to the farther one');
    assert.equal(r.guides.length, 1);
    close(r.guides[0].at, 10.2, 0.011);
  }
});

test('alignTo: the dragged prop is not its own candidate', () => {
  const me = G(3.21, 4.56, 1, 1);
  const r = alignTo([me], 0, 3.21, 4.56);
  assert.equal(r.aligned, false);
  assert.equal(r.x, 3.21);
  assert.equal(r.z, 4.56);
  assert.deepEqual(r.guides, []);
  // and the passed (x, z), not its old place, is what is compared: a dragged copy of itself far away
  const r2 = alignTo([G(0, 0, 1, 1), G(9, 9, 1, 1)], 1, 20, 20);
  assert.equal(r2.aligned, false);
});

test('alignTo: a bad index gives the input back untouched', () => {
  const props = [G(0, 0, 1, 1), G(0.1, 0.1, 1, 1)];
  for (const i of [-1, 2, 99, 1.5, NaN]) {
    const r = alignTo(props, i, 0.05, 0.05);
    assert.equal(r.aligned, false, `index ${i}`);
    assert.equal(r.x, 0.05);
    assert.equal(r.z, 0.05);
    assert.deepEqual(r.guides, []);
  }
  assert.equal(alignTo([], 0, 1, 2).aligned, false);
});

test('alignTo and moved: the list given is never changed', () => {
  const list = [G(5, 5, 4, 4), G(5.1, 20, 1, 1), G(40, 20.1, 4, 4)].map((p) => Object.freeze(p));
  Object.freeze(list);
  const copy = JSON.parse(JSON.stringify(list));
  assert.doesNotThrow(() => alignTo(list, 1, 5.1, 20));
  assert.doesNotThrow(() => moved(list, 1, 5, 20.1, false));
  assert.deepEqual(JSON.parse(JSON.stringify(list)), copy);
  const out = moved(list, 1, 5, 20.1, false);
  assert.notEqual(out, list);
  assert.equal(list[1].x, 5.1);
});

test('alignTo: an office is a reference (width and length, no scale)', () => {
  const office: Prop = { kind: 'office', x: 0, z: 0, width: 10, length: 8 }; // x lines -5, 0, 5; z lines -4, 0, 4
  const me = G(5.7, 20, 1, 1); // left edge 5.2
  const r = alignTo([office, me], 1, 5.7, 20);
  assert.equal(r.aligned, true);
  close(r.x, 5.5); // flush with the office's right wall
  close(r.guides[0].at, 5);
  assert.equal(r.z, 20);
  const rz = alignTo([office, G(30, 4.7, 1, 1)], 1, 30, 4.7);
  assert.equal(rz.aligned, true);
  close(rz.z, 4.5);
});

test('moved: grid false rounds to a millimetre, grid true to a quarter', () => {
  const props = [G(0, 0, 1, 1)];
  const free = moved(props, 0, 3.1234, 7.8765, false);
  assert.equal(free[0].x, 3.123);
  assert.equal(free[0].z, 7.877);
  const snapped = moved(props, 0, 3.2234, 7.8765);
  assert.equal(snapped[0].x, 3.25);
  assert.equal(snapped[0].z, 8);
  assert.equal(moved(props, 0, 3.1234, 0, true)[0].x, 3);
  assert.equal(moved(props, 0, 3.2234, 0, false)[0].x, 3.223);
});

test('moved: an office stays where it is, grid or not', () => {
  const props: Prop[] = [{ kind: 'office', x: 1, z: 2, width: 10, length: 8 }];
  assert.deepEqual(moved(props, 0, 9, 9, false), props);
  assert.deepEqual(moved(props, 0, 9, 9), props);
});

test('alignTo then moved(grid false) keeps the exact line; grid true would pull it off', () => {
  const A = G(5.1, 0, 4, 4);
  const me = G(5.2, 50, 1, 1);
  const props = [A, me];
  const a = alignTo(props, 1, 5.2, 50);
  assert.equal(a.aligned, true);
  close(a.x, 5.1);
  const exact = moved(props, 1, a.x, a.z, !a.aligned);
  assert.equal(exact[1].x, 5.1);
  assert.equal(exact[1].z, 50);
  const pulled = moved(props, 1, a.x, a.z, true);
  assert.equal(pulled[1].x, 5, 'with the grid on it would have been snapped off the line');
});
