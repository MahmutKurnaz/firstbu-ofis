// The army panel: a floor's ordu.json and its roles' reports, and hiring a worker for a role.
import path from 'node:path';
import type { OrduClientMsg, OrduView } from '../../../shared/protocol.js';
import type { Floor } from '../../floor.js';
import type { Ctx } from '../../office/context.js';
import { loadOrdu } from '../../ordu/config.js';
import { hireRole } from '../../ordu/hire.js';
import { readReports } from '../../ordu/reports.js';
import { here } from './common.js';
import type { HandlerMap } from './types.js';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function orduView(floor: Floor): OrduView {
  const loaded = loadOrdu(floor.dir, path.join(floor.dir, '.agent-office'));
  return { ...loaded, reports: readReports(floor.dir, loaded.config, floor.workers.list()) };
}

export const orduChanged = (ctx: Ctx, floor: Floor) => ctx.toFloor(floor, { t: 'ordu.state', view: orduView(floor) });

export const orduHandlers = {
  'ordu.get'(ctx, c) {
    const floor = here(ctx, c);
    if (floor) ctx.sendTo(c, { t: 'ordu.state', view: orduView(floor) });
  },
  'ordu.hire'(ctx, c, msg) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    if (!floor) return;
    if (!floor.project.agentProviders.includes('claude')) return ctx.warn(c, 'Bu katta Claude Code yok: roller Claude Code ile çalışır');
    // A role runs Claude Code as whoever hires it, so they need a Claude sign-in of their own, as at a desk.
    ctx.withSignIn(c, ctx.claudeFor('claude'), () => {
      const r = hireRole(floor, str(msg.role, 40), who, str(msg.prompt, 20000) || undefined, c.accountId);
      if (typeof r === 'string') return ctx.warn(c, r);
      ctx.toastFloor(floor, `${who}, ${r.info.name} (${r.info.role}) işe aldı${msg.prompt ? ': bir işle' : ''}`);
      if (r.note) ctx.toastFloor(floor, r.note, 'warn');
      orduChanged(ctx, floor);
    });
  },
  'ordu.tell'(ctx, c, msg) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    const text = str(msg.prompt, 20000).trim();
    const w = floor?.workers.get(str(msg.workerId, 64));
    if (!floor || !w || !text) return ctx.warn(c, w ? 'Ne yapsın?' : 'Bu rolün ajanı artık burada değil');
    // Only for a role's worker (this is the Ekipler panel's message). Like worker.prompt and worker.resume,
    // anyone signed in to the office may give it work: it's a shared office, and a resumed worker runs
    // on its own owner's sign-ins, not the asker's.
    if (!w.role) return ctx.warn(c, 'Bu bir rol ajanı değil');
    // Asleep after a restart: wake it with the task, as tell_worker does.
    let err = floor.workers.prompt(w.id, text, who);
    if (err === 'Worker is not running') err = floor.workers.resume(w.id, text);
    if (err) return ctx.warn(c, err);
    ctx.toastFloor(floor, `${who}, ${w.name}'e iş verdi`);
  },
} satisfies HandlerMap<OrduClientMsg>;
