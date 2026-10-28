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
import {
  CATALOG,
  History,
  added,
  alignTo,
  aligned as alignedList,
  centered,
  distributed,
  frozen,
  inBox,
  removedMany,
  snap,
  type AlignMode,
  type Guide,
  duplicated,
  editables,
  fitted,
  footprint,
  made,
  moved,
  nameOf,
  nearestProp,
  pickProp,
  removed,
  scaled,
  split,
  swapped,
  turned,
  TURN,
  type Prop,
} from './logic';
import { createPanel } from './panel';
import { createPlan2d } from './plan2d';

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
  /** Several picked together (Shift+click, or a box drawn on the plan): the indexes, `selected` among them; empty for one or none. */
  let group: number[] = [];
  /** Where the group's main one was when it was taken, while the group is dragged. */
  let origin: [number, number] | null = null;
  let hovered = -1;
  let dragging = false;
  let ghost: [number, number] | null = null;
  /** The catalog item chosen in the panel to put down (an index into CATALOG), or -1, and where the pointer last was on the ground. */
  let pick = -1;
  /** Lined up with what's near while it's dragged (Alt held: not), and the lines it's on. */
  let align = true;
  let guides: Guide[] = [];
  let aligned = false;
  let pointer: [number, number] | null = null;
  const history = new History();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  const selMark = makeMark('#ffb547');
  const hoverMark = makeMark('#6cc4ff');
  const originMark = makeMark('#aaaaaa');
  ctx.scene.add(selMark, hoverMark, originMark);
  /** What the rest of a group is outlined with, made as they're needed. */
  const groupMarks: THREE.Group[] = [];
  const groupMark = (n: number) => {
    while (groupMarks.length <= n) {
      const m = makeMark('#ffb547');
      ctx.scene.add(m);
      groupMarks.push(m);
    }
    return groupMarks[n];
  };

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
    turn: (by) => selected >= 0 && commit(fit(turned(props, selected, by * TURN))),
    scale: (up) => selected >= 0 && commit(scaled(props, selected, up ? 1.1 : 1 / 1.1)),
    copy: () => duplicate(),
    remove: () => remove(),
    undo: () => undo(),
    leave: () => leave(),
    plan: () => togglePlan(),
    choose: (i) => {
      pick = pick === i ? -1 : i;
      show();
    },
    swap: () => pick >= 0 && selected >= 0 && commit(swapped(props, selected, CATALOG[pick])),
    align: (mode) => lineUp(alignedList(props, group, mode)),
    spread: (axis) => lineUp(distributed(props, group, axis)),
    center: (axis) => lineUp(centered(props, group, axis, ctx.plan().bounds)),
    fill: (axis) => lineUp(centered(distributed(props, group, axis), group, axis, ctx.plan().bounds)),
  });

  /** The group lined up as `next` has it (a table or your seat that ends outside the hall is pulled back in), the group kept. */
  function lineUp(next: Prop[]) {
    let list = next;
    for (const i of group) list = fitted(list, i, ctx.plan().bounds);
    commit(list, true);
  }

  /** A table that was put or turned where its ends or benches would be outside the hall is pulled back in. */
  const fit = (list: Prop[]) => (selected >= 0 ? fitted(list, selected, ctx.plan().bounds) : list);

  const plan2d = createPlan2d({
    press,
    marquee,
    move: (at, o) => hover(at, o),
    release,
    close: () => togglePlan(false),
    align: () => {
      align = !align;
      show();
    },
  });
  function togglePlan(want = !plan2d.isOpen()) {
    if (want && on) plan2d.show(planState());
    else plan2d.hide();
    show();
  }
  const planState = () => ({
    plan: ctx.plan(),
    props,
    selected,
    group,
    hovered,
    ghost: dragging ? ghost : null,
    pick,
    pointer,
    align,
    guides: dragging ? guides : [],
    player: { x: ctx.player.pos.x, z: ctx.player.pos.z, facing: ctx.player.facing },
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
    panel.render(on, { selected: p, group: group.length, pick, canUndo: history.canUndo });
    ctx.renderer.domElement.style.cursor = !on ? '' : dragging ? 'grabbing' : pick >= 0 ? 'copy' : hovered >= 0 ? 'grab' : '';
    mark(selMark, on ? p : null, dragging ? ghost : null);
    mark(originMark, on && dragging ? p : null);
    // The rest of a group, moving with the one that's being dragged.
    const [gx, gz] = dragging && origin && ghost ? [ghost[0] - origin[0], ghost[1] - origin[1]] : [0, 0];
    groupMarks.forEach((m) => (m.visible = false));
    group.filter((i) => i !== selected).forEach((i, n) => mark(groupMark(n), on && props[i] ? props[i] : null, [props[i].x + gx, props[i].z + gz]));
    // What's about to be put down is shown where the pointer is; else what's under the pointer.
    const putting = on && pick >= 0 && pointer ? made(CATALOG[pick], pointer[0], pointer[1]) : null;
    const under = on && !dragging && pick < 0 && candidate() >= 0 && candidate() !== selected ? props[candidate()] : null;
    mark(hoverMark, putting ?? under, putting ? pointer : null);
    if (plan2d.isOpen()) plan2d.draw(planState());
    const flat = plan2d.isOpen();
    label(selTag, on && !flat ? p : null, dragging ? ghost : null);
    label(hoverTag, flat ? null : (under ?? putting), putting ? pointer : null, putting ? `+ ${CATALOG[pick].label}` : undefined);
  }

  /** The list is now `next`: remembered, shown, and saved for everyone. */
  function commit(next: Prop[], keepGroup = false) {
    if (!keepGroup) group = [];
    // Nothing changed (a key on something that can't be scaled or taken away): nothing to remember or save.
    if (JSON.stringify(next) === JSON.stringify(props)) return;
    history.push(props);
    props = next;
    save();
  }
  /** Saved a moment after the last change, so a key held down (or a quick run of them) is one save and one rebuild. */
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Until when the map coming back is an echo of an earlier save, which would put the list back as it was a moment ago. */
  let echoUntil = 0;
  function save() {
    show();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const out = split(props);
      ctx.net.send({ t: 'map.edit', base: ctx.plan().id, props: out.props, tables: out.tables, ...(out.throne ? { throne: out.throne } : {}) });
      echoUntil = Date.now() + 2500;
    }, 350);
  }
  function undo(redo = false) {
    const back = redo ? history.redo(props) : history.undo(props);
    if (!back) return;
    props = back;
    group = [];
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
    if (group.length > 1) {
      commit(removedMany(props, group));
      selected = -1;
      hovered = -1;
      return show();
    }
    if (selected < 0 || !props[selected] || props[selected].kind === 'office' || (props[selected].kind === 'table' && typeof props[selected].tableIndex === 'number') || props[selected].kind === 'throne') return;
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
    props = editables(ctx.plan().config as Parameters<typeof editables>[0]);
    selected = hovered = pick = -1;
    group = [];
    on = true;
    ctx.player.setView('third');
    show();
  }
  function leave() {
    plan2d.hide();
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

  /** A press at (x, z) on the ground, in 3D or on the plan: puts the chosen catalog item down, or picks what's there up. True when the editor took it. */
  function press(at: [number, number], o: { shift?: boolean } = {}): boolean {
    if (pick >= 0) {
      // A catalog item is chosen: this click puts it down here.
      const next = added(props, made(CATALOG[pick], at[0], at[1]));
      if (next.length > props.length) {
        commit(next);
        selected = next.length - 1;
      } else toast('✏️ Haritada en çok 400 eşya olabilir');
      show();
      return true;
    }
    const i = pickProp(props, at[0], at[1]);
    if (o.shift) {
      // Shift: adds to the group or takes out of it; nothing is dragged.
      if (i < 0) return false;
      const was = group.length ? group : selected >= 0 ? [selected] : [];
      group = was.includes(i) ? was.filter((k) => k !== i) : [...was, i];
      selected = group.includes(i) ? i : (group[group.length - 1] ?? -1);
      if (group.length < 2) group = [];
      show();
      return true;
    }
    // On one of a group's: the group is dragged. On another: just that one.
    if (!(i >= 0 && group.includes(i))) group = [];
    selected = i;
    if (i < 0) {
      show();
      return false;
    }
    dragging = true;
    ghost = [props[i].x, props[i].z];
    origin = group.length > 1 ? [props[i].x, props[i].z] : null;
    show();
    return true;
  }
  /** The box drawn on the plan: whatever has its middle in it is picked together. */
  function marquee(a: [number, number], b: [number, number]) {
    const ids = inBox(props, a[0], a[1], b[0], b[1]);
    group = ids.length > 1 ? ids : [];
    selected = ids[0] ?? -1;
    show();
  }
  function hover(at: [number, number] | null, o: { alt?: boolean; within?: number } = {}) {
    if (at) pointer = at;
    if (!dragging) hovered = at && pick < 0 ? pickProp(props, at[0], at[1]) : -1;
    else if (at) {
      const a = align && !o.alt && selected >= 0 && group.length < 2 ? alignTo(props, selected, at[0], at[1], o.within ?? 0.3) : null;
      ghost = a?.aligned ? [a.x, a.z] : at;
      guides = a?.guides ?? [];
      aligned = !!a?.aligned;
    }
    show();
  }
  function release() {
    if (!on || !dragging) return;
    dragging = false;
    const to = ghost;
    ghost = null;
    const from = origin;
    origin = null;
    if (group.length > 1 && to && from) {
      // The group goes as far as its main one was taken, on the grid.
      const dx = Math.round((snap(to[0]) - from[0]) * 1000) / 1000;
      const dz = Math.round((snap(to[1]) - from[1]) * 1000) / 1000;
      guides = [];
      aligned = false;
      if (Math.hypot(dx, dz) <= 0.15) return show();
      let list: Prop[] = props.map((q, k) => (group.includes(k) && q.kind !== 'office' ? { ...frozen(q), x: Math.round((q.x + dx) * 1000) / 1000, z: Math.round((q.z + dz) * 1000) / 1000 } : q));
      for (const k of group) list = fitted(list, k, ctx.plan().bounds);
      return commit(list, true);
    }
    // A click that didn't take it anywhere only selects it.
    const next = to && selected >= 0 ? moved(props, selected, to[0], to[1], !aligned) : null;
    guides = [];
    aligned = false;
    const p = props[selected];
    if (next && p && (next[selected].x !== p.x || next[selected].z !== p.z) && Math.hypot(to![0] - p.x, to![1] - p.z) > 0.15) commit(fit(next));
    else show();
  }

  const dom = ctx.renderer.domElement;
  dom.addEventListener(
    'pointerdown',
    (e) => {
      if (!on || e.button !== 0) return;
      const at = point(e);
      if (!at || !press(at, { shift: e.shiftKey })) return;
      // Taken over from the camera: this click is the editor's.
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    true,
  );
  window.addEventListener('pointermove', (e) => {
    // The plan has its own pointer; off the 3D view the pointer is over nothing.
    if (!on || plan2d.isOpen()) return;
    hover(e.target === dom ? point(e) : null, { alt: e.altKey });
  });
  window.addEventListener('pointerup', release);
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
      if (e.code === 'KeyP' && !mod) {
        swallow();
        return togglePlan();
      }
      if (e.code === 'Escape') {
        if (plan2d.isOpen()) {
          swallow();
          return togglePlan(false);
        }
        // First Esc lets go of a group, or puts the chosen catalog item back; the next leaves.
        if (group.length > 1) {
          swallow();
          group = [];
          return show();
        }
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
        if (group.length > 1) lineUp(group.reduce((l, i) => turned(l, i, e.shiftKey ? -TURN : TURN), props));
        else commit(fit(turned(props, selected, e.shiftKey ? -TURN : TURN)));
      } else if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && selected >= 0) {
        swallow();
        commit(scaled(props, selected, e.code === 'BracketRight' ? 1.1 : 1 / 1.1));
      }
    },
    true,
  );
  // When the map is rebuilt (by this edit, or someone else's), the list is what the map has now, unless it's being dragged.
  store.on('map', () => {
    if (!on || dragging || saveTimer || Date.now() < echoUntil) return;
    const before = props.length;
    if (planOk()) props = editables(ctx.plan().config as Parameters<typeof editables>[0]);
    // Someone else's edit moved the indexes: what was selected can't be told any more.
    if (props.length !== before) selected = -1;
    group = [];
    selected = Math.min(selected, props.length - 1);
    hovered = -1;
    show();
  });
  // The editor follows the map: if it isn't the street any more, it's over. The names follow the camera.
  ctx.ticks.add('hud', () => {
    if (!on) return;
    if (!planOk()) return leave();
    // The plan is redrawn when something changes; in 3D the names follow the camera.
    if (!plan2d.isOpen()) show();
  });
}
