// streetFurniture (shared/maps/cadde-props.ts), editables' use of it, saveEdit's `furnished`, the fridge in the catalog,
// and the wiring of `furnished` into the street builder (world/cadde/index.ts, kaykit.ts: DOM/three, so read as text).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Maps } from '../src/server/maps.js';
import { CADDE } from '../src/shared/maps/cadde.js';
import { officeBox, officePoint, streetFurniture } from '../src/shared/maps/cadde-props.js';
import { planMap } from '../src/shared/maps/index.js';
import type { PropConfig } from '../src/shared/maps/types.js';
import { CATALOG, GROUPS, editables, split, type Prop } from '../src/client/features/mapedit/logic.js';

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const near = (a: unknown, b: number) => assert.ok(Math.abs(Number(a) - b) < 1e-3, `${a} !~ ${b}`);
const byModel = (l: PropConfig[], m: string) => l.filter((p) => p.model === m);
const props = CADDE.props as PropConfig[];

test('streetFurniture on the real street: 14 bushes, 2 hydrants, 2 bins, a fridge, a menu stand = 20', () => {
  const f = streetFurniture(props);
  assert.equal(props.filter((p) => p.kind === 'office').length, 7);
  assert.equal(f.length, 20);
  assert.equal(byModel(f, 'meshy-cali').length, 14);
  assert.equal(byModel(f, 'meshy-hidrant').length, 2);
  assert.equal(byModel(f, 'meshy-cop-kutusu').length, 2);
  assert.equal(byModel(f, 'meshy-buzdolabi').length, 1);
  assert.equal(byModel(f, 'meshy-menu-sehpasi').length, 1);
  for (const p of f) {
    assert.equal(p.kind, 'glb');
    assert.equal(p.x, r3(p.x));
    assert.equal(p.z, r3(p.z));
    assert.equal(p.width, p.length);
  }
});

test('streetFurniture: sizes and fixed positions', () => {
  const f = streetFurniture(props);
  for (const p of byModel(f, 'meshy-cali')) assert.equal(p.width, 0.9);
  const h = byModel(f, 'meshy-hidrant').sort((a, b) => a.x - b.x);
  assert.deepEqual(h.map((p) => [p.x, p.z, p.width, p.length]), [[-8.6, 22, 0.5, 0.5], [8.6, 22, 0.5, 0.5]]);
  const b = byModel(f, 'meshy-cop-kutusu').sort((a, c) => a.x - c.x);
  assert.deepEqual(b.map((p) => [p.x, p.z, p.width, p.length]), [[-8.4, 16.6, 0.5, 0.5], [8.4, 16.6, 0.5, 0.5]]);
  assert.equal(byModel(f, 'meshy-buzdolabi')[0].width, 0.8);
  assert.equal(byModel(f, 'meshy-menu-sehpasi')[0].width, 0.6);
});

test('streetFurniture: bushes sit where the old dress code put them (officePoint, +-(width/2-0.8), length/2+1.1)', () => {
  const f = byModel(streetFurniture(props), 'meshy-cali');
  const want: [number, number][] = [];
  for (const p of props.filter((q) => q.kind === 'office')) {
    const o = officeBox(p);
    for (const side of [-1, 1]) want.push(officePoint(p, side * (o.width / 2 - 0.8), o.length / 2 + 1.1));
  }
  assert.equal(f.length, want.length);
  want.forEach(([x, z], i) => {
    near(f[i].x, x);
    near(f[i].z, z);
  });
  // a turned, scaled office too
  const t: PropConfig = { kind: 'office', x: 10, z: -5, rotY: Math.PI / 2, scale: 1.5, width: 10, length: 12 };
  const g = streetFurniture([t]);
  const o = officeBox(t);
  const [x0, z0] = officePoint(t, -(o.width / 2 - 0.8), o.length / 2 + 1.1);
  near(g[0].x, x0);
  near(g[0].z, z0);
});

test('streetFurniture: fridge and menu stand follow the counter exactly as kaykit dress did', () => {
  const c = props.find((q) => q.kind === 'counter')!;
  assert.ok(c);
  const r = c.rotY ?? 0;
  const by = (across: number, out: number): [number, number] => [c.x + Math.cos(r) * across + Math.sin(r) * out, c.z - Math.sin(r) * across + Math.cos(r) * out];
  const w = (c.width ?? 4) * (c.scale ?? 1);
  const f = streetFurniture(props);
  const fr = byModel(f, 'meshy-buzdolabi')[0];
  const [fx, fz] = by(-w / 2 + 0.2, -1.2);
  near(fr.x, fx);
  near(fr.z, fz);
  near(fr.rotY ?? 0, r);
  const mn = byModel(f, 'meshy-menu-sehpasi')[0];
  const [mx, mz] = by(w / 2 + 0.2, 1.8);
  near(mn.x, mx);
  near(mn.z, mz);
  near(mn.rotY ?? 0, r + 0.5);
  // a turned and scaled counter
  const c2: PropConfig = { kind: 'counter', x: 3, z: 4, rotY: 1.2, scale: 2, width: 5 };
  const g = streetFurniture([c2]);
  const bb = (a: number, o: number): [number, number] => [3 + Math.cos(1.2) * a + Math.sin(1.2) * o, 4 - Math.sin(1.2) * a + Math.cos(1.2) * o];
  near(g.find((p) => p.model === 'meshy-buzdolabi')!.x, bb(-4.8, -1.2)[0]);
  near(g.find((p) => p.model === 'meshy-menu-sehpasi')!.z, bb(5.2, 1.8)[1]);
});

test('streetFurniture: no counter means no fridge or menu; no office means no bushes; empty still has hydrants and bins', () => {
  const noCounter = streetFurniture(props.filter((p) => p.kind !== 'counter'));
  assert.equal(byModel(noCounter, 'meshy-buzdolabi').length + byModel(noCounter, 'meshy-menu-sehpasi').length, 0);
  assert.equal(noCounter.length, 18);
  const noOffice = streetFurniture(props.filter((p) => p.kind !== 'office'));
  assert.equal(byModel(noOffice, 'meshy-cali').length, 0);
  assert.equal(noOffice.length, 6);
  assert.equal(streetFurniture([]).length, 4);
});

test('streetFurniture does not change its input', () => {
  const before = structuredClone(props);
  streetFurniture(props);
  assert.deepEqual(props, before);
});

test('every model it makes is in MESHY_KEYS and blender/furniture.json, and the map plans with it', () => {
  const src = readFileSync('src/client/world/cadde/meshy.ts', 'utf8');
  const block = /MESHY_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(src);
  const keys = new Set([...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const pieces = (JSON.parse(readFileSync('blender/furniture.json', 'utf8')) as { pieces: Record<string, unknown> }).pieces;
  const f = streetFurniture(props);
  for (const m of new Set(f.map((p) => String(p.model)))) {
    const k = m.replace(/^meshy-/, '');
    assert.ok(keys.has(k), `${m} not in MESHY_KEYS`);
    assert.ok(k in pieces, `${m} not in furniture.json`);
  }
  assert.doesNotThrow(() => planMap({ ...CADDE, id: 'x', props: [...props, ...f] }));
});

test('editables: not furnished adds the furniture after props and before tables; furnished does not', () => {
  const tables = CADDE.tables;
  const cfg = { props: structuredClone(props) as Prop[], tables };
  const e = editables(cfg);
  const f = streetFurniture(props);
  assert.equal(e.slice(0, props.length).every((p, i) => p.kind === props[i].kind), true);
  assert.deepEqual(e.slice(props.length, props.length + f.length), f);
  const firstTable = e.findIndex((p) => p.kind === 'table');
  assert.equal(firstTable, props.length + f.length);
  for (const v of [false, undefined]) assert.equal(editables({ ...cfg, furnished: v }).length, e.length);
  const done = editables({ ...cfg, furnished: true });
  assert.equal(done.length, e.length - f.length);
  assert.ok(!done.some((p) => String(p.model).startsWith('meshy-cali')));
});

test('split(editables(...)) keeps the furniture in props when not furnished, and does not duplicate it when furnished', () => {
  const cfg = { props: structuredClone(props) as Prop[], tables: CADDE.tables };
  const rt = split(editables(cfg));
  assert.equal(rt.props.length, props.length + 20);
  // a saved (furnished) map comes back as it was
  const saved = rt.props;
  const again = split(editables({ props: saved, tables: CADDE.tables, furnished: true }));
  assert.deepEqual(again.props, saved);
  assert.equal(editables({ props: saved, furnished: true }).length, saved.length);
});

test('saveEdit writes furnished: true, always (props with and without furniture)', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'furnished-'));
  try {
    const maps = new Maps(dir);
    const file = path.join(dir, 'maps', 'duzen.json');
    const plain = structuredClone(props) as Record<string, unknown>[];
    assert.equal(maps.saveEdit('cadde', plain, 'x'), null);
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).furnished, true);
    assert.equal(maps.plan().config!.furnished, true);
    rmSync(file);
    const full = [...plain, ...streetFurniture(props)] as Record<string, unknown>[];
    assert.equal(maps.saveEdit('cadde', full, 'x'), null);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(json.furnished, true);
    assert.equal(json.props.length, full.length);
    assert.ok(existsSync(file));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catalog has the fridge (Buzdolabı 0.8x0.8) in the Kafe group', () => {
  const c = CATALOG.find((x) => x.id === 'meshy-buzdolabi')!;
  assert.ok(c);
  assert.equal(c.label, 'Buzdolabı');
  assert.equal(c.width, 0.8);
  assert.equal(c.length, 0.8);
  const kafe = GROUPS.find((g) => g.title.includes('Kafe'))!;
  assert.ok(kafe.ids.includes('meshy-buzdolabi'));
  assert.equal(GROUPS.filter((g) => g.ids.includes('meshy-buzdolabi')).length, 1);
});

test('wiring: MapConfig.furnished exists and the street builder passes it to dress', () => {
  assert.match(readFileSync('src/shared/maps/types.ts', 'utf8'), /furnished\?:\s*boolean/);
  assert.match(readFileSync('src/client/world/cadde/index.ts', 'utf8'), /dress\(\s*kit\s*,\s*c\.props\s*\?\?\s*\[\]\s*,\s*c\.furnished\s*===\s*true\s*\)/);
  assert.match(readFileSync('src/client/world/cadde/kaykit.ts', 'utf8'), /export function dress\(\s*kit: CaddeKit,\s*props: PropConfig\[\],\s*furnished\s*=\s*false\s*\)/);
});
