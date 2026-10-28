import test from 'node:test';
import assert from 'node:assert/strict';
import { CAM_PRESETS, DEFAULT_PRESET, nextPreset, presetIndex, gaitFor, clipOf, STILL, WALK_UP_TO, WALK_PACE, RUN_PACE } from '../src/client/features/avatar/logic.js';

test('there are 6 camera presets with unique ids', () => {
  assert.equal(CAM_PRESETS.length, 6);
  const ids = CAM_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the first preset is first person, the others are third person', () => {
  assert.equal(CAM_PRESETS[0].third, false);
  for (const p of CAM_PRESETS.slice(1)) assert.equal(p.third, true, p.id);
});

test('third-person presets have positive distance and pitch', () => {
  for (const p of CAM_PRESETS.filter((c) => c.third)) {
    assert.ok(p.dist > 0, `${p.id} dist`);
    assert.ok(p.pitch > 0, `${p.id} pitch`);
  }
});

test('only the "on" and "portre" presets look back from the front (yaw π)', () => {
  const on = CAM_PRESETS.find((p) => p.id === 'on');
  assert.ok(on);
  assert.equal(on.yaw, Math.PI);
  for (const p of CAM_PRESETS.filter((c) => c.id !== 'on' && c.id !== 'portre')) assert.equal(p.yaw, 0, p.id);
  assert.equal(CAM_PRESETS.find((c) => c.id === 'portre')!.yaw, Math.PI);
});

test('DEFAULT_PRESET is a valid index', () => {
  assert.ok(Number.isInteger(DEFAULT_PRESET));
  assert.ok(DEFAULT_PRESET >= 0 && DEFAULT_PRESET < CAM_PRESETS.length);
});

test('nextPreset steps forward and wraps round', () => {
  assert.equal(nextPreset(0), 1);
  assert.equal(nextPreset(3), 4);
  assert.equal(nextPreset(CAM_PRESETS.length - 1), 0);
  let i = 0;
  for (let k = 0; k < CAM_PRESETS.length; k++) i = nextPreset(i);
  assert.equal(i, 0);
});

test('presetIndex accepts in-range numbers and numeric strings', () => {
  for (let i = 0; i < CAM_PRESETS.length; i++) {
    assert.equal(presetIndex(i), i);
    assert.equal(presetIndex(String(i)), i);
  }
});

test('presetIndex falls back to the default for anything else', () => {
  const bad: unknown[] = [null, undefined, NaN, -1, '-1', CAM_PRESETS.length, String(CAM_PRESETS.length), 99, 1.5, '1.5', 'abc', {}, [], true, Infinity];
  for (const v of bad) {
    assert.equal(presetIndex(v), DEFAULT_PRESET, String(v));
  }
});

test('gaitFor: airborne is a jump at rate 1, whatever the speed', () => {
  for (const v of [0, 0.1, 1, 2.4, 6, 100, -3, NaN, Infinity]) {
    assert.deepEqual(gaitFor(v, false), { clip: 'jump', rate: 1 }, String(v));
  }
});

test('gaitFor: standing still (<= STILL, 0, negative, NaN) is idle at rate 1', () => {
  for (const v of [STILL, STILL - 0.01, 0, -0, -1, -50, NaN]) {
    assert.deepEqual(gaitFor(v, true), { clip: 'idle', rate: 1 }, String(v));
  }
});

test('gaitFor: just over STILL starts the walk', () => {
  assert.equal(gaitFor(STILL + 0.01, true).clip, 'walk');
});

test('gaitFor: between STILL and WALK_UP_TO it walks, rate = speed / WALK_PACE', () => {
  for (const v of [0.5, 1, WALK_PACE, 2, WALK_UP_TO]) {
    const g = gaitFor(v, true);
    assert.equal(g.clip, 'walk', String(v));
    assert.ok(Math.abs(g.rate - v / WALK_PACE) < 1e-12, String(v));
  }
  assert.equal(gaitFor(WALK_PACE, true).rate, 1);
});

test('gaitFor: faster than WALK_UP_TO it runs, rate = speed / RUN_PACE', () => {
  for (const v of [WALK_UP_TO + 0.01, 3, 4.6, RUN_PACE, 7]) {
    const g = gaitFor(v, true);
    assert.equal(g.clip, 'run', String(v));
    assert.ok(Math.abs(g.rate - Math.min(1.5, Math.max(0.4, v / RUN_PACE))) < 1e-12, String(v));
  }
  assert.equal(gaitFor(RUN_PACE, true).rate, 1);
  assert.ok(Math.abs(gaitFor(4.8, true).rate - 0.8) < 1e-12);
});

test('gaitFor: the run rate is clamped to [0.4, 1.5], and the feet match the floor right from where the run starts', () => {
  const low = gaitFor(WALK_UP_TO + 0.01, true); // 2.41 / 6 = 0.40
  assert.equal(low.clip, 'run');
  assert.ok(Math.abs(low.rate - (WALK_UP_TO + 0.01) / RUN_PACE) < 1e-12);
  assert.equal(gaitFor(1, true).clip, 'walk');
  assert.equal(gaitFor(9, true).rate, 1.5); // exactly the ceiling
  assert.equal(gaitFor(50, true).rate, 1.5);
  assert.equal(gaitFor(1e9, true).rate, 1.5);
  assert.equal(gaitFor(Infinity, true).rate, 1.5);
  assert.ok(Math.abs(gaitFor(3.3, true).rate - 0.55) < 1e-12);
});

test('gaitFor: rates stay positive, finite and the walk is never played much faster than ~1.7x', () => {
  for (let v = -2; v <= 30; v += 0.01) {
    const g = gaitFor(v, true);
    assert.ok(Number.isFinite(g.rate) && g.rate > 0, String(v));
    if (g.clip === 'walk') assert.ok(g.rate <= 1.72, `${v} walk rate ${g.rate}`);
    if (g.clip === 'run') assert.ok(g.rate >= 0.4 && g.rate <= 1.5, `${v} run rate ${g.rate}`);
  }
  assert.ok(gaitFor(WALK_UP_TO, true).rate <= 1.72);
});

test('gaitFor: the clip changes only at the WALK_UP_TO boundary (inclusive walk) and STILL', () => {
  assert.equal(gaitFor(WALK_UP_TO, true).clip, 'walk');
  assert.equal(gaitFor(WALK_UP_TO + 1e-9, true).clip, 'run');
  let changes = 0;
  let prev = gaitFor(0, true).clip;
  for (let v = 0; v <= 12; v += 0.001) {
    const c = gaitFor(v, true).clip;
    if (c !== prev) changes++;
    prev = c;
  }
  assert.equal(changes, 2); // idle -> walk -> run, no flicker
});

test('clipOf maps model clip names, ignoring case', () => {
  assert.equal(clipOf('idle'), 'idle');
  assert.equal(clipOf('Walk'), 'walk');
  assert.equal(clipOf('RUN'), 'run');
  assert.equal(clipOf('Armature|Jump_01'), 'jump');
  assert.equal(clipOf('Idle_Loop'), 'idle');
});

test('clipOf returns undefined for clips it does not drive', () => {
  assert.equal(clipOf('wave'), 'wave');
  assert.equal(clipOf('sit'), 'sit');
  assert.equal(clipOf(''), undefined);
});

test('clipOf checks jump before run before walk before idle', () => {
  assert.equal(clipOf('jump_run'), 'jump');
  assert.equal(clipOf('run_walk'), 'run');
  assert.equal(clipOf('walk_idle'), 'walk');
});

test('presetIndex: an empty or loose string is not a stored index', () => {
  for (const v of ['', '  ', '0x1', '1e0', ' 2 ']) assert.equal(presetIndex(v), DEFAULT_PRESET);
});
