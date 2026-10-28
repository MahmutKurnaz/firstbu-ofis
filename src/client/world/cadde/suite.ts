import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { SUITE, officeBox, officePoint } from '../../../shared/maps/cadde-props';
import type { Interactable } from '../types';
import { box, collide, lit, placed } from '../station/kit';
import { mesh, roundedBox, textPlane, toon } from '../toon';
import { glow, type CaddeKit } from './kit';
import { meshy, type MeshyKey } from './meshy';

// The executive suite (an office with style `yonetim`, see SUITE in shared/maps/cadde-props.ts): along
// the back of it Mahmut's room, the lead's room, a coffee corner and a meeting room for ten, glass
// between them in brass frames; along the front a lobby with the lead's assistant and the managers at
// their desks. The furniture is the street's own, made with Meshy (./meshy.ts). The desks the workers
// sit at are the plan's `look: 'desk'` tables (buildDesks).

const BRASS = '#b5893f';
const WOOD = '#5a3a28';

/** What the rooms are floored in, and how far across each goes. */
const FLOORS: { from: number; to: number; color: string }[] = [
  { from: -22, to: -12, color: '#d9bd92' },
  { from: -12, to: 0, color: '#4b2f21' },
  { from: 0, to: 8, color: '#cfc7b8' },
  { from: 8, to: 22, color: '#7c7f86' },
];

/** The suite's rooms, rugs and furniture. */
export function furnishSuite(kit: CaddeKit, p: PropConfig) {
  const o = officeBox(p);
  const H = o.height;
  const { glass } = kit.street;
  const g = placed(o.x, 0, o.z, o.rotY);
  const at = (u: number, v: number) => officePoint(p, u, v);
  const brass = toon(BRASS);
  const trim = toon('#efe9dd');
  const back = SUITE.back;

  // Floors: each room its own, and marble in the lobby; rugs under the two desks.
  for (const f of FLOORS) g.add(mesh(box(f.to - f.from - 0.1, 0.02, -back - 0.1), toon(f.color), (f.from + f.to) / 2, 0.05, back / 2, false));
  g.add(mesh(box(o.width - 0.5, 0.02, o.length / 2 - 0.1), toon('#ece7dd'), 0, 0.05, o.length / 4, false));
  g.add(mesh(box(4.2, 0.02, 3.2), toon('#7a2630'), -6, 0.065, -2.6, false));
  g.add(mesh(box(3.6, 0.02, 2.6), toon('#2d4a5c'), -17, 0.065, -2.6, false));

  // Glass between the rooms and the lobby, a low panel under it, a brass rail on top and brass posts.
  const part = (cx: number, cz: number, len: number, alongX: boolean) => {
    const w = alongX ? len : SUITE.thick;
    const d = alongX ? SUITE.thick : len;
    g.add(mesh(box(w, 0.9, d), trim, cx, 0.45, cz));
    g.add(mesh(alongX ? box(len, H - 1.3, 0.03) : box(0.03, H - 1.3, len), glass, cx, 0.9 + (H - 1.3) / 2, cz, false));
    g.add(mesh(box(w + 0.04, 0.1, d + 0.04), brass, cx, H - 0.45, cz, false));
    for (const e of [-1, 1]) g.add(mesh(box(alongX ? 0.08 : SUITE.thick + 0.04, H - 0.4, alongX ? SUITE.thick + 0.04 : 0.08), brass, alongX ? cx + (e * len) / 2 : cx, (H - 0.4) / 2, alongX ? cz : cz + (e * len) / 2));
  };
  for (const [a, b] of SUITE.fronts) part((a + b) / 2, 0, b - a, true);
  for (const u of SUITE.dividers) part(u, back / 2, -back, false);

  // What each room is, over its door (the coffee corner's has none, so its sign hangs).
  const sign = (text: string, u: number, y: number, border = BRASS) => {
    const s = textPlane(text, { bg: '#2a2420', color: '#fff3dc', border, size: 64 });
    s.scale.multiplyScalar(0.9);
    s.position.set(u, y, 0.1);
    g.add(s);
  };
  sign('⭐ Mahmut’un odası', SUITE.doors.you, H - 0.95);
  sign('🦁 Aslan Lider', SUITE.doors.lead, H - 0.95);
  sign('🤝 Toplantı odası · 10 kişilik', SUITE.doors.meeting, H - 0.95);
  sign('☕ Kahve köşesi', 4, H - 0.95);

  // Ceiling lights over each room, warm; they come on at dusk like the shell's.
  const panel = glow(kit, '#ffe9c2', 0.2, 1);
  for (const f of FLOORS) for (const v of [-3.8, -1.2]) g.add(mesh(box(Math.min(3, f.to - f.from - 3), 0.04, 0.5), panel, (f.from + f.to) / 2, H - 0.05, v, false));
  kit.group.add(g);

  const put = (key: MeshyKey, u: number, v: number, turn = 0, scale = 1, y = 0) => {
    const [x, z] = at(u, v);
    const h = placed(x, y, z, o.rotY);
    kit.group.add(h);
    meshy(h, key, { scale, turn });
  };
  const solid = (u: number, v: number, w: number, d: number, top: number) => {
    const [x, z] = at(u, v);
    collide(kit, x, z, w, d, o.rotY, top);
  };
  const east = -Math.PI / 2;
  const west = Math.PI / 2;

  // The lead's room: bookcases along the east wall, a sofa along the west, two chairs for visitors, plants.
  put('kitaplik', -0.6, -3.6, east);
  put('kitaplik', -0.6, -1.6, east);
  solid(-0.6, -2.6, 0.5, 4, 2.2);
  put('kanepe', -11.3, -2.6, west);
  solid(-11.3, -2.6, 1, 2.2, 0.9);
  put('toplanti-sandalye', -6.9, -1.3, Math.PI);
  put('toplanti-sandalye', -5.1, -1.3, Math.PI);
  put('fikus', -11.2, -4.4);
  put('fikus', -0.9, -0.7);

  // Your room: your desk and chair, bookcases, a sofa, plants. The big desk faces the door.
  put('yonetici-masa', -17, -3.2, 0, 1.15);
  solid(-17, -3.2, 2.6, 1.3, 0.8);
  put('yonetici-koltuk', -17, -4.2, 0, 1.1);
  put('kitaplik', -21.5, -3.6, west);
  put('kitaplik', -21.5, -1.6, west);
  solid(-21.5, -2.6, 0.5, 4, 2.2);
  put('kanepe', -12.7, -2.6, east);
  solid(-12.7, -2.6, 1, 2.2, 0.9);
  put('cicek-saksi', -13, -4.4);
  put('fikus', -21, -0.7);

  // The coffee corner: the counter with its espresso machine along the back, the coffee machine, flowers.
  put('kahve-tezgahi', 3.6, -4.2, 0, 0.78);
  solid(3.6, -4.2, 3.5, 1.2, 1.1);
  put('kahve-makinesi', 6.9, -4.2, 0, 0.9);
  solid(6.9, -4.2, 1, 0.8, 1.9);
  put('cicek-saksi', 0.7, -0.8);
  put('cicek-saksi', 7.3, -0.8);
  const [cx, cz] = at(4.5, -2.6);
  const cup: Interactable = { kind: 'coffee', label: '☕ Yönetim kahvesi', x: cx, z: cz, radius: 1.8 };
  kit.interactables.push(cup);

  // The meeting room: a long walnut table with ten chairs, a screen on the back wall and a whiteboard on the side.
  const table = placed(...at(15, -2.7), o.rotY);
  table.add(mesh(roundedBox(8.4, 0.09, 1.7, 0.05), toon(WOOD), 0, 0.74, 0));
  table.add(mesh(box(8.2, 0.025, 0.05), brass, 0, 0.79, 0, false));
  for (const e of [-1, 1]) table.add(mesh(roundedBox(0.5, 0.7, 1.2, 0.04), toon('#3b251a'), e * 2.8, 0.35, 0));
  kit.group.add(table);
  solid(15, -2.7, 8.4, 1.7, 0.8);
  for (let i = 0; i < 5; i++) {
    const u = 15 + (i - 2) * 1.6;
    put('toplanti-sandalye', u, -3.85, 0);
    put('toplanti-sandalye', u, -1.55, Math.PI);
  }
  g.add(mesh(box(5.2, 2.5, 0.1), toon('#16191e'), 15, 2.35, back + 0.1));
  g.add(mesh(box(4.9, 2.2, 0.02), lit('#24527a'), 15, 2.35, back + 0.17, false));
  g.add(mesh(box(0.06, 1.4, 3.2), toon('#f7f5f0'), 21.55, 1.9, -2.7));
  put('fikus', 21, -4.4);
  put('fikus', 9, -4.4);

  // The lobby: plants by the door and the glass.
  put('fikus', -20.5, 3.6);
  put('fikus', 20.5, 3.6);
  put('cicek-saksi', -3.2, 4.1);
  put('cicek-saksi', 3.2, 4.1);
}

/** The desks of the plan's `look: 'desk'` tables: each seat's desk (the lead's the big one) and its chair. */
export function buildDesks(kit: CaddeKit) {
  for (const t of kit.plan.tables) {
    if (t.look !== 'desk') continue;
    const seats = kit.plan.desks.filter((d) => d.label.startsWith(`${t.name}, seat `));
    const lead = t.length > 2.2 && t.seats === 1;
    for (const d of seats) {
      // The sitter's side of the desk, pointing out from it.
      const nx = Math.sin(d.rotY);
      const nz = Math.cos(d.rotY);
      const desk = placed(d.x - nx * 0.25, 0, d.z - nz * 0.25, d.rotY + Math.PI);
      kit.group.add(desk);
      const spacing = t.length / t.seats;
      meshy(desk, lead ? 'yonetici-masa' : 'ofis-masa', { scale: lead ? 1.05 : Math.min(1, (spacing - 0.2) / 1.6) });
      collide(kit, d.x - nx * 0.25, d.z - nz * 0.25, Math.abs(nz) > 0.5 ? (lead ? 2.4 : 1.6) : 0.9, Math.abs(nz) > 0.5 ? 0.9 : lead ? 2.4 : 1.6, 0, 0.78);
      const chair = placed(d.x + nx * 0.85, 0, d.z + nz * 0.85, d.rotY + Math.PI);
      kit.group.add(chair);
      meshy(chair, lead ? 'yonetici-koltuk' : 'ofis-sandalye', { scale: 1 });
    }
  }
}
