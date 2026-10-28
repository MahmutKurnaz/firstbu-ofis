// A worker's subagents (the Agent tool), followed by Claude Code's SubagentStart and SubagentStop hooks:
// the office shows each one running as a ghost beside its desk (features/ghosts/).
import type { WorkerInfo } from '../../shared/protocol.js';

/** The most it keeps: more than this and the oldest is let go. */
export const MAX_SUBAGENTS = 6;

const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
let made = 0;

/** Takes a hook event for `info`'s subagents. True when its list changed. */
export function noteSubagent(info: Pick<WorkerInfo, 'subagents'>, event: string, payload: unknown, now = Date.now()): boolean {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const list = info.subagents ?? [];
  switch (event) {
    case 'SubagentStart': {
      const id = text(p.agent_id, 80) ?? `sub-${now.toString(36)}-${made++}`;
      if (list.some((s) => s.id === id)) return false;
      const next = [...list, { id, type: text(p.agent_type, 40) ?? 'alt ajan', at: now }];
      info.subagents = next.slice(-MAX_SUBAGENTS);
      return true;
    }
    case 'SubagentStop': {
      const id = text(p.agent_id, 80);
      const type = text(p.agent_type, 40);
      // By its id; a stop that names none takes the oldest of its kind.
      const i = id ? list.findIndex((s) => s.id === id) : list.findIndex((s) => s.type === (type ?? 'alt ajan'));
      if (i < 0) return false;
      const next = list.filter((_, k) => k !== i);
      info.subagents = next.length ? next : undefined;
      return true;
    }
    case 'SessionStart':
      // A compaction starts the session over mid-turn, with its subagents still running.
      if (p.source === 'compact') return false;
    // falls through
    case 'Stop':
      if (!list.length) return false;
      info.subagents = undefined;
      return true;
    default:
      return false;
  }
}

/** Its process ended: it's `exited`, and whatever subagents it had went with it (no Stop hook comes then). */
export function markExited(info: Pick<WorkerInfo, 'status' | 'subagents'>) {
  info.status = 'exited';
  info.subagents = undefined;
}
