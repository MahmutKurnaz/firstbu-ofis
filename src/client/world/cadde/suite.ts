import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { SUITE, SUITE_DIVIDERS, SUITE_FRONTS, officeBox, officePoint } from '../../../shared/maps/cadde-props';
import type { Interactable } from '../types';
import { box, collide, lit, placed } from '../station/kit';
import { mesh, roundedBox, textPlane, toon } from '../toon';
import { TEAM_COLORS } from './interiors';
import { glow, type CaddeKit } from './kit';
import { meshy, type MeshyKey } from './meshy';
import { addTeamBoard, clearTeamBoards } from './teamboard';

// The executive suite (an office with style `yonetim`, see SUITE in shared/maps/cadde-props.ts): along the
// back a row of rooms, each sized to who sits in it (the lead's the biggest, then Mahmut's, a manager's a
// single, the assistant's a pair's, a meeting room for ten, a coffee corner, the archive), glass between them
// in brass frames; along the front a lobby. The furniture is the street's own, made with Meshy (./meshy.ts).
// The desks the workers sit at are the plan's `look: 'desk'` tables (buildDesks).

const BRASS = '#b5893f';
const WOOD = '#5a3a28';
const east = -Math.PI / 2;
const west = Math.PI / 2;

/** What each room is floored in. */
const FLOOR: Record<string, string> = { you: '#d9bd92', lead: '#8a6240', asst: '#cdb48e', fe: '#e8d6c0', be: '#d6dce6', bug: '#dcd2e6', verify: '#cfe3e0', coffee: '#cfc7b8', meeting: '#7c7f86', archive: '#bfb8aa' };

/** The suite's rooms, rugs and furniture. */
export function furnishSuite(kit: CaddeKit, p: PropConfig) {
  const o = officeBox(p);
  const H = o.height;
  const { glass } = kit.street;
  const g = placed(o.x, 0, o.z, o.rotY);
  const at = (u: number, v: number) => officePoint(p, u, v);
  const brass = toon(BRASS);
  const trim = toon('#efe9dd');
  const { back, front, thick } = SUITE;
  const depth = front - back;

  // Floors: each room its own, marble in the lobby; rugs under the desks.
  for (const r of SUITE.rooms) g.add(mesh(box(r.to - r.from - 0.1, 0.004, depth - 0.1), toon(FLOOR[r.id]), (r.from + r.to) / 2, 0.014, (back + front) / 2, false));
  g.add(mesh(box(o.width - 0.5, 0.004, o.length / 2 - front - 0.1), toon('#ece7dd'), 0, 0.014, (front + o.length / 2) / 2, false));
  const rug = (u: number, v: number, w: number, d: number, color: string) => g.add(mesh(box(w, 0.004, d), toon(color), u, 0.018, v, false));
  rug(-18.5, -2.8, 4.4, 3.4, '#7a2630');
  rug(-26.4, -2.8, 3.8, 3, '#2d4a5c');
  rug(-11.5, -2.4, 2.6, 2.2, '#8a5a44');
  for (const [r, c] of [['fe', 2], ['be', 3], ['bug', 4], ['verify', 5]] as const) {
    const room = SUITE.rooms.find((x) => x.id === r)!;
    rug((room.from + room.to) / 2, -2.6, 2.4, 2.2, TEAM_COLORS[c] + '99');
  }

  // Glass between the rooms and the lobby, a low panel under it, a brass rail on top and brass posts.
  const part = (cx: number, cz: number, len: number, alongX: boolean) => {
    const w = alongX ? len : thick;
    const d = alongX ? thick : len;
    g.add(mesh(box(w, 0.9, d), trim, cx, 0.45, cz));
    g.add(mesh(alongX ? box(len, H - 1.3, 0.03) : box(0.03, H - 1.3, len), glass, cx, 0.9 + (H - 1.3) / 2, cz, false));
    g.add(mesh(box(w + 0.04, 0.1, d + 0.04), brass, cx, H - 0.45, cz, false));
    for (const e of [-1, 1]) g.add(mesh(box(alongX ? 0.08 : thick + 0.04, H - 0.4, alongX ? thick + 0.04 : 0.08), brass, alongX ? cx + (e * len) / 2 : cx, (H - 0.4) / 2, alongX ? cz : cz + (e * len) / 2));
  };
  for (const [a, b] of SUITE_FRONTS) part((a + b) / 2, front, b - a, true);
  for (const d of SUITE_DIVIDERS) part(d.u, (d.from + d.to) / 2, d.to - d.from, false);

  // What each room is, over its door (an open one's hangs), and the team's color on the back wall of a manager's.
  const sign = (text: string, u: number, y: number, border = BRASS, size = 64) => {
    const s = textPlane(text, { bg: '#2a2420', color: '#fff3dc', border, size });
    s.scale.multiplyScalar(0.8);
    s.position.set(u, y, front + 0.1);
    g.add(s);
  };
  for (const r of SUITE.rooms) {
    sign(r.label, r.door ?? (r.from + r.to) / 2, H - 0.95, r.team > 0 ? TEAM_COLORS[r.team] : BRASS, r.to - r.from < 5 ? 48 : 64);
    if (r.team > 1 && r.id !== 'archive') g.add(mesh(box(r.to - r.from - 0.5, 2.3, 0.05), toon(TEAM_COLORS[r.team]), (r.from + r.to) / 2, 2.1, back + 0.1, false));
  }
  // Ceiling lights over each room, warm; they come on at dusk like the shell's.
  const panel = glow(kit, '#ffe9c2', 0.2, 1);
  for (const r of SUITE.rooms) for (const v of [-3.6, -1.2]) g.add(mesh(box(Math.min(3, r.to - r.from - 1.2), 0.04, 0.5), panel, (r.from + r.to) / 2, H - 0.05, v, false));
  kit.group.add(g);

  // The live boards on the back walls (features/teamboards): a manager's shows their team, the lead's every team,
  // the assistant's who's waiting on you, Mahmut's everyone.
  clearTeamBoards();
  for (const r of SUITE.rooms) {
    const c = (r.from + r.to) / 2;
    const w = r.to - r.from;
    if (r.id === 'fe' || r.id === 'be' || r.id === 'bug' || r.id === 'verify') addTeamBoard(g, 'team', r.team, r.label, c, 2.15, back + 0.18, w - 0.8, (w - 0.8) * 0.5625);
    else if (r.id === 'lead') addTeamBoard(g, 'lead', -1, r.label, c, 2.75, back + 0.18, 5.6, 1.9);
    else if (r.id === 'asst') addTeamBoard(g, 'asst', -1, r.label, c, 2.6, back + 0.18, 3.8, 1.7);
    else if (r.id === 'you') addTeamBoard(g, 'you', -1, r.label, c, 2.5, back + 0.18, 6, 2.5);
  }

  const put = (key: MeshyKey, u: number, v: number, turn = 0, scale = 1) => {
    const [x, z] = at(u, v);
    const h = placed(x, 0, z, o.rotY);
    kit.group.add(h);
    meshy(h, key, { scale, turn });
  };
  const solid = (u: number, v: number, w: number, d: number, top: number) => {
    const [x, z] = at(u, v);
    collide(kit, x, z, w, d, o.rotY, top);
  };
  /** A bookcase against a wall: `turn` its front, 0.9 m wide. */
  const shelf = (u: number, v: number, turn = 0) => {
    put('kitaplik', u, v, turn);
    solid(u, v, turn === 0 ? 0.9 : 0.33, turn === 0 ? 0.33 : 0.9, 1.83);
  };

  // The lead's room (9 x 5.4): his desk and the rug, bookcases behind him, a sofa and two visitor chairs, plants.
  shelf(-21.2, back + 0.25);
  shelf(-15.8, back + 0.25);
  put('kanepe', -22.5, -1.4, west);
  solid(-22.5, -1.4, 0.9, 2, 0.85);
  put('toplanti-sandalye', -19.3, -1.0, Math.PI);
  put('toplanti-sandalye', -17.7, -1.0, Math.PI);
  put('fikus', -22.4, back + 0.5);
  put('fikus', -14.6, 0.1);

  // Mahmut's room (6.8 x 5.4): his big desk and chair, bookcases along the wall, a sofa, plants.
  put('yonetici-masa', -26.4, -3, 0);
  solid(-26.4, -3, 1.8, 0.9, 0.78);
  put('yonetici-koltuk', -26.4, -4.1, 0);
  shelf(-29.35, -3.6, west);
  shelf(-29.35, -1.8, west);
  put('kanepe', -23.6, -2.2, east);
  solid(-23.6, -2.2, 0.9, 2, 0.85);
  put('cicek-saksi', -23.7, -4.4);
  put('fikus', -29.1, 0.1);

  // The assistant's room (5 x 5.4, a pair's): her desk by the lead's door, a sofa to wait on, a chair for a guest.
  put('kanepe', -9.6, -3.2, east);
  solid(-9.6, -3.2, 0.9, 2, 0.85);
  put('toplanti-sandalye', -12.6, -0.4, Math.PI);
  put('toplanti-sandalye', -10.8, -0.4, Math.PI);
  put('fikus', -13.4, back + 0.5);

  // A manager's room (4 x 5.4, a single): the desk, a bookcase, two visitor chairs, a plant.
  for (const id of ['fe', 'be', 'bug', 'verify']) {
    const room = SUITE.rooms.find((x) => x.id === id)!;
    const c = (room.from + room.to) / 2;
    shelf(room.from + 0.25, -3.8, west);
    put('toplanti-sandalye', c - 0.5, -1.0, Math.PI);
    put('toplanti-sandalye', c + 0.5, -1.0, Math.PI);
    put('fikus', room.to - 0.6, -0.2);
  }

  // The coffee corner (6 wide, open): the counter with its espresso machine, a coffee machine, flowers; E for a cup.
  put('kahve-tezgahi', 9.4, -4.2, 0, 0.9);
  solid(9.4, -4.2, 3.6, 1, 1.1);
  put('kahve-makinesi', 12.2, -4.2, 0);
  solid(12.2, -4.2, 1, 0.8, 1.9);
  put('cicek-saksi', 7.6, -0.6);
  put('cicek-saksi', 12.4, -0.6);
  const [cx, cz] = at(10.4, -2.4);
  kit.interactables.push({ kind: 'coffee', label: '☕ Yönetim kahvesi', x: cx, z: cz, radius: 1.8 } satisfies Interactable);

  // The meeting room (12 x 5.4): the live meeting table is in it (the plan's council: shared/maps/cadde.ts), its screen on the
  // wall behind; a whiteboard on the side.
  g.add(mesh(box(0.06, 1.4, 3.2), toon('#f7f5f0'), 24.9, 1.9, -2.2));
  put('fikus', 24.4, back + 0.5);
  put('fikus', 13.6, back + 0.5);

  // The archive (4.8 x 5.4): shelves all along the back wall, a table to read at.
  for (const u of [26.1, 27.4, 28.7]) shelf(u, back + 0.25);
  put('ofis-masa', 27.4, -2.2, 0);
  solid(27.4, -2.2, 1.4, 0.7, 0.76);
  put('ofis-sandalye', 27.4, -1.2, Math.PI);

  // The lobby: plants by the door and the glass.
  for (const u of [-28.5, -20, 20, 28.5]) put('fikus', u, 3.7);
  for (const u of [-2.4, 2.4]) put('cicek-saksi', u, 4.2);
}

/** The desks of the plan's `look: 'desk'` tables: each seat's desk (the lead's and the managers' the big one) and its chair. */
export function buildDesks(kit: CaddeKit) {
  for (const t of kit.plan.tables) {
    if (t.look !== 'desk') continue;
    const seats = kit.plan.desks.filter((d) => d.label.startsWith(`${t.name}, `));
    const big = t.length >= 1.8;
    for (const d of seats) {
      // The sitter's side of the desk, pointing out from it.
      const nx = Math.sin(d.rotY);
      const nz = Math.cos(d.rotY);
      const desk = placed(d.x - nx * 0.25, 0, d.z - nz * 0.25, d.rotY + Math.PI);
      kit.group.add(desk);
      // A plain top stands in at the real size (76 cm) until the model arrives, so the laptop isn't left in mid-air.
      const top = mesh(box(big ? 1.8 : 1.4, 0.76, big ? 0.9 : 0.7), toon(big ? WOOD : '#d8d2c6'), 0, 0.38, 0);
      desk.add(top);
      meshy(desk, big ? 'yonetici-masa' : 'ofis-masa', { scale: 1, replaces: [top] });
      collide(kit, d.x - nx * 0.25, d.z - nz * 0.25, Math.abs(nz) > 0.5 ? (big ? 1.8 : 1.4) : 0.9, Math.abs(nz) > 0.5 ? 0.9 : big ? 1.8 : 1.4, 0, 0.78);
      const chair = placed(d.x + nx * 0.85, 0, d.z + nz * 0.85, d.rotY + Math.PI);
      kit.group.add(chair);
      const seat = mesh(box(0.5, 0.06, 0.5), toon('#2f343b'), 0, 0.5, 0);
      const backrest = mesh(box(0.5, 0.5, 0.06), toon('#2f343b'), 0, 0.78, -0.22);
      chair.add(seat, backrest);
      meshy(chair, big ? 'yonetici-koltuk' : 'ofis-sandalye', { scale: 1, replaces: [seat, backrest] });
    }
  }
}
