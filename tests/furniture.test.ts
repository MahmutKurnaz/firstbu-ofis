// The world held to blender/furniture.json: the finished models (meshy-props.glb), the spec's own realism,
// the code constants (kit.ts), the generated doc and the meeting table in the suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

interface Piece { w: number; d: number; h: number; seat?: number; top?: number; kind: string; range: string; src: string[]; verified: string }
interface Spec {
  people: { src: string[] };
  constants: {
    tableTop: number; benchTop: number; src: string[];
    meetingTable: { w: number; d: number; h: number; perPerson: number; seats: number };
  };
  sources: Record<string, string>;
  pieces: Record<string, Piece>;
}
interface Gltf {
  nodes: { name?: string; mesh?: number; scale?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
}

const root = new URL('../', import.meta.url);
const text = (p: string) => readFileSync(new URL(p, root), 'utf8');
const spec = JSON.parse(text('blender/furniture.json')) as Spec;
const pieces = Object.entries(spec.pieces);

function parseGlb(p: string): Gltf {
  const b = readFileSync(new URL(p, root));
  assert.equal(b.toString('ascii', 0, 4), 'glTF');
  const len = b.readUInt32LE(12);
  assert.equal(b.toString('ascii', 16, 20), 'JSON');
  return JSON.parse(b.toString('utf8', 20, 20 + len)) as Gltf;
}

const pack = parseGlb('src/client/models/meshy-props.glb');
const meshNodes = pack.nodes.filter((n) => n.mesh !== undefined);

/** min/max of a node's mesh (POSITION accessor), times the node's scale; glTF is y-up. */
function measure(name: string) {
  const n = meshNodes.find((x) => x.name === name)!;
  const s = n.scale ?? [1, 1, 1];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pack.meshes[n.mesh!]!.primitives) {
    const a = pack.accessors[p.attributes.POSITION]!;
    assert.ok(a.min && a.max, `${name} POSITION has no min/max`);
    for (let i = 0; i < 3; i++) {
      const lo = a.min[i]! * s[i]!, hi = a.max[i]! * s[i]!;
      min[i] = Math.min(min[i]!, lo, hi);
      max[i] = Math.max(max[i]!, lo, hi);
    }
  }
  return { w: max[0]! - min[0]!, h: max[1]! - min[1]!, d: max[2]! - min[2]!, minY: min[1]!, cx: (min[0]! + max[0]!) / 2, cz: (min[2]! + max[2]!) / 2 };
}

// (1) models vs spec
test('piece keys and mesh nodes of meshy-props.glb are the same set', () => {
  const nodeNames = meshNodes.map((n) => n.name!);
  assert.equal(new Set(nodeNames).size, nodeNames.length, 'duplicate node names');
  assert.deepEqual([...nodeNames].sort(), Object.keys(spec.pieces).sort());
});

for (const [key, p] of pieces) {
  test(`model ${key}: size within 3% of spec, on the floor, centred`, () => {
    const m = measure(key);
    for (const ax of ['w', 'h', 'd'] as const) {
      const err = Math.abs(m[ax] - p[ax]) / p[ax];
      assert.ok(err <= 0.03, `${key} ${ax}: model ${m[ax].toFixed(3)} vs spec ${p[ax]} (${(err * 100).toFixed(1)}%)`);
    }
    assert.ok(Math.abs(m.minY) <= 0.02, `${key} min y ${m.minY.toFixed(3)} is not on the floor`);
    assert.ok(Math.abs(m.cx) <= 0.05, `${key} centre x ${m.cx.toFixed(3)}`);
    assert.ok(Math.abs(m.cz) <= 0.05, `${key} centre z ${m.cz.toFixed(3)}`);
  });
}

// (2) realism of the spec itself
test('desks are at the table-top constant, 0.71-0.76 m', () => {
  const tt = spec.constants.tableTop;
  assert.ok(tt >= 0.71 && tt <= 0.76, `tableTop ${tt}`);
  for (const k of ['ofis-masa', 'yonetici-masa']) assert.equal(spec.pieces[k]!.h, tt, k);
});

test('all seat heights are 0.43-0.55 m and no seat is above its piece (a stool is its seat)', () => {
  for (const [k, p] of pieces) {
    if (p.seat === undefined) continue;
    assert.ok(p.seat >= 0.43 && p.seat <= 0.55, `${k} seat ${p.seat}`);
    assert.ok(p.seat <= p.h, `${k} seat ${p.seat} > h ${p.h}`);
  }
  for (const k of ['kanepe', 'bank', 'ofis-sandalye', 'yonetici-koltuk', 'toplanti-sandalye']) {
    assert.ok(spec.pieces[k]!.seat !== undefined, `${k} has no seat`);
  }
});

test('no piece is taller or wider than 5 m (the street gateway, 7 m between its posts, is the one wide thing)', () => {
  for (const [k, p] of pieces) {
    assert.ok(p.h <= 5, `${k} h ${p.h}`);
    assert.ok(p.w <= (k === 'kapi' ? 8 : 5), `${k} w ${p.w}`);
  }
});

test('bookcase is 1.8-2.2 m, street lamp 3-6 m', () => {
  assert.ok(spec.pieces['kitaplik']!.h >= 1.8 && spec.pieces['kitaplik']!.h <= 2.2);
  assert.ok(spec.pieces['lamba']!.h >= 3 && spec.pieces['lamba']!.h <= 6);
});

test('every src id exists in sources, every source is an https URL', () => {
  for (const [id, url] of Object.entries(spec.sources)) {
    assert.ok(/^https:\/\/[^\s/]+\.[^\s/]+/.test(url) && URL.canParse(url), `${id}: ${url}`);
  }
  const need = (where: string, ids: string[] | undefined) => {
    for (const id of ids ?? []) assert.ok(id in spec.sources, `${where} cites unknown source ${id}`);
  };
  for (const [k, p] of pieces) need(k, p.src);
  need('constants', spec.constants.src);
  need('people', spec.people.src);
});

test('verified is sources or partly; "sources" pieces list at least one src', () => {
  for (const [k, p] of pieces) {
    assert.ok(p.verified === 'sources' || p.verified === 'partly', `${k} verified=${p.verified}`);
    if (p.verified === 'sources') assert.ok((p.src ?? []).length >= 1, `${k} is verified by sources but lists none`);
  }
});

// (3) code constants
test('kit.ts TABLE_TOP and BENCH_TOP equal the spec constants', () => {
  const kit = text('src/client/world/station/kit.ts');
  const num = (n: string) => {
    const m = new RegExp(`\\b${n}\\s*=\\s*([0-9.]+)`).exec(kit);
    assert.ok(m, `${n} not found in kit.ts`);
    return Number(m[1]);
  };
  assert.equal(num('TABLE_TOP'), spec.constants.tableTop);
  assert.equal(num('BENCH_TOP'), spec.constants.benchTop);
});

// (4) the committed doc
test('docs/mobilya-olculeri.md mentions every piece key and its w × d × h', () => {
  const doc = text('docs/mobilya-olculeri.md');
  for (const [k, p] of pieces) {
    assert.ok(doc.includes('`' + k + '`'), `doc lacks ${k}`);
    const dims = `${p.w.toFixed(2)} × ${p.d.toFixed(2)} × ${p.h.toFixed(2)}`;
    const row = doc.split('\n').find((l) => l.includes('`' + k + '`'))!;
    assert.ok(row.includes(dims), `doc row of ${k} lacks ${dims}`);
  }
});

// (5) the meeting table
test('the meeting table is the round council one in the suite meeting room, 2.2 m across and 76 cm high', () => {
  const cadde = text('src/shared/maps/cadde.ts');
  assert.ok(/council:\s*\{\s*x: 19,\s*z: -33\.2/.test(cadde), 'the council is in the suite meeting room');
  const t = spec.pieces['konsey-masasi']!;
  assert.equal(t.w, 2.2);
  assert.equal(t.d, 2.2);
  assert.equal(t.h, spec.constants.tableTop);
  assert.ok(/height: 0\.76/.test(text('src/shared/maps/index.ts')), 'COUNCIL.height is the desk height');
  // The 10-seat table is the spec's for when the meeting grows to ten (the live one seats five).
  assert.equal(spec.constants.meetingTable.seats, 10);
});
