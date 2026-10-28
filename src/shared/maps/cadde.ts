import type { MapConfig, PropConfig, TableConfig } from './types.js';

/*
 * The street (cadde): a pedestrian street of glass offices, one for each team, with a café on a
 * square in the middle of it where you sit and the workers come to you. Each office is a zone (see
 * ./zones.ts): the offices of a project's ordu.json go into them in order, the first (the lead's,
 * at the head of the street) into the first, and a role hired there sits at its own office's table.
 *
 * It's all data, like the castle (./castle.ts): moving an office is changing a number here, or a
 * map of your own that `extends: 'cadde'` in the office's .agent-office/maps/ (docs/maps.md).
 *
 * The street runs north (-z, the lead's office) to south (+z, the way in); x is across it.
 */

const W = 64;
const L = 76;
const H = 12;
/** Where the offices either side of the street stand (their middles), and how deep they are. */
const SIDE_X = 21;
const SIDE_DEPTH = 18;
const SIDE_FRONT = 14;
/** The rows of offices down each side, and how far the boards stand out on the pavement. */
const ROWS = [-19, 0, 19];
const BOARD_X = 8.4;
const KIOSK_X = 7;
const east = -Math.PI / 2;
const west = Math.PI / 2;

/** The offices, in zone order: the lead's at the head of the street, then west and east down it, row by row. */
const OFFICES: PropConfig[] = [
  { kind: 'office', x: 0, z: -31, width: 16, length: 10, rotY: 0 },
  ...ROWS.flatMap((z) => [
    { kind: 'office', x: -SIDE_X, z, width: SIDE_FRONT, length: SIDE_DEPTH, rotY: west },
    { kind: 'office', x: SIDE_X, z, width: SIDE_FRONT, length: SIDE_DEPTH, rotY: east },
  ]),
];

/** A table in each office, across it toward the back; the design studio's (the fourth) seats three a side. */
const TABLES: TableConfig[] = [
  { name: 'Lider ofisi', x: 0, z: -31.8, length: 6, seats: 2, rotY: west },
  ...ROWS.flatMap((z, row) =>
    [-1, 1].map((side, i): TableConfig => {
      const big = row === 0 && i === 1;
      const names = [
        ['Keşif ofisi', 'Tasarım stüdyosu'],
        ['Mühendislik ofisi', 'Hata laboratuvarı'],
        ['Test laboratuvarı', 'Güvenlik merkezi'],
      ];
      return { name: names[row][i], x: side * (SIDE_X + 1.5), z, length: big ? 7.5 : 6, seats: big ? 3 : 2, rotY: 0 };
    }),
  ),
  // The café's long table, for when every office's seats are taken.
  { name: 'Kafe masası', x: 0, z: 5.6, length: 6, seats: 2, rotY: west },
];

const props: PropConfig[] = [
  ...OFFICES,
  // Trees and lamps down both sides of the street, clear of the doors and the boards.
  ...[-23, -12, 11, 26, 32].flatMap((z) => [-1, 1].map((side) => ({ kind: 'tree', x: side * 7.6, z }))),
  ...[-28, -9.5, 9.5, 29].flatMap((z, i) => [-1, 1].map((side) => ({ kind: 'lamp', x: side * 8.7, z, rotY: side < 0 ? west : east, light: i % 2 === 0 }))),
  // The café: tables under parasols, the counter and the coffee machine behind your seat, the gong.
  ...[
    [-4.6, -1.2],
    [4.6, -1.2],
    [-4.6, 9.6],
    [4.6, 9.6],
  ].map(([x, z]) => ({ kind: 'parasol', x, z })),
  { kind: 'counter', x: -4.2, z: -9.4, width: 4.4, rotY: 0 },
  { kind: 'dispenser', x: 4.2, z: -9.6, rotY: 0 },
  { kind: 'gong', x: 6.6, z: -6.4, rotY: east },
  // Benches and planters toward the way in.
  ...[-1, 1].map((side) => ({ kind: 'bench', x: side * 7.8, z: 18.5, rotY: west })),
  ...[-1, 1].map((side) => ({ kind: 'planter', x: side * 4.6, z: 30, width: 3.2 })),
];

export const CADDE: MapConfig = {
  id: 'cadde',
  name: 'Cadde',
  icon: '🏙️',
  description:
    'Ağaçlıklı, yayalara ayrılmış bir cadde: her ekibin kendi cam ofisi, ortada bir kafe meydanı. Projenin ordu.json’ındaki ofisler sırayla binalara yerleşir, bir rol kendi ofisinin masasına oturur. Kafede senin koltuğun var; işini bitiren ya da seni bekleyen ajan önünde sıraya girer.',
  style: 'cadde',
  hall: { width: W, length: L, height: H },
  spawn: { x: -2.4, z: -2.6, rotY: Math.PI },
  door: { x: 0, z: L / 2 - 1.6 },
  // Your seat, at the head of the café, looking down the street.
  throne: { x: 0, z: -6.6, rotY: 0, dais: null, label: '☕ Senin koltuğun' },
  herald: { x: 2.4, z: -6.1, rotY: -0.35, name: 'Karşılayıcı', says: 'Yeni bir ajan için benimle konuş', ask: 'Yeni ajan ne yapsın?', button: 'İşe başlasın ☕' },
  lineup: { x: 0, z: -4.6, rotY: Math.PI, step: [0, 1.2], count: 6 },
  tables: TABLES,
  stations: {
    issues: { x: -KIOSK_X, z: -4, rotY: -Math.PI / 2 },
    queue: { x: -KIOSK_X, z: 4, rotY: -Math.PI / 2 },
    pulls: { x: KIOSK_X, z: -4, rotY: Math.PI / 2 },
  },
  // The meeting table, out on the street south of the café.
  council: { x: 0, z: 14.5, rotY: Math.PI },
  boards: {
    issues: { x: -BOARD_X, y: 2.3, z: -4, rotY: west, width: 3.2, height: 2, label: '🐞 Konular' },
    queue: { x: -BOARD_X, y: 2.3, z: 4, rotY: west, width: 3.2, height: 2, label: '📋 İş sırası' },
    pulls: { x: BOARD_X, y: 2.3, z: -4, rotY: east, width: 3.2, height: 2, label: '🔀 PR’lar' },
    services: { x: BOARD_X, y: 2.3, z: 4, rotY: east, width: 3.2, height: 2, label: '🌐 Servisler' },
  },
  props,
  agents: { outfit: 'none', ageMinutes: 0 },
  // Desks and their metal (the station's furniture, in a street's colors), the pavement and the frames.
  palette: { hull: '#f3efe8', panel: '#d9d2c5', metal: '#a7adb5', glow: '#ffb547', paving: '#cfc8bc', frame: '#2f343b' },
};
