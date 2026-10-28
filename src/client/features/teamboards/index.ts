// The live boards on the back walls of the executive suite's rooms (world/cadde/suite.ts): each manager's shows
// their team's workers, what each is on, what it's doing, how long it has been so and who it reports to; the
// lead's every team at a glance, the assistant's who's waiting on you, and yours everyone. Redrawn whenever the
// workers change, and every few seconds so the minutes keep counting.
import type { Ctx } from '../../core/context';
import { store } from '../../state';
import { teamBoards } from '../../world/cadde/teamboard';
import { drawEveryone, drawLead, drawTeam, drawWaiting } from './draw';
import { everyone, rowOf, teamLines, teamRows, waiting, workerOf } from './logic';

const EVERY = 5000;

export function installTeamBoards(ctx: Ctx) {
  let dirty = true;
  let last = 0;
  let size = -1;
  store.on('workers', () => (dirty = true));
  store.on('floor', () => (dirty = true));

  function redraw() {
    const config = store.ordu?.config;
    const now = Date.now();
    const workers = [...store.workers.values()];
    for (const b of teamBoards) {
      const g = b.canvas.getContext('2d');
      if (!g) continue;
      if (b.kind === 'team' && config) {
        const t = teamRows(config, b.team, workers, now);
        if (t) drawTeam(g, b.canvas.width, b.canvas.height, t.name, t.color, t.rows);
      } else if (b.kind === 'lead' && config) {
        const role = config.offices.flatMap((o) => o.teams.flatMap((x) => x.roles)).find((r) => r.name === 'lead');
        drawLead(g, b.canvas.width, b.canvas.height, teamLines(config, workers, now), role ? rowOf(config, role, workerOf(workers, role.name), now) : null);
      } else if (b.kind === 'asst') drawWaiting(g, b.canvas.width, b.canvas.height, waiting(workers, now));
      else if (b.kind === 'you') drawEveryone(g, b.canvas.width, b.canvas.height, everyone(config, workers, now));
      b.texture.needsUpdate = true;
    }
  }

  ctx.ticks.add('hud', ({ now }) => {
    if (!teamBoards.size) return;
    if (size !== teamBoards.size) {
      size = teamBoards.size;
      dirty = true;
    }
    if (dirty || now - last > EVERY) {
      dirty = false;
      last = now;
      redraw();
    }
  });
}
