// Maps.saveEdit(base, props, by, tables) (server/maps.ts): moving the street's tables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Maps } from '../src/server/maps.js';
import { CADDE } from '../src/shared/maps/cadde.js';
import { rightIsInner } from '../src/shared/maps/tables.js';

const fresh = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mapedit-tables-'));
  return { dir, maps: new Maps(dir), file: path.join(dir, 'maps', 'duzen.json') };
};
const caddeProps = () => structuredClone(CADDE.props) as Record<string, unknown>[];
const cafeI = CADDE.tables.findIndex((t) => t.name === 'Kafe masası');
const deskI = CADDE.tables.findIndex((t) => t.look === 'desk');
const noFile = (dir: string) => assert.ok(!existsSync(path.join(dir, 'maps', 'duzen.json')) && !(existsSync(path.join(dir, 'maps')) && readdirSync(path.join(dir, 'maps')).length));
const withDir = (f: (t: ReturnType<typeof fresh>) => void) => {
  const t = fresh();
  try {
    f(t);
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
};

test('a valid table move writes the whole tables list with that table moved', () =>
  withDir(({ maps, file }) => {
    assert.ok(cafeI >= 0);
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', [{ i: cafeI, x: 6, z: 8, rotY: 0 }]), null);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(json.tables.length, CADDE.tables.length);
    assert.equal(json.tables[cafeI].x, 6);
    assert.equal(json.tables[cafeI].z, 8);
    assert.equal(json.tables[cafeI].rotY, 0);
    assert.equal(json.tables[cafeI].length, CADDE.tables[cafeI].length);
    assert.equal(rightIsInner(json.tables[cafeI]), rightIsInner(CADDE.tables[cafeI]));
    json.tables.forEach((t: { x: number }, i: number) => i !== cafeI && assert.equal(t.x, CADDE.tables[i].x));
    assert.equal(maps.pick(), 'duzen');
    assert.equal(maps.plan().config!.tables![cafeI].x, 6);
  }));

test('no table changed (or no tables at all): no tables key in the json', () =>
  withDir(({ maps, file }) => {
    const t = CADDE.tables[cafeI];
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', [{ i: cafeI, x: t.x, z: t.z, rotY: t.rotY ?? 0 }]), null);
    assert.ok(!('tables' in JSON.parse(readFileSync(file, 'utf8'))));
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x', []), null);
    assert.ok(!('tables' in JSON.parse(readFileSync(file, 'utf8'))));
    assert.equal(maps.saveEdit('cadde', caddeProps(), 'x'), null);
    assert.ok(!('tables' in JSON.parse(readFileSync(file, 'utf8'))));
  }));

test('bad table lists are refused with a message and write nothing', () =>
  withDir(({ dir, maps }) => {
    const ok = { i: cafeI, x: 6, z: 8, rotY: 0 };
    const bad: unknown[] = [
      [{ i: deskI, x: 1, z: 1, rotY: 0 }],
      [{ ...ok, i: -1 }],
      [{ ...ok, i: CADDE.tables.length }],
      [{ ...ok, i: 1.5 }],
      [{ ...ok, i: '12' }],
      [{ ...ok, x: NaN }],
      [{ ...ok, z: Infinity }],
      [{ ...ok, rotY: NaN }],
      [{ ...ok, x: 1e9 }],
      [{ ...ok, z: -500 }],
      [{ ...ok, x: '6' }],
      [{ i: cafeI, x: 6, z: 8 }],
      [null],
      ['x'],
      Array.from({ length: 41 }, () => ok),
      { not: 'an array' },
      'tables',
      null,
      5,
    ];
    for (const tables of bad) {
      const r = maps.saveEdit('cadde', caddeProps(), 'x', tables);
      assert.equal(typeof r, 'string', JSON.stringify(tables)?.slice(0, 60));
      assert.ok(r!.length > 0);
    }
    assert.equal(maps.pick(), 'office');
    noFile(dir);
  }));
