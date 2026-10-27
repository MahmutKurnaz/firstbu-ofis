// Task 6 of docs/superpowers/plans/2026-10-28-f1-roller-ekipler.md: roleRows(view, workers), the pure
// part of the Ekipler panel (src/client/features/ordu/ui.ts).
//
// Assumptions beyond the plan:
//  - the module may be imported under node (stylesheets stub out via #tests/css); keep top-level code
//    free of `document`/`window` access, or this test fails at import.
//  - one RoleRow per role in config order (office -> team -> role), whether or not a worker sits on it.
//  - row.office / row.team are the office and team NAMES; row.color is the team's color.
//  - when two workers share a role, the first in `workers` order wins.
//  - the report for a role is the OrduView.reports entry with the same `role`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { roleRows } from '../src/client/features/ordu/ui.js';
import type { OrduView } from '../src/shared/protocol.js';
import type { RoleReport } from '../src/shared/ordu.js';

const view = (reports: RoleReport[] = []): OrduView => ({
  config: {
    version: 1,
    offices: [
      {
        id: 'o1', name: 'Ofis 1', teams: [
          { id: 'a', name: 'Ekip A', color: '#111111', roles: [{ name: 'lead' }, { name: 'be-lead' }] },
          { id: 'b', name: 'Ekip B', color: '#222222', roles: [{ name: 'verify-be' }] },
        ],
      },
      { id: 'o2', name: 'Ofis 2', teams: [{ id: 'c', name: 'Ekip C', color: '#333333', roles: [{ name: 'scout-be' }] }] },
    ],
  },
  source: 'file',
  agents: [],
  reports,
});

const worker = (id: string, extra: object = {}) =>
  ({ id, deskId: 'desk-1', name: id, color: '#fff', kind: 'agent', status: 'working', createdAt: 1, acked: false, createdBy: 'x', cols: 80, rows: 24, viewers: [], ...extra }) as never;

test('roleRows lists every role in config order: office, then team, then role', () => {
  const rows = roleRows(view(), []);
  assert.deepEqual(rows.map((r) => r.role.name), ['lead', 'be-lead', 'verify-be', 'scout-be']);
  assert.deepEqual(rows.map((r) => r.team), ['Ekip A', 'Ekip A', 'Ekip B', 'Ekip C']);
  assert.deepEqual(rows.map((r) => r.office), ['Ofis 1', 'Ofis 1', 'Ofis 1', 'Ofis 2']);
  assert.deepEqual(rows.map((r) => r.color), ['#111111', '#111111', '#222222', '#333333']);
  assert.ok(rows.every((r) => r.worker === undefined && r.report === undefined));
});

test('roleRows ties the worker whose role is be-lead to the be-lead row', () => {
  const rows = roleRows(view(), [worker('w1', { role: 'be-lead' }), worker('w2', { role: 'verify-be', status: 'done' })]);
  assert.equal(rows.find((r) => r.role.name === 'be-lead')?.worker?.id, 'w1');
  assert.equal(rows.find((r) => r.role.name === 'verify-be')?.worker?.id, 'w2');
  assert.equal(rows.find((r) => r.role.name === 'lead')?.worker, undefined);
});

test('workers without a role (or with an unknown one) make no row', () => {
  const rows = roleRows(view(), [worker('w1'), worker('w2', { role: 'yok-boyle-rol' })]);
  assert.equal(rows.length, 4);
  assert.ok(rows.every((r) => r.worker === undefined));
});

test('a role with a report carries it', () => {
  const report: RoleReport = { role: 'verify-be', task: 't1', verdict: 'GEÇTİ', file: '.claude/work/t1/verify.md', at: 5 };
  const rows = roleRows(view([report]), []);
  assert.deepEqual(rows.find((r) => r.role.name === 'verify-be')?.report, report);
  assert.equal(rows.find((r) => r.role.name === 'lead')?.report, undefined);
});

test('an empty config has no rows', () => {
  assert.deepEqual(roleRows({ ...view(), config: { version: 1, offices: [] }, source: 'none' }, [worker('w1', { role: 'lead' })]), []);
});
