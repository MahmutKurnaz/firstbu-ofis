// What a hire for an ordu.json role adds to WorkerManager.spawn (see ../ordu/hire.ts).

export interface SpawnOpts {
  /** The ordu.json role it's hired for. */
  role?: string;
  /** `claude --agent <agentFile>`: one of the project's .claude/agents. */
  agentFile?: string;
  /** The task id its reports go under. */
  roleTask?: string;
  /** Its name, instead of the next free one from the list (`Kaplan 2` when a `Kaplan` is here). */
  name?: string;
}

/** `wanted`, or `wanted 2`, `wanted 3`… when that name is taken. */
export function freeName(wanted: string, used: Set<string>): string {
  if (!used.has(wanted)) return wanted;
  for (let n = 2; ; n++) if (!used.has(`${wanted} ${n}`)) return `${wanted} ${n}`;
}

/** The role fields of a worker's info, for those it has. */
export function roleFields(opts: SpawnOpts): { role?: string; agentFile?: string; roleTask?: string } {
  return { ...(opts.role ? { role: opts.role } : {}), ...(opts.agentFile ? { agentFile: opts.agentFile } : {}), ...(opts.roleTask ? { roleTask: opts.roleTask } : {}) };
}

// The manager's other small helpers live beside their own topic; it takes them from here to keep its imports short.
export { markExited } from './subagents.js';
