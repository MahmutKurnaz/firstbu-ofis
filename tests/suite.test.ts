// The executive suite (style 'yonetim' on the street's first office): its glass partitions, the
// table options `flip` and `look`, and where the suite's six seats end up on the real CADDE plan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CADDE } from '../src/shared/maps/cadde.js';
import { SUITE, officeBox, officePoint, officeWalls } from '../src/shared/maps/cadde-props.js';
import { mapZones, zoneOf } from '../src/shared/maps/zones.js';
import { MapError, planMap } from '../src/shared/maps/index.js';
import type { MapConfig, PropConfig, TableConfig } from '../src/shared/maps/types.js';
import type { Rect } from '../src/shared/nav.js';

const inRect = (r: Rect, x: number, z: number) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
const isMapError = (e: unknown) => e instanceof MapError;

const suiteOffice = CADDE.props!.find((p) => p.kind === 'office' && p.style === 'yonetim') as PropConfig;
const plainOffice: PropConfig = { ...suiteOffice, style: undefined };
delete plainOffice.style;

test('officeWalls adds the suite partitions only for style yonetim', () => {
  const plain = officeWalls(plainOffice).length;
  const suite = officeWalls(suiteOffice).length;
  assert.equal(suite - plain, SUITE.fronts.length + SUITE.dividers.length);
  // The same office without the style is just the shell.
  assert.equal(plain, 5);
  // A different style value (or none) adds nothing.
  assert.equal(officeWalls({ ...suiteOffice, style: undefined }).length, plain);
});

test('every suite door is clear of every wall, north and south of it', () => {
  const walls = officeWalls(suiteOffice);
  for (const [name, u] of Object.entries(SUITE.doors)) {
    // v = 0 is the line of the fronts; look a little to either side of it.
    for (const v of [-0.4, 0.4]) {
      const [x, z] = officePoint(suiteOffice, u, v);
      const hit = walls.findIndex((r) => inRect(r, x, z));
      assert.equal(hit, -1, `the ${name} door (u=${u}, v=${v}) is blocked by wall ${hit}`);
    }
    // And the doorway itself, at v = 0.
    const [x0, z0] = officePoint(suiteOffice, u, 0);
    assert.ok(!walls.some((r) => inRect(r, x0, z0)), `the ${name} door at v=0 is open`);
  }
  // Sanity: the partitions really are there (a point on a front is blocked).
  const [a, b] = SUITE.fronts[1];
  const [mx, mz] = officePoint(suiteOffice, (a + b) / 2, 0);
  assert.ok(walls.some((r) => inRect(r, mx, mz)), 'a front partition blocks its middle');
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
  // As shipped: Aslan (flip) is north of his table, Asistan south of hers.
  assert.ok(deskZ(CADDE, 'desk-1') < aslan.z, 'desk-1 is north of its table');
  assert.ok(deskZ(CADDE, 'desk-2') > asistan.z, 'desk-2 is south of its table');
  // Without the flip Aslan's seat is south; with it, Asistan's is north.
  const unflipped = withTable('Aslan', (t) => ({ ...t, flip: undefined }));
  assert.ok(deskZ(unflipped, 'desk-1') > aslan.z, 'unflipped, desk-1 is south');
  const flipped = withTable('Asistan', (t) => ({ ...t, flip: true }));
  assert.ok(deskZ(flipped, 'desk-2') < asistan.z, 'flipped, desk-2 is north');
  // flip: false is the same as leaving it out.
  const off = withTable('Aslan', (t) => ({ ...t, flip: false }));
  assert.equal(deskZ(off, 'desk-1'), deskZ(unflipped, 'desk-1'));
  // The two sides are mirror images about the table.
  assert.ok(Math.abs(deskZ(CADDE, 'desk-1') + deskZ(unflipped, 'desk-1') - 2 * aslan.z) < 1e-9);
});

test('look "desk" is carried onto plan.tables', () => {
  const plan = planMap(CADDE);
  for (const name of ['Aslan', 'Asistan', 'Müdürler']) assert.equal(plan.tables.find((t) => t.name === name)?.look, 'desk', name);
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

test('the suite seats are desk-1…6, all in zone 0, the lead in front of his table', () => {
  const plan = planMap(CADDE);
  const ids = [1, 2, 3, 4, 5, 6].map((n) => `desk-${n}`);
  for (const id of ids) {
    assert.ok(plan.byId.has(id), `${id} exists`);
    assert.equal(zoneOf(plan, id), 0, `${id} is in the suite`);
  }
  assert.deepEqual(mapZones(plan)[0].desks.slice(0, 6).sort(), [...ids].sort());
  const aslan = tableNamed('Aslan');
  assert.ok(plan.byId.get('desk-1')!.z < aslan.z, "the lead's seat is north of his table");
});

test("the managers' seats desk-3…6 run in increasing x", () => {
  const plan = planMap(CADDE);
  const xs = [3, 4, 5, 6].map((n) => plan.byId.get(`desk-${n}`)!.x);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `desk-${i + 3} is east of desk-${i + 2}: ${xs}`);
  // They sit at the Müdürler table (z about its row).
  const t = tableNamed('Müdürler');
  for (const n of [3, 4, 5, 6]) assert.ok(Math.abs(plan.byId.get(`desk-${n}`)!.z - t.z) < 1.5);
});
