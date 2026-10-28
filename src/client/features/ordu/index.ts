// The Ekipler panel: the floor's army (ordu.json) beside the workers list, to see every team at a
// glance and hire, open or give work to a role from it.
import type { Ctx } from '../../core/context';
import { store } from '../../state';
import { $ } from '../../ui/dom';
import { defineOrduDoors } from './door';
import { OrduPanel } from './panel';

export interface OrduDeps {
  openTerminal(workerId: string): void;
}

export function installOrdu(ctx: Ctx, deps: OrduDeps): OrduPanel {
  const panel = new OrduPanel($('ordu-body'), {
    openTerminal: (id) => deps.openTerminal(id),
    tell: (workerId, prompt) => ctx.net.send({ t: 'ordu.tell', workerId, prompt }),
    hire: (role, prompt) => ctx.net.send({ t: 'ordu.hire', role, ...(prompt ? { prompt } : {}) }),
  });
  const draw = () => {
    panel.render(store.ordu, store.workers.values());
    const roles = store.ordu ? [...store.workers.values()].filter((w) => w.role).length : 0;
    $('ordu-count').textContent = roles ? String(roles) : '';
  };
  panel.redraw = draw;
  // A street office's door: its office in the panel, which comes out if it was put away.
  defineOrduDoors(ctx, (i) => {
    $('ordu-panel').classList.remove('hud-off');
    panel.focusOffice(i);
  });
  // A new floor (or the first one): ask for its army.
  store.on('floor', () => ctx.net.send({ t: 'ordu.get' }));
  store.on('ordu', draw);
  // A role finishing or leaving may have written a report: read them again, a moment later.
  const seen = new Map<string, string>();
  let again: ReturnType<typeof setTimeout> | undefined;
  store.on('workers', () => {
    let changed = false;
    const now = new Set<string>();
    for (const w of store.workers.values()) {
      if (!w.role) continue;
      now.add(w.id);
      if (seen.get(w.id) !== w.status && (w.status === 'done' || w.status === 'idle')) changed = true;
      seen.set(w.id, w.status);
    }
    for (const id of [...seen.keys()]) if (!now.has(id)) (seen.delete(id), (changed = true));
    if (changed) {
      clearTimeout(again);
      again = setTimeout(() => ctx.net.send({ t: 'ordu.get' }), 800);
    }
    draw();
  });
  return panel;
}
