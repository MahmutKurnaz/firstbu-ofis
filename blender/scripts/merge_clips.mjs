// Gathers a character's clips into one .glb, for our own characters (F4: the lion lead first). Meshy's
// rigging gives one file per clip, each the same rigged model with one animation; this keeps the first
// file whole and copies the others' animations into it, untouched, onto its bones by name, so nothing
// is re-sampled or re-oriented (a round trip through Blender lost them). Its texture can be shrunk with
// macOS's `sips` (--tex <px>), as a JPEG, to keep the file small.
//
//   node blender/scripts/merge_clips.mjs <out.glb> idle=<a.glb> walk=<b.glb> sit=<c.glb> [--tex 1024]
//   node blender/scripts/merge_clips.mjs <out.glb> --from <all.glb> Idle=idle Casual_Walk=walk … [--tex 1024]
//
// The second form is for one file that already holds every clip (Meshy's Animation API with several
// `action_ids`): each animation, by the name it came with, is kept under the name after the `=`, the rest dropped.
//
// The clips are named as given (`idle`, `walk`, `sit`: what world/character/animal.ts plays), and
// the first file's own animation is replaced by its named one. The generations it's made from are listed
// in docs/KAYNAKLAR.md; they aren't in the repo.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const out = args[0];
const tex = args.includes('--tex') ? Number(args[args.indexOf('--tex') + 1]) : 0;
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const pairs = args.filter((a) => /^[A-Za-z_]+=/.test(a));
const clips = pairs.map((a) =>
  from ? { name: a.slice(a.indexOf('=') + 1), file: from, anim: a.split('=')[0] } : { name: a.split('=')[0], file: a.slice(a.indexOf('=') + 1) },
);
if (!out || !clips.length) {
  console.error('usage: node blender/scripts/merge_clips.mjs <out.glb> idle=<a.glb> walk=<b.glb> … [--tex 1024]\n   or: … <out.glb> --from <all.glb> Idle=idle Casual_Walk=walk … [--tex 1024]');
  process.exit(2);
}

function readGlb(file) {
  const b = readFileSync(file);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const binLen = b.readUInt32LE(20 + jsonLen);
  return { json, bin: Buffer.from(b.subarray(binStart, binStart + binLen)) };
}

const pad4 = (buf, fill = 0) => (buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4), fill)]) : buf);

const base = readGlb(clips[0].file);
const g = base.json;
// What this doesn't know how to carry over: refuse rather than write a broken file.
for (const { file } of clips) {
  const { json } = file === clips[0].file ? base : readGlb(file);
  if ((json.accessors ?? []).some((a) => a.sparse)) throw new Error(`${file}: sparse accessors aren't handled`);
  if ((json.extensionsUsed ?? []).some((x) => /draco|meshopt/i.test(x))) throw new Error(`${file}: compressed meshes aren't handled`);
}
let bin = base.bin;
/** Appends `data` to the binary chunk as a new buffer view; returns its index. */
const addView = (data, extra = {}) => {
  bin = pad4(bin);
  g.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: data.length, ...extra });
  bin = Buffer.concat([bin, data]);
  return g.bufferViews.length - 1;
};
// The clips go onto the base's bones, by name (only its skin's joints: another node may share a name).
const nodeByName = new Map((g.skins?.[0]?.joints ?? []).map((i) => [g.nodes[i].name, i]));

const own = g.animations ?? [];
g.animations = [];
for (const clip of clips) {
  const src = clip.file === clips[0].file ? base : readGlb(clip.file);
  const anim = src === base ? (clip.anim ? own.find((x) => x.name === clip.anim) : own[0]) : src.json.animations?.[0];
  if (!anim) throw new Error(`no animation${clip.anim ? ` "${clip.anim}"` : ''} in ${clip.file}`);
  const accMap = new Map();
  const copyAccessor = (i) => {
    // The base's own clip is in the file already.
    if (src === base) return i;
    if (accMap.has(i)) return accMap.get(i);
    const acc = src.json.accessors[i];
    const view = src.json.bufferViews[acc.bufferView];
    const data = src.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const { bufferView: _, ...rest } = acc;
    g.accessors.push({ ...rest, bufferView: addView(Buffer.from(data), view.byteStride ? { byteStride: view.byteStride } : {}) });
    accMap.set(i, g.accessors.length - 1);
    return g.accessors.length - 1;
  };
  const samplers = anim.samplers.map((s) => ({ ...s, input: copyAccessor(s.input), output: copyAccessor(s.output) }));
  const channels = anim.channels.map((c) => {
    const name = src.json.nodes[c.target.node].name;
    if (!nodeByName.has(name)) throw new Error(`${clip.file}: no bone "${name}" in ${clips[0].file}`);
    return { sampler: c.sampler, target: { node: nodeByName.get(name), path: c.target.path } };
  });
  g.animations.push({ name: clip.name, samplers, channels });
  console.log(`  ${clip.name}: ${channels.length} channels from ${path.basename(clip.file)}`);
}

// The texture, smaller, as a JPEG.
if (tex && g.images?.length) {
  const dir = mkdtempSync(path.join(tmpdir(), 'merge-clips-'));
  // A texture with transparency in it stays as it is: a JPEG has none.
  const alpha = new Set((g.materials ?? []).filter((m) => m.alphaMode === 'MASK' || m.alphaMode === 'BLEND').flatMap((m) => [m.pbrMetallicRoughness?.baseColorTexture?.index]).filter((t) => t !== undefined).map((t) => g.textures[t].source));
  for (const [k, img] of g.images.entries()) {
    if (alpha.has(k)) continue;
    const view = g.bufferViews[img.bufferView];
    const src = path.join(dir, 'in');
    writeFileSync(src, bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    const dst = path.join(dir, 'out.jpg');
    // Only ever smaller.
    const size = Math.max(...execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' }).match(/\d+$/gm).map(Number));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', ...(size > tex ? ['-Z', String(tex)] : []), src, '--out', dst], { stdio: 'ignore' });
    img.bufferView = addView(readFileSync(dst));
    img.mimeType = 'image/jpeg';
  }
  rmSync(dir, { recursive: true, force: true });
}

// Only what's still used: the accessors something still points at (the base's old clip's are left over),
// then the binary rebuilt from the views those and the images point at.
const live = new Set();
for (const m of g.meshes ?? [])
  for (const p of m.primitives) {
    for (const a of Object.values(p.attributes)) live.add(a);
    if (p.indices !== undefined) live.add(p.indices);
    for (const t of p.targets ?? []) for (const a of Object.values(t)) live.add(a);
  }
for (const s of g.skins ?? []) if (s.inverseBindMatrices !== undefined) live.add(s.inverseBindMatrices);
for (const an of g.animations) for (const s of an.samplers) (live.add(s.input), live.add(s.output));
const accRemap = new Map();
g.accessors = g.accessors.filter((a, i) => live.has(i) && (accRemap.set(i, accRemap.size), true));
const reAcc = (i) => accRemap.get(i);
for (const m of g.meshes ?? [])
  for (const p of m.primitives) {
    for (const k of Object.keys(p.attributes)) p.attributes[k] = reAcc(p.attributes[k]);
    if (p.indices !== undefined) p.indices = reAcc(p.indices);
    for (const t of p.targets ?? []) for (const k of Object.keys(t)) t[k] = reAcc(t[k]);
  }
for (const s of g.skins ?? []) if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = reAcc(s.inverseBindMatrices);
for (const an of g.animations) for (const s of an.samplers) (s.input = reAcc(s.input), s.output = reAcc(s.output));
const used = new Set([...g.accessors.map((a) => a.bufferView), ...(g.images ?? []).map((i) => i.bufferView)].filter((v) => v !== undefined));
const views = [];
let packed = Buffer.alloc(0);
const remap = new Map();
g.bufferViews.forEach((v, i) => {
  if (!used.has(i)) return;
  packed = pad4(packed);
  const data = bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
  remap.set(i, views.length);
  views.push({ ...v, byteOffset: packed.length });
  packed = Buffer.concat([packed, data]);
});
g.bufferViews = views;
for (const a of g.accessors) if (a.bufferView !== undefined) a.bufferView = remap.get(a.bufferView);
for (const img of g.images ?? []) img.bufferView = remap.get(img.bufferView);
packed = pad4(packed);
g.buffers = [{ byteLength: packed.length }];

const json = pad4(Buffer.from(JSON.stringify(g), 'utf8'), 0x20);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + packed.length, 8);
const chunk = (len, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(len, 0);
  h.writeUInt32LE(type, 4);
  return h;
};
writeFileSync(out, Buffer.concat([header, chunk(json.length, 0x4e4f534a), json, chunk(packed.length, 0x004e4942), packed]));
console.log(`  -> ${out} (${(12 + 16 + json.length + packed.length) / 1024 | 0} KB)`);
