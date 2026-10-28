// The Images tab of a worker's terminal: the pictures in its folder (what it has drawn, screenshotted or saved), the newest
// first, to look at big, download, or hand back to it by path. The office finds them (server/termimages.ts); this draws them.
import './termimages.css';
import { clip, h, toast } from './dom';

interface Img {
  path: string;
  size: number;
  at: number;
}

export interface TermImagesOptions {
  floor: string;
  workerId: string;
  /** Types these paths (relative to the worker's folder) into its terminal, for it to open. */
  insert(paths: string[]): void;
}

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const ago = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  return s < 60 ? 'az önce' : s < 3600 ? `${Math.round(s / 60)} dk önce` : s < 86400 ? `${Math.round(s / 3600)} sa önce` : `${Math.round(s / 86400)} gün önce`;
};

export function termImages(o: TermImagesOptions): { el: HTMLElement; show(): void; hide(): void } {
  const q = (extra: Record<string, string> = {}) => new URLSearchParams({ floor: o.floor, worker: o.workerId, ...extra }).toString();
  const src = (p: string) => `/api/term/image?${q({ path: p })}`;
  const count = h('span.ti-count', {}, '');
  const refresh = h('button.btn', { type: 'button', title: 'Klasörü yeniden tara' }, '↻ Yenile');
  const grid = h('div.ti-grid', {});
  const view = h('div.ti-view.hidden', {});
  const el = h('div.term-images.hidden', {}, h('div.ti-bar', {}, h('b', {}, '🖼️ Görseller'), count, refresh), grid, view);

  let shown = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = '';

  const open = (img: Img) => {
    const back = h('button.btn', { type: 'button' }, '← Geri');
    const use = h('button.btn.primary', { type: 'button', title: 'Yolunu terminale yaz: ajan bu görsele bakar' }, '➕ Terminale ekle');
    const dl = h('a.btn', { href: src(img.path), download: img.path.split('/').pop() ?? 'gorsel', title: 'İndir' }, '⬇ İndir');
    back.addEventListener('click', () => view.classList.add('hidden'));
    use.addEventListener('click', () => {
      o.insert([img.path]);
      view.classList.add('hidden');
    });
    view.replaceChildren(h('div.ti-viewbar', {}, back, h('span.ti-name', { title: img.path }, clip(img.path, 60)), use, dl), h('img.ti-big', { src: src(img.path), alt: img.path }));
    view.classList.remove('hidden');
  };

  const draw = (images: Img[]) => {
    count.textContent = images.length ? `${images.length} görsel` : '';
    if (!images.length) {
      grid.replaceChildren(h('p.ti-empty', {}, 'Bu çalışanın klasöründe henüz görsel yok. Bir ajan png, jpg, gif, webp ya da svg kaydedince burada görünür.'));
      return;
    }
    grid.replaceChildren(
      ...images.map((img) => {
        const card = h('button.ti-card', { type: 'button', title: img.path }, h('img', { src: src(img.path), alt: img.path, loading: 'lazy' }), h('span.ti-cap', {}, clip(img.path.split('/').pop() ?? img.path, 26)), h('span.ti-meta', {}, `${kb(img.size)} · ${ago(img.at)}`));
        card.addEventListener('click', () => open(img));
        return card;
      }),
    );
  };

  const load = async () => {
    try {
      const res = await fetch(`/api/term/images?${q()}`);
      const r = (await res.json().catch(() => ({}))) as { images?: Img[]; error?: string };
      if (!res.ok || !r.images) throw new Error(r.error ?? 'Görseller okunamadı');
      // The same list: the grid is left alone (an open picture, a scroll position).
      const key = r.images.map((i) => `${i.path}:${i.at}`).join('|');
      if (key !== last) {
        last = key;
        draw(r.images);
      }
    } catch (err) {
      if (shown) toast((err as Error).message, 'warn');
    }
  };
  refresh.addEventListener('click', () => {
    last = '';
    void load();
  });

  return {
    el,
    show() {
      shown = true;
      el.classList.remove('hidden');
      void load();
      timer ??= setInterval(() => void load(), 6000);
    },
    hide() {
      shown = false;
      el.classList.add('hidden');
      view.classList.add('hidden');
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
