// ⚙️ Settings' Outside, under Building: what the sky's doing, and which clock it keeps, for everyone
// (see server/sky.ts).
import type { Net } from '../net';
import { store } from '../state';
import { h } from './dom';
import { describeSky } from '../world/sky';

/**
 * The setting, made by `frame` from what goes in it: the sky now (`outside`, see describeSky), the
 * real time of day or a whole day and night every hour as buttons, and a note. Kept up to date until `off`.
 */
export function outsideSetting(net: Net, outside: { now: string; live: boolean }, frame: (body: Node[]) => HTMLElement): { section: HTMLElement; off: () => void } {
  const row = h('div.seg', { role: 'radiogroup', 'aria-label': 'Gökyüzünün saati' });
  const now = h('p.outside-now');
  const note = h('p.setting-note');
  const paint = () => {
    const real = !!store.sky?.realTime;
    now.textContent = store.sky ? describeSky(store.sky) : outside.now;
    row.replaceChildren(
      ...[true, false].map((r) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(real === r),
            class: real === r ? 'on' : '',
            onclick: () => r !== !!store.sky?.realTime && net.send({ t: 'sky.clock', real: r }),
          },
          r ? '🕰️ Gerçek saat (24 s)' : '⏩ Her saat bir gün',
        ),
      ),
    );
    note.textContent = `Herkes aynı gökyüzünü görür: ${real ? 'günün gerçek saati' : 'her saatte bir gün ve gece'} ve ${outside.live ? 'bulunduğu yerin canlı havası.' : 'gelip geçen hava durumu. Gerçek bir şehrin tahminini kullanmak için ofisi --city ile başlat.'}`;
  };
  paint();
  return { section: frame([now, row, note]), off: store.on('sky', paint) };
}
