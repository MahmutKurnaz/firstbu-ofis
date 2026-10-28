import * as THREE from 'three';
import type { PropConfig } from '../../../shared/maps';
import { officeBox, officePoint } from '../../../shared/maps/cadde-props';
import { box, collide, lit, placed } from '../station/kit';
import { mesh, textPlane, toon } from '../toon';
import { glow, type CaddeKit } from './kit';
import { addTeamBoard } from './teamboard';
import { meshy, type MeshyKey } from './meshy';

// What each team's office looks like inside, so you know whose it is from the door: a map wall and crates
// for the scouts, color swatches and easels for design, server racks for engineering, a pinboard of strings
// for the bug hunters, a lab bench and its PASS/FAIL sign for testing, a wall of cameras for security. They
// go in on top of the street's furniture (./kaykit.ts furnish) in the office's own frame: `u` across its
// front, `v` from its middle toward its door (the back wall is at -length/2).

/** The team colors of the template's offices (ordu/sablonlar/yazilim.json), which the themes are keyed to. */
export const TEAM_COLORS = ['#e8b931', '#3fae6a', '#ff7a6b', '#4a8fe7', '#9b6bdf', '#2bb5b0', '#8a93a6'];

const THEME_NAMES = ['', 'Keşif', 'Tasarım', 'Mühendislik', 'Hata avı', 'Test', 'Güvenlik'];

type Put = (key: MeshyKey, u: number, v: number, turn?: number, scale?: number) => void;

interface Ctx {
  kit: CaddeKit;
  g: THREE.Group;
  o: ReturnType<typeof officeBox>;
  /** A box of `color` (w across, h high, d deep) at (u, y, v). */
  bx: (w: number, h: number, d: number, color: string, u: number, y: number, v: number, glows?: boolean) => THREE.Mesh;
  /** A sign on the back wall (or a side wall, `side` -1 or 1), `scale` times its size. */
  sign: (text: string, u: number, y: number, color: string, scale?: number, side?: 0 | -1 | 1) => void;
  put: Put;
  /** Something to bump into. */
  solid: (u: number, v: number, w: number, d: number, top: number) => void;
}

type Theme = (c: Ctx, color: string) => void;

const THEMES: Theme[] = [
  // 0, the suite, has its own (./suite.ts).
  () => {},
  // 1: Keşif — the scouts: a wall map, crates, bookcases, a map table.
  (c, color) => {
    const { o } = c;
    const back = -o.length / 2;
    c.bx(7.4, 3.2, 0.06, '#f1e6c8', 0, 2.2, back + 0.3);
    c.sign('🗺️ Dünya haritası', 0, 3.4, color, 1.1);
    for (const [u, w] of [[-2.8, 1.8], [-0.4, 1.2], [2.2, 2.2]]) c.bx(w, 0.9, 0.04, ['#6aa56b', '#c9a15b', '#8fb8d6'][Math.abs(Math.round(u)) % 3], u, 2.0, back + 0.34);
    c.put('kitaplik', -5.8, back + 0.5);
    c.put('kitaplik', 5.8, back + 0.5);
    c.solid(-5.8, back + 0.5, 1.2, 0.5, 2.2);
    c.solid(5.8, back + 0.5, 1.2, 0.5, 2.2);
    for (const [u, v, s] of [[-5.5, back + 1.6, 0.7], [-5.0, back + 1.7, 0.5], [5.5, back + 1.7, 0.6]]) c.bx(s, s * 0.8, s, '#a67c52', u, (s * 0.8) / 2, v);
    c.put('fikus', 6.2, 7.6);
    c.put('cicek-saksi', -6.2, 7.6);
  },
  // 2: Tasarım — design: a swatch board, easels, a big screen, a sofa.
  (c, color) => {
    const back = -c.o.length / 2;
    c.bx(6.4, 2.6, 0.06, '#fff8f0', 0, 2.2, back + 0.3);
    ['#ff7a6b', '#ffb36b', '#ffe06b', '#8ed08e', '#6bb8ff', '#b48cff', '#ff8cc0', '#6bd0c9'].forEach((col, i) => c.bx(0.7, 0.7, 0.03, col, -2.45 + (i % 4) * 1.6 + (i < 4 ? 0 : 0.8), i < 4 ? 2.75 : 1.75, back + 0.35));
    c.sign('🎨 Renk örnekleri', 0, 3.8, color, 1);
    for (const u of [-5, 5]) {
      c.bx(0.06, 1.6, 0.06, '#8a6a4a', u - 0.45, 0.8, back + 2);
      c.bx(0.06, 1.6, 0.06, '#8a6a4a', u + 0.45, 0.8, back + 2);
      c.bx(1.1, 0.9, 0.04, u < 0 ? '#ffcab8' : '#c8e6ff', u, 1.3, back + 2.05);
    }
    c.put('kanepe', -4.2, 7.4, Math.PI);
    c.solid(-4.2, 7.4, 2.2, 1, 0.9);
    c.put('cicek-saksi', 5.4, 7.6);
    c.put('fikus', 6.3, back + 0.6);
  },
  // 3: Mühendislik — engineering: server racks with blinking lights, a whiteboard, a monitor wall.
  (c, color) => {
    const back = -c.o.length / 2;
    for (const u of [-5.6, -4.3, 4.3, 5.6]) {
      c.bx(1, 2.1, 0.9, '#2b2f38', u, 1.05, back + 0.6);
      for (let i = 0; i < 6; i++) c.bx(0.7, 0.05, 0.02, i % 3 ? '#38d68a' : color, u, 0.4 + i * 0.3, back + 1.07, true);
      c.solid(u, back + 0.6, 1, 0.9, 2.1);
    }
    c.bx(4.2, 2.1, 0.05, '#f7f9fc', 0, 2.1, back + 0.3);
    c.sign('{ API } → [ DB ] → [ UI ]', 0, 2.5, color, 0.9);
    c.bx(1.1, 0.04, 0.04, color, -1.2, 1.7, back + 0.34, true);
    c.bx(1.1, 0.04, 0.04, color, 1.2, 1.7, back + 0.34, true);
    c.put('fikus', 6.3, 7.6);
    c.put('cicek-saksi', -6.3, 7.6);
  },
  // 4: Hata laboratuvarı — bug lab: a pinboard with red string, photos, a sofa.
  (c, color) => {
    const back = -c.o.length / 2;
    c.bx(6.2, 2.8, 0.07, '#b58a5c', 0, 2.2, back + 0.3);
    const pins: [number, number][] = [[-2.4, 2.9], [-0.9, 1.9], [0.6, 2.9], [2.2, 1.9], [0, 2.3], [-1.9, 1.6]];
    pins.forEach(([u, y], i) => c.bx(0.8, 0.6, 0.02, i % 2 ? '#fffdf5' : '#f1e9d6', u, y, back + 0.36));
    for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 4], [4, 0], [1, 5]]) {
      const [x0, y0] = pins[a];
      const [x1, y1] = pins[b];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const s = c.bx(len, 0.02, 0.01, '#d6334a', (x0 + x1) / 2, (y0 + y1) / 2, back + 0.38);
      s.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    }
    c.sign('🔍 Hata avı', 0, 3.85, color, 1);
    c.put('kanepe', 4.2, 7.4, Math.PI);
    c.solid(4.2, 7.4, 2.2, 1, 0.9);
    c.put('kitaplik', -6.2, back + 0.5);
    c.solid(-6.2, back + 0.5, 1.2, 0.5, 2.2);
    c.put('cicek-saksi', -5.4, 7.6);
  },
  // 5: Test laboratuvarı — test lab: a bench, a PASS/FAIL sign, shelves of vials.
  (c, color) => {
    const back = -c.o.length / 2;
    c.bx(6.4, 0.9, 1, '#eef3f6', 0, 0.45, back + 0.8);
    c.bx(6.5, 0.06, 1.1, '#2f343b', 0, 0.93, back + 0.8);
    c.solid(0, back + 0.8, 6.4, 1, 0.95);
    ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388eb', '#ff9f68'].forEach((col, i) => c.bx(0.16, 0.34, 0.16, col, -2.4 + i * 0.95, 1.12, back + 0.8));
    c.bx(1.9, 0.9, 0.06, '#10241f', -1.4, 2.8, back + 0.3);
    c.bx(1.9, 0.9, 0.06, '#241012', 1.4, 2.8, back + 0.3);
    c.sign('✅ GEÇTİ', -1.4, 2.8, '#38d68a', 1.1);
    c.sign('❌ KALDI', 1.4, 2.8, '#8a3a3a', 1.1);
    c.sign('🧪 Test laboratuvarı', 0, 3.8, color, 0.9);
    c.put('fikus', 6.3, 7.6);
    c.put('kitaplik', -6.2, 7.2, Math.PI);
    c.solid(-6.2, 7.2, 1.2, 0.5, 2.2);
  },
  // 6: Güvenlik merkezi — security: a wall of camera screens, lockers.
  (c, color) => {
    const back = -c.o.length / 2;
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 4; k++) {
        c.bx(1.5, 0.95, 0.08, '#14171c', -3 + k * 2, 2.0 + r * 1.1, back + 0.3);
        c.bx(1.34, 0.8, 0.02, (k + r) % 3 ? '#27506b' : '#3b6b4a', -3 + k * 2, 2.0 + r * 1.1, back + 0.36, true);
      }
    c.sign('📹 Güvenlik merkezi', 0, 3.95, color, 1);
    for (let i = 0; i < 4; i++) c.bx(0.8, 2.0, 0.55, '#7a828f', -6.4 + i * 0.85, 1.0, back + 0.5);
    c.solid(-5, back + 0.5, 3.4, 0.55, 2);
    c.put('fikus', 6.3, 7.6);
    c.put('cicek-saksi', -6.3, 7.6);
  },
];

/** Dresses the `index`th office for its team (see THEMES), in the team's `color`. */
export function themeOffice(kit: CaddeKit, p: PropConfig, index: number, color: string) {
  const theme = THEMES[index];
  if (!theme) return;
  const o = officeBox(p);
  // The themes are laid out for the street's team offices (14 across, 18 deep): any other size is left to its own furnishing.
  if (Math.abs(o.width - 14) > 0.01 || Math.abs(o.length - 18) > 0.01) return;
  const g = placed(o.x, 0, o.z, o.rotY);
  kit.group.add(g);
  const bx: Ctx['bx'] = (w, h, d, col, u, y, v, glows = false) => {
    const m = glows ? lit(col) : toon(col);
    const part = mesh(box(w, h, d), m, u, y, v, !glows);
    g.add(part);
    return part;
  };
  const sign: Ctx['sign'] = (text, u, y, col, scale = 1) => {
    const s = textPlane(text, { bg: '#262a31', color: '#ffffff', border: col, size: 56 });
    s.scale.multiplyScalar(scale * 0.8);
    s.position.set(u, y, -o.length / 2 + 0.4);
    g.add(s);
  };
  const put: Put = (key, u, v, turn = 0, scale = 1) => {
    const [x, z] = officePoint(p, u, v);
    const h = placed(x, 0, z, o.rotY);
    kit.group.add(h);
    meshy(h, key, { scale, turn });
  };
  const solid: Ctx['solid'] = (u, v, w, d, top) => {
    const [x, z] = officePoint(p, u, v);
    collide(kit, x, z, w, d, o.rotY, top);
  };
  theme({ kit, g, o, bx, sign, put, solid }, color);
  // A TV on a stand by the glass, opposite the lounge, showing its team live: who's on what, and for how long (features/teamboards).
  const tvSide = index % 2 ? -1 : 1;
  const tv = placed(0, 0, 0, 0);
  tv.position.set(tvSide * (o.width / 2 - 0.55), 0, o.length / 2 - 3.6);
  tv.rotation.y = tvSide * (-Math.PI / 2);
  g.add(tv);
  // (an 85 inch TV, 1.9 x 1.07 m, its middle 1.5 m up, on two black posts)
  for (const sx of [-0.7, 0.7]) tv.add(mesh(box(0.08, 1.0, 0.08), toon('#1d232b'), sx, 0.5, -0.12));
  addTeamBoard(tv, 'team', index, THEME_NAMES[index] ?? `Ofis ${index}`, 0, 1.5, 0, 1.9, 1.07);
  solid(tvSide * (o.width / 2 - 0.55), o.length / 2 - 3.6, 0.3, 2.0, 2.1);
  // Brighter: the team's color washing the back wall from a strip under the ceiling, and a row of ceiling panels over the table.
  const wash = glow(kit, color, 0.35, 1);
  g.add(mesh(box(o.width - 1, 0.08, 0.3), wash, 0, o.height - 0.3, -o.length / 2 + 0.3, false));
  const panel = glow(kit, '#fff7e6', 0.45, 1);
  for (const v of [-3, 1.5, 6]) g.add(mesh(box(o.width - 3, 0.04, 0.6), panel, 0, o.height - 0.05, v, false));
}
