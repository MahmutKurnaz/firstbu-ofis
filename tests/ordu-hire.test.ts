// Task 4 of docs/superpowers/plans/2026-10-28-f1-roller-ekipler.md: rolePrompt, hireRole, and the
// role/agentFile/roleTask fields surviving workers.json.
//
// Fake floor shape hireRole must work with (nothing else may be touched):
//   {
//     dir: <temp project dir>,                  // loadOrdu(floor.dir, path.join(floor.dir, '.agent-office'))
//     plan: { wing: 0 },                        // for nextFreeSeat(..., floor.plan.wing)
//     workers: {
//       list(): WorkerInfo[],                   // to find a role already at its desk (info.role)
//       deskOccupied(id: string): boolean,
//       spawn(...args): WorkerInfo | string,    // WorkerManager.spawn; 13th arg (index 12) is SpawnOpts
//     },
//   }
// The fake spawn records its args and returns a WorkerInfo built from them the way the real manager
// does (role/agentFile/roleTask copied from opts, name = opts.name). Positions asserted, per the plan:
//   [0] desk [1] by [2] prompt [3] worktree=false [4] 'agent' [5] 'claude' [6] model [7] effort
//   [9] owner [10] [] [12] SpawnOpts { role, agentFile, roleTask, name }
// Beyond the plan: "no free desk" is a string mentioning "masa" (and spawn is not called); when the
// agent file is missing, note contains 'rol dosyası bulunamadı' and opts.agentFile is undefined;
// a successful hire without a problem has no `note`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { OFIS_NOTU, rolePrompt } from '../src/shared/ordu.js';
import { hireRole } from '../src/server/ordu/hire.js';
import type { SpawnOpts } from '../src/server/workers/manager.js';
import { restoreWorkers, saveWorkers } from '../src/server/workers/persist.js';
import { newWorker } from '../src/server/workers/worker.js';
import { restoreTracker } from '../src/server/usage.js';
import type { WorkerInfo } from '../src/shared/protocol.js';
import type { Floor } from '../src/server/floor.js';

test('rolePrompt orders: office note, brief, task line, then the user prompt', () => {
  const p = rolePrompt({ name: 'be-lead' }, '.claude/work', 't1', 'BRIF METNİ', 'KULLANICI İSTEĞİ');
  const at = [OFIS_NOTU, 'BRIF METNİ', 'Görev id: t1 · çalışma klasörün: .claude/work/t1/', 'KULLANICI İSTEĞİ'].map((s) => p.indexOf(s));
  assert.ok(at.every((i) => i >= 0), `missing part: ${at}`);
  assert.deepEqual([...at], [...at].sort((a, b) => a - b));
});

test('rolePrompt has no task line without a reportDir', () => {
  const p = rolePrompt({ name: 'be-lead' }, undefined, 't1', 'BRIF', 'İSTEK');
  assert.ok(!p.includes('Görev id'));
  assert.ok(p.includes('BRIF') && p.includes('İSTEK'));
});

test('rolePrompt works without a brief or a user prompt', () => {
  const p = rolePrompt({ name: 'be-lead' }, '.claude/work', 't1', undefined, undefined);
  assert.ok(p.includes(OFIS_NOTU));
  assert.ok(p.includes('Görev id: t1'));
});

type Call = unknown[];
function fixture(t: { after(fn: () => void): void }, roles: object[], opts: { agents?: string[]; taken?: string[]; running?: Partial<WorkerInfo>[] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-hire-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, '.agent-office'), { recursive: true });
  writeFileSync(path.join(dir, '.agent-office', 'ordu.json'), JSON.stringify({
    version: 1,
    offices: [{ id: 'o', name: 'O', teams: [{ id: 't', name: 'T', color: '#112233', roles }] }],
  }));
  for (const a of opts.agents ?? []) {
    mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
    writeFileSync(path.join(dir, '.claude', 'agents', `${a}.md`), `---\nname: ${a}\n---\nGövde`);
  }
  const calls: Call[] = [];
  const taken = new Set(opts.taken ?? []);
  const floor = {
    dir,
    plan: { wing: 0 },
    workers: {
      list: () => (opts.running ?? []) as WorkerInfo[],
      deskOccupied: (id: string) => taken.has(id) || !!opts.running?.some((w) => w.deskId === id),
      spawn: (...args: unknown[]) => {
        calls.push(args);
        const o = (args[12] ?? {}) as SpawnOpts;
        return { id: 'w1', kind: 'agent', deskId: args[0], name: o.name ?? 'Worker', role: o.role, agentFile: o.agentFile, roleTask: o.roleTask, provider: args[5], model: args[6], effort: args[7] } as unknown as WorkerInfo;
      },
    },
  } as unknown as Floor;
  return { floor, calls, dir };
}

test('hireRole: an unknown role is named in the error', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', agent: 'be-lead' }]);
  assert.equal(hireRole(floor, 'x', 'Ada'), '"x" diye bir rol yok');
  assert.equal(calls.length, 0);
});

test('hireRole: a role already at its desk is not hired twice', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', agent: 'be-lead' }], { agents: ['be-lead'], running: [{ role: 'be-lead', deskId: 'desk-1' }] });
  assert.equal(hireRole(floor, 'be-lead', 'Ada'), 'be-lead zaten masasında: iş ver');
  assert.equal(calls.length, 0);
});

test('hireRole: a role whose own desk is taken does not sit at another desk', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', agent: 'be-lead', desk: 'desk-3' }], { agents: ['be-lead'], taken: ['desk-3'] });
  assert.equal(hireRole(floor, 'be-lead', 'Ada'), "be-lead'in masası (desk-3) dolu");
  assert.equal(calls.length, 0);
});

test('hireRole: no free desk at all is an error, not a seat somewhere odd', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', agent: 'be-lead' }], { agents: ['be-lead'] });
  (floor.workers as unknown as { deskOccupied(id: string): boolean }).deskOccupied = () => true;
  const r = hireRole(floor, 'be-lead', 'Ada');
  assert.equal(typeof r, 'string');
  assert.match(r as string, /masa/);
  assert.equal(calls.length, 0);
});

test('hireRole: a missing .claude/agents file hires without --agent and says so', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', agent: 'be-lead' }]);
  const r = hireRole(floor, 'be-lead', 'Ada');
  assert.equal(typeof r, 'object');
  if (typeof r === 'string') return;
  assert.ok(r.note?.includes('rol dosyası bulunamadı'), r.note);
  assert.equal(r.info.agentFile, undefined);
  assert.equal(r.info.role, 'be-lead');
  assert.equal(calls.length, 1);
  assert.equal((calls[0][12] as SpawnOpts).agentFile, undefined);
});

test('hireRole: success passes the role, agent file, name and provider to spawn', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'be-lead', title: 'Backend Lideri', agent: 'be-lead' }], { agents: ['be-lead'] });
  const r = hireRole(floor, 'be-lead', 'Ada', 'şunu yap', 'owner-1');
  assert.equal(typeof r, 'object');
  if (typeof r === 'string') return;
  assert.equal(r.note, undefined);
  assert.equal(r.info.role, 'be-lead');
  assert.equal(r.info.agentFile, 'be-lead');
  assert.equal(r.info.name, 'Backend Lideri');
  assert.ok(r.info.roleTask);
  const c = calls[0];
  assert.equal(c[1], 'Ada');
  assert.ok((c[2] as string).includes('şunu yap'));
  assert.equal(c[3], false);
  assert.equal(c[4], 'agent');
  assert.equal(c[5], 'claude');
  assert.equal(c[9], 'owner-1');
  assert.deepEqual(c[10], []);
  assert.deepEqual({ ...(c[12] as SpawnOpts), roleTask: typeof (c[12] as SpawnOpts).roleTask }, { role: 'be-lead', agentFile: 'be-lead', roleTask: 'string', name: 'Backend Lideri' });
});

test('hireRole: the name falls back to the role name, model and effort only when the role sets them', (t) => {
  const plain = fixture(t, [{ name: 'scout-be', agent: 'scout-be' }], { agents: ['scout-be'] });
  hireRole(plain.floor, 'scout-be', 'Ada');
  assert.equal((plain.calls[0][12] as SpawnOpts).name, 'scout-be');
  assert.equal(plain.calls[0][6], undefined);
  assert.equal(plain.calls[0][7], undefined);
  const set = fixture(t, [{ name: 'lead', model: 'opus', effort: 'high' }]);
  hireRole(set.floor, 'lead', 'Ada');
  assert.equal(set.calls[0][6], 'opus');
  assert.equal(set.calls[0][7], 'high');
});

test('hireRole: a role without an agent hires plain (no agentFile, no missing-file note)', (t) => {
  const { floor, calls } = fixture(t, [{ name: 'lead', model: 'opus' }]);
  const r = hireRole(floor, 'lead', 'Ada');
  assert.equal(typeof r, 'object');
  if (typeof r === 'string') return;
  assert.equal(r.note, undefined);
  assert.equal((calls[0][12] as SpawnOpts).agentFile, undefined);
});

test('role, agentFile and roleTask survive workers.json', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-persist-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'workers.json');
  const info: WorkerInfo = {
    id: 'w1', kind: 'agent', provider: 'claude', deskId: 'desk-1', name: 'Backend Lideri', color: '#fff', status: 'idle', acked: true,
    createdBy: 'Ada', createdAt: 1, cols: 100, rows: 30, viewers: [], role: 'be-lead', agentFile: 'be-lead', roleTask: 't1',
  };
  saveWorkers(file, [newWorker(info, restoreTracker(undefined))], true);
  const back = new Map<string, ReturnType<typeof newWorker>>();
  restoreWorkers(file, back, 'claude', () => false);
  const w = back.get('w1')?.info;
  assert.equal(w?.role, 'be-lead');
  assert.equal(w?.agentFile, 'be-lead');
  assert.equal(w?.roleTask, 't1');
  // And a worker without a role stays without one.
  saveWorkers(file, [newWorker({ ...info, role: undefined, agentFile: undefined, roleTask: undefined }, restoreTracker(undefined))], true);
  const plain = new Map<string, ReturnType<typeof newWorker>>();
  restoreWorkers(file, plain, 'claude', () => false);
  assert.equal(plain.get('w1')?.info.role, undefined);
  assert.equal(plain.get('w1')?.info.agentFile, undefined);
});
