// Writes docs/mobilya-olculeri.md, the map of the world's real-world sizes, from blender/furniture.json (the single
// source) and the KayKit city file (the buildings, as drawn and as placed).
//
//   node blender/scripts/furniture_doc.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const spec = JSON.parse(readFileSync(path.join(root, 'blender', 'furniture.json'), 'utf8'));
const cm = (m) => `${Math.round(m * 100)} cm`;
const link = (ids) => ids.map((id) => `[${id}](${spec.sources[id]})`).join(', ') || '—';

/** The KayKit buildings' height as drawn, in the file's units, from their position accessors. */
function buildings() {
  const b = readFileSync(path.join(root, 'src/client/models/kaykit-city.glb'));
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.subarray(20, 20 + len).toString());
  return j.nodes
    .filter((n) => n.mesh !== undefined && n.name.startsWith('building_'))
    .map((n) => {
      const a = j.accessors[j.meshes[n.mesh].primitives[0].attributes.POSITION];
      return { name: n.name, w: a.max[0] - a.min[0], h: a.max[1] - a.min[1] };
    });
}

const rows = Object.entries(spec.pieces).map(([key, p]) => {
  const extra = [p.seat ? `oturak ${cm(p.seat)}` : '', p.top ? `üst ${cm(p.top)}` : ''].filter(Boolean).join(', ');
  return `| \`${key}\` | ${p.kind === 'street' ? 'cadde' : 'ofis'} | ${p.w.toFixed(2)} × ${p.d.toFixed(2)} × ${p.h.toFixed(2)} | ${extra || '—'} | ${p.range} | ${link(p.src)} | ${p.verified === 'sources' ? 'kaynaklı' : 'kısmen'} |`;
});
const c = spec.constants;
const bs = buildings();
const hs = bs.map((x) => x.h * 5);
const md = `# Mobilya ve yapı ölçüleri

Dünyadaki her eşyanın gerçek hayattaki ölçüsü: en × derinlik × yükseklik, metre. Ölçüler [\`blender/furniture.json\`](../blender/furniture.json) dosyasındadır; **tek kaynak** odur. Blender betiği (\`build_meshy_props.py\`) her modeli bu ölçüye getirir (her eksen ayrı: Meshy'nin çizdiği şekil ne olursa olsun masa doğru yükseklikte çıkar), \`tests/furniture.test.ts\` bitmiş modelleri ve koddaki sabitleri bu dosyaya karşı denetler, bu belge de ondan yazılır:

\`\`\`bash
node blender/scripts/furniture_doc.mjs
\`\`\`

## İnsanlar

${spec.people.note}

Kaynaklar: ${link(spec.people.src)}

## Sabitler (kodda da aynıdır)

| Ne | Değer | Aralık ve kaynak |
| --- | --- | --- |
| Masa üstü (\`TABLE_TOP\`) | ${cm(c.tableTop)} | ${c.range.tableTop} |
| Oturak (\`BENCH_TOP\`) | ${cm(c.benchTop)} | ${c.range.benchTop} |
| Kapı kanadı | ${c.doorWidth.toFixed(2)} × ${c.doorHeight.toFixed(2)} m | ${c.range.door} |
| Tavan (zemin kat cam ofis) | ${c.ceiling.toFixed(1)} m | ${c.range.ceiling} |
| 10 kişilik toplantı masası | ${c.meetingTable.w} × ${c.meetingTable.d} × ${c.meetingTable.h} m, kişi başı ${cm(c.meetingTable.perPerson)} | ${c.range.meetingTable} |

${c.note}

Kaynaklar: ${link(c.src)}

## Eşyalar

| Anahtar | Yer | en × der. × yük. (m) | Ayrıntı | Gerçek hayatta (bulunan aralık) | Kaynak | Durum |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

"Kaynaklı": ölçü, listelenen sayfalardaki aralıktan seçildi. "Kısmen": bir standart bulunamadı, yaygın bir ölçü alındı (sayfada belirtildi).

## Binalar

Cadde binaları KayKit City Builder Bits'ten (CC0). Çizildikleri yükseklik ${Math.min(...bs.map((x) => x.h)).toFixed(2)}-${Math.max(...bs.map((x) => x.h)).toFixed(2)} birim; sokağa 5 ile, kenar sıraya 1,5-1,9 ek çarpanla konur: **${(Math.min(...hs) * 1.5).toFixed(0)}-${(Math.max(...hs) * 1.9).toFixed(0)} m**, yani kat başına 3,5-4 m ile 3-7 katlı. Zemin kat cam ofisler 4,2 m tavanlı, 44 m (yönetim) ve 14 × 18 m (ekip ofisleri). Yangın musluğu 0,8 m (yaygın ölçü, kaynak aranmadı).
`;
writeFileSync(path.join(root, 'docs', 'mobilya-olculeri.md'), md);
console.log('docs/mobilya-olculeri.md yazıldı:', rows.length, 'eşya');
