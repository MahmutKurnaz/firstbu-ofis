// Maps.saveEdit (server/maps.ts) and the wiring of the map editor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Maps } from '../src/server/maps.js';
import { CADDE } from '../src/shared/maps/cadde.js';

const fresh = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mapedit-'));
  return { dir, maps: new Maps(dir), file: path.join(dir, 'maps', 'duzen.json') };
};
const caddeProps = () => structuredClone(CADDE.props) as Record<string, unknown>[];
const movedTree = () => {
  const props = caddeProps();
  const i = props.findIndex((p) => p.kind === 'tree');
  assert.ok(i >= 0);
  props[i] = { ...props[i], x: (props[i].x as number) + 0.5 };
  return { props, i };
};
const noFile = (dir: string) => assert.ok(!existsSync(path.join(dir, 'maps', 'duzen.json')) && !(existsSync(path.join(dir, 'maps')) && readdirSync(path.join(dir, 'maps')).length));

test('saveEdit on the street writes duzen.json, picks it and plans the moved tree', () => {
  const { dir, maps, file } = fresh();
  const { props, i } = movedTree();
  assert.equal(maps.saveEdit('cadde', props, 'x'), null);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(json.id, 'duzen');
  assert.equal(json.extends, 'cadde');
  assert.equal(json.props.length, CADDE.props!.length);
  assert.equal(maps.pick(), 'duzen');
  const planned = maps.plan().config.props!;
  assert.equal(planned.length, props.length);
  assert.equal(planned[i].x, props[i].x);
  assert.equal(maps.state().by, 'x');
  assert.ok(dir);
});

test('saveEdit again with base duzen works', () => {
  const { maps } = fresh();
  const { props, i } = movedTree();
  assert.equal(maps.saveEdit('cadde', props, 'a'), null);
  props[i] = { ...props[i], z: (props[i].z as number) + 0.5 };
  assert.equal(maps.saveEdit('duzen', props, 'b'), null);
  assert.equal(maps.pick(), 'duzen');
  assert.equal(maps.plan().config.props![i].z, props[i].z);
  assert.equal(maps.state().by, 'b');
});

test('saveEdit refuses other maps', () => {
  const { dir, maps } = fresh();
  const before = maps.pick();
  assert.equal(typeof maps.saveEdit('castle', caddeProps(), 'x'), 'string');
  assert.equal(typeof maps.saveEdit('', caddeProps(), 'x'), 'string');
  assert.equal(maps.pick(), before);
  noFile(dir);
});

test('saveEdit refuses bad lists and leaves everything as it was', () => {
  const { dir, maps } = fresh();
  const before = maps.pick();
  const bad: unknown[] = [
    { not: 'an array' },
    'props',
    null,
    Array.from({ length: 401 }, () => ({ kind: 'tree', x: 0, z: 0 })),
    [...caddeProps(), { kind: 'nope', x: 0, z: 0 }],
  ];
  for (const props of bad) assert.equal(typeof maps.saveEdit('cadde', props, 'x'), 'string');
  const noX = caddeProps();
  delete noX[noX.findIndex((p) => p.kind === 'tree')].x;
  assert.equal(typeof maps.saveEdit('cadde', noX, 'x'), 'string', 'a prop without x');
  assert.equal(maps.pick(), before);
  noFile(dir);
});

test('saveEdit drops unknown fields from the written JSON', () => {
  const { maps, file } = fresh();
  const props = caddeProps();
  const evil = JSON.parse('{"__proto__": {"polluted": true}, "evil": 1}') as Record<string, unknown>;
  props[7] = { ...props[7], ...evil, evil: 1 };
  Object.defineProperty(props[7], '__proto__', { value: { polluted: 1 }, enumerable: true, configurable: true });
  assert.equal(maps.saveEdit('cadde', props, 'x'), null);
  const text = readFileSync(file, 'utf8');
  assert.ok(!text.includes('evil'));
  assert.ok(!text.includes('polluted'));
  const json = JSON.parse(text);
  assert.deepEqual(Object.keys(json.props[7]).filter((k) => !['kind', 'x', 'z', 'y', 'rotY', 'scale', 'width', 'height', 'length', 'color', 'light', 'model', 'style'].includes(k)), []);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('the editor is wired in: client main, server handler (admin only) and protocol', () => {
  const main = read('src/client/main.ts');
  assert.equal(main.split('installMapEdit(ctx').length - 1, 1);
  const h = read('src/server/ws/handlers/settings.ts');
  const start = h.indexOf("'map.edit'(");
  assert.ok(start >= 0, 'a map.edit handler');
  const body = h.slice(start, h.indexOf("\n  },", start));
  assert.match(body, /\.admin/);
  assert.match(body, /saveEdit/);
  assert.match(read('src/shared/protocol/settings.ts'), /t: 'map\.edit'/);
});
