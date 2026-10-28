// Tables in the map editor: movedTable / rightIsInner (shared/maps/tables.ts), treeLook, frozen and the table parts of
// features/mapedit/logic.ts, and planMap's seat numbering staying put when a table is moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CADDE } from '../src/shared/maps/cadde.js';
import { treeLook } from '../src/shared/maps/cadde-props.js';
import { BENCH_OUT, planMap } from '../src/shared/maps/index.js';
import { movedTable, rightIsInner } from '../src/shared/maps/tables.js';
import type { TableConfig } from '../src/shared/maps/types.js';
import { PINNED, duplicated, editables, fitted, footprint, frozen, moved, nameOf, removed, scaled, split, swapped, turned, CATALOG, type Prop } from '../src/client/features/mapedit/logic.js';

const cafe = () => CADDE.tables.find((t) => t.name === 'Kafe masası')!;
const spots: [number, number, number][] = [
  [0, 5.6, Math.PI / 2],
  [6, 8, 0],
  [-7.5, 3, 1],
  [3.25, -2, -2.4],
  [-4, 10, Math.PI],
  [0.5, 0.5, 0],
];
const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const freeze = <T>(o: T): T => {
  Object.values(o as object).forEach((v) => typeof v === 'object' && v && Object.freeze(v));
  return Object.freeze(o);
};

test('movedTable keeps rightIsInner, whatever the place, turn or starting flip', () => {
  const bases: TableConfig[] = [cafe(), { ...cafe(), flip: true }, { ...cafe(), x: 5, z: -3, rotY: 0.7 }, { ...cafe(), x: -5, z: 4, rotY: 2, flip: true }, { x: 0, z: 0, length: 3, seats: 2 }];
  for (const t of bases) {
    const before = rightIsInner(t);
    for (const [x, z, r] of spots) {
      const m = movedTable(t, x, z, r);
      assert.equal(rightIsInner(m), before, `from ${JSON.stringify(t)} to ${x},${z},${r}`);
    }
  }
});

test('movedTable applies x, z, rotY, keeps the other fields and never mutates its input', () => {
  const t = freeze({ ...cafe() });
  const m = movedTable(t, 3, -2, 1.2);
  assert.equal(m.x, 3);
  assert.equal(m.z, -2);
  assert.equal(m.rotY, 1.2);
  assert.equal(m.length, t.length);
  assert.equal(m.seats, t.seats);
  assert.equal(m.name, t.name);
  assert.equal(t.x, cafe().x);
  assert.notEqual(m, t);
  // flip is only ever set to true, never left false
  for (const [x, z, r] of spots) assert.ok(movedTable(t, x, z, r).flip === undefined || movedTable(t, x, z, r).flip === true);
});

test('planMap: moving the café table changes only seat positions, not ids or labels or their order', () => {
  const base = planMap(CADDE);
  const tablesFor = (x: number, z: number, r: number) => CADDE.tables.map((t) => (t === cafe() || t.name === 'Kafe masası' ? movedTable(t, x, z, r) : t));
  const ids = (p: typeof base) => [p.desks.map((d) => [d.id, d.label]), p.overflow.map((d) => [d.id, d.label])];
  for (const [x, z, r] of [spots[0], spots[1], [-9, 9, 1.1], [8, 12, -2.4], [0, 8, Math.PI]]) {
    let plan: typeof base | undefined;
    assert.doesNotThrow(() => {
      plan = planMap({ ...CADDE, id: 'x', tables: tablesFor(x, z, r) });
    }, `at ${x},${z},${r}`);
    assert.deepEqual(ids(plan!), ids(base), `at ${x},${z},${r}`);
  }
  // and it really did move them
  const p2 = planMap({ ...CADDE, id: 'x', tables: tablesFor(6, 8, 0) });
  const all = (p: typeof base) => [...p.desks, ...p.overflow];
  assert.ok(all(p2).some((d, i) => d.x !== all(base)[i].x || d.z !== all(base)[i].z));
});

test('treeLook: from the place when there is no model, repeatable', () => {
  const a = treeLook({ x: 3.5, z: -8 });
  assert.deepEqual(treeLook({ x: 3.5, z: -8 }), a);
  assert.ok(a.key === 'agac-ince' || a.key === 'agac-genis');
  const keys = new Set<string>();
  for (let x = 0; x < 30; x++) keys.add(treeLook({ x, z: 1 }).key);
  assert.equal(keys.size, 2, 'both come up across a street');
});

test('treeLook: a model of its own wins, a bad one falls back to the formula', () => {
  assert.deepEqual(treeLook({ x: 1, z: 2, model: 'meshy-agac-ince' }), { key: 'agac-ince', turn: 0 });
  assert.deepEqual(treeLook({ x: 1, z: 2, model: 'meshy-agac-genis' }), { key: 'agac-genis', turn: 0 });
  for (const model of ['meshy-bank', 'agac-ince', 42, null, {}, '']) assert.deepEqual(treeLook({ x: 1, z: 2, model }), treeLook({ x: 1, z: 2 }));
});

test('frozen leaves non-trees and props with a model alone', () => {
  const bench: Prop = { kind: 'bench', x: 1, z: 2 };
  assert.equal(frozen(bench), bench);
  const glb: Prop = { kind: 'glb', model: 'meshy-bank', x: 1, z: 2 };
  assert.equal(frozen(glb), glb);
  const tree: Prop = { kind: 'tree', x: 1, z: 2, model: 'meshy-agac-ince' };
  assert.equal(frozen(tree), tree);
});

test('a tree that is moved keeps its look: same key, same total turn', () => {
  for (const [x, z, rotY] of [[3.5, -8, undefined], [10, 4, 0.6], [-7, 2.2, -1], [0, 0, undefined], [13.1, 5.9, 3]] as const) {
    const tree: Prop = { kind: 'tree', x, z, ...(rotY !== undefined ? { rotY } : {}) };
    const old = treeLook(tree);
    const out = moved([tree], 0, x + 7.3, z - 4.1)[0];
    const now = treeLook(out);
    assert.equal(now.key, old.key);
    const total = (p: Prop, l: { turn: number }) => norm(Number(p.rotY ?? 0) + l.turn);
    const d = Math.abs(total(out, now) - total(tree, old));
    assert.ok(Math.min(d, Math.PI * 2 - d) < 1e-3, `turn ${total(out, now)} vs ${total(tree, old)}`);
    // moving it again changes nothing about the look
    const again = moved([out], 0, 1, 1)[0];
    assert.equal(again.model, out.model);
    assert.equal(again.rotY, out.rotY);
  }
});

test('editables / split: tables that are not desks become table props and split gives them back', () => {
  const config = { props: structuredClone(CADDE.props) as Prop[], tables: CADDE.tables, furnished: true };
  const list = editables(config);
  const tableProps = list.filter((p) => p.kind === 'table');
  const plain = CADDE.tables.map((t, i) => [t, i] as const).filter(([t]) => !t.look);
  assert.equal(tableProps.length, plain.length);
  assert.ok(plain.length >= 1);
  assert.equal(list.length, config.props.length + plain.length);
  for (const [t, i] of plain) {
    const p = tableProps.find((q) => q.tableIndex === i)!;
    assert.ok(p, `table ${i}`);
    assert.equal(p.x, t.x);
    assert.equal(p.z, t.z);
    assert.equal(p.rotY, t.rotY ?? 0);
    assert.equal(p.length, t.length);
    assert.equal(p.width, t.width ?? 1.4);
    assert.equal(p.name, t.name ?? `Masa ${i + 1}`);
  }
  assert.ok(!tableProps.some((p) => CADDE.tables[Number(p.tableIndex)].look), 'no desk-look table');
  const { props, tables } = split(list);
  assert.deepEqual(props, config.props);
  assert.deepEqual(tables, plain.map(([t, i]) => ({ i, x: t.x, z: t.z, rotY: t.rotY ?? 0 })));
});

test('editables copies props and tolerates a config without props or tables', () => {
  const props: Prop[] = [{ kind: 'tree', x: 1, z: 1 }];
  const out = editables({ props, furnished: true });
  assert.deepEqual(out, props);
  assert.notEqual(out[0], props[0]);
  assert.deepEqual(editables({ furnished: true }), []);
  assert.deepEqual(split([]), { props: [], tables: [] });
});

test('table props can only be moved and turned', () => {
  assert.ok(PINNED.has('table') && PINNED.has('office'));
  const l: Prop[] = [{ kind: 'table', x: 1, z: 1, rotY: 0, length: 3, width: 1.4, name: 'Masa', tableIndex: 0 }, { kind: 'tree', x: 5, z: 5 }];
  for (const out of [scaled(l, 0, 2), removed(l, 0), duplicated(l, 0), swapped(l, 0, CATALOG[0])]) {
    assert.deepEqual(out, l);
    assert.notEqual(out, l);
  }
  const m = moved(l, 0, 3.1, 4.1);
  assert.equal(m[0].x, 3);
  assert.equal(m[0].z, 4);
  assert.equal(m[0].tableIndex, 0);
  assert.equal(m[0].model, undefined);
  const t = turned(l, 0, Math.PI / 12);
  assert.equal(t[0].rotY, Math.round((Math.PI / 12) * 1e4) / 1e4);
});

test('footprint and nameOf of a table', () => {
  const t: Prop = { kind: 'table', x: 0, z: 0, length: 7.5, width: 2, name: 'Kafe masası', tableIndex: 0 };
  const wide = 2 + 2 * (BENCH_OUT + 0.22);
  assert.deepEqual(footprint(t), [wide, 7.5]);
  assert.deepEqual(footprint({ ...t, width: undefined }), [1.4 + 2 * (BENCH_OUT + 0.22), 7.5]);
  assert.equal(nameOf(t), 'Kafe masası');
});

test('fitted pulls a table that sticks out back inside the hall', () => {
  const b = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  for (const rotY of [0, Math.PI / 2]) {
    const t: Prop = { kind: 'table', x: 9.5, z: 9.5, rotY, length: 8, width: 2, name: 'm', tableIndex: 0 };
    const out = fitted([t], 0, b)[0];
    const [w, l] = footprint(t);
    const hx = (Math.abs(Math.sin(rotY)) * l + Math.abs(Math.cos(rotY)) * w) / 2;
    const hz = (Math.abs(Math.cos(rotY)) * l + Math.abs(Math.sin(rotY)) * w) / 2;
    assert.ok(out.x + hx <= b.maxX && out.z + hz <= b.maxZ, `rotY ${rotY}`);
    assert.ok(out.x < t.x || out.z < t.z);
    const low = fitted([{ ...t, x: -50, z: -50 }], 0, b)[0];
    assert.ok(low.x - hx >= b.minX && low.z - hz >= b.minZ);
    assert.equal(t.x, 9.5, 'input untouched');
  }
});

test('fitted leaves a table that is inside, and anything that is not a table', () => {
  const b = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const inside: Prop = { kind: 'table', x: 0, z: 0, rotY: 0.4, length: 4, width: 1.4, tableIndex: 0 };
  assert.deepEqual(fitted([inside], 0, b), [inside]);
  const tree: Prop = { kind: 'tree', x: 99, z: 99 };
  assert.deepEqual(fitted([tree], 0, b), [tree]);
  assert.deepEqual(fitted([tree], 5, b), [tree]);
});
