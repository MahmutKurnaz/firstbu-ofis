import test from 'node:test';
import assert from 'node:assert/strict';
import { seekSpots } from '../src/client/world/court.js';
import { MAX_GHOSTS, ghostSlots } from '../src/client/features/ghosts/logic.js';
import { LANES, strollAt } from '../src/client/world/cadde/passersby.js';
import { planOf } from '../src/shared/maps/index.js';

// F3 (docs/superpowers/plans/2026-10-28-f3-canlilik.md): where the workers who come to you stand, where
// subagent ghosts float, and where the street's passers-by walk.

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('seekSpots: count spots, 1.7 m in front of the anchor, 1.1 m apart, centred on the forward line', () => {
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
    const anchor = { x: 3, z: -4, rotY };
    const f = [Math.sin(rotY), Math.cos(rotY)];
    for (const n of [0, 1, 2, 3, 4]) {
      const spots = seekSpots(anchor, n);
      assert.equal(spots.length, n);
      if (!n) continue;
      // Their middle is on the forward line, 1.7 m out.
      const mx = spots.reduce((a, s) => a + s.x, 0) / n;
      const mz = spots.reduce((a, s) => a + s.z, 0) / n;
      assert.ok(close(mx, anchor.x + f[0] * 1.7) && close(mz, anchor.z + f[1] * 1.7), `middle for n=${n} rotY=${rotY}`);
      spots.forEach((s, i) => {
        // Straight ahead is 1.7 m; sideways is the offset from the line.
        const ahead = (s.x - anchor.x) * f[0] + (s.z - anchor.z) * f[1];
        assert.ok(close(ahead, 1.7), `1.7 m ahead (${ahead})`);
        if (i) assert.ok(close(Math.hypot(s.x - spots[i - 1].x, s.z - spots[i - 1].z), 1.1), 'neighbours 1.1 m apart');
        assert.ok(angleDiff(s.rotY, Math.atan2(anchor.x - s.x, anchor.z - s.z)) < 1e-6, 'faces the anchor');
      });
    }
  }
});

test('seekSpots: rotY 0 is +z and π/2 is +x', () => {
  const [a] = seekSpots({ x: 0, z: 0, rotY: 0 }, 1);
  assert.ok(close(a.x, 0) && close(a.z, 1.7));
  assert.ok(close(a.rotY, Math.PI) || close(a.rotY, -Math.PI), 'turned back toward the anchor');
  const [b] = seekSpots({ x: 0, z: 0, rotY: Math.PI / 2 }, 1);
  assert.ok(close(b.x, 1.7) && close(b.z, 0));
  // Two are mirror images across the forward line.
  const [l, r] = seekSpots({ x: 0, z: 0, rotY: 0 }, 2);
  assert.ok(close(l.x, -r.x) && close(l.z, r.z) && close(Math.abs(l.x), 0.55));
});

test('ghostSlots: n slots for 0..6, distinct, close to the desk, clamped at 6', () => {
  assert.equal(MAX_GHOSTS, 6);
  for (let n = 0; n <= 6; n++) {
    const slots = ghostSlots(n);
    assert.equal(slots.length, n);
    assert.equal(new Set(slots.map((s) => `${s.dx.toFixed(3)},${s.dz.toFixed(3)}`)).size, n, `distinct for n=${n}`);
    for (const s of slots) assert.ok(Math.hypot(s.dx, s.dz) <= 3 && Math.abs(s.dx) <= 2, `near the desk (${s.dx}, ${s.dz})`);
  }
  assert.equal(ghostSlots(7).length, 6);
  assert.deepEqual(ghostSlots(50), ghostSlots(6));
  assert.deepEqual(ghostSlots(-1), []);
});

const plan = planOf('cadde');
const laneLen = (i: number) => Math.hypot(LANES[i].b[0] - LANES[i].a[0], LANES[i].b[1] - LANES[i].a[1]);

test('strollAt: stays on the hall floor, clear of the meeting table and of every prop', () => {
  const { bounds, obstacles } = plan;
  assert.ok(LANES.length >= 1);
  for (let lane = 0; lane < LANES.length; lane++) {
    for (let t = 0; t < 400; t += 0.37) {
      const { x, z } = strollAt(lane, t);
      assert.ok(x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ, `lane ${lane} t=${t} (${x}, ${z}) in the hall`);
      assert.ok(Math.hypot(x - 0, z - 14.5) > 2.6, `lane ${lane} t=${t} clear of the table`);
      for (const [x0, x1, z0, z1] of obstacles?.rects ?? []) assert.ok(!(x >= x0 && x <= x1 && z >= z0 && z <= z1), `lane ${lane} t=${t} not in rect`);
      for (const [cx, cz, r] of obstacles?.circles ?? []) assert.ok(Math.hypot(x - cx, z - cz) > r, `lane ${lane} t=${t} not in circle`);
    }
  }
});

test('strollAt: faces the way it moves, and is periodic', () => {
  for (let lane = 0; lane < LANES.length; lane++) {
    const period = (2 * laneLen(lane)) / 1.1;
    for (let t = 0.1; t < period; t += 0.9) {
      const a = strollAt(lane, t);
      const b = strollAt(lane, t + 0.01);
      const moved = Math.hypot(b.x - a.x, b.z - a.z);
      if (moved < 1e-4) continue;
      assert.ok(Math.abs(moved / 0.01 - 1.1) < 0.05 || moved > 0, 'it moves');
      // Skip the instant it turns round.
      if (angleDiff(a.heading, b.heading) > 0.1) continue;
      assert.ok(angleDiff(a.heading, Math.atan2(b.x - a.x, b.z - a.z)) < 0.05, `lane ${lane} t=${t} heading follows motion`);
      const c = strollAt(lane, t + period);
      assert.ok(close(a.x, c.x, 1e-6) && close(a.z, c.z, 1e-6), `lane ${lane} repeats after a period`);
    }
    // It goes from one end to the other and comes back.
    const start = strollAt(lane, 0);
    assert.ok(close(start.x, LANES[lane].a[0]) && close(start.z, LANES[lane].a[1]));
    const far = strollAt(lane, laneLen(lane) / 1.1);
    assert.ok(close(far.x, LANES[lane].b[0], 1e-6) && close(far.z, LANES[lane].b[1], 1e-6));
  }
});
