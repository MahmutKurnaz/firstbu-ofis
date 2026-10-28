// The map editor (J): on the street, click a thing (a tree, a bench, a lamp, a café table…) and drag it where you
// want it; R turns it, [ and ] make it smaller or bigger, Delete takes it away, Ctrl+D copies it, Ctrl+Z goes back.
// Every change is saved at once as a map of your own that extends the street (server/maps.ts saveEdit) and everyone
// is on it. Only the street, and only admins, for now: the offices' insides are built in code (see docs/maps.md).
import * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { toast } from '../../ui/dom';
import { History, duplicated, moved, nearestProp, removed, scaled, turned, TURN, type Prop } from './logic';

const KEY = 'KeyJ';

export function installMapEdit(ctx: Ctx) {
  let on = false;
  let props: Prop[] = [];
  let selected = -1;
  let dragging = false;
  let ghost: [number, number] | null = null;
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

  const planOk = () => ctx.plan().style === 'cadde' && Array.isArray(ctx.plan().config?.props);
  const point = (e: PointerEvent): [number, number] | null => {
    const r = ctx.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
  };

  function show() {
    panel.style.display = on ? 'block' : 'none';
    const p = props[selected];
    panel.innerHTML =
      '<b>✏️ Düzenleme modu</b><br>Bir eşyaya tıkla, sürükle. <b>R</b> döndür · <b>[</b> <b>]</b> boyut · <b>Delete</b> sil · <b>Ctrl+D</b> kopyala · <b>Ctrl+Z</b> geri al · <b>J</b>/<b>Esc</b> çık' +
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
  function save() {
    ctx.net.send({ t: 'map.edit', base: ctx.plan().id, props });
    show();
  }

  function enter() {
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
    if (!on || !dragging) return;
    const at = point(e);
    if (at) ghost = at;
    show();
  });
  window.addEventListener('pointerup', () => {
    if (!on || !dragging) return;
    dragging = false;
    const to = ghost;
    ghost = null;
    if (to && selected >= 0) commit(moved(props, selected, to[0], to[1]));
    else show();
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (!on) return;
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
      } else if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && selected >= 0) {
        swallow();
        commit(scaled(props, selected, e.code === 'BracketRight' ? 1.1 : 1 / 1.1));
      }
    },
    true,
  );
  // The editor follows the map: when everyone's map is rebuilt (by this edit, or someone else's), what it shows is that.
  ctx.ticks.add('hud', () => {
    if (!on) return;
    if (!planOk()) return leave();
  });
}
