// The map editor's panel (features/mapedit): what's selected, buttons for what can be done to it, and the catalog
// to click an item out of. It only draws and reports clicks; index.ts holds the state.
import { CATALOG, GROUPS, footprint, nameOf, type Prop } from './logic';

export interface PanelState {
  selected: Prop | null;
  /** The catalog item chosen to put down (an index into CATALOG), or -1. */
  pick: number;
  canUndo: boolean;
}

export interface PanelActions {
  turn(by: 1 | -1): void;
  scale(up: boolean): void;
  copy(): void;
  remove(): void;
  undo(): void;
  leave(): void;
  choose(i: number): void;
  swap(): void;
}

const BTN = 'border:0;border-radius:8px;padding:5px 9px;margin:2px 3px 2px 0;background:#2c3644;color:#eef3f8;font:inherit;cursor:pointer';

export function createPanel(act: PanelActions) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:12px;top:70px;z-index:50;width:290px;max-height:calc(100vh - 100px);overflow:auto;padding:10px 12px;border-radius:12px;background:rgba(20,24,32,.94);color:#eef3f8;font:13px/1.45 system-ui,sans-serif;box-shadow:0 4px 18px #0006;display:none';
  const items = GROUPS.map(
    (g) =>
      `<div style="margin:8px 0 2px;opacity:.75">${g.title}</div>` +
      g.ids.map((id) => `<button data-a="choose" data-i="${CATALOG.findIndex((c) => c.id === id)}" style="${BTN}">${CATALOG.find((c) => c.id === id)?.label ?? id}</button>`).join(''),
  ).join('');
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center"><b>✏️ Düzenleme modu</b><button data-a="leave" title="Kapat (J)" style="border:0;background:none;color:#eef3f8;font-size:18px;cursor:pointer">✕</button></div>' +
    '<div data-sel style="margin-top:6px"></div>' +
    '<div style="margin-top:10px;border-top:1px solid #fff2;padding-top:6px"><b>Katalog</b> <span style="opacity:.7">tıkla, sonra haritada yere tıkla</span></div>' +
    `<div data-cat>${items}</div>` +
    '<div style="margin-top:8px;opacity:.6;font-size:12px">Kısayollar: R döndür · [ ] boyut · Delete sil · Ctrl+D kopyala · Ctrl+Z geri al · J çık</div>';
  // Clicking a button must not take the keyboard from the game (Enter or Space would press it again).
  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'choose') act.choose(Number(b.dataset.i));
    else if (a === 'turn') act.turn(1);
    else if (a === 'turnback') act.turn(-1);
    else if (a === 'smaller') act.scale(false);
    else if (a === 'bigger') act.scale(true);
    else if (a === 'copy') act.copy();
    else if (a === 'remove') act.remove();
    else if (a === 'undo') act.undo();
    else if (a === 'swap') act.swap();
    else if (a === 'leave') act.leave();
  });
  document.body.appendChild(el);
  const sel = el.querySelector('[data-sel]') as HTMLElement;

  function render(on: boolean, s: PanelState) {
    el.style.display = on ? 'block' : 'none';
    if (!on) return;
    const p = s.selected;
    const chosen = s.pick >= 0 ? CATALOG[s.pick] : null;
    const btn = (a: string, text: string, off = false) => `<button data-a="${a}" ${off ? 'disabled' : ''} style="${BTN}${off ? ';opacity:.4;cursor:default' : ''}">${text}</button>`;
    let h = '';
    if (chosen) h += `<div style="color:#8fe39a">➕ Seçtiğin: <b>${chosen.label}</b>. Haritada boş bir yere tıkla, oraya koyulur.</div>`;
    if (p) {
      const [w, l] = footprint(p);
      h +=
        `<div style="color:#ffb547;margin-top:4px">Seçili: <b>${nameOf(p)}</b><br><span style="opacity:.85">konum ${p.x.toFixed(1)}, ${p.z.toFixed(1)} · ${w.toFixed(1)}×${l.toFixed(1)} m${p.rotY ? ` · ${(Number(p.rotY) * 57.3).toFixed(0)}°` : ''}</span></div>` +
        btn('turn', '↻ Döndür') +
        btn('smaller', '− Küçült') +
        btn('bigger', '+ Büyüt') +
        btn('copy', '⧉ Kopyala') +
        btn('remove', '🗑 Sil') +
        btn('undo', '↶ Geri al', !s.canUndo) +
        (chosen ? `<br>${btn('swap', `🔁 Bunu «${chosen.label}» yap`)}` : '<div style="opacity:.65;font-size:12px">Sürükleyip bırakarak taşı.</div>');
    } else if (!chosen)
      h += `<div style="opacity:.75;margin-top:4px">Hiçbir şey seçili değil. Haritadaki bir eşyaya tıkla ya da yanına yürü (mavi çerçeveli olanı <b>Enter</b> seçer), sürükleyip taşı.</div>${btn('undo', '↶ Geri al', !s.canUndo)}`;
    sel.innerHTML = h;
    el.querySelectorAll<HTMLElement>('[data-a="choose"]').forEach((b) => {
      b.style.background = Number(b.dataset.i) === s.pick ? '#3b7d4a' : '#2c3644';
    });
  }
  return { render, el };
}
