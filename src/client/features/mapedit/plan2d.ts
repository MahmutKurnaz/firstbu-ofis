// The map editor's 2D plan (features/mapedit): the same list the 3D editor works on, drawn from above as a blueprint (the
// hall's outline, the offices and the suite's rooms, the tables with their benches and seats, every prop as a symbol with
// its name), to pick, drag, turn and put down on. It only draws and turns pointer events into points in the world (m);
// what they mean is index.ts's, the same as in 3D. Wheel zooms, the middle or right button (or a drag on bare ground) pans.
import { CADDE_SIZE, OFFICE_DOOR, SUITE, officeBox, officePoint } from '../../../shared/maps/cadde-props';
import { BENCH_OUT, COUNCIL, THRONE_SIZE, type MapPlan } from '../../../shared/maps';
import { CATALOG, footprint, made, nameOf, type Guide, type Prop } from './logic';

export interface PlanState {
  plan: MapPlan;
  props: readonly Prop[];
  selected: number;
  hovered: number;
  /** Where the selected one is being dragged to, and what's about to be put down where the pointer is. */
  ghost: [number, number] | null;
  pick: number;
  pointer: [number, number] | null;
  /** Lining up on (and the lines it's on while it's dragged). */
  align: boolean;
  guides: Guide[];
  player: { x: number; z: number; facing: number };
}

export interface PlanHandlers {
  /** A press at (x, z): true when it took something (it's being dragged), false for bare ground (then it pans). */
  press(at: [number, number]): boolean;
  move(at: [number, number], o: { alt: boolean; within: number }): void;
  align(): void;
  release(): void;
  close(): void;
}

const INK = '#cfe8ff';
const DIM = '#6f93b8';

export function createPlan2d(h: PlanHandlers) {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:40;display:none;background:#0e2a47;touch-action:none';
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  const bar = document.createElement('div');
  bar.style.cssText =
    'position:absolute;right:14px;top:14px;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(20,24,32,.92);color:#eef3f8;font:13px system-ui,sans-serif';
  const chip = 'border:0;border-radius:8px;padding:5px 10px;background:#2c3644;color:#eef3f8;font:inherit;cursor:pointer';
  bar.innerHTML = `<span>📐 2D plan</span><button data-a="in" style="${chip}">＋</button><button data-a="out" style="${chip}">－</button><button data-a="align" title="Sürüklerken yakındaki eşyalara hizala (Alt: geçici kapat)" style="${chip}">🧲 Hizala</button><button data-a="fit" style="${chip}">Sığdır</button><button data-a="close" title="Kapat (P)" style="border:0;background:none;color:#eef3f8;font-size:18px;cursor:pointer">✕</button>`;
  bar.addEventListener('mousedown', (e) => e.preventDefault());
  root.append(cv, bar);
  const alignBtn = bar.querySelector('[data-a="align"]') as HTMLElement;
  document.body.appendChild(root);

  let open = false;
  let state: PlanState | null = null;
  /** Pixels per metre, and the world point at the middle of the canvas. */
  let k = 12;
  let cx = 0;
  let cz = 0;
  let panning: { x: number; y: number } | null = null;
  let dragging = false;

  const size = () => ({ w: cv.clientWidth, h: cv.clientHeight });
  const toScreen = (x: number, z: number): [number, number] => [size().w / 2 + (x - cx) * k, size().h / 2 + (z - cz) * k];
  const toWorld = (px: number, py: number): [number, number] => [cx + (px - size().w / 2) / k, cz + (py - size().h / 2) / k];
  const at = (e: PointerEvent | WheelEvent): [number, number] => {
    const r = cv.getBoundingClientRect();
    const b = state?.plan.bounds;
    const [x, z] = toWorld(e.clientX - r.left, e.clientY - r.top);
    return b ? [Math.min(b.maxX - 0.5, Math.max(b.minX + 0.5, x)), Math.min(b.maxZ - 0.5, Math.max(b.minZ + 0.5, z))] : [x, z];
  };

  function fit() {
    const b = state?.plan.bounds;
    if (!b) return;
    const { w, h: ht } = size();
    // The panel takes the left 320 px.
    const usable = Math.max(200, w - 340);
    k = Math.min(usable / (b.maxX - b.minX + 4), (ht - 40) / (b.maxZ - b.minZ + 4));
    cx = (b.minX + b.maxX) / 2 - 160 / k;
    cz = (b.minZ + b.maxZ) / 2;
  }
  function zoom(f: number, px = size().w / 2, py = size().h / 2) {
    const [wx, wz] = toWorld(px, py);
    k = Math.min(80, Math.max(3, k * f));
    cx = wx - (px - size().w / 2) / k;
    cz = wz - (py - size().h / 2) / k;
  }

  bar.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'in') zoom(1.25);
    else if (a === 'out') zoom(0.8);
    else if (a === 'fit') fit();
    else if (a === 'align') return h.align();
    else if (a === 'close') return h.close();
    if (state) draw(state);
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
      if (state) draw(state);
    },
    { passive: false },
  );
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    if (e.button === 0 && h.press(at(e))) dragging = true;
    else panning = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('pointermove', (e) => {
    if (panning) {
      cx -= (e.clientX - panning.x) / k;
      cz -= (e.clientY - panning.y) / k;
      panning = { x: e.clientX, y: e.clientY };
      if (state) draw(state);
    } else h.move(at(e), { alt: e.altKey, within: Math.min(0.5, 8 / k) });
  });
  const up = () => {
    panning = null;
    if (dragging) {
      dragging = false;
      h.release();
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => open && state && draw(state));

  /** `rotY` as the canvas turns it: the world turns x toward -z, the canvas's y is z. */
  function frame(g: CanvasRenderingContext2D, x: number, z: number, rotY: number, fn: () => void) {
    const [sx, sy] = toScreen(x, z);
    g.save();
    g.translate(sx, sy);
    g.rotate(-rotY);
    g.scale(k, k);
    g.lineWidth = 1.5 / k;
    fn();
    g.restore();
  }
  const rect = (g: CanvasRenderingContext2D, w: number, l: number, fill?: string, dx = 0) => {
    if (fill) {
      g.fillStyle = fill;
      g.fillRect(dx - w / 2, -l / 2, w, l);
    }
    g.strokeRect(dx - w / 2, -l / 2, w, l);
  };
  const label = (g: CanvasRenderingContext2D, text: string, x: number, z: number, color = INK, px = 12) => {
    const [sx, sy] = toScreen(x, z);
    g.font = `${px}px system-ui,sans-serif`;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.fillText(text, sx, sy + px / 3);
  };

  /** One prop as its symbol, in its own frame. */
  function symbol(g: CanvasRenderingContext2D, p: Prop, color: string, fill: string) {
    const s = Number(p.scale ?? 1) || 1;
    const r = Number(p.rotY ?? 0);
    frame(g, p.x, p.z, r, () => {
      g.strokeStyle = color;
      g.fillStyle = fill;
      const circle = (rad: number) => {
        g.beginPath();
        g.arc(0, 0, rad, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      };
      if (p.kind === 'tree') circle(1.1 * s);
      else if (p.kind === 'lamp') circle(0.3);
      else if (p.kind === 'parasol') circle(CADDE_SIZE.parasol * s);
      else if (p.kind === 'gong') circle(0.35);
      else if (p.kind === 'throne') {
        // Your own seat: an armchair, its back toward -z.
        rect(g, THRONE_SIZE.width * 0.6, THRONE_SIZE.depth * 0.6, fill);
        g.strokeRect(-THRONE_SIZE.width * 0.3, -THRONE_SIZE.depth * 0.3, THRONE_SIZE.width * 0.6, 0.2);
      }
      else if (p.kind === 'planter') rect(g, Number(p.width ?? CADDE_SIZE.planter.width) * s, CADDE_SIZE.planter.depth * s, fill);
      else if (p.kind === 'bench') rect(g, Number(p.width ?? CADDE_SIZE.bench.width) * s, CADDE_SIZE.bench.depth * s, fill);
      else if (p.kind === 'counter') rect(g, Number(p.width ?? CADDE_SIZE.counter.width) * s, CADDE_SIZE.counter.depth * s, fill);
      else if (p.kind === 'dispenser') rect(g, CADDE_SIZE.dispenser.width * s, CADDE_SIZE.dispenser.depth * s, fill);
      else {
        const [w, l] = footprint(p);
        rect(g, w, l, fill);
      }
      // Which way it faces: a short tick out of its front.
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 0.45);
      g.stroke();
    });
  }

  function draw(s: PlanState) {
    state = s;
    const dpr = window.devicePixelRatio || 1;
    const { w, h: ht } = size();
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(ht * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(ht * dpr);
    }
    const g = cv.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, ht);
    const b = s.plan.bounds;
    // The grid: every metre (when it's big enough to tell), every five bold, labelled every ten.
    g.lineWidth = 1;
    const [x0, z0] = toWorld(0, 0);
    const [x1, z1] = toWorld(w, ht);
    for (let x = Math.floor(x0); x <= x1; x++) {
      if (k < 8 && x % 5) continue;
      g.strokeStyle = x % 5 ? 'rgba(120,170,220,.12)' : 'rgba(120,170,220,.28)';
      const [sx] = toScreen(x, 0);
      g.beginPath();
      g.moveTo(sx, 0);
      g.lineTo(sx, ht);
      g.stroke();
      if (x % 10 === 0) label(g, `${x}`, x, z0 + 0.8, DIM, 10);
    }
    for (let z = Math.floor(z0); z <= z1; z++) {
      if (k < 8 && z % 5) continue;
      g.strokeStyle = z % 5 ? 'rgba(120,170,220,.12)' : 'rgba(120,170,220,.28)';
      const [, sy] = toScreen(0, z);
      g.beginPath();
      g.moveTo(0, sy);
      g.lineTo(w, sy);
      g.stroke();
      if (z % 10 === 0) label(g, `${z}`, x0 + 0.8, z, DIM, 10);
    }
    // The hall.
    g.strokeStyle = INK;
    g.lineWidth = 2;
    const [bx, by] = toScreen(b.minX, b.minZ);
    g.strokeRect(bx, by, (b.maxX - b.minX) * k, (b.maxZ - b.minZ) * k);

    // The offices (not for moving here: the 3D editor doesn't either) and the suite's rooms.
    for (const p of s.props) {
      if (p.kind !== 'office') continue;
      const o = officeBox(p as never);
      frame(g, o.x, o.z, o.rotY, () => {
        g.strokeStyle = INK;
        g.lineWidth = 2.5 / k;
        rect(g, o.width, o.length, 'rgba(80,130,190,.10)');
        // Its door, in the front (toward +z in its own frame).
        g.strokeStyle = '#0e2a47';
        g.lineWidth = 4 / k;
        g.beginPath();
        g.moveTo(-OFFICE_DOOR / 2, o.length / 2);
        g.lineTo(OFFICE_DOOR / 2, o.length / 2);
        g.stroke();
      });
      if (p.style === 'yonetim') {
        for (const room of SUITE.rooms) {
          const [rx0, rz] = officePoint(p as never, room.from, (SUITE.back + SUITE.front) / 2);
          const [rx1] = officePoint(p as never, room.to, (SUITE.back + SUITE.front) / 2);
          frame(g, (rx0 + rx1) / 2, rz, o.rotY, () => {
            g.strokeStyle = DIM;
            g.lineWidth = 1.5 / k;
            rect(g, room.to - room.from, SUITE.front - SUITE.back);
          });
          label(g, room.label.replace(/^\S+\s/, ''), (rx0 + rx1) / 2, rz, DIM, k > 16 ? 11 : 0);
        }
      } else label(g, 'Ofis', o.x, o.z, DIM, 13);
    }

    // The tables with their benches; a desk's table is only a desk. A table the editor has (and may have put elsewhere) is drawn where it has it.
    s.plan.tables.forEach((t, i) => {
      const j = s.props.findIndex((p) => p.kind === 'table' && p.tableIndex === i);
      const mine = s.props[j];
      const x = j === s.selected && s.ghost ? s.ghost[0] : (mine?.x ?? t.x);
      const z = j === s.selected && s.ghost ? s.ghost[1] : (mine?.z ?? t.z);
      frame(g, x, z, Number(mine?.rotY ?? t.rotY), () => {
        g.strokeStyle = t.look ? DIM : INK;
        rect(g, t.width, t.length, t.look ? undefined : 'rgba(120,170,220,.14)');
        if (!t.look) for (const side of t.sides) rect(g, 0.44, t.length - 0.2, 'rgba(120,170,220,.08)', side * (t.width / 2 + BENCH_OUT));
      });
    });
    g.fillStyle = DIM;
    for (const d of [...s.plan.desks, ...s.plan.overflow, ...s.plan.meeting]) {
      const [sx, sy] = toScreen(d.x, d.z);
      g.beginPath();
      g.arc(sx, sy, Math.max(2, k * 0.22), 0, Math.PI * 2);
      g.fill();
    }

    // What's in the map but isn't for editing here: the board agents' lecterns, the meeting table, the greeter, the boards on the walls.
    for (const d of s.plan.stations) {
      frame(g, d.x, d.z, d.rotY, () => {
        g.strokeStyle = DIM;
        rect(g, 0.8, 0.5);
      });
      label(g, d.label, d.x, d.z - 0.7, DIM, k > 12 ? 11 : 0);
    }
    const council = s.plan.config?.council;
    if (council) {
      g.strokeStyle = DIM;
      g.lineWidth = 1.5;
      const [cx0, cy0] = toScreen(council.x, council.z);
      g.beginPath();
      g.arc(cx0, cy0, COUNCIL.radius * k, 0, Math.PI * 2);
      g.stroke();
      label(g, 'Toplantı masası', council.x, council.z, DIM, k > 12 ? 11 : 0);
    }
    const herald = s.plan.config?.herald;
    if (herald) {
      const [hx, hy] = toScreen(herald.x, herald.z);
      g.fillStyle = DIM;
      g.beginPath();
      g.arc(hx, hy, Math.max(3, k * 0.3), 0, Math.PI * 2);
      g.fill();
      label(g, herald.name ?? 'Karşılayıcı', herald.x, herald.z - 0.8, DIM, k > 12 ? 11 : 0);
    }
    g.strokeStyle = '#7fd3a8';
    for (const bd of Object.values(s.plan.boards)) {
      frame(g, bd.x, bd.z, bd.rotY, () => {
        g.lineWidth = 4 / k;
        g.beginPath();
        g.moveTo(-bd.width / 2, 0);
        g.lineTo(bd.width / 2, 0);
        g.stroke();
      });
    }
    // The props, the editable ones; the table pseudo-props are the tables above, drawn lit when they're picked.
    s.props.forEach((p, i) => {
      if (p.kind === 'office') return;
      const sel = i === s.selected;
      const hov = i === s.hovered;
      const dragged = sel && s.ghost;
      const shown = dragged ? { ...p, x: s.ghost![0], z: s.ghost![1] } : p;
      const color = sel ? '#ffb547' : hov ? '#6cc4ff' : INK;
      if (p.kind === 'table' && typeof p.tableIndex === 'number') {
        if (sel || hov) {
          frame(g, shown.x, shown.z, Number(p.rotY ?? 0), () => {
            g.strokeStyle = color;
            g.lineWidth = 3 / k;
            const [fw, fl] = footprint(p);
            rect(g, fw, fl, sel ? 'rgba(255,181,71,.16)' : 'rgba(108,196,255,.14)');
          });
          label(g, nameOf(p), shown.x, shown.z, color);
        }
        return;
      }
      symbol(g, shown, color, sel ? 'rgba(255,181,71,.22)' : hov ? 'rgba(108,196,255,.2)' : 'rgba(207,232,255,.08)');
      if (sel || hov || k > 14) label(g, nameOf(p), shown.x, shown.z - (footprint(p)[1] / 2 + 0.5), color, sel ? 13 : 11);
    });
    // Where the dragged one came from.
    const was = s.props[s.selected];
    if (was && s.ghost) symbol(g, was, 'rgba(160,160,160,.6)', 'rgba(160,160,160,.08)');
    // The lines the dragged one is lined up on.
    g.save();
    g.strokeStyle = '#ff4fd8';
    g.lineWidth = 1;
    g.setLineDash([6, 4]);
    for (const gd of s.guides) {
      const [gx, gy] = toScreen(gd.axis === 'x' ? gd.at : 0, gd.axis === 'z' ? gd.at : 0);
      g.beginPath();
      if (gd.axis === 'x') {
        g.moveTo(gx, by);
        g.lineTo(gx, by + (b.maxZ - b.minZ) * k);
      } else {
        g.moveTo(bx, gy);
        g.lineTo(bx + (b.maxX - b.minX) * k, gy);
      }
      g.stroke();
    }
    g.restore();
    alignBtn.style.background = s.align ? '#3b7d4a' : '#2c3644';
    // What's about to be put down.
    if (s.pick >= 0 && s.pointer) {
      const item = made(CATALOG[s.pick], s.pointer[0], s.pointer[1]);
      symbol(g, item, '#8fe39a', 'rgba(143,227,154,.2)');
      label(g, `+ ${CATALOG[s.pick].label}`, item.x, item.z - 1, '#8fe39a', 13);
    }
    // You, and where you come in.
    const [px, py] = toScreen(s.player.x, s.player.z);
    g.save();
    g.translate(px, py);
    g.rotate(-s.player.facing);
    g.fillStyle = '#ff6b6b';
    g.beginPath();
    g.moveTo(0, k * 0.7);
    g.lineTo(-k * 0.4, -k * 0.4);
    g.lineTo(k * 0.4, -k * 0.4);
    g.closePath();
    g.fill();
    g.restore();
    label(g, 'sen', s.player.x, s.player.z - 1.1, '#ff6b6b', 11);
  }

  return {
    isOpen: () => open,
    show(s: PlanState) {
      if (!open) {
        open = true;
        root.style.display = 'block';
        state = s;
        fit();
      }
      draw(s);
    },
    hide() {
      open = false;
      dragging = false;
      panning = null;
      root.style.display = 'none';
    },
    draw(s: PlanState) {
      if (open) draw(s);
    },
  };
}
