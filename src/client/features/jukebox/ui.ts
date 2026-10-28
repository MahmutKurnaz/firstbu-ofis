import './ui.css';
import { JUKEBOX_TUNES, STREAM, checkStreamUrl, trackTitle, tuneById } from '../../../shared/jukebox';
import type { Net } from '../../net';
import { store } from '../../state';
import { h, openModal, toast } from '../../ui/dom';

/** The jukebox: what's on, the tunes to pick from, skip and stop, and a box for a stream. */
export function openJukebox(net: Net, openVolume: () => void) {
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const now = h('div.jb-now');
  const list = h('ul.svc-list');
  const url = h('input', { type: 'text', placeholder: 'https://… internet radyosu ya da bir .mp3 bağlantısı', 'aria-label': 'Yayın ya da ses dosyası bağlantısı', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  const playUrl = h('button.btn.primary', { type: 'button' }, '📻 Çal');
  const volume = h('button.btn', { type: 'button' }, '🔈 Ses seviyen');
  const el = h(
    'div.modal.jukebox',
    { role: 'dialog', 'aria-label': 'Jukebox' },
    h('header', {}, h('h2', {}, '🎵 Jukebox'), close),
    h(
      'div.body',
      {},
      now,
      h('label', { style: 'margin-top:16px' }, 'Bir şarkı aç'),
      list,
      h('label', { style: 'margin-top:16px' }, 'Ya da bir yayın çal'),
      h('div.webhook', {}, url, playUrl),
      h('p.setting-note', {}, 'İnternet radyosu ya da bir ses dosyası. Jukebox’tan çalar, bu kattaki herkes duyar.'),
    ),
    h('footer', {}, h('span.grow', {}, 'Bu kattaki herkes aynı şarkıyı duyar; dinlenme alanına yaklaştıkça ses yükselir.'), volume),
  );

  const button = (label: string, title: string, send: () => void, primary = false) => h(primary ? 'button.btn.primary' : 'button.btn', { type: 'button', title, onclick: send }, label);

  const render = () => {
    const j = store.jukebox;
    const stream = j.track === STREAM;
    now.replaceChildren(
      h('span.jb-disc', { class: j.on ? 'spin' : '' }, stream ? '📻' : '💿'),
      h(
        'div.svc-main',
        {},
        h('div.svc-title', {}, j.on ? trackTitle(j) : 'Jukebox kapalı'),
        h('div.svc-meta', {}, j.on ? [stream ? 'bir yayın' : tuneById(j.track)?.mood, j.by && `açan: ${j.by}`].filter(Boolean).join(' · ') : j.by ? `${j.by} kapattı` : 'Açmak için bir şarkı seç'),
      ),
      j.on ? button('⏭️ Atla', 'Sıradaki şarkıya geç', () => net.send({ t: 'jukebox.skip' })) : button('▶️ Çal', `${trackTitle(j)} tekrar açılsın`, () => net.send({ t: 'jukebox.play' }), true),
      j.on ? button('⏹️ Durdur', 'Jukebox’ı kapat', () => net.send({ t: 'jukebox.stop' })) : '',
    );
    list.replaceChildren(
      ...JUKEBOX_TUNES.map((t) => {
        const playing = j.on && j.track === t.id;
        const li = h(
          'li',
          { class: playing ? 'on' : '', tabindex: 0, role: 'button', 'aria-pressed': String(playing), title: playing ? 'Şu an çalıyor' : `Aç: ${t.title}` },
          h('span.jb-icon', {}, playing ? '🔊' : '🎵'),
          h('div.svc-main', {}, h('div.svc-title', {}, t.title), h('div.svc-meta', {}, t.mood)),
        );
        const pick = () => {
          if (!playing) net.send({ t: 'jukebox.play', track: t.id });
        };
        li.addEventListener('click', pick);
        li.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        });
        return li;
      }),
    );
  };

  const play = () => {
    const u = checkStreamUrl(url.value);
    if ('error' in u) {
      toast(u.error, 'warn');
      return url.focus();
    }
    net.send({ t: 'jukebox.play', url: u.url });
    url.value = '';
  };
  playUrl.addEventListener('click', play);
  url.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') play();
  });

  const modal = openModal(el, { doing: '🎵 jukebox başında', onClose: store.on('jukebox', render) });
  close.addEventListener('click', () => modal.close());
  volume.addEventListener('click', () => {
    modal.close();
    openVolume();
  });
  render();
}
