// Tasks 2 and 3 of docs/superpowers/plans/2026-10-28-f1-roller-ekipler.md: ordu.json parsing, the
// derived fallback, loadOrdu, the software template, and role reports.
//
// Assumptions beyond the plan (the implementer should match them):
//  - error strings are returned verbatim from the plan; parseOrdu returns a string for any failure.
//  - reportLine returns objects WITHOUT undefined-valued keys (deepEqual against `{}` / `{verdict}`).
//  - readReports looks in `<projectDir>/<config.reportDir>/<taskId>/`, one RoleReport per role that
//    has a matching file; `file` is the path of the file read; `task` is the task folder name.
//  - A role is "verify" when its name starts with `verify`; verify.md goes to it, report.md to the
//    worker's role. With no task, a verify role gets the newest verify.md, any other role gets nothing. Reports are read from the first 4096 bytes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { allRoles, deriveOrdu, findRole, parseAgentFrontmatter, parseOrdu, reportLine, type OrduConfig } from '../src/shared/ordu.js';
import { loadOrdu } from '../src/server/ordu/config.js';
import { readReports } from '../src/server/ordu/reports.js';

const team = (roles: object[], extra: object = {}) => ({ id: 't', name: 'T', color: '#ffffff', roles, ...extra });
const cfg = (teams: object[]) => ({ version: 1, offices: [{ id: 'o', name: 'O', teams }] });
const parsed = (raw: unknown): OrduConfig => {
  const c = parseOrdu(raw);
  assert.equal(typeof c, 'object', String(c));
  return c as OrduConfig;
};

function project(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-ordu-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const data = path.join(dir, '.agent-office');
  mkdirSync(data, { recursive: true });
  return { dir, data };
}

const agentMd = (dir: string, name: string, body = `---\nname: ${name}\ndescription: ${name} rolü\n---\nGövde`) => {
  mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  writeFileSync(path.join(dir, '.claude', 'agents', `${name}.md`), body);
};

test('parseAgentFrontmatter reads the key: value lines of the first --- block', () => {
  assert.deepEqual(parseAgentFrontmatter('---\nname: be-lead\ndescription: Backend\nmodel: sonnet\neffort: xhigh\n---\nGövde'), {
    name: 'be-lead', description: 'Backend', model: 'sonnet', effort: 'xhigh',
  });
});

test('parseAgentFrontmatter gives null without frontmatter', () => {
  assert.equal(parseAgentFrontmatter('Sadece gövde, başlık yok'), null);
  assert.equal(parseAgentFrontmatter(''), null);
});

test('parseOrdu accepts a well-formed config', () => {
  const c = parsed(cfg([team([{ name: 'a', title: 'A', effort: 'max' }, { name: 'b' }])]));
  assert.equal(c.version, 1);
  assert.deepEqual(c.offices[0].teams[0].roles.map((r) => r.name), ['a', 'b']);
});

test('parseOrdu names a role defined twice', () => {
  assert.equal(parseOrdu(cfg([team([{ name: 'a' }, { name: 'a' }])])), '"a" rolü iki kez tanımlı');
});

test('parseOrdu rejects what is not an object, or the wrong version', () => {
  assert.equal(parseOrdu('x'), 'ordu.json bir nesne olmalı');
  assert.equal(parseOrdu({ version: 2 }), 'Desteklenen sürüm: 1');
});

test('parseOrdu rejects a team color that is not #rrggbb', () => {
  assert.equal(parseOrdu(cfg([team([{ name: 'a' }], { color: '#xyz' })])), '"t" ekibinin rengi #rrggbb olmalı');
});

test('parseOrdu rejects an effort that is not a known level', () => {
  assert.equal(parseOrdu(cfg([team([{ name: 'a', effort: 'ultra' }])])), '"a" rolünün eforu low, medium, high, xhigh, max olmalı');
});

test('parseOrdu ignores unknown fields', () => {
  const c = parsed({ ...cfg([team([{ name: 'a', bilinmeyen: 1 }], { x: 2 })]), y: 3 });
  assert.equal(c.offices[0].teams[0].roles[0].name, 'a');
});

test('deriveOrdu makes one office and one team of the agent files, each role its own agent', () => {
  const c = deriveOrdu([{ name: 'scout-be' }, { name: 'verify-be' }]);
  assert.equal(c.version, 1);
  assert.equal(c.offices.length, 1);
  assert.equal(c.offices[0].name, 'Ofis');
  assert.equal(c.offices[0].teams.length, 1);
  assert.equal(c.offices[0].teams[0].name, 'Ekip');
  assert.equal(c.offices[0].teams[0].color, '#7c8cff');
  assert.deepEqual(c.offices[0].teams[0].roles.map((r) => r.name), ['scout-be', 'verify-be']);
  assert.deepEqual(c.offices[0].teams[0].roles.map((r) => r.agent), ['scout-be', 'verify-be']);
});

test('findRole locates a role with its office and team, and gives undefined for a stranger', () => {
  const c = deriveOrdu([{ name: 'scout-be' }, { name: 'verify-be' }]);
  const hit = findRole(c, 'verify-be');
  assert.equal(hit?.team.id, c.offices[0].teams[0].id);
  assert.equal(hit?.office.id, c.offices[0].id);
  assert.equal(hit?.role.name, 'verify-be');
  assert.equal(findRole(c, 'yok'), undefined);
});

test('loadOrdu reads .agent-office/ordu.json when it is valid', (t) => {
  const { dir, data } = project(t);
  writeFileSync(path.join(data, 'ordu.json'), JSON.stringify(cfg([team([{ name: 'be-lead' }])])));
  agentMd(dir, 'be-lead');
  const l = loadOrdu(dir, data);
  assert.equal(l.source, 'file');
  assert.equal(l.error, undefined);
  assert.equal(findRole(l.config, 'be-lead')?.role.name, 'be-lead');
  assert.deepEqual(l.agents, ['be-lead']);
});

test('loadOrdu falls back to the agent files, with a Türkçe error, on broken JSON', (t) => {
  const { dir, data } = project(t);
  writeFileSync(path.join(data, 'ordu.json'), '{ bozuk');
  agentMd(dir, 'scout-be');
  agentMd(dir, 'verify-be');
  const l = loadOrdu(dir, data);
  assert.equal(l.source, 'derived');
  assert.ok(l.error?.startsWith('ordu.json okunamadı'), l.error);
  assert.deepEqual(allRoles(l.config).map((r) => r.name).sort(), ['scout-be', 'verify-be']);
  assert.deepEqual([...l.agents].sort(), ['scout-be', 'verify-be']);
});

test('loadOrdu falls back too when ordu.json parses but is invalid', (t) => {
  const { dir, data } = project(t);
  writeFileSync(path.join(data, 'ordu.json'), JSON.stringify(cfg([team([{ name: 'a' }, { name: 'a' }])])));
  agentMd(dir, 'scout-be');
  const l = loadOrdu(dir, data);
  assert.equal(l.source, 'derived');
  assert.ok(l.error?.includes('"a" rolü iki kez tanımlı'), l.error);
});

test('loadOrdu with neither file gives source none and no offices', (t) => {
  const { dir, data } = project(t);
  const l = loadOrdu(dir, data);
  assert.equal(l.source, 'none');
  assert.deepEqual(l.config.offices, []);
  assert.deepEqual(l.agents, []);
});

test('the software template parses with 7 teams and 15 roles, lead included', () => {
  const raw = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'ordu', 'sablonlar', 'yazilim.json'), 'utf8'));
  const c = parsed(raw);
  assert.equal(c.offices.flatMap((o) => o.teams).length, 7);
  assert.equal(allRoles(c).length, 15);
  const lead = findRole(c, 'lead')?.role;
  assert.ok(lead);
  assert.equal(lead.agent, undefined);
  assert.equal(lead.model, 'opus');
  assert.equal(lead.effort, 'high');
  assert.equal(lead.resident, true);
  assert.equal(c.reportDir, '.claude/work');
});

test('reportLine finds a verdict, a status, or nothing', () => {
  assert.deepEqual(reportLine('Sonuç: GEÇTİ\n…'), { verdict: 'GEÇTİ' });
  assert.deepEqual(reportLine('Sonuç: KALDI\n'), { verdict: 'KALDI' });
  assert.deepEqual(reportLine('# Rapor\nDurum: ÇÖZÜLDÜ\n'), { status: 'ÇÖZÜLDÜ' });
  assert.deepEqual(reportLine(''), {});
});

const reportConfig = () => parsed({ ...cfg([team([{ name: 'be-lead' }, { name: 'verify-be' }, { name: 'scout-be' }])]), reportDir: '.claude/work' });
const work = (dir: string, ...p: string[]) => path.join(dir, '.claude', 'work', ...p);

test('readReports: report.md goes to the worker role, verify.md to the verify- role', (t) => {
  const { dir } = project(t);
  mkdirSync(work(dir, 't1'), { recursive: true });
  writeFileSync(work(dir, 't1', 'report.md'), '# Rapor\nDurum: ÇÖZÜLDÜ\n');
  writeFileSync(work(dir, 't1', 'verify.md'), 'Sonuç: GEÇTİ\n');
  const reports = readReports(dir, reportConfig(), [{ role: 'be-lead', roleTask: 't1' }]);
  const be = reports.find((r) => r.role === 'be-lead');
  const verify = reports.find((r) => r.role === 'verify-be');
  assert.equal(be?.status, 'ÇÖZÜLDÜ');
  assert.equal(be?.task, 't1');
  assert.equal(verify?.verdict, 'GEÇTİ');
  assert.equal(typeof be?.at, 'number');
  assert.ok(be?.file.endsWith('report.md'));
});

test('readReports: a verify role with no task gets the newest verify.md; other roles with no task get none', (t) => {
  const { dir } = project(t);
  for (const id of ['old', 'new']) mkdirSync(work(dir, id), { recursive: true });
  writeFileSync(work(dir, 'old', 'verify.md'), 'Sonuç: KALDI\n');
  writeFileSync(work(dir, 'new', 'verify.md'), 'Sonuç: GEÇTİ\n');
  writeFileSync(work(dir, 'new', 'report.md'), 'Durum: YENİ\n');
  utimesSync(work(dir, 'old', 'verify.md'), new Date(2020, 0, 1), new Date(2020, 0, 1));
  utimesSync(work(dir, 'new', 'verify.md'), new Date(2025, 0, 1), new Date(2025, 0, 1));
  const reports = readReports(dir, reportConfig(), []);
  assert.equal(reports.find((r) => r.role === 'verify-be')?.verdict, 'GEÇTİ');
  assert.equal(reports.find((r) => r.role === 'scout-be'), undefined);
  assert.equal(reports.find((r) => r.role === 'be-lead'), undefined);
});

test('readReports: a missing report folder is an empty list, with or without reportDir', (t) => {
  const { dir } = project(t);
  assert.deepEqual(readReports(dir, reportConfig(), [{ role: 'be-lead', roleTask: 't1' }]), []);
  assert.deepEqual(readReports(dir, parsed(cfg([team([{ name: 'a' }])])), []), []);
});

test('readReports reads only the first 4 KB of a huge file', (t) => {
  const { dir } = project(t);
  mkdirSync(work(dir, 't1'), { recursive: true });
  // Status is near the top (found); a verdict past 4 KB must not be.
  writeFileSync(work(dir, 't1', 'report.md'), `Durum: ÇÖZÜLDÜ\n${'x'.repeat(100 * 1024)}\nSonuç: GEÇTİ\n`);
  const be = readReports(dir, reportConfig(), [{ role: 'be-lead', roleTask: 't1' }]).find((r) => r.role === 'be-lead');
  assert.equal(be?.status, 'ÇÖZÜLDÜ');
  assert.equal(be?.verdict, undefined);
});
