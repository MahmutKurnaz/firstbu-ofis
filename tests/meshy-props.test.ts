// The Meshy prop pack (src/client/models/meshy-props.glb) against the key list in cadde/meshy.ts, the
// interior theme colors against the yazilim template, and the animation clips of the mahmut model.
// meshy.ts / interiors.ts import THREE and .glb?url, so their constants are read from the source text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

interface Gltf {
  nodes: { name?: string; mesh?: number }[];
  meshes: { primitives: { indices?: number }[] }[];
  accessors: { count: number }[];
  images?: { mimeType?: string }[];
  animations?: { name?: string }[];
}

const root = new URL('../', import.meta.url);
const text = (p: string) => readFileSync(new URL(p, root), 'utf8');

function parseGlb(p: string): Gltf {
  const b = readFileSync(new URL(p, root));
  assert.equal(b.toString('ascii', 0, 4), 'glTF');
  const len = b.readUInt32LE(12);
  assert.equal(b.toString('ascii', 16, 20), 'JSON');
  return JSON.parse(b.toString('utf8', 20, 20 + len)) as Gltf;
}

function listFrom(src: string, re: RegExp): string[] {
  const m = re.exec(src);
  assert.ok(m, `pattern not found: ${re}`);
  return [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
}

const PACK = 'src/client/models/meshy-props.glb';
const keys = listFrom(text('src/client/world/cadde/meshy.ts'), /MESHY_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
const pack = parseGlb(PACK);
const meshNodes = pack.nodes.filter((n) => n.mesh !== undefined);

test('MESHY_KEYS is read and has no duplicates', () => {
  assert.ok(keys.length > 0);
  assert.equal(new Set(keys).size, keys.length);
});

test('every MESHY_KEY is a named node with a mesh, and there are exactly that many mesh nodes', () => {
  const names = new Set(meshNodes.map((n) => n.name));
  for (const k of keys) assert.ok(names.has(k), `no mesh node named ${k}`);
  assert.equal(meshNodes.length, keys.length);
});

test('each prop stays under its triangle budget (5000 by default, a tree\'s more)', () => {
  for (const n of meshNodes) {
    let tris = 0;
    for (const p of pack.meshes[n.mesh!]!.primitives) {
      assert.ok(p.indices !== undefined, `${n.name} has a non-indexed primitive`);
      tris += pack.accessors[p.indices]!.count / 3;
    }
    const budget = (JSON.parse(readFileSync(new URL('blender/furniture.json', root), 'utf8')).pieces[n.name!]?.tris ?? 5000) + 1000;
    assert.ok(tris < budget, `${n.name} has ${tris} triangles, its budget ${budget}`);
  }
});

test('every image in the pack is a JPEG', () => {
  assert.ok((pack.images ?? []).length > 0);
  for (const i of pack.images ?? []) assert.equal(i.mimeType, 'image/jpeg');
});

test('the pack file is under 26 MB', () => {
  assert.ok(statSync(new URL(PACK, root)).size < 26 * 1024 * 1024);
});

test('TEAM_COLORS are the first team color of each yazilim office, in order', () => {
  const colors = listFrom(text('src/client/world/cadde/interiors.ts'), /TEAM_COLORS\s*=\s*\[([\s\S]*?)\]/);
  const tpl = JSON.parse(text('ordu/sablonlar/yazilim.json')) as { offices: { teams: { color: string }[] }[] };
  const expected = tpl.offices.map((o) => o.teams[0]!.color);
  assert.equal(expected.length, 7);
  assert.deepEqual(colors, expected);
});

test('mahmut.glb carries the idle, walk, run, jump, wave and sit clips', () => {
  const names = (parseGlb('src/client/models/mahmut.glb').animations ?? []).map((a) => a.name);
  for (const n of ['idle', 'walk', 'run', 'jump', 'wave', 'sit']) assert.ok(names.includes(n), `missing clip ${n}`);
});
