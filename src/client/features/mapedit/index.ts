// The map editor (J): on the street, click a thing (a tree, a bench, a lamp, a café table…) and drag it where you
// want it; R turns it, [ and ] make it smaller or bigger, Delete takes it away, Ctrl+D copies it, Ctrl+Z goes back.
// Every change is saved at once as a map of your own that extends the street (server/maps.ts saveEdit) and everyone
// is on it. Only the street, and only admins, for now: the offices' insides are built in code (see docs/maps.md).
import * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { isTyping } from '../../player';
import { store } from '../../state';
import { modalOpen, toast } from '../../ui/dom';
import { CATALOG, History, added, duplicated, made, moved, nearestProp, removed, scaled, swapped, turned, TURN, type Prop } from './logic';

const KEY = 'KeyJ';

export function installMapEdit(ctx: Ctx) {
  let on = false;
  let props: Prop[] = [];
  let selected = -1;
  let dragging = false;
  let ghost: [number, number] | null = null;
  /** What N has picked to put down (Enter), or to swap the selected one for (Y), and where the pointer last was on the ground. */
  let cat = 0;
  let pointer: [number, number] | null = null;
  const history = new History();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = 10;
  ring.visible = false;
  ctx.scene.add(ring);

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:12px;top:70px;z-index:50;max-width:310px;padding:10px 12px;border-radius:12px;background:rgba(20,24,32,.92);color:#eef3f8;font:13px/1.45 system-ui,sans-serif;box-shadow:0 4px 18px #0006;display:none;pointer-events:none';
  document.body.appendChild(panel);

  const planOk = () => (ctx.plan().id === 'cadde' || ctx.plan().id === 'duzen') && ctx.plan().style === 'cadde' && Array.isArray(ctx.plan().config?.props);
  const point = (e: PointerEvent): [number, number] | null => {
    const r = ctx.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const b = ctx.plan().bounds;
    return [Math.min(b.maxX - 0.5, Math.max(b.minX + 0.5, hit.x)), Math.min(b.maxZ - 0.5, Math.max(b.minZ + 0.5, hit.z))];
  };

  function show() {
    panel.style.display = on ? 'block' : 'none';
    const p = props[selected];
    panel.innerHTML =
      '<b>✏️ Düzenleme modu</b><br>Bir eşyaya tıkla, sürükle. <b>R</b> döndür · <b>[</b> <b>]</b> boyut · <b>Delete</b> sil · <b>Ctrl+D</b> kopyala · <b>Ctrl+Z</b> geri al · <b>J</b>/<b>Esc</b> çık' +
      `<br><b>N</b>: katalog → <span style="color:#9fd2ee">${CATALOG[cat].label}</span> · <b>Enter</b> imlecin olduğu yere koy · <b>Y</b> seçiliyle değiştir` +
      (p ? `<br><span style="color:#ffb547">Seçili: ${p.kind} (${p.x.toFixed(2)}, ${p.z.toFixed(2)})${p.rotY ? ` · ${(Number(p.rotY) * 57.3).toFixed(0)}°` : ''}${p.scale ? ` · ×${p.scale}` : ''}</span>` : '<br><span style="opacity:.7">Hiçbir şey seçili değil.</span>');
    const q = ghost ?? (p ? [p.x, p.z] : null);
    ring.visible = on && !!q;
    if (q) ring.position.set(q[0], 0.05, q[1]);
  }

  /** The list is now `next`: remembered, shown, and saved for everyone. */
  function commit(next: Prop[]) {
    history.push(props);
    props = next;
    save();
  }
  /** Saved a moment after the last change, so a key held down (or a quick run of them) is one save and one rebuild. */
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function save() {
    show();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      ctx.net.send({ t: 'map.edit', base: ctx.plan().id, props });
    }, 350);
  }

  function enter() {
    if (!store.me.admin) {
      toast('✏️ Haritayı yalnızca yöneticiler düzenleyebilir');
      return;
    }
    if (!planOk()) {
      toast('✏️ Düzenleme şimdilik yalnızca cadde haritasında');
      return;
    }
    props = (ctx.plan().config!.props as Prop[]).map((p) => ({ ...p }));
    selected = -1;
    on = true;
    ctx.player.setView('third');
    show();
  }
  function leave() {
    on = false;
    dragging = false;
    ghost = null;
    show();
  }

  ctx.keys.bind({ code: KEY, repeat: false, run: () => (on ? leave() : enter()) });

  const dom = ctx.renderer.domElement;
  dom.addEventListener(
    'pointerdown',
    (e) => {
      if (!on || e.button !== 0) return;
      const at = point(e);
      if (!at) return;
      const i = nearestProp(props, at[0], at[1]);
      selected = i;
      if (i < 0) return show();
      // Taken over from the camera: this click is the editor's.
      e.stopImmediatePropagation();
      e.preventDefault();
      dragging = true;
      ghost = [props[i].x, props[i].z];
      show();
    },
    true,
  );
  window.addEventListener('pointermove', (e) => {
    if (!on) return;
    const at = point(e);
    if (at) pointer = at;
    if (!dragging) return;
    if (at) ghost = at;
    show();
  });
  window.addEventListener('pointerup', () => {
    if (!on || !dragging) return;
    dragging = false;
    const to = ghost;
    ghost = null;
    // A click that didn't take it anywhere only selects it.
    const next = to && selected >= 0 ? moved(props, selected, to[0], to[1]) : null;
    const p = props[selected];
    if (next && p && (next[selected].x !== p.x || next[selected].z !== p.z) && Math.hypot(to![0] - p.x, to![1] - p.z) > 0.15) commit(next);
    else show();
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (!on) return;
      // Typing somewhere, or a window's open: the keys are theirs.
      if (modalOpen() || isTyping(e)) return;
      if (e.repeat) return;
      const mod = e.ctrlKey || e.metaKey;
      const swallow = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      if (e.code === 'Escape') return leave();
      if (mod && e.code === 'KeyZ') {
        swallow();
        const back = e.shiftKey ? history.redo(props) : history.undo(props);
        if (back) {
          props = back;
          selected = Math.min(selected, props.length - 1);
          save();
        }
      } else if (mod && e.code === 'KeyD' && selected >= 0) {
        swallow();
        const next = duplicated(props, selected);
        if (next.length > props.length) {
          commit(next);
          selected = next.length - 1;
          show();
        }
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selected >= 0) {
        swallow();
        commit(removed(props, selected));
        selected = -1;
        show();
      } else if (e.code === 'KeyR' && selected >= 0 && !mod) {
        swallow();
        commit(turned(props, selected, e.shiftKey ? -TURN : TURN));
      } else if (e.code === 'KeyN' && !mod) {
        swallow();
        cat = (cat + (e.shiftKey ? CATALOG.length - 1 : 1)) % CATALOG.length;
        show();
      } else if (e.code === 'Enter' && !mod) {
        swallow();
        const at = pointer ?? [ctx.player.pos.x, ctx.player.pos.z];
        const next = added(props, made(CATALOG[cat], at[0], at[1]));
        if (next.length > props.length) {
          commit(next);
          selected = next.length - 1;
          show();
        }
      } else if (e.code === 'KeyY' && selected >= 0 && !mod) {
        swallow();
        commit(swapped(props, selected, CATALOG[cat]));
      } else if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && selected >= 0) {
        swallow();
        commit(scaled(props, selected, e.code === 'BracketRight' ? 1.1 : 1 / 1.1));
      }
    },
    true,
  );
  // When the map is rebuilt (by this edit, or someone else's), the list is what the map has now, unless it's being dragged.
  store.on('map', () => {
    if (!on || dragging || saveTimer) return;
    if (planOk()) props = (ctx.plan().config!.props as Prop[]).map((p) => ({ ...p }));
    selected = Math.min(selected, props.length - 1);
    show();
  });
  // The editor follows the map: if it isn't the street any more, it's over.
  ctx.ticks.add('hud', () => {
    if (!on) return;
    if (!planOk()) return leave();
  });
}
