// The map editor (J): on the street, click a thing (a tree, a bench, a lamp, a café table…) and drag it where you
// want it, or pick something from the panel's catalog and click the ground to put it down; R turns it, [ and ] make it
// smaller or bigger, Delete takes it away, Ctrl+D copies it, Ctrl+Z goes back. What's under the pointer is outlined in
// blue with its name, what's selected in orange. Every change is saved at once as a map of your own that extends the
// street (server/maps.ts saveEdit) and everyone is on it. Only the street, and only admins, for now: the offices'
// insides are built in code (see docs/maps.md).
import * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { isTyping } from '../../player';
import { store } from '../../state';
import { modalOpen, toast } from '../../ui/dom';
import { CATALOG, History, added, duplicated, footprint, made, moved, nameOf, nearestProp, pickProp, removed, scaled, swapped, turned, TURN, type Prop } from './logic';
import { createPanel } from './panel';

const KEY = 'KeyJ';

/** An outline and a tint on the ground, one metre square, made the size of a prop's footprint by `mark`. */
function makeMark(color: string) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      depthTest: false,
      side: THREE.DoubleSide,
    }),
  );
  const edge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 0, -0.5), new THREE.Vector3(0.5, 0, 0.5), new THREE.Vector3(-0.5, 0, 0.5)]),
    new THREE.LineBasicMaterial({ color, depthTest: false }),
  );
  g.add(fill, edge);
  g.renderOrder = 10;
  fill.renderOrder = edge.renderOrder = 10;
  g.visible = false;
  return g;
}
function mark(g: THREE.Group, p: Prop | null, at?: [number, number] | null) {
  g.visible = !!p;
  if (!p) return;
  const [w, l] = footprint(p);
  g.position.set(at ? at[0] : p.x, 0.06, at ? at[1] : p.z);
  g.scale.set(w, 1, l);
  g.rotation.y = Number(p.rotY ?? 0);
}

export function installMapEdit(ctx: Ctx) {
  let on = false;
  let props: Prop[] = [];
  let selected = -1;
  let hovered = -1;
  let dragging = false;
  let ghost: [number, number] | null = null;
  /** The catalog item chosen in the panel to put down (an index into CATALOG), or -1, and where the pointer last was on the ground. */
  let pick = -1;
  let pointer: [number, number] | null = null;
  const history = new History();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  const selMark = makeMark('#ffb547');
  const hoverMark = makeMark('#6cc4ff');
  const originMark = makeMark('#aaaaaa');
  ctx.scene.add(selMark, hoverMark, originMark);

  const tag = (color: string) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;z-index:49;transform:translate(-50%,-100%);padding:2px 8px;border-radius:8px;background:${color};color:#10151c;font:600 12px system-ui,sans-serif;pointer-events:none;display:none;white-space:nowrap`;
    document.body.appendChild(d);
    return d;
  };
  const selTag = tag('#ffb547');
  const hoverTag = tag('#6cc4ff');
  const v = new THREE.Vector3();
  function label(d: HTMLElement, p: Prop | null, at?: [number, number] | null, text = p ? nameOf(p) : '') {
    if (!on || !p) return void (d.style.display = 'none');
    v.set(at ? at[0] : p.x, 1.4, at ? at[1] : p.z).project(ctx.camera);
    if (v.z > 1) return void (d.style.display = 'none');
    const r = ctx.renderer.domElement.getBoundingClientRect();
    d.style.left = `${r.left + ((v.x + 1) / 2) * r.width}px`;
    d.style.top = `${r.top + ((1 - v.y) / 2) * r.height}px`;
    d.textContent = text;
    d.style.display = 'block';
  }

  const panel = createPanel({
    turn: (by) => selected >= 0 && commit(turned(props, selected, by * TURN)),
    scale: (up) => selected >= 0 && commit(scaled(props, selected, up ? 1.1 : 1 / 1.1)),
    copy: () => duplicate(),
    remove: () => remove(),
    undo: () => undo(),
    leave: () => leave(),
    choose: (i) => {
      pick = pick === i ? -1 : i;
      show();
    },
    swap: () => pick >= 0 && selected >= 0 && commit(swapped(props, selected, CATALOG[pick])),
  });

  const planOk = () => (ctx.plan().id === 'cadde' || ctx.plan().id === 'duzen') && ctx.plan().style === 'cadde' && Array.isArray(ctx.plan().config?.props);
  const point = (e: PointerEvent): [number, number] | null => {
    const r = ctx.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const b = ctx.plan().bounds;
    return [Math.min(b.maxX - 0.5, Math.max(b.minX + 0.5, hit.x)), Math.min(b.maxZ - 0.5, Math.max(b.minZ + 0.5, hit.z))];
  };

  /** What Enter would select: what's under the pointer, else the nearest thing to where you stand (walk up to it). */
  const candidate = () => (hovered >= 0 ? hovered : nearestProp(props, ctx.player.pos.x, ctx.player.pos.z, 3));

  function show() {
    const p = props[selected] ?? null;
    panel.render(on, { selected: p, pick, canUndo: history.canUndo });
    ctx.renderer.domElement.style.cursor = !on ? '' : dragging ? 'grabbing' : pick >= 0 ? 'copy' : hovered >= 0 ? 'grab' : '';
    mark(selMark, on ? p : null, dragging ? ghost : null);
    mark(originMark, on && dragging ? p : null);
    // What's about to be put down is shown where the pointer is; else what's under the pointer.
    const putting = on && pick >= 0 && pointer ? made(CATALOG[pick], pointer[0], pointer[1]) : null;
    const under = on && !dragging && pick < 0 && candidate() >= 0 && candidate() !== selected ? props[candidate()] : null;
    mark(hoverMark, putting ?? under, putting ? pointer : null);
    label(selTag, on ? p : null, dragging ? ghost : null);
    label(hoverTag, under ?? putting, putting ? pointer : null, putting ? `+ ${CATALOG[pick].label}` : undefined);
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
  function undo(redo = false) {
    const back = redo ? history.redo(props) : history.undo(props);
    if (!back) return;
    props = back;
    selected = Math.min(selected, props.length - 1);
    save();
  }
  function duplicate() {
    if (selected < 0) return;
    const next = duplicated(props, selected);
    if (next.length <= props.length) return;
    commit(next);
    selected = next.length - 1;
    show();
  }
  function remove() {
    if (selected < 0) return;
    commit(removed(props, selected));
    selected = -1;
    hovered = -1;
    show();
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
    selected = hovered = pick = -1;
    on = true;
    ctx.player.setView('third');
    show();
  }
  function leave() {
    on = false;
    dragging = false;
    ghost = null;
    pick = -1;
    show();
  }

  ctx.keys.bind({
    code: KEY,
    repeat: false,
    run: () => (on ? leave() : enter()),
  });

  const dom = ctx.renderer.domElement;
  dom.addEventListener(
    'pointerdown',
    (e) => {
      if (!on || e.button !== 0) return;
      const at = point(e);
      if (!at) return;
      if (pick >= 0) {
        // A catalog item is chosen: this click puts it down here.
        e.stopImmediatePropagation();
        e.preventDefault();
        const next = added(props, made(CATALOG[pick], at[0], at[1]));
        if (next.length > props.length) {
          commit(next);
          selected = next.length - 1;
        } else toast('✏️ Haritada en çok 400 eşya olabilir');
        return show();
      }
      const i = pickProp(props, at[0], at[1]);
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
    const at = e.target === dom ? point(e) : null;
    if (at) pointer = at;
    if (!dragging) hovered = at && pick < 0 ? pickProp(props, at[0], at[1]) : -1;
    else if (at) ghost = at;
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
      if (e.code === 'Escape') {
        // First Esc puts the chosen catalog item back, the next leaves.
        if (pick < 0) return leave();
        swallow();
        pick = -1;
        return show();
      }
      if (mod && e.code === 'KeyZ') {
        swallow();
        undo(e.shiftKey);
      } else if (mod && e.code === 'KeyD' && selected >= 0) {
        swallow();
        duplicate();
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selected >= 0) {
        swallow();
        remove();
      } else if ((e.code === 'Enter' || e.code === 'KeyF') && !mod && pick < 0 && candidate() >= 0) {
        swallow();
        selected = candidate();
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
  // When the map is rebuilt (by this edit, or someone else's), the list is what the map has now, unless it's being dragged.
  store.on('map', () => {
    if (!on || dragging || saveTimer) return;
    if (planOk()) props = (ctx.plan().config!.props as Prop[]).map((p) => ({ ...p }));
    selected = Math.min(selected, props.length - 1);
    show();
  });
  // The editor follows the map: if it isn't the street any more, it's over. The names follow the camera.
  ctx.ticks.add('hud', () => {
    if (!on) return;
    if (!planOk()) return leave();
    show();
  });
}
