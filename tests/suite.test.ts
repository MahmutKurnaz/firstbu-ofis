// The executive suite (style 'yonetim' on the street's first office): its glass partitions, the
// table options `flip` and `look`, and where the suite's six seats end up on the real CADDE plan.
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { CADDE } from '../src/shared/maps/cadde.js';
import { SUITE, SUITE_DIVIDERS, SUITE_FRONTS, officeBox, officePoint, officeWalls } from '../src/shared/maps/cadde-props.js';
import { mapZones, zoneOf } from '../src/shared/maps/zones.js';
import { MapError, planMap } from '../src/shared/maps/index.js';
import type { MapConfig, PropConfig, TableConfig } from '../src/shared/maps/types.js';
import type { Rect } from '../src/shared/nav.js';

const inRect = (r: Rect, x: number, z: number) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
const isMapError = (e: unknown) => e instanceof MapError;

const suiteOffice = CADDE.props!.find((p) => p.kind === 'office' && p.style === 'yonetim') as PropConfig;
const plainOffice: PropConfig = { ...suiteOffice, style: undefined };
delete plainOffice.style;

const hitsWall = (walls: Rect[], u: number, v: number) => {
  const [x, z] = officePoint(suiteOffice, u, v);
  return walls.some((r) => inRect(r, x, z));
};

test('officeWalls adds the suite partitions only for style yonetim', () => {
  const plain = officeWalls(plainOffice).length;
  const suite = officeWalls(suiteOffice).length;
  assert.equal(suite - plain, SUITE_FRONTS.length + SUITE_DIVIDERS.length);
  // The same office without the style is just the shell.
  assert.equal(plain, 5);
  // 9 rooms with a door make 2 front pieces each; the open one makes none; 9 dividers + 1 extra from the split doorway.
  assert.equal(SUITE_FRONTS.length, 2 * SUITE.rooms.filter((r) => r.door !== null).length);
  assert.equal(SUITE_DIVIDERS.length, SUITE.rooms.length - 1 + 1);
});

test('every room door is exactly SUITE.gate wide and open on both sides; open rooms have no front', () => {
  const walls = officeWalls(suiteOffice);
  for (const room of SUITE.rooms) {
    const pieces = SUITE_FRONTS.filter(([a, b]) => a >= room.from - 1e-9 && b <= room.to + 1e-9);
    if (room.door === null) {
      assert.equal(pieces.length, 0, `${room.id} is open: no front piece`);
      continue;
    }
    assert.equal(pieces.length, 2, `${room.id} has two front pieces`);
    const [left, right] = pieces.sort((p, q) => p[0] - q[0]);
    assert.equal(left[0], room.from, `${room.id} front starts at its wall`);
    assert.equal(right[1], room.to, `${room.id} front ends at its wall`);
    assert.ok(Math.abs(right[0] - left[1] - SUITE.gate) < 1e-9, `${room.id} gap is ${right[0] - left[1]}, not ${SUITE.gate}`);
    assert.ok(Math.abs((left[1] + right[0]) / 2 - room.door) < 1e-9, `${room.id} gap is centred on its door`);
    for (const v of [SUITE.front - 0.4, SUITE.front, SUITE.front + 0.4]) {
      assert.ok(!hitsWall(walls, room.door, v), `${room.id} door (u=${room.door}, v=${v}) is blocked`);
    }
    // Just outside the gap the front is closed.
    for (const du of [-(SUITE.gate / 2 + 0.1), SUITE.gate / 2 + 0.1]) {
      assert.ok(hitsWall(walls, room.door + du, SUITE.front), `${room.id}: front is closed at door ${du > 0 ? '+' : '-'}${Math.abs(du)}`);
    }
  }
});

test('the rooms tile the suite across with no gaps or overlaps', () => {
  const rooms = SUITE.rooms;
  assert.equal(rooms[0].from, -29.8);
  assert.equal(rooms[rooms.length - 1].to, 29.8);
  for (let i = 1; i < rooms.length; i++) assert.equal(rooms[i].from, rooms[i - 1].to, `${rooms[i - 1].id} meets ${rooms[i].id}`);
  for (const r of rooms) {
    assert.ok(r.to > r.from, `${r.id} has width`);
    if (r.door !== null) assert.ok(r.door - SUITE.gate / 2 > r.from && r.door + SUITE.gate / 2 < r.to, `${r.id}'s door fits in the room`);
  }
  assert.equal(new Set(rooms.map((r) => r.id)).size, rooms.length, 'room ids are unique');
});

test('the assistant/lead doorway is passable; the rest of that wall is not', () => {
  const walls = officeWalls(suiteOffice);
  const { u, from, to } = SUITE.between;
  assert.ok(!hitsWall(walls, u, -2.5), 'open at v=-2.5');
  assert.ok(hitsWall(walls, u, -4), 'closed at v=-4');
  assert.ok(hitsWall(walls, u, 0), 'closed at v=0');
  assert.ok(from < -2.5 && -2.5 < to);
  // Every other divider is solid through the middle of the rooms.
  for (const room of SUITE.rooms.slice(1)) if (room.from !== u) assert.ok(hitsWall(walls, room.from, -2.5), `wall at ${room.from} is solid at v=-2.5`);
});

test('every suite partition lies inside the office', () => {
  const o = officeBox(suiteOffice);
  const shell = officeWalls(plainOffice);
  const [x0, x1, z0, z1] = shell.reduce((a, r) => [Math.min(a[0], r[0]), Math.max(a[1], r[1]), Math.min(a[2], r[2]), Math.max(a[3], r[3])], [Infinity, -Infinity, Infinity, -Infinity]);
  const eps = 1e-6;
  assert.ok(x1 - x0 >= o.width - 0.01 && z1 - z0 >= o.length - 0.01, 'the shell spans the office');
  for (const r of officeWalls(suiteOffice).slice(shell.length)) {
    assert.ok(r[0] >= x0 - eps && r[1] <= x1 + eps && r[2] >= z0 - eps && r[3] <= z1 + eps, `partition ${r} is inside the office ${[x0, x1, z0, z1]}`);
  }
});

// ---- flip and look ---------------------------------------------------------------------------

const tableNamed = (name: string) => (CADDE.tables as TableConfig[]).find((t) => t.name === name)!;
/** CADDE with one table replaced by `change` of itself. */
function withTable(name: string, change: (t: TableConfig) => TableConfig): MapConfig {
  return { ...CADDE, id: 'suite-test', tables: (CADDE.tables as TableConfig[]).map((t) => (t.name === name ? change(t) : t)) };
}
const deskZ = (c: MapConfig, id: string) => planMapDesk(c, id).z;
const planMapDesk = (c: MapConfig, id: string) => planMap(c).byId.get(id)!;

test('flip puts the single seat on the other side of the table', () => {
  const aslan = tableNamed('Aslan');
  const asistan = tableNamed('Asistan');
  // As shipped: every suite table is flipped, so the seat is north of it.
  assert.ok(deskZ(CADDE, 'desk-1') < aslan.z, 'desk-1 is north of its table');
  assert.ok(deskZ(CADDE, 'desk-2') < asistan.z, 'desk-2 is north of its table');
  const unflippedAsistan = withTable('Asistan', (t) => ({ ...t, flip: undefined }));
  assert.ok(deskZ(unflippedAsistan, 'desk-2') > asistan.z, 'unflipped, desk-2 is south');
  // Without the flip Aslan's seat is south.
  const unflipped = withTable('Aslan', (t) => ({ ...t, flip: undefined }));
  assert.ok(deskZ(unflipped, 'desk-1') > aslan.z, 'unflipped, desk-1 is south');
  // flip: false is the same as leaving it out.
  const off = withTable('Aslan', (t) => ({ ...t, flip: false }));
  assert.equal(deskZ(off, 'desk-1'), deskZ(unflipped, 'desk-1'));
  // The two sides are mirror images about the table.
  assert.ok(Math.abs(deskZ(CADDE, 'desk-1') + deskZ(unflipped, 'desk-1') - 2 * aslan.z) < 1e-9);
});

test('look "desk" is carried onto plan.tables', () => {
  const plan = planMap(CADDE);
  for (const name of ['Aslan', 'Asistan', 'Susamuru', 'Kaplan', 'Tavşan', 'Geyik']) assert.equal(plan.tables.find((t) => t.name === name)?.look, 'desk', name);
  assert.equal(plan.tables.find((t) => t.name === 'Kafe masası')?.look, undefined);
  assert.ok(!('look' in plan.tables.find((t) => t.name === 'Kafe masası')!));
  assert.equal(planMap(withTable('Aslan', (t) => ({ ...t, look: undefined }))).tables.find((t) => t.name === 'Aslan')?.look, undefined);
});

test('bad flip, look and style values are refused', () => {
  const badTable = (extra: object) => withTable('Aslan', (t) => ({ ...t, ...extra }) as TableConfig);
  assert.throws(() => planMap(badTable({ flip: 'yes' })), (e) => isMapError(e) && /flip/.test((e as Error).message));
  assert.throws(() => planMap(badTable({ flip: 1 })), isMapError);
  assert.throws(() => planMap(badTable({ look: 'x' })), (e) => isMapError(e) && /look/.test((e as Error).message));
  const withProps = (props: PropConfig[]): MapConfig => ({ ...CADDE, id: 'suite-test', props });
  const rest = CADDE.props!.filter((p) => p !== suiteOffice);
  // style on something that isn't an office, and a style other than yonetim.
  assert.throws(() => planMap(withProps([...rest, { kind: 'tree', x: 0, z: 0, style: 'yonetim' } as PropConfig])), (e) => isMapError(e) && /style/.test((e as Error).message));
  assert.throws(() => planMap(withProps([...rest, { ...suiteOffice, style: 'other' } as unknown as PropConfig])), (e) => isMapError(e) && /style/.test((e as Error).message));
  // The shipped one is fine.
  assert.doesNotThrow(() => planMap(CADDE));
});

// ---- the real street -------------------------------------------------------------------------

const roomOfU = (u: number) => SUITE.rooms.find((r) => u >= r.from && u < r.to)?.id;

test('the suite seats are desk-1…6, all in zone 0, north of their desks, each in its own room', () => {
  const plan = planMap(CADDE);
  const ids = [1, 2, 3, 4, 5, 6].map((n) => `desk-${n}`);
  const names = ['Aslan', 'Asistan', 'Susamuru', 'Kaplan', 'Tavşan', 'Geyik'];
  for (const id of ids) {
    assert.ok(plan.byId.has(id), `${id} exists`);
    assert.equal(zoneOf(plan, id), 0, `${id} is in the suite`);
  }
  assert.deepEqual([...mapZones(plan)[0].desks].filter((d) => ids.includes(d)).sort(), [...ids].sort());
  const rooms = ids.map((id) => roomOfU(plan.byId.get(id)!.x - suiteOffice.x));
  assert.equal(new Set(rooms).size, 6, `six different rooms: ${rooms}`);
  assert.deepEqual(rooms.slice(0, 2), ['lead', 'asst']);
  assert.deepEqual(rooms.slice(2), ['fe', 'be', 'bug', 'verify']);
  ids.forEach((id, i) => assert.ok(plan.byId.get(id)!.z < tableNamed(names[i]).z, `${id} sits north of ${names[i]}'s desk`));
});

// ---- the style needs the real size, and every room has a floor --------------------------------

test('planMap refuses a yonetim office that is not 60 x 10, and takes the real one', () => {
  const withOffice = (o: PropConfig): MapConfig => ({ ...CADDE, id: 'suite-test', props: CADDE.props!.map((p) => (p === suiteOffice ? o : p)) });
  assert.throws(() => planMap(withOffice({ ...suiteOffice, width: 44 })), (e) => isMapError(e) && /60/.test((e as Error).message));
  assert.throws(() => planMap(withOffice({ ...suiteOffice, length: 8 })), isMapError);
  assert.throws(() => planMap(withOffice({ ...suiteOffice, rotY: 0.5 })), isMapError);
  assert.doesNotThrow(() => planMap(withOffice({ ...suiteOffice })));
  assert.doesNotThrow(() => planMap(CADDE));
});

test('every suite room has a floor colour in client/world/cadde/suite.ts', () => {
  const src = readFileSync(new URL('../src/client/world/cadde/suite.ts', import.meta.url), 'utf8');
  const m = src.match(/const FLOOR\s*:[^=]*=\s*\{([^}]*)\}/);
  assert.ok(m, 'found the FLOOR record');
  const keys = [...m![1].matchAll(/(?:^|[,\s])['"]?([A-Za-z_][\w-]*)['"]?\s*:/g)].map((k) => k[1]);
  assert.deepEqual([...keys].sort(), SUITE.rooms.map((r) => r.id).sort());
});
