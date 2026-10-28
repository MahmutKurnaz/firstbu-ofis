// F2 of docs/superpowers/plans/2026-10-28-f2-cadde.md: the street map (style 'cadde'), its glass
// offices as zones, the office-wall geometry, planMap's checks for the new props, and hireRole
// seating a role in its own office. Written against the plan's interfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CADDE } from '../src/shared/maps/cadde.js';
import { CADDE_SIZE, OFFICE_DOOR, OFFICE_WALL, caddeFootprint, caddeTop, officeDoor, officeWalls } from '../src/shared/maps/cadde-props.js';
import { mapZones, zoneOf } from '../src/shared/maps/zones.js';
import { BUILTIN_MAPS, MapError, OFFICE_PLAN, mapChoices, planMap, planOf } from '../src/shared/maps/index.js';
import type { PropConfig } from '../src/shared/maps/types.js';
import { DESKS, deskBuilt } from '../src/shared/layout.js';
import type { Rect } from '../src/shared/nav.js';
import { hireRole } from '../src/server/ordu/hire.js';
import type { Floor } from '../src/server/floor.js';
import type { WorkerInfo } from '../src/shared/protocol.js';

/** The seats each office needs, in office order: the suite's six (the lead, his assistant and four managers, whose `desk`s are in ordu/sablonlar/yazilim.json), then the teams' own. */
const ROLE_COUNTS = [6, 2, 2, 1, 1, 1, 2];

const inRect = (r: Rect, x: number, z: number) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
const inAny = (rs: Rect[], x: number, z: number) => rs.some((r) => inRect(r, x, z));

/** A point `fwd` along the way the office's door faces and `side` across its facade, from its middle. */
function at(p: { x: number; z: number; rotY?: number }, fwd: number, side: number): [number, number] {
  const r = p.rotY ?? 0;
  return [p.x + Math.sin(r) * fwd + Math.cos(r) * side, p.z + Math.cos(r) * fwd - Math.sin(r) * side];
}

const OFFICE: PropConfig = { kind: 'office', x: 10, z: -5, width: 8, length: 7, rotY: 0 };

test('the street map loads as a cadde-style plan and is offered in the pick', () => {
  const plan = planOf('cadde');
  assert.equal(plan.id, 'cadde');
  assert.equal(plan.style, 'cadde');
  assert.equal(planMap(CADDE).style, 'cadde');
  assert.ok(mapChoices().some((c) => c.id === 'cadde' && !c.error));
  assert.ok(BUILTIN_MAPS.includes(CADDE));
});

test('mapZones: one zone per glass office, indexed in order, with every desk in at most one', () => {
  const zones = mapZones(planOf('cadde'));
  assert.equal(zones.length, 7);
  assert.deepEqual(zones.map((z) => z.index), [0, 1, 2, 3, 4, 5, 6]);
  const seen = new Map<string, number>();
  for (const z of zones) for (const id of z.desks) {
    assert.ok(!seen.has(id), `${id} is in zones ${seen.get(id)} and ${z.index}`);
    seen.set(id, z.index);
  }
});

test('mapZones: a zone\'s desks stand inside its office, and there are enough built ones for its roles', () => {
  const plan = planOf('cadde');
  const zones = mapZones(plan);
  const regular = DESKS.filter((d) => !d.beanbag && deskBuilt(d, 0)).map((d) => d.id);
  assert.ok(regular.length >= 16);
  zones.forEach((z, i) => {
    for (const id of z.desks) {
      const d = plan.byId.get(id)!;
      assert.ok(d, `${id} is on the map`);
      const dx = d.x - z.x;
      const dz = d.z - z.z;
      const u = dx * Math.cos(z.rotY) - dz * Math.sin(z.rotY); // across the facade
      const v = dx * Math.sin(z.rotY) + dz * Math.cos(z.rotY); // into the depth
      assert.ok(Math.abs(u) <= z.width / 2 + 1e-6 && Math.abs(v) <= z.length / 2 + 1e-6, `${id} (${d.x}, ${d.z}) is inside office ${i}`);
    }
    const built = z.desks.filter((id) => regular.includes(id)).length;
    assert.ok(built >= ROLE_COUNTS[i], `office ${i} has ${built} regular desks, its team needs ${ROLE_COUNTS[i]}`);
  });
});

test('mapZones: maps without glass offices have no zones', () => {
  assert.deepEqual(mapZones(planOf('castle')), []);
  assert.deepEqual(mapZones(planOf('station')), []);
  assert.deepEqual(mapZones(OFFICE_PLAN), []);
});

test('zoneOf agrees with mapZones and says -1 for what is in no office', () => {
  const plan = planOf('cadde');
  for (const z of mapZones(plan)) for (const id of z.desks) assert.equal(zoneOf(plan, id), z.index, id);
  assert.equal(zoneOf(plan, 'desk-9999'), -1);
  assert.equal(zoneOf(plan, 'nonsense'), -1);
  const kiosk = plan.stations[0];
  assert.ok(kiosk, 'the map has a kiosk');
  assert.equal(zoneOf(plan, kiosk.id), -1);
  assert.equal(zoneOf(planOf('castle'), 'desk-1'), -1);
});

test('officeWalls: five rects, a gap at the door, solid side walls', () => {
  const walls = officeWalls(OFFICE);
  assert.equal(walls.length, 5);
  const [dx, dz] = at(OFFICE, OFFICE.length! / 2 - OFFICE_WALL / 2, 0); // the door's middle in the front wall
  assert.ok(!inAny(walls, dx, dz), 'the door gap is open');
  const [ix, iz] = at(OFFICE, OFFICE.length! / 2 - OFFICE_WALL - 0.3, 0); // just inside it
  assert.ok(!inAny(walls, ix, iz));
  const [ox, oz] = at(OFFICE, OFFICE.length! / 2 + 0.3, 0); // just outside it
  assert.ok(!inAny(walls, ox, oz));
  for (const s of [1, -1]) {
    const [sx, sz] = at(OFFICE, 0, s * (OFFICE.width! / 2 - OFFICE_WALL / 2));
    assert.ok(inAny(walls, sx, sz), `side wall ${s}`);
  }
  const [bx, bz] = at(OFFICE, -(OFFICE.length! / 2 - OFFICE_WALL / 2), 0);
  assert.ok(inAny(walls, bx, bz), 'the back wall');
  // Beside the door gap the front wall is there.
  const [fx, fz] = at(OFFICE, OFFICE.length! / 2 - OFFICE_WALL / 2, OFFICE_DOOR / 2 + 0.5);
  assert.ok(inAny(walls, fx, fz), 'front wall next to the door');
  const [cx, cz] = at(OFFICE, 0, 0);
  assert.ok(!inAny(walls, cx, cz), 'the middle of the room is open');
});

test('officeWalls: turned π/2 the front wall is on the +x side', () => {
  const p: PropConfig = { ...OFFICE, rotY: Math.PI / 2 };
  const walls = officeWalls(p);
  assert.equal(walls.length, 5);
  // The door is on +x: open in the middle of that side, wall in the middle of the -x side.
  assert.ok(!inAny(walls, p.x + p.length! / 2 - OFFICE_WALL / 2, p.z), 'door gap on +x');
  assert.ok(!inAny(walls, p.x + p.length! / 2 - OFFICE_WALL - 0.3, p.z));
  assert.ok(inAny(walls, p.x - p.length! / 2 + OFFICE_WALL / 2, p.z), 'back wall on -x');
  // Side walls run along x, at z = ± width/2.
  assert.ok(inAny(walls, p.x, p.z + p.width! / 2 - OFFICE_WALL / 2));
  assert.ok(inAny(walls, p.x, p.z - p.width! / 2 + OFFICE_WALL / 2));
});

test('officeDoor: outside the office, in front of the door, facing it', () => {
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p: PropConfig = { ...OFFICE, rotY };
    const door = officeDoor(p);
    const dx = door.x - p.x;
    const dz = door.z - p.z;
    const fwd = dx * Math.sin(rotY) + dz * Math.cos(rotY);
    const side = dx * Math.cos(rotY) - dz * Math.sin(rotY);
    assert.ok(fwd > p.length! / 2, `rotY ${rotY}: beyond the front wall (${fwd})`);
    assert.ok(Math.abs(side) < OFFICE_DOOR / 2 + 1e-6, `rotY ${rotY}: in line with the door`);
    // It looks back at the office: the same way as, or exactly opposite to, the facade's direction.
    assert.ok(Math.abs(Math.cos(door.rotY - rotY)) > 0.99, `rotY ${rotY}: faces along the door's axis`);
  }
});

test('caddeFootprint and caddeTop', () => {
  const office = caddeFootprint(OFFICE);
  assert.equal(office?.rects?.length, 5);
  const tree = caddeFootprint({ kind: 'tree', x: 1, z: 2 });
  assert.ok(tree?.circle, 'a tree is a circle');
  assert.equal(tree.circle[0], 1);
  assert.equal(tree.circle[1], 2);
  for (const kind of ['counter', 'bench', 'table']) {
    const f = caddeFootprint({ kind, x: 3, z: 4, width: 2, length: 1 });
    assert.ok(f?.rect, `${kind} is a rect`);
    assert.ok(inRect(f.rect, 3, 4), `${kind} covers its middle`);
  }
  const lamp = caddeFootprint({ kind: 'lamp', x: 0, z: 0 });
  if (lamp) {
    if (lamp.circle) assert.ok(lamp.circle[2] < 1);
    else if (lamp.rect) assert.ok(lamp.rect[1] - lamp.rect[0] < 1 && lamp.rect[3] - lamp.rect[2] < 1);
  }
  // An office reaches its height: the default from CADDE_SIZE, else the one it is given.
  const size = CADDE_SIZE as unknown as { office?: { height?: number } };
  const dflt = size.office?.height;
  assert.equal(typeof dflt, 'number', 'CADDE_SIZE.office.height is the default office height');
  assert.equal(caddeTop({ kind: 'office', x: 0, z: 0, width: 8, length: 7 }), dflt);
  assert.equal(caddeTop({ ...OFFICE, height: 5.5 }), 5.5);
});

test('planMap checks the new props', () => {
  const withProps = (props: PropConfig[], extra: object = {}) => planMap({ ...CADDE, id: 'x', ...extra, props });
  // An office on a castle-style map is not a castle prop.
  assert.throws(() => planMap({ ...CADDE, id: 'x', style: 'castle', props: [OFFICE] }), (e: unknown) => e instanceof MapError && /office/.test((e as Error).message));
  // A model name is a plain file name. (Props stand at the hall's far corner, clear of the lineup and seats.)
  const glb = (model: string): PropConfig => ({ kind: 'glb', x: CADDE.hall.width / 2 - 1, z: CADDE.hall.length / 2 - 1, model });
  assert.throws(() => withProps([glb('../x')]), (e: unknown) => e instanceof MapError && /model/i.test((e as Error).message));
  assert.throws(() => withProps([glb('A B')]), (e: unknown) => e instanceof MapError && /model/i.test((e as Error).message));
  assert.doesNotThrow(() => withProps([glb('plants')]));
});

// ---- hireRole seats a role in its own office ----

type Call = unknown[];
function floorWith(t: { after(fn: () => void): void }, roles: { name: string; desk?: string }[][], taken: string[] = []) {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-cadde-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, '.agent-office'), { recursive: true });
  writeFileSync(path.join(dir, '.agent-office', 'ordu.json'), JSON.stringify({
    version: 1,
    offices: roles.map((rs, i) => ({ id: `o${i}`, name: `O${i}`, teams: [{ id: `t${i}`, name: `T${i}`, color: '#112233', roles: rs }] })),
  }));
  const calls: Call[] = [];
  const set = new Set(taken);
  const floor = {
    dir,
    plan: { wing: 0 },
    workers: {
      list: () => [] as WorkerInfo[],
      deskOccupied: (id: string) => set.has(id),
      spawn: (...args: unknown[]) => {
        calls.push(args);
        return { id: 'w1', kind: 'agent', deskId: args[0] } as unknown as WorkerInfo;
      },
    },
  } as unknown as Floor;
  return { floor, calls };
}
const ZONES = [['desk-3', 'desk-4'], ['desk-7', 'desk-8']];
const ROLES = [[{ name: 'a' }], [{ name: 'b' }]];
const hire = (floor: Floor, role: string, zones?: string[][]) => hireRole(floor, role, 'Ada', undefined, undefined, zones);

test('hireRole with zones: the role sits at the first free desk of its own office', (t) => {
  const { floor, calls } = floorWith(t, ROLES);
  const r = hire(floor, 'b', ZONES);
  assert.equal(typeof r, 'object');
  assert.equal(calls[0][0], 'desk-7');
});

test('hireRole with zones: the first office\'s role gets that office\'s desk', (t) => {
  const { floor, calls } = floorWith(t, ROLES);
  hire(floor, 'a', ZONES);
  assert.equal(calls[0][0], 'desk-3');
});

test('hireRole with zones: a taken desk moves it on to the next one in its office', (t) => {
  const { floor, calls } = floorWith(t, ROLES, ['desk-7']);
  hire(floor, 'b', ZONES);
  assert.equal(calls[0][0], 'desk-8');
});

test('hireRole with zones: a full office falls back to the first free seat anywhere', (t) => {
  const { floor, calls } = floorWith(t, ROLES, ['desk-7', 'desk-8']);
  hire(floor, 'b', ZONES);
  assert.equal(calls[0][0], 'desk-1');
});

test('hireRole with zones: a role with its own desk ignores them', (t) => {
  const { floor, calls } = floorWith(t, [[{ name: 'a' }], [{ name: 'b', desk: 'desk-12' }]]);
  hire(floor, 'b', ZONES);
  assert.equal(calls[0][0], 'desk-12');
});

test('hireRole with zones: an office with no zone entry falls back, and a desk not built is skipped', (t) => {
  const { floor, calls } = floorWith(t, ROLES);
  hire(floor, 'b', [['desk-3']]); // no zone for office 1
  assert.equal(calls[0][0], 'desk-1');
  const second = floorWith(t, ROLES);
  hire(second.floor, 'b', [[], ['desk-17', 'desk-8']]); // desk-17 is in the back office, not built at wing 0
  assert.equal(second.calls[0][0], 'desk-8');
});

test('hireRole without zones is unchanged: the first free seat', (t) => {
  const { floor, calls } = floorWith(t, ROLES, ['desk-1']);
  hire(floor, 'b');
  assert.equal(calls[0][0], 'desk-2');
});

test('quarterTurn: square to the street only', async () => {
  const { quarterTurn } = await import('../src/shared/maps/cadde-props.js');
  for (const r of [0, Math.PI / 2, -Math.PI / 2, Math.PI, 3 * Math.PI / 2]) assert.ok(quarterTurn(r), String(r));
  for (const r of [Math.PI / 4, 0.3, 1]) assert.ok(!quarterTurn(r), String(r));
  assert.ok(quarterTurn(undefined));
});

test('planMap: an office must be turned a quarter turn', () => {
  const office = (rotY: number): PropConfig => ({ kind: 'office', x: 0, z: -31, width: 8, length: 7, rotY });
  const load = (rotY: number) => planMap({ ...CADDE, id: 'x', props: [...(CADDE.props ?? []).filter((p) => p.kind !== 'office'), office(rotY)] });
  assert.throws(() => load(Math.PI / 4), (e: unknown) => e instanceof MapError && /rotY/.test((e as Error).message));
  for (const r of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) assert.doesNotThrow(() => load(r), String(r));
});
