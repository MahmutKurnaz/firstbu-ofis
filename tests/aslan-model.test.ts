import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { openModel } from './glb';
import { ANIMAL_HEIGHT, clipFor } from '../src/client/world/character/animal.js';
import { CHARACTER_MODELS, characterOf } from '../src/client/features/characters/index.js';

// aslan.glb, the lion lead (blender/scripts/build_aslan.py, merge_clips.mjs), against what AnimalSkin plays:
// clips idle, walk and sit that really move its bones, one skinned mesh, a JPEG skin, a size the download can bear.

const FILE = new URL('../src/client/models/aslan.glb', import.meta.url);
const { gltf, nodes } = openModel('aslan');

type Channel = { sampler: number; target: { node?: number; path: string } };
type Anim = { name?: string; channels: Channel[]; samplers: { input: number; output: number }[] };
type Full = { animations: Anim[]; skins: { joints: number[] }[]; images?: { mimeType?: string }[]; accessors: { count: number }[]; meshes: { primitives: { attributes: Record<string, number> }[] }[] };
const g = gltf as unknown as Full;

test('aslan.glb is under 3 MB, with one JPEG image', () => {
  assert.ok(statSync(FILE).size < 3 * 1024 * 1024, `${statSync(FILE).size} bytes`);
  assert.equal(g.images?.length, 1);
  assert.equal(g.images![0].mimeType, 'image/jpeg');
});

test('one skinned mesh, on a skin with a Hips joint', () => {
  const skinned = nodes.filter((n) => n.skin !== undefined);
  assert.equal(skinned.length, 1, 'one skinned node');
  assert.equal(g.skins.length, 1);
  assert.ok(skinned[0].mesh !== undefined);
  for (const p of g.meshes[skinned[0].mesh!].primitives) assert.ok(p.attributes.JOINTS_0 !== undefined && p.attributes.WEIGHTS_0 !== undefined, 'joints and weights');
  const names = g.skins[0].joints.map((j) => nodes[j].name);
  assert.ok(names.includes('Hips'), `joints: ${names.slice(0, 5)}…`);
});

test('the clips are idle, walk, sit and drink, each moving the skin\'s bones for more than the rest pose', () => {
  assert.deepEqual(g.animations.map((a) => a.name).sort(), ['drink', 'idle', 'sit', 'walk']);
  const joints = new Set(g.skins[0].joints);
  for (const a of g.animations) {
    assert.ok(a.channels.length > 0, `${a.name} has channels`);
    for (const c of a.channels) assert.ok(c.target.node !== undefined && joints.has(c.target.node), `${a.name}: a channel targets a joint`);
    const keys = a.channels.filter((c) => c.target.path === 'rotation').map((c) => g.accessors[a.samplers[c.sampler].input].count);
    assert.ok(keys.length > 0 && Math.max(...keys) > 2, `${a.name}: a rotation channel with more than 2 keyframes (has ${keys})`);
  }
});

test('clipFor: walking beats sitting, sitting beats standing', () => {
  assert.equal(clipFor(true, true), 'walk');
  assert.equal(clipFor(true, false), 'walk');
  assert.equal(clipFor(false, true), 'sit');
  assert.equal(clipFor(false, false), 'idle');
  assert.ok(ANIMAL_HEIGHT > 0.5 && ANIMAL_HEIGHT < 2);
});

const config = {
  version: 1,
  offices: [{ id: 'o', name: 'O', teams: [{ id: 't', name: 'T', color: '#112233', roles: [{ name: 'lead', character: 'aslan' }, { name: 'x', character: 'yok-boyle' }, { name: 'plain' }] }] }],
} as never;

test('characterOf finds the model a role wears', () => {
  assert.equal(characterOf(config, 'lead'), 'aslan');
  assert.equal(characterOf(config, 'x'), undefined, 'a character we have no model for');
  assert.equal(characterOf(config, 'plain'), undefined);
  assert.equal(characterOf(config, 'nobody'), undefined);
  assert.equal(characterOf(config, undefined), undefined);
  assert.equal(characterOf(undefined, 'lead'), undefined);
});

test('every character model is registered in the models registry', () => {
  const src = readFileSync(new URL('../src/client/world/models.ts', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('MODELS'));
  for (const model of Object.values(CHARACTER_MODELS)) assert.match(body, new RegExp(`(^|\\s|')${model}'?:\\s*\\{`, 'm'), `${model} is in MODELS`);
});
