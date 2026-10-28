import './ui.css';
import { FRAMES, checkImageUrl, type Decoration } from '../../../shared/decor';
import { store } from '../../state';
import { holdPicture, loadPicture, type Picture } from './world';
import { h, openModal, timeAgo } from '../../ui/dom';
import { confirmDialog } from '../../ui/prompt';

export interface HangChoice {
  picture: Picture;
  title: string;
  frame: number;
}

const FRAME_KEY = 'agent-office.frame';
function lastFrame(): number {
  try {
    const n = Number(localStorage.getItem(FRAME_KEY));
    return Number.isInteger(n) && n >= 0 && n < FRAMES.length ? n : 0;
  } catch {
    return 0;
  }
}

const TIP = 'Bir resim bağlantısı yapıştır. Çevrimiçi herhangi bir resme sağ tıkla ve “Resim adresini kopyala”yı seç.';

/** Pick an image, a title and a frame. Editing a picture (`initial`) fills them in. */
export function openHangDialog(opts: { initial?: Decoration; onDone(choice: HangChoice): void }) {
  const init = opts.initial;
  const urlIn = h('input', { type: 'text', placeholder: 'https://…/picture.png', 'aria-label': 'Resim bağlantısı', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  const titleIn = h('input', { type: 'text', maxlength: 80, placeholder: 'İsteğe bağlı', 'aria-label': 'Başlık', autocomplete: 'off' }) as HTMLInputElement;
  urlIn.value = init?.url ?? '';
  titleIn.value = init?.title ?? '';
  let frame = init?.frame ?? lastFrame();
  const frames = h('div.seg', { role: 'radiogroup', 'aria-label': 'Çerçeve' });
  const preview = h('div.hang-preview');
  const status = h('p.hang-status', {}, TIP);
  const submit = h('button.btn.primary', { type: 'submit', disabled: true }, init ? 'Kaydet' : 'Duvarda yer seç →') as HTMLButtonElement;
  const cancel = h('button.btn', { type: 'button' }, 'Vazgeç');
  const close = h('button.btn.close', { type: 'button', 'aria-label': 'Kapat' }, '✕');
  const form = h(
    'form.modal.hang',
    { role: 'dialog', 'aria-label': init ? 'Resmi düzenle' : 'Resim as' },
    h('header', {}, h('h2', {}, init ? '🖼️ Resmi düzenle' : '🖼️ Resim as'), close),
    h(
      'div.body',
      {},
      h('label', {}, 'Resim bağlantısı'),
      urlIn,
      h('label', { style: 'margin-top:12px' }, 'Başlık'),
      titleIn,
      h('label', { style: 'margin-top:12px' }, 'Çerçeve'),
      frames,
      preview,
      status,
    ),
    h('footer', {}, h('span.grow', {}, init ? '' : 'Sonra bir duvara nişan al ve tıkla.'), cancel, submit),
  ) as HTMLFormElement;

  let pic: Picture | null = null;
  let release = () => {};
  let seq = 0;
  let loading = false;
  /** Enter was pressed before the image loaded: go on as soon as it does. */
  let submitWhenLoaded = false;

  const paintFrames = () => {
    frames.replaceChildren(
      ...FRAMES.map((f, i) =>
        h(
          'button.btn',
          { type: 'button', role: 'radio', 'aria-checked': String(i === frame), class: i === frame ? 'on' : '', onclick: () => ((frame = i), paintFrames()) },
          h('span.dot', { style: `background:${f.color}` }),
          f.name,
        ),
      ),
    );
    preview.style.setProperty('--frame', FRAMES[frame].color);
  };
  paintFrames();

  const setStatus = (text: string, kind: '' | 'loading' | 'error' = '') => {
    status.className = `hang-status ${kind}`;
    status.replaceChildren(kind === 'loading' ? h('span.spinner') : '', text);
  };

  const load = async () => {
    const my = ++seq;
    loading = false;
    pic = null;
    submit.disabled = true;
    release();
    release = () => {};
    preview.replaceChildren();
    const raw = urlIn.value.trim();
    if (!raw) return setStatus(TIP);
    const checked = checkImageUrl(raw);
    if ('error' in checked) return setStatus(checked.error, 'error');
    release = holdPicture(checked.url);
    setStatus('Resim yükleniyor…', 'loading');
    loading = true;
    try {
      const p = await loadPicture(checked.url);
      if (my !== seq) return;
      loading = false;
      pic = p;
      preview.replaceChildren(h('img', { src: p.src, alt: 'Önizleme' }));
      setStatus('');
      submit.disabled = false;
      if (submitWhenLoaded) finish();
    } catch (err) {
      if (my !== seq) return;
      loading = false;
      submitWhenLoaded = false;
      setStatus((err as Error).message, 'error');
    }
  };
  let timer = 0;
  urlIn.addEventListener('input', () => {
    submitWhenLoaded = false;
    clearTimeout(timer);
    timer = window.setTimeout(() => void load(), 350);
  });
  // With the button disabled, Enter wouldn't submit the form at all.
  for (const input of [urlIn, titleIn]) {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing || pic) return;
      e.preventDefault();
      if (!urlIn.value.trim()) return;
      submitWhenLoaded = true;
      if (!loading) {
        clearTimeout(timer);
        void load();
      }
    });
  }

  const modal = openModal(form, {
    doing: '🖼️ resim asıyor',
    onClose: () => {
      seq++;
      clearTimeout(timer);
      release();
    },
  });
  close.addEventListener('click', () => modal.close());
  cancel.addEventListener('click', () => modal.close());
  const finish = () => {
    if (!pic) return;
    try {
      localStorage.setItem(FRAME_KEY, String(frame));
    } catch {
      // storage blocked
    }
    const choice = { picture: pic, title: titleIn.value.trim(), frame };
    modal.close();
    opts.onDone(choice);
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    finish();
  });
  if (urlIn.value) void load();
  setTimeout(() => (init ? titleIn : urlIn).focus(), 30);
}

/** A closer look at a picture on the wall, with who hung it and ways to move, edit or take it down. */
export function openPicture(d: Decoration, actions: { move(): void; edit(): void; remove(): void }) {
  const release = holdPicture(d.url);
  const stage = h('div.picture-stage', {}, h('span.spinner'));
  loadPicture(d.url).then(
    (pic) => stage.replaceChildren(h('img', { src: pic.src, alt: d.title ?? 'Resim' })),
    (err) => stage.replaceChildren(h('p.hang-status.error', {}, `⚠️ ${(err as Error).message}`)),
  );
  const link = h('a', { href: d.url, target: '_blank', rel: 'noopener noreferrer' }, 'Orijinalini aç ↗');
  const close = h('button.btn.close', { type: 'button', 'aria-label': 'Kapat' }, '✕');
  const takeDown = h('button.btn.danger', { type: 'button' }, 'İndir');
  const edit = h('button.btn', { type: 'button' }, '✏️ Düzenle');
  const move = h('button.btn.primary', { type: 'button' }, '↔️ Taşı');
  const el = h(
    'div.modal.picture',
    { role: 'dialog', 'aria-label': d.title || 'Resim' },
    h('header', {}, h('h2', {}, `🖼️ ${d.title || 'Bir resim'}`), close),
    h('div.body', {}, stage, h('p.picture-meta', {}, `Asan: ${d.by} · ${timeAgo(d.at)} · `, link)),
    h('footer', {}, takeDown, h('span.grow'), edit, move),
  );
  // Someone else took it down while you were looking.
  const unsub = store.on('decor', () => {
    if (!store.decor.some((x) => x.id === d.id)) modal.close();
  });
  const modal = openModal(el, {
    onClose: () => {
      unsub();
      release();
    },
  });
  close.addEventListener('click', () => modal.close());
  move.addEventListener('click', () => {
    modal.close();
    actions.move();
  });
  edit.addEventListener('click', () => {
    modal.close();
    actions.edit();
  });
  takeDown.addEventListener('click', () =>
    confirmDialog('Bu resim indirilsin mi?', 'Herkes için duvardan kalkar.', 'İndir', () => {
      modal.close();
      actions.remove();
    }),
  );
}
