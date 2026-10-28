// The map editor's catalog (features/mapedit/logic.ts) against the Meshy pack's contract and the map validator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOG } from '../src/client/features/mapedit/logic.js';
import { CADDE } from '../src/shared/maps/cadde.js';
import { MapError, planMap } from '../src/shared/maps/index.js';

const meshySrc = readFileSync('src/client/world/cadde/meshy.ts', 'utf8');
const keysBlock = /MESHY_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(meshySrc);
const meshyKeys = new Set([...(keysBlock?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
const pieces = (JSON.parse(readFileSync('blender/furniture.json', 'utf8')) as { pieces: Record<string, unknown> }).pieces;
const key = (id: string) => id.replace(/^meshy-/, '');

test('MESHY_KEYS was parsed', () => {
  assert.ok(meshyKeys.size >= 20);
});

test('every catalog id is a MESHY_KEYS key', () => {
  for (const c of CATALOG) assert.ok(meshyKeys.has(key(c.id)), `${c.id} is not in MESHY_KEYS`);
});

test('every catalog id is a piece in blender/furniture.json', () => {
  for (const c of CATALOG) assert.ok(key(c.id) in pieces, `${c.id} has no furniture.json piece`);
});

test('every catalog id passes the map validator model regex', () => {
  for (const c of CATALOG) assert.match(c.id, /^[a-z0-9][a-z0-9_-]{0,39}$/);
});

test('planMap accepts a catalog prop and rejects an invalid model name', () => {
  const withProp = (model: string) => ({ ...CADDE, id: 'x', props: [...(CADDE.props ?? []), { kind: 'glb', model, x: 0, z: 14, width: 2, length: 0.9 }] });
  assert.doesNotThrow(() => planMap(withProp('meshy-kanepe')));
  assert.throws(() => planMap(withProp('Meshy Kanepe')), MapError);
});
