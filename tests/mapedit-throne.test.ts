// The throne (your own seat) in the map editor: isThrone / editables / split / pinned behaviour in features/mapedit/logic.ts,
// Maps.saveEdit(base, props, by, tables, throne) in server/maps.ts, and the optional `throne` of the 'map.edit' message.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Maps } from '../src/server/maps.js';
import { CADDE } from '../src/shared/maps/cadde.js';
import { THRONE_SIZE } from '../src/shared/maps/index.js';
import type { SettingsClientMsg } from '../src/shared/protocol/settings.js';
import { duplicated, editables, fitted, footprint, isThrone, moved, nameOf, removed, scaled, split, swapped, turned, CATALOG, type Prop } from '../src/client/features/mapedit/logic.js';

const T = CADDE.throne!;
const caddeProps = () => structuredClone(CADDE.props) as Record<string, unknown>[];
const fresh = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mapedit-throne-'));
  return { dir, maps: new Maps(dir), file: path.join(dir, 'maps', 'duzen.json') };
};
const noFile = (dir: string) => assert.ok(!existsSync(path.join(dir, 'maps', 'duzen.json')) && !(existsSync(path.join(dir, 'maps')) && readdirSync(path.join(dir, 'maps')).length));
const withDir = (f: (t: ReturnType<typeof fresh>) => void) => {
  const t = fresh();
  try {
    f(t);
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
};
const seat: Prop = { kind: 'throne', x: 1, z: -6, rotY: 0.5, name: 'Senin koltuğun' };
const tree: Prop = { kind: 'tree', x: 4, z: 4 };
const list = (): Prop[] => [{ ...tree }, { ...seat }];

test('isThrone is true only for kind throne', () => {
  assert.equal(isThrone(seat), true);
  assert.equal(isThrone(tree), false);
  assert.equal(isThrone({ kind: 'table', x: 0, z: 0, tableIndex: 1 }), false);
});

test('editables: the throne goes last, named by label or by default; none when null or missing', () => {
  const cfg = { props: [{ kind: 'tree', x: 1, z: 1 }], tables: [{ x: 0, z: 0, length: 3, seats: 2 }], furnished: true };
  const e = editables({ ...cfg, throne: { x: 2, z: 3, rotY: 0.4, label: 'Tahtım' } });
  assert.deepEqual(e[e.length - 1], { kind: 'throne', x: 2, z: 3, rotY: 0.4, name: 'Tahtım' });
  assert.equal(e.filter(isThrone).length, 1);
  const d = editables({ ...cfg, throne: { x: 2, z: 3 } });
  assert.equal(d[d.length - 1].name, 'Senin koltuğun');
  assert.equal(d[d.length - 1].rotY, 0);
  assert.equal(editables({ ...cfg, throne: null }).some(isThrone), false);
  assert.equal(editables(cfg).some(isThrone), false);
  assert.equal(editables({ props: [], throne: { x: 0, z: 0 }, furnished: true }).length, 1);
  const c = editables({ ...CADDE, furnished: true });
  assert.equal(c[c.length - 1].kind, 'throne');
  assert.equal(c[c.length - 1].x, T.x);
});

test('split: throne comes out as {x,z,rotY}, not in props; absent means no throne key', () => {
  const s = split(list());
  assert.deepEqual(s.props, [tree]);
  assert.deepEqual(s.tables, []);
  assert.deepEqual(s.throne, { x: 1, z: -6, rotY: 0.5 });
  const n = split([tree]);
  assert.ok(!('throne' in n));
  assert.deepEqual(split([{ kind: 'throne', x: 1, z: 2 }]).throne, { x: 1, z: 2, rotY: 0 });
  const rt = split(editables({ ...CADDE, furnished: true }));
  assert.deepEqual(rt.throne, { x: T.x, z: T.z, rotY: T.rotY ?? 0 });
  assert.equal(rt.props.length, CADDE.props.length);
  assert.ok(!rt.props.some(isThrone));
});

test('the throne is pinned: scaled, removed, duplicated, swapped leave an equal copy', () => {
  const l = list();
  const before = structuredClone(l);
  for (const out of [scaled(l, 1, 2), removed(l, 1), duplicated(l, 1), swapped(l, 1, CATALOG[0])]) {
    assert.deepEqual(out, before);
    assert.notEqual(out, l);
  }
  assert.deepEqual(l, before);
});

test('moved and turned work on the throne and touch nothing else', () => {
  const l = list();
  const m = moved(l, 1, 3.1, -4.9);
  assert.equal(m[1].x, 3);
  assert.equal(m[1].z, -5);
  assert.equal(m[1].kind, 'throne');
  assert.equal(m[1].name, 'Senin koltuğun');
  assert.deepEqual(m[0], tree);
  assert.equal(moved(l, 1, 3.1, -4.9, false)[1].x, 3.1);
  const t = turned(l, 1, Math.PI / 12);
  assert.ok(Math.abs(Number(t[1].rotY) - (0.5 + Math.PI / 12)) < 1e-3);
  assert.equal(l[1].x, 1);
  assert.equal(l[1].rotY, 0.5);
});

test('footprint and nameOf of the throne', () => {
  assert.deepEqual(footprint(seat), [THRONE_SIZE.width, THRONE_SIZE.depth]);
  assert.deepEqual(footprint({ ...seat, scale: 3, width: 9 }), [THRONE_SIZE.width, THRONE_SIZE.depth]);
  assert.equal(nameOf(seat), 'Senin koltuğun');
  assert.equal(nameOf({ ...seat, name: 'Tahtım' }), 'Tahtım');
});

test('fitted pulls the throne inside the hall, leaves a fitting one alone', () => {
  const b = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const out = fitted([{ ...seat, x: 50, z: -50, rotY: 0 }], 0, b);
  assert.ok(out[0].x < 10 && out[0].x > 8);
  assert.ok(out[0].z > -10 && out[0].z < -8);
  const ok = fitted(list(), 1, b);
  assert.deepEqual(ok, list());
  assert.deepEqual(fitted(list(), 0, b), list());
});

test('saveEdit: a valid throne move writes the whole throne with only x, z, rotY changed', () =>
  withDir(({ maps, file }) => {
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', undefined, { x: 3, z: -4, rotY: 1 }), null);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(json.throne, { ...T, x: 3, z: -4, rotY: 1 });
    assert.equal(json.throne.label, T.label);
    assert.equal(json.throne.hips, T.hips);
    assert.ok(!('tables' in json));
    assert.equal(maps.pick(), 'duzen');
    const plan = maps.plan();
    assert.equal(plan.throne!.x, 3);
    assert.equal(plan.throne!.z, -4);
  }));

test('saveEdit: unchanged throne leaves no throne key', () =>
  withDir(({ maps, file }) => {
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', undefined, { x: T.x, z: T.z, rotY: T.rotY ?? 0 }), null);
    assert.ok(!('throne' in JSON.parse(readFileSync(file, 'utf8'))));
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x'), null);
    assert.ok(!('throne' in JSON.parse(readFileSync(file, 'utf8'))));
  }));

test('saveEdit: only the turn changed still counts as moved', () =>
  withDir(({ maps, file }) => {
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', undefined, { x: T.x, z: T.z, rotY: (T.rotY ?? 0) + 1 }), null);
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).throne.rotY, (T.rotY ?? 0) + 1);
  }));

test('saveEdit: throne together with tables writes both', () =>
  withDir(({ maps, file }) => {
    const i = CADDE.tables.findIndex((t) => t.name === 'Kafe masası');
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', [{ i, x: 6, z: 8, rotY: 0 }], { x: 2, z: -3, rotY: 0.3 }), null);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(json.tables[i].x, 6);
    assert.equal(json.throne.x, 2);
    assert.equal(json.throne.z, -3);
    const plan = maps.plan();
    assert.equal(plan.throne!.x, 2);
    assert.equal(plan.config!.tables![i].x, 6);
  }));

test('saveEdit: bad throne values are refused with a message and write nothing', () =>
  withDir(({ dir, maps }) => {
    const ok = { x: 3, z: -4, rotY: 1 };
    const bad: unknown[] = [
      { ...ok, x: NaN },
      { ...ok, z: Infinity },
      { ...ok, rotY: -Infinity },
      { ...ok, x: 500 },
      { ...ok, z: -500 },
      { ...ok, x: 1e9 },
      { ...ok, x: '3' },
      { ...ok, rotY: '1' },
      { x: 3, z: -4 },
      { z: -4, rotY: 1 },
      { x: 3, rotY: 1 },
      {},
      null,
      [],
      [3, -4, 1],
      'throne',
      5,
    ];
    for (const throne of bad) {
      const r = maps.saveEdit('cadde', caddeProps(), 'x', undefined, throne);
      assert.equal(typeof r, 'string', JSON.stringify(throne));
      assert.match(r!, /Koltuk/);
    }
    assert.equal(maps.pick(), 'office');
    noFile(dir);
  }));

test('saveEdit: a bad throne with a valid table list still writes nothing', () =>
  withDir(({ dir, maps }) => {
    const i = CADDE.tables.findIndex((t) => t.name === 'Kafe masası');
    assert.equal(typeof maps.saveEdit('cadde', caddeProps(), 'x', [{ i, x: 6, z: 8, rotY: 0 }], { x: NaN, z: 0, rotY: 0 }), 'string');
    noFile(dir);
  }));

test("protocol: 'map.edit' accepts a message with or without throne", () => {
  const a: SettingsClientMsg = { t: 'map.edit', base: 'cadde', props: [] };
  const b: SettingsClientMsg = { t: 'map.edit', base: 'cadde', props: [], throne: { x: 1, z: 2, rotY: 0 } };
  const c: SettingsClientMsg = { t: 'map.edit', base: 'cadde', props: [], tables: [], throne: { x: 1, z: 2, rotY: 0 } };
  assert.equal(a.t, 'map.edit');
  assert.ok(!('throne' in a));
  assert.equal(b.t === 'map.edit' && b.throne?.x, 1);
  assert.equal(c.t === 'map.edit' && c.tables?.length, 0);
});
