import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { openModel } from './glb';

// The street's CC0 KayKit drafts (blender/scripts/build_kaykit.py -> src/client/models/kaykit-*.glb), against
// what world/cadde/kaykit.ts asks them for: every piece by name as a root node, every name the code uses
// (read from its source), UVs and the atlas texture on them, and a size that keeps the download small.

const root = new URL('..', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');

/** PACKS in the build script: the pieces each .glb is made of (the city's lose their `_withoutBase`). */
function packs(): Record<string, string[]> {
  const src = read('blender/scripts/build_kaykit.py');
  const block = src.slice(src.indexOf('PACKS = {'), src.indexOf('\n}\n', src.indexOf('PACKS = {')));
  const out: Record<string, string[]> = {};
  for (const m of block.matchAll(/"(kaykit-[a-z]+)": \([^,]+,\s*\[([\s\S]*?)\n\s*\]\)/g)) {
    const names: string[] = [];
    for (const g of m[2].matchAll(/\*\(f"building_\{c\}_withoutBase" for c in "([A-Z]+)"\)|"([A-Za-z_]+)"/g)) {
      if (g[1]) for (const c of g[1]) names.push(`building_${c}`);
      else names.push(g[2].replace('_withoutBase', ''));
    }
    out[m[1]] = names;
  }
  return out;
}
const PACKS = packs();

test('the build script lists the three packs, with the pieces the street was drawn with', () => {
  assert.deepEqual(Object.keys(PACKS).sort(), ['kaykit-cafe', 'kaykit-city', 'kaykit-furniture']);
  assert.deepEqual(PACKS['kaykit-city'].slice(0, 8), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((c) => `building_${c}`));
  for (const n of ['bench', 'bush', 'streetlight', 'firehydrant', 'trash_A', 'dumpster', 'car_sedan', 'car_taxi', 'car_hatchback']) assert.ok(PACKS['kaykit-city'].includes(n), n);
  assert.equal(PACKS['kaykit-furniture'].length, 13);
  assert.equal(PACKS['kaykit-cafe'].length, 7);
});

type Img = { images?: unknown[]; textures?: unknown[] };

for (const [pack, names] of Object.entries(PACKS)) {
  const model = openModel(pack);
  const { gltf, nodes } = model;

  test(`${pack}.glb has every piece as a root node`, () => {
    const roots = new Set(nodes.map((n, i) => (model.parentOf.has(i) ? '' : n.name)).filter(Boolean));
    for (const n of names) assert.ok(roots.has(n), `${pack} has a root called ${n}`);
  });

  test(`${pack}.glb's meshes have UVs, and it carries the atlas`, () => {
    assert.ok(gltf.meshes.length > 0);
    for (const m of gltf.meshes) for (const p of m.primitives) assert.ok(p.attributes.TEXCOORD_0 !== undefined, 'TEXCOORD_0 on every primitive');
    const g = gltf as unknown as Img;
    assert.ok((g.images?.length ?? 0) >= 1, 'an image');
    assert.ok((g.textures?.length ?? 0) >= 1, 'a texture');
  });

  test(`${pack}.glb is under 1 MB`, () => {
    const size = statSync(new URL(`src/client/models/${pack}.glb`, root)).size;
    assert.ok(size < 1024 * 1024, `${size} bytes`);
  });
}

test('every piece world/cadde/kaykit.ts asks for is in its pack', () => {
  const src = read('src/client/world/cadde/kaykit.ts');
  const asked: [string, string][] = [];
  for (const m of src.matchAll(/'(kaykit-[a-z]+)',\s*'([A-Za-z_]+)'/g)) asked.push([m[1], m[2]]);
  // The office walls' pictures are picked from a list: 'pictureframe_…' names stand alone there.
  for (const m of src.matchAll(/'(pictureframe_[A-Za-z_]+)'/g)) asked.push(['kaykit-furniture', m[1]]);
  // The skyline's `building_${'ABCDEFGH'[i % 8]}`.
  const letters = /building_\$\{'([A-Z]+)'\[/.exec(src)?.[1];
  assert.ok(letters, 'the skyline picks buildings by letter');
  for (const c of letters) asked.push(['kaykit-city', `building_${c}`]);
  assert.ok(asked.length >= 15, `found ${asked.length} requests`);
  for (const [pack, part] of asked) {
    assert.ok(PACKS[pack], `${pack} is a pack`);
    assert.ok(PACKS[pack].includes(part), `${pack} has ${part}`);
  }
});
