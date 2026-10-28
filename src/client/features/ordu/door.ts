// A street office's door (a zone of the map, see shared/maps/zones.ts): the floor's ordu.json office
// that's in it, by order, is named over it, its team's color is round its roof, and E at its door
// brings that office up in the Ekipler panel.
import type { Ctx } from '../../core/context';
import { aside, hintTitle, key, onE } from '../../core/hint';
import type { OrduView } from '../../../shared/protocol';
import { store } from '../../state';
import { roleRows } from './ui';

// The kinds of thing you can use that this defines (see InteractKinds in world/types.ts).
declare module '../../world/types' {
  interface InteractKinds {
    ofis: true;
  }
}

/** Each zone's name and color, from the floor's ordu.json: its nth office in the nth zone, its first team's color. */
export function zoneLooks(view: OrduView | null): { name: string; color: string }[] {
  return (view?.config.offices ?? []).map((o) => ({ name: o.name, color: o.teams[0]?.color ?? '#8a94a6' }));
}

export function defineOrduDoors(ctx: Ctx, focusOffice: (index: number) => void) {
  ctx.interactions.define('ofis', {
    reach: 2.5,
    hint: (it) => {
      const office = store.ordu?.config.offices[it.zone ?? -1];
      if (!office) return { k: `none:${it.zone}`, parts: [hintTitle(`🏢 Ofis ${(it.zone ?? 0) + 1}`), aside('ordu.json’da bu sırada ofis yok')] };
      const rows = roleRows(store.ordu!, store.workers.values()).filter((r) => r.office === office.name);
      const busy = rows.filter((r) => r.worker && r.worker.status === 'working').length;
      const here = rows.filter((r) => r.worker).length;
      const what = `${rows.length} rol · ${here} masada · ${busy} çalışıyor`;
      return { k: `${office.name}:${what}`, parts: [hintTitle(`🏢 ${office.name}`), aside(what), key('E', 'Ekibi gör')] };
    },
    use: onE((it) => focusOffice(it.zone ?? 0)),
  });
  // The world's offices are named whenever the army or the map changes (after the map's world is up).
  const paint = () => setTimeout(() => ctx.world().setZones?.(zoneLooks(store.ordu)), 0);
  store.on('ordu', paint);
  store.on('map', paint);
}
