// Hiring a worker for one of ordu.json's roles: at its desk (or the next free one), as the project's
// own Claude Code agent for it, told how the office works and where its task's reports go.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRole, rolePrompt } from '../../shared/ordu.js';
import { nextFreeSeat } from '../../shared/layout.js';
import type { WorkerInfo } from '../../shared/protocol.js';
import type { Floor } from '../floor.js';
import { loadOrdu } from './config.js';

/** This repository, where ordu/ (the templates and the shared roles' briefs) lives. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const MAX_BRIEF = 64 * 1024;

/** The floor as hiring needs it, so a test can hand in a small fake. */
export type HireFloor = Pick<Floor, 'dir'> & { plan: { wing: number }; workers: Pick<Floor['workers'], 'list' | 'deskOccupied' | 'spawn'> };

/** A role's brief: a file in the project, else one in this repository's ordu/. */
function readBrief(projectDir: string, file: string | undefined): string | undefined {
  if (!file || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) return undefined;
  for (const base of [projectDir, REPO_ROOT]) {
    const abs = path.join(base, file);
    try {
      if (existsSync(abs) && statSync(abs).size <= MAX_BRIEF) return readFileSync(abs, 'utf8');
    } catch {
      // unreadable: try the next place
    }
  }
  return undefined;
}

/** The task id a role's reports go under: short, sortable, unique enough within a project. */
export function newTaskId(now = Date.now()): string {
  return `${now.toString(36)}${Math.floor(Math.random() * 36 ** 2).toString(36).padStart(2, '0')}`;
}

/**
 * Hires a worker for `roleName`. A string is why it can't (in Turkish, for the page); `note` is
 * something to warn about although it went ahead (its agent file is missing, say).
 */
export function hireRole(floor: HireFloor, roleName: string, by: string, prompt?: string, owner?: string): { info: WorkerInfo; note?: string } | string {
  const loaded = loadOrdu(floor.dir, path.join(floor.dir, '.agent-office'));
  const found = findRole(loaded.config, roleName);
  if (!found) return `"${roleName}" diye bir rol yok`;
  const { role } = found;
  if (floor.workers.list().some((w) => w.role === role.name)) return `${role.name} zaten masasında: iş ver`;
  let desk = role.desk;
  if (desk) {
    if (floor.workers.deskOccupied(desk)) return `${role.name}'in masası (${desk}) dolu`;
  } else {
    desk = nextFreeSeat((id) => floor.workers.deskOccupied(id), floor.plan.wing)?.id;
    if (!desk) return 'Boş masa yok: önce birini eve gönder';
  }
  let note: string | undefined;
  let agentFile: string | undefined;
  if (role.agent) {
    if (loaded.agents.includes(role.agent)) agentFile = role.agent;
    else note = `${role.name}: rol dosyası bulunamadı (.claude/agents/${role.agent}.md), --agent olmadan çalışıyor`;
  }
  const roleTask = newTaskId();
  const text = rolePrompt(role, loaded.config.reportDir, roleTask, readBrief(floor.dir, role.brief), prompt);
  const r = floor.workers.spawn(desk, by, text, false, 'agent', 'claude', role.model, role.effort, undefined, owner, [], undefined, { role: role.name, agentFile, roleTask, name: role.title ?? role.name });
  if (typeof r === 'string') return r;
  return note ? { info: r, note } : { info: r };
}
