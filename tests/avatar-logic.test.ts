import test from 'node:test';
import assert from 'node:assert/strict';
import { CAM_PRESETS, DEFAULT_PRESET, nextPreset, presetIndex, clipFor, clipOf } from '../src/client/features/avatar/logic.js';

test('there are 5 camera presets with unique ids', () => {
  assert.equal(CAM_PRESETS.length, 5);
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

test('only the "on" preset looks back from the front (yaw π)', () => {
  const on = CAM_PRESETS.find((p) => p.id === 'on');
  assert.ok(on);
  assert.equal(on.yaw, Math.PI);
  for (const p of CAM_PRESETS.filter((c) => c.id !== 'on')) assert.equal(p.yaw, 0, p.id);
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

test('clipFor: airborne is a jump, even while moving or running', () => {
  assert.equal(clipFor({ moving: false, running: false, grounded: false }), 'jump');
  assert.equal(clipFor({ moving: true, running: false, grounded: false }), 'jump');
  assert.equal(clipFor({ moving: true, running: true, grounded: false }), 'jump');
});

test('clipFor: on the ground it is idle, walk or run', () => {
  assert.equal(clipFor({ moving: false, running: false, grounded: true }), 'idle');
  assert.equal(clipFor({ moving: true, running: false, grounded: true }), 'walk');
  assert.equal(clipFor({ moving: true, running: true, grounded: true }), 'run');
  assert.equal(clipFor({ moving: false, running: true, grounded: true }), 'idle');
});

test('clipOf maps model clip names, ignoring case', () => {
  assert.equal(clipOf('idle'), 'idle');
  assert.equal(clipOf('Walk'), 'walk');
  assert.equal(clipOf('RUN'), 'run');
  assert.equal(clipOf('Armature|Jump_01'), 'jump');
  assert.equal(clipOf('Idle_Loop'), 'idle');
});

test('clipOf returns undefined for clips it does not drive', () => {
  assert.equal(clipOf('wave'), undefined);
  assert.equal(clipOf('sit'), undefined);
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
