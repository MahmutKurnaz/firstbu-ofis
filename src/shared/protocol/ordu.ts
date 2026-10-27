// The army panel's messages: a floor's offices, teams and roles (ordu.json), and the roles' reports.
import type { OrduConfig, RoleReport } from '../ordu.js';

export type { OrduConfig, OrduOffice, OrduRole, OrduTeam, RoleReport } from '../ordu.js';

export interface OrduView {
  config: OrduConfig;
  /** 'file': ordu.json; 'derived': made from .claude/agents; 'none': the project has neither. */
  source: 'file' | 'derived' | 'none';
  /** Why ordu.json couldn't be used, in Turkish. */
  error?: string;
  /** The project's .claude/agents names. */
  agents: string[];
  reports: RoleReport[];
}

export type OrduClientMsg =
  | { t: 'ordu.get' }
  /** Hire a worker for a role, with a task for it or none. */
  | { t: 'ordu.hire'; role: string; prompt?: string }
  /** Give a role's worker its next task, waking it if it's asleep. */
  | { t: 'ordu.tell'; workerId: string; prompt: string };

export type OrduServerMsg = { t: 'ordu.state'; view: OrduView };
