// The team boards' pure logic (features/teamboards/logic.ts): durations, who reports to whom, the rows and lines.
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ago, everyone, reportsTo, rowOf, sinceOf, teamLines, teamRows, waiting, workerOf } from '../src/client/features/teamboards/logic.js';
import type { OrduConfig, OrduRole } from '../src/shared/ordu.js';
import type { WorkerInfo } from '../src/shared/protocol/workers.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = 10_000_000_000;

const config: OrduConfig = {
  version: 1,
  offices: [
    {
      id: 'yonetim',
      name: 'Yönetim',
      teams: [{ id: 'yon', name: 'Yönetim Ekibi', color: '#112233', roles: [{ name: 'lead', title: 'Lider' }, { name: 'prompt-refiner', title: 'Prompt Düzenleyici' }] }],
    },
    {
      id: 'fe',
      name: 'Ön Yüz',
      teams: [{ id: 'fe', name: 'Frontend', color: '#aa5500', roles: [{ name: 'fe-manager', title: 'FE Yöneticisi' }, { name: 'fe-dev' }, { name: 'fe-test', title: 'FE Test' }] }],
    },
    { id: 'bos', name: 'Boş Ofis', teams: [] },
  ],
};
const role = (n: string): OrduRole => config.offices.flatMap((o) => o.teams.flatMap((t) => t.roles)).find((r) => r.name === n)!;

let seq = 0;
const worker = (o: Partial<WorkerInfo> = {}): WorkerInfo =>
  ({ id: `w${seq++}`, kind: 'agent', deskId: 'd', name: 'W', color: '#fff', status: 'idle', acked: false, createdBy: 'x', createdAt: NOW - HOUR, cols: 80, rows: 24, viewers: [], viewerIds: [], ...o }) as WorkerInfo;

test('ago formats durations in Turkish', () => {
  assert.equal(ago(0), 'şimdi');
  assert.equal(ago(59_000), 'şimdi');
  assert.equal(ago(60_000), '1 dk');
  assert.equal(ago(59 * MIN), '59 dk');
  assert.equal(ago(60 * MIN), '1 sa 0 dk');
  assert.equal(ago(3 * HOUR + 5 * MIN), '3 sa 5 dk');
  assert.equal(ago(24 * HOUR), '1 gün');
  assert.equal(ago(50 * HOUR), '2 gün');
  assert.equal(ago(-5 * MIN), 'şimdi');
});

test('sinceOf measures from the right moment for each status', () => {
  assert.equal(sinceOf(worker({ status: 'working', workingSince: NOW - 5 * MIN }), NOW), 5 * MIN);
  assert.equal(sinceOf(worker({ status: 'working', createdAt: NOW - 7 * MIN }), NOW), 7 * MIN);
  for (const status of ['done', 'needs_input'] as const) {
    assert.equal(sinceOf(worker({ status, waitingSince: NOW - 2 * MIN, createdAt: NOW - HOUR }), NOW), 2 * MIN);
    assert.equal(sinceOf(worker({ status, createdAt: NOW - 9 * MIN }), NOW), 9 * MIN);
  }
  // idle ignores workingSince / waitingSince
  assert.equal(sinceOf(worker({ status: 'idle', workingSince: NOW - MIN, waitingSince: NOW - MIN, createdAt: NOW - 30 * MIN }), NOW), 30 * MIN);
});

test('sinceOf is never negative when the clock is behind', () => {
  assert.equal(sinceOf(worker({ status: 'working', workingSince: NOW + HOUR }), NOW), 0);
  assert.equal(sinceOf(worker({ status: 'done', waitingSince: NOW + HOUR }), NOW), 0);
  assert.equal(sinceOf(worker({ status: 'idle', createdAt: NOW + HOUR }), NOW), 0);
});

test('reportsTo: the lead to Mahmut, a team first role to the lead, the rest to their first role', () => {
  assert.equal(reportsTo(config, role('lead')), 'Mahmut');
  assert.equal(reportsTo(config, role('fe-manager')), 'Lider');
  assert.equal(reportsTo(config, role('fe-dev')), 'FE Yöneticisi');
  assert.equal(reportsTo(config, role('fe-test')), 'FE Yöneticisi');
});

test('reportsTo: the second role of the lead\'s own team reports to the lead', () => {
  assert.equal(reportsTo(config, role('prompt-refiner')), 'Lider');
});

test('reportsTo: with no lead role in the config, Mahmut', () => {
  const noLead: OrduConfig = { version: 1, offices: [{ id: 'o', name: 'O', teams: [{ id: 't', name: 'T', color: '#000000', roles: [{ name: 'a' }, { name: 'b' }] }] }] };
  assert.equal(reportsTo(noLead, noLead.offices[0].teams[0].roles[0]), 'Mahmut');
  assert.equal(reportsTo(noLead, noLead.offices[0].teams[0].roles[1]), 'a');
});

test('workerOf prefers a live worker over an exited one, and is undefined when none', () => {
  const dead = worker({ role: 'fe-dev', status: 'exited' });
  const live = worker({ role: 'fe-dev', status: 'working' });
  assert.equal(workerOf([dead, live], 'fe-dev'), live);
  assert.equal(workerOf([live, dead], 'fe-dev'), live);
  assert.equal(workerOf([dead], 'fe-dev'), dead);
  assert.equal(workerOf([live], 'fe-test'), undefined);
  assert.equal(workerOf([], 'fe-dev'), undefined);
  assert.equal(workerOf(new Set([live]), 'fe-dev'), live);
});

test('rowOf: an absent role', () => {
  for (const w of [undefined, worker({ role: 'fe-dev', status: 'exited' })]) {
    const r = rowOf(config, role('fe-dev'), w, NOW);
    assert.equal(r.status, 'absent');
    assert.equal(r.since, null);
    assert.equal(r.label, 'Henüz işe alınmadı');
    assert.equal(r.who, 'fe-dev');
    assert.equal(r.reportsTo, 'FE Yöneticisi');
    assert.equal(r.helpers, 0);
    assert.equal(r.pr, undefined);
  }
});

test('rowOf: task falls back from task.name to prompt (60 chars) to "Görev verilmedi"', () => {
  const r = (o: Partial<WorkerInfo>) => rowOf(config, role('fe-dev'), worker({ role: 'fe-dev', status: 'working', ...o }), NOW);
  assert.equal(r({ task: { name: 'Giriş sayfası' } as WorkerInfo['task'], prompt: 'x' }).task, 'Giriş sayfası');
  assert.equal(r({ prompt: 'a'.repeat(100) }).task, 'a'.repeat(60));
  assert.equal(r({ prompt: 'kısa' }).task, 'kısa');
  assert.equal(r({}).task, 'Görev verilmedi');
});

test('rowOf: doing, helpers, pr, label and since of a live worker', () => {
  const w = worker({ role: 'fe-dev', status: 'working', workingSince: NOW - 3 * MIN, activity: 'Edit app.ts', subagents: [{ id: 'a', type: 't', at: 1 }, { id: 'b', type: 't', at: 2 }], pr: { number: 42, url: 'u' } });
  const row = rowOf(config, role('fe-dev'), w, NOW);
  assert.equal(row.doing, 'Edit app.ts');
  assert.equal(row.helpers, 2);
  assert.equal(row.pr, 42);
  assert.equal(row.label, 'Çalışıyor');
  assert.equal(row.status, 'working');
  assert.equal(row.since, 3 * MIN);
  assert.equal(rowOf(config, role('fe-dev'), worker({ role: 'fe-dev', task: { name: 'N', summary: 'özet' } as WorkerInfo['task'], activity: 'etkinlik' }), NOW).doing, 'özet');
  assert.equal(rowOf(config, role('fe-dev'), worker({ role: 'fe-dev' }), NOW).doing, '');
  assert.equal(rowOf(config, role('fe-dev'), worker({ role: 'fe-dev' }), NOW).helpers, 0);
});

test('teamRows: unknown office is null; a row per role in order; name and color from the first team', () => {
  assert.equal(teamRows(config, 9, [], NOW), null);
  assert.equal(teamRows(config, -1, [], NOW), null);
  const t = teamRows(config, 1, [worker({ role: 'fe-dev', status: 'done', waitingSince: NOW - MIN })], NOW)!;
  assert.equal(t.name, 'Frontend');
  assert.equal(t.color, '#aa5500');
  assert.deepEqual(t.rows.map((r) => r.who), ['FE Yöneticisi', 'fe-dev', 'FE Test']);
  assert.deepEqual(t.rows.map((r) => r.status), ['absent', 'done', 'absent']);
  // an office with no teams falls back to the office name and the grey
  const empty = teamRows(config, 2, [], NOW)!;
  assert.equal(empty.name, 'Boş Ofis');
  assert.equal(empty.color, '#8a94a6');
  assert.deepEqual(empty.rows, []);
});

test('teamLines counts roles, hired (live), working and waiting, with the longest wait', () => {
  const ws = [
    worker({ role: 'fe-manager', status: 'working' }),
    worker({ role: 'fe-dev', status: 'done', waitingSince: NOW - 5 * MIN }),
    worker({ role: 'fe-test', status: 'needs_input', waitingSince: NOW - 20 * MIN }),
    worker({ role: 'lead', status: 'idle' }),
    worker({ role: 'prompt-refiner', status: 'exited' }),
  ];
  const lines = teamLines(config, ws, NOW);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[1], { name: 'Frontend', color: '#aa5500', roles: 3, hired: 3, working: 1, waiting: 2, longestWait: 20 * MIN });
  // exited is not hired; idle is hired but neither working nor waiting
  assert.deepEqual(lines[0], { name: 'Yönetim Ekibi', color: '#112233', roles: 2, hired: 1, working: 0, waiting: 0, longestWait: null });
  assert.equal(lines[2].roles, 0);
  assert.equal(lines[2].longestWait, null);
});

test('waiting lists only done / needs_input, longest wait first', () => {
  const ws = [
    worker({ name: 'a', status: 'working' }),
    worker({ name: 'b', status: 'done', waitingSince: NOW - 2 * MIN, task: { name: 'T' } as WorkerInfo['task'] }),
    worker({ name: 'c', status: 'needs_input', waitingSince: NOW - 9 * MIN, activity: 'soru' }),
    worker({ name: 'd', status: 'exited' }),
    worker({ name: 'e', status: 'idle' }),
    worker({ name: 'f', status: 'done', waitingSince: NOW - 5 * MIN }),
  ];
  const out = waiting(ws, NOW);
  assert.deepEqual(out.map((x) => x.who), ['c', 'f', 'b']);
  assert.deepEqual(out.map((x) => x.since), [9 * MIN, 5 * MIN, 2 * MIN]);
  assert.equal(out[0].task, 'soru');
  assert.equal(out[1].task, '');
  assert.equal(out[2].task, 'T');
  assert.deepEqual(waiting([], NOW), []);
});

test('everyone omits exited and orders needs_input, working, done, starting, idle, offline; ties by longest since', () => {
  const mk = (name: string, status: WorkerInfo['status'], extra: Partial<WorkerInfo> = {}) => worker({ name, status, createdAt: NOW - HOUR, ...extra });
  const ws = [
    mk('offline', 'offline'),
    mk('idle', 'idle'),
    mk('starting', 'starting'),
    mk('done', 'done'),
    mk('workShort', 'working', { workingSince: NOW - MIN }),
    mk('workLong', 'working', { workingSince: NOW - 30 * MIN }),
    mk('gone', 'exited'),
    mk('asks', 'needs_input'),
  ];
  const rows = everyone(undefined, ws, NOW);
  assert.deepEqual(rows.map((r) => r.who), ['asks', 'workLong', 'workShort', 'done', 'starting', 'idle', 'offline']);
});

test('everyone uses the config role title, or the worker\'s own name when its role is unknown', () => {
  const known = worker({ name: 'Ali', role: 'fe-test', status: 'working' });
  const unknown = worker({ name: 'Veli', role: 'yok', status: 'working' });
  const noRole = worker({ name: 'Ayşe', status: 'working' });
  const rows = everyone(config, [known, unknown, noRole], NOW);
  const byWho = new Map(rows.map((r) => [r.who, r]));
  assert.equal(byWho.get('FE Test')?.reportsTo, 'FE Yöneticisi');
  assert.equal(byWho.get('Veli')?.reportsTo, '');
  assert.ok(byWho.has('Ayşe'));
  assert.equal(rows.length, 3);
  // with no config at all every row is the worker's name
  assert.deepEqual(everyone(undefined, [known], NOW).map((r) => r.who), ['Ali']);
});

test('structure: main.ts installs the boards once; the suite makes team, lead, asst and you boards', () => {
  const main = readFileSync(new URL('../src/client/main.ts', import.meta.url), 'utf8');
  assert.equal((main.match(/installTeamBoards\(ctx\)/g) ?? []).length, 1);
  const suite = readFileSync(new URL('../src/client/world/cadde/suite.ts', import.meta.url), 'utf8');
  for (const kind of ['team', 'lead', 'asst', 'you']) assert.match(suite, new RegExp(`addTeamBoard\\(g, '${kind}'`));
});
