// The army (ordu): a project's offices, their teams and each team's roles, read from the project's
// .agent-office/ordu.json, or made up from its .claude/agents/*.md when there's no such file. Pure
// code, so the server, the page and the tests all share it.

import { AGENT_EFFORTS, isAgentEffort, type AgentEffort } from './providers.js';

/** One seat on a team: a desk, a character and, once hired, a worker with its own terminal. */
export interface OrduRole {
  /** Unique across the whole ordu.json: what workers carry as `role`. */
  name: string;
  /** What the worker is called (defaults to `name`). */
  title?: string;
  /** The Claude Code agent it runs as (`claude --agent <agent>`), from the project's .claude/agents. */
  agent?: string;
  /** A key into the character catalogue (aslan, susamuru…). */
  character?: string;
  model?: string;
  effort?: AgentEffort;
  /** A file of standing instructions put ahead of its first prompt (relative to the project, or this repo's ordu/). */
  brief?: string;
  /** What it does when hired with nothing to do (a scheduled role's run). */
  prompt?: string;
  /** The desk it always sits at, when it has one. */
  desk?: string;
  /** Kept on all the time (the lead), rather than hired for a task and sent home after. */
  resident?: boolean;
}

export interface OrduTeam {
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
  roles: OrduRole[];
}

export interface OrduOffice {
  id: string;
  name: string;
  teams: OrduTeam[];
}

export interface OrduConfig {
  version: 1;
  /** Where the roles write their reports, one folder per task (FirstBU: .claude/work). */
  reportDir?: string;
  offices: OrduOffice[];
}

/** The frontmatter of a .claude/agents/<name>.md. */
export interface AgentFile {
  name: string;
  description?: string;
  model?: string;
  effort?: string;
}

/** The latest report a role wrote: its report.md's Durum, or its verify.md's Sonuç. */
export interface RoleReport {
  role: string;
  task?: string;
  status?: string;
  verdict?: 'GEÇTİ' | 'KALDI';
  /** Relative to the project. */
  file: string;
  at: number;
}

const ROLE_NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_ROLES = 64;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const optStr = (v: unknown, max = 200): v is string | undefined => v === undefined || (typeof v === 'string' && v.length <= max);

/** The `key: value` lines of a markdown file's leading `---` block, or null when it has none (or no name). */
export function parseAgentFrontmatter(md: string): AgentFile | null {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!m) return null;
  const fields: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  if (!fields.name) return null;
  return {
    name: fields.name,
    ...(fields.description ? { description: fields.description } : {}),
    ...(fields.model ? { model: fields.model } : {}),
    ...(fields.effort ? { effort: fields.effort } : {}),
  };
}

function parseRole(raw: unknown, team: string): OrduRole | string {
  if (!isObj(raw) || typeof raw.name !== 'string' || !ROLE_NAME.test(raw.name)) return `"${team}" ekibinde adı geçersiz bir rol var (küçük harf, rakam, - ve _)`;
  const n = raw.name;
  if (!optStr(raw.title, 60)) return `"${n}" rolünün başlığı en çok 60 karakter olmalı`;
  if (raw.agent !== undefined && (typeof raw.agent !== 'string' || !ROLE_NAME.test(raw.agent))) return `"${n}" rolünün agent'ı bir .claude/agents dosya adı olmalı`;
  if (!optStr(raw.character, 40)) return `"${n}" rolünün karakteri geçersiz`;
  if (!optStr(raw.model, 200)) return `"${n}" rolünün modeli geçersiz`;
  if (raw.effort !== undefined && !isAgentEffort(raw.effort)) return `"${n}" rolünün eforu ${AGENT_EFFORTS.join(', ')} olmalı`;
  if (!optStr(raw.brief, 200)) return `"${n}" rolünün brief yolu geçersiz`;
  if (!optStr(raw.prompt, 20000)) return `"${n}" rolünün prompt'u en çok 20000 karakter olmalı`;
  if (raw.desk !== undefined && (typeof raw.desk !== 'string' || !/^[a-z]+-\d{1,3}$/.test(raw.desk))) return `"${n}" rolünün masası desk-3 gibi olmalı`;
  if (raw.resident !== undefined && typeof raw.resident !== 'boolean') return `"${n}" rolünün resident alanı true ya da false olmalı`;
  const role: OrduRole = { name: n };
  for (const k of ['title', 'agent', 'character', 'model', 'brief', 'prompt', 'desk'] as const) if (typeof raw[k] === 'string') role[k] = raw[k] as string;
  if (raw.effort !== undefined) role.effort = raw.effort as AgentEffort;
  if (raw.resident !== undefined) role.resident = raw.resident as boolean;
  return role;
}

/** Checks an ordu.json, read as JSON: the config, or what's wrong with it (in Turkish, for the page). */
export function parseOrdu(raw: unknown): OrduConfig | string {
  if (!isObj(raw)) return 'ordu.json bir nesne olmalı';
  if (raw.version !== 1) return 'Desteklenen sürüm: 1';
  if (!optStr(raw.reportDir, 200) || (typeof raw.reportDir === 'string' && (raw.reportDir.startsWith('/') || raw.reportDir.split(/[\\/]/).includes('..')))) return 'reportDir proje içinde göreli bir klasör olmalı';
  if (!Array.isArray(raw.offices)) return 'offices bir liste olmalı';
  const seen = new Set<string>();
  const offices: OrduOffice[] = [];
  for (const o of raw.offices) {
    if (!isObj(o) || typeof o.id !== 'string' || !ID.test(o.id)) return 'Her ofisin geçerli bir id\'si olmalı';
    if (typeof o.name !== 'string' || !o.name.trim() || o.name.length > 60) return `"${o.id}" ofisinin adı olmalı`;
    if (!Array.isArray(o.teams)) return `"${o.id}" ofisinin ekipleri bir liste olmalı`;
    const teams: OrduTeam[] = [];
    for (const t of o.teams) {
      if (!isObj(t) || typeof t.id !== 'string' || !ID.test(t.id)) return `"${o.id}" ofisinde id'si geçersiz bir ekip var`;
      if (typeof t.name !== 'string' || !t.name.trim() || t.name.length > 60) return `"${t.id}" ekibinin adı olmalı`;
      if (typeof t.color !== 'string' || !COLOR.test(t.color)) return `"${t.id}" ekibinin rengi #rrggbb olmalı`;
      if (!Array.isArray(t.roles)) return `"${t.id}" ekibinin rolleri bir liste olmalı`;
      const roles: OrduRole[] = [];
      for (const r of t.roles) {
        const role = parseRole(r, t.id);
        if (typeof role === 'string') return role;
        if (seen.has(role.name)) return `"${role.name}" rolü iki kez tanımlı`;
        seen.add(role.name);
        roles.push(role);
      }
      teams.push({ id: t.id, name: t.name, color: t.color, roles });
    }
    offices.push({ id: o.id, name: o.name, teams });
  }
  if (seen.size > MAX_ROLES) return `En çok ${MAX_ROLES} rol olabilir`;
  return { version: 1, ...(typeof raw.reportDir === 'string' ? { reportDir: raw.reportDir } : {}), offices };
}

/** A project with agent files but no ordu.json: one office, one team, a role per agent. */
export function deriveOrdu(agents: AgentFile[]): OrduConfig {
  const roles = agents.filter((a) => ROLE_NAME.test(a.name)).slice(0, MAX_ROLES).map((a): OrduRole => ({ name: a.name, agent: a.name }));
  return { version: 1, offices: roles.length ? [{ id: 'ofis', name: 'Ofis', teams: [{ id: 'ekip', name: 'Ekip', color: '#7c8cff', roles }] }] : [] };
}

export function findRole(c: OrduConfig, name: string): { office: OrduOffice; team: OrduTeam; role: OrduRole } | undefined {
  for (const office of c.offices) for (const team of office.teams) for (const role of team.roles) if (role.name === name) return { office, team, role };
  return undefined;
}

export function allRoles(c: OrduConfig): OrduRole[] {
  return c.offices.flatMap((o) => o.teams.flatMap((t) => t.roles));
}

/** A report's Durum line, or a verify.md's Sonuç: GEÇTİ|KALDI, wherever they are in its first lines. */
export function reportLine(md: string): { status?: string; verdict?: 'GEÇTİ' | 'KALDI' } {
  const out: { status?: string; verdict?: 'GEÇTİ' | 'KALDI' } = {};
  for (const raw of md.split(/\r?\n/).slice(0, 80)) {
    const line = raw.replace(/[*_`]/g, '').replace(/^[\s#>-]+/, '').trim();
    // \b is ASCII-only and the İ in GEÇTİ isn't a word character to it: end the word on a non-letter instead.
    const verdict = /^Sonu[çc]\s*:\s*(GEÇTİ|GEÇTI|GECTI|KALDI)(?!\p{L})/iu.exec(line);
    if (verdict && !out.verdict) out.verdict = /^KALDI$/i.test(verdict[1]) ? 'KALDI' : 'GEÇTİ';
    const status = /^Durum\s*:\s*(.+)$/i.exec(line);
    if (status && !out.status) out.status = status[1].trim().slice(0, 120);
  }
  return out;
}

/** What every worker hired for a role is told first: how it talks to the rest of the office. */
export const OFIS_NOTU = [
  'Ofis notu: Bir ajan ofisinde, bir ekibin rolü olarak çalışıyorsun. Diğer roller de ayrı ajanlar olarak masalarında.',
  '- Kim var, ne yapıyor: agent-office MCP aracı list_workers.',
  '- Bir rolü işe almak için: hire_worker, role alanına rol adını yaz (ordu.json\'daki ad). Rol dosyası modeli ve eforu kendisi seçer.',
  '- Bir role mesaj ya da iş vermek için: tell_worker. Cevabı bekleme, işin bitince o sana yazar.',
  '- Merge, push, yayın ve para harcayan işler için önce Mahmut\'un onayını iste.',
].join('\n');

/** The first prompt of a worker hired for `role`: the office note, its brief, its task's folder, then what it's asked. */
export function rolePrompt(role: OrduRole, reportDir: string | undefined, taskId: string, brief: string | undefined, userPrompt: string | undefined): string {
  const task = userPrompt?.trim() || role.prompt?.trim();
  return [
    OFIS_NOTU,
    brief?.trim(),
    reportDir ? `Görev id: ${taskId} · çalışma klasörün: ${reportDir.replace(/\/+$/, '')}/${taskId}/` : undefined,
    task || 'Şimdilik bir iş yok: kendini bir cümleyle tanıt ve iş bekle.',
  ].filter(Boolean).join('\n\n');
}
