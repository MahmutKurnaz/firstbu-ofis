import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SUBAGENTS, markExited, noteSubagent } from '../src/server/workers/subagents.js';
import { markExited as reExported } from '../src/server/workers/spawn-opts.js';
import { claude } from '../src/server/providers/claude.js';
import type { WorkerInfo } from '../src/shared/protocol.js';
import type { WorkerHandle } from '../src/server/workers/types.js';

// Claude Code's SubagentStart / SubagentStop hooks as the worker's `subagents` list (docs/superpowers/plans/2026-10-28-f3-canlilik.md).

const fresh = (): Pick<WorkerInfo, 'subagents'> => ({});
const start = (info: Pick<WorkerInfo, 'subagents'>, id: string | undefined, type: string | undefined, now: number) =>
  noteSubagent(info, 'SubagentStart', { agent_id: id, agent_type: type }, now);

test('SubagentStart adds the subagent with its id, type and time', () => {
  const info = fresh();
  assert.equal(start(info, 'a1', 'Explore', 100), true);
  assert.deepEqual(info.subagents, [{ id: 'a1', type: 'Explore', at: 100 }]);
});

test('SubagentStart without a type is an "alt ajan"; without an id it still gets a unique one', () => {
  const info = fresh();
  start(info, 'a1', undefined, 1);
  assert.equal(info.subagents![0].type, 'alt ajan');
  start(info, undefined, 'Plan', 2);
  start(info, undefined, 'Plan', 2);
  assert.equal(info.subagents!.length, 3);
  assert.equal(new Set(info.subagents!.map((s) => s.id)).size, 3);
  assert.ok(info.subagents!.every((s) => s.id));
});

test('a long type is cut to 40 characters', () => {
  const info = fresh();
  start(info, 'a1', 'x'.repeat(100), 1);
  assert.ok(info.subagents![0].type.length <= 40);
  assert.ok(info.subagents![0].type.length > 0);
});

test('the same id is not added twice', () => {
  const info = fresh();
  assert.equal(start(info, 'a1', 'Explore', 1), true);
  assert.equal(start(info, 'a1', 'Explore', 2), false);
  assert.equal(info.subagents!.length, 1);
});

test('it keeps at most six: the oldest goes', () => {
  const info = fresh();
  for (let i = 0; i < MAX_SUBAGENTS + 2; i++) start(info, `a${i}`, 'Explore', i);
  assert.equal(MAX_SUBAGENTS, 6);
  assert.deepEqual(info.subagents!.map((s) => s.id), ['a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
});

test('SubagentStop takes its id away', () => {
  const info = fresh();
  start(info, 'a1', 'Explore', 1);
  start(info, 'a2', 'Plan', 2);
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_id: 'a1' }), true);
  assert.deepEqual(info.subagents!.map((s) => s.id), ['a2']);
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_id: 'a2' }), true);
  assert.equal(info.subagents, undefined, 'an empty list is no list');
});

test('SubagentStop without an id takes the oldest of its type', () => {
  const info = fresh();
  start(info, 'a1', 'Explore', 1);
  start(info, 'a2', 'Plan', 2);
  start(info, 'a3', 'Explore', 3);
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_type: 'Explore' }), true);
  assert.deepEqual(info.subagents!.map((s) => s.id), ['a2', 'a3']);
});

test('SubagentStop for one it does not know changes nothing', () => {
  const info = fresh();
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_id: 'nope' }), false);
  start(info, 'a1', 'Explore', 1);
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_id: 'nope' }), false);
  assert.equal(noteSubagent(info, 'SubagentStop', { agent_type: 'Plan' }), false);
  assert.equal(info.subagents!.length, 1);
});

test('Stop and SessionStart clear the list', () => {
  for (const event of ['Stop', 'SessionStart']) {
    const info = fresh();
    start(info, 'a1', 'Explore', 1);
    start(info, 'a2', 'Plan', 2);
    assert.equal(noteSubagent(info, event, {}), true, event);
    assert.equal(info.subagents, undefined, event);
    assert.equal(noteSubagent(info, event, {}), false, `${event} with none changes nothing`);
  }
});

test('other events and malformed payloads do not throw', () => {
  for (const payload of [null, undefined, 42, 'x', [], {}]) {
    for (const event of ['SubagentStart', 'SubagentStop', 'Stop', 'SessionStart', 'PreToolUse']) {
      const info = fresh();
      assert.doesNotThrow(() => noteSubagent(info, event, payload, 5), `${event} ${JSON.stringify(payload)}`);
    }
  }
  const info = fresh();
  assert.equal(noteSubagent(info, 'PreToolUse', { agent_id: 'a1' }), false);
  assert.equal(info.subagents, undefined);
});

test('the Claude adapter takes SubagentStart and SubagentStop through its hook', () => {
  let emits = 0;
  const info = { id: 'w1' } as WorkerInfo;
  const base: Record<string, unknown> = { info, tracker: {}, state: undefined, emit: () => emits++ };
  const h = new Proxy(base, { get: (t, k) => (k in t ? t[k as string] : () => undefined) }) as unknown as WorkerHandle;
  const hook = (event: string, payload: object) => claude.hook!.handle(h, event, payload, undefined as never);
  hook('SubagentStart', { agent_id: 'a1', agent_type: 'Explore' });
  assert.deepEqual(info.subagents?.map((s) => [s.id, s.type]), [['a1', 'Explore']]);
  assert.ok(emits > 0, 'a change is announced');
  hook('SubagentStop', { agent_id: 'a1' });
  assert.equal(info.subagents, undefined);
});

test('a compaction (SessionStart, source compact) keeps the list; other starts clear it', () => {
  const info = fresh();
  start(info, 'a1', 'Explore', 1);
  assert.equal(noteSubagent(info, 'SessionStart', { source: 'compact' }), false);
  assert.equal(info.subagents!.length, 1);
  for (const payload of [{}, { source: 'clear' }, { source: 'startup' }]) {
    const i = fresh();
    start(i, 'a1', 'Explore', 1);
    assert.equal(noteSubagent(i, 'SessionStart', payload), true, JSON.stringify(payload));
    assert.equal(i.subagents, undefined);
  }
});

test('markExited: the worker is exited and its subagents are gone', () => {
  assert.equal(reExported, markExited);
  const info: Pick<WorkerInfo, 'status' | 'subagents'> = { status: 'working' };
  start(info, 'a1', 'Explore', 1);
  markExited(info);
  assert.equal(info.status, 'exited');
  assert.equal(info.subagents, undefined);
});
