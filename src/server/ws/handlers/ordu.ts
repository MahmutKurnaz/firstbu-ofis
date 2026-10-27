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
    const r = hireRole(floor, str(msg.role, 40), who, str(msg.prompt, 20000) || undefined, c.accountId);
    if (typeof r === 'string') return ctx.warn(c, r);
    ctx.toastFloor(floor, `${who}, ${r.info.name} (${r.info.role}) işe aldı${r.info.prompt && msg.prompt ? ': bir işle' : ''}`);
    if (r.note) ctx.toastFloor(floor, r.note, 'warn');
    orduChanged(ctx, floor);
  },
} satisfies HandlerMap<OrduClientMsg>;
