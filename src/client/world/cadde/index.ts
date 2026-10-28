import * as THREE from 'three';
import type { FloorPalette } from '../../../shared/floors';
import type { MapPlan } from '../../../shared/maps';
import type { CaddePropKind } from '../../../shared/maps/cadde-props';
import { NavGrid, type Pt } from '../../../shared/nav';
// The people first, as the castle's and the station's are: Person (and what it loads) before the
// rest, so the materials the modules make as they load keep their order.
import { buildArmchair, buildBarista } from './people';
import type { Interactable } from '../types';
import { mergeByMaterial } from '../toon';
import type { World } from '../world';
import { buildBoards } from '../station/boards';
import { agentConsole, buildBenches, buildBriefing, placeSetting } from '../station/seats';
import { dress, furnish } from './kaykit';
import { caddeKit } from './kit';
import { paintOffice, type OfficeView } from './offices';
import { buildNpcs } from './npcs';
import { skylineOwn } from './skyline';
import { streetLife } from './passersby';
import { meshy } from './meshy';
import { buildDesks, furnishSuite } from './suite';
import { TEAM_COLORS, themeOffice } from './interiors';
import { PROPS } from './props';
import { buildShell } from './shell';

/*
 * The street's style of map (see shared/maps/cadde.ts for the street itself): a pedestrian street of
 * glass offices, one for each team, and a café on a square in the middle of it, with your armchair at
 * its head and a barista who takes on new workers. Each office is a zone (shared/maps/zones.ts):
 * setZones names and colors them after the floor's ordu.json, and its door shows its team (E).
 *
 * It goes up a part at a time, each in a file of its own beside this one: the shell (the paving, the
 * city round it and the gateway), the offices, the props (one builder for each kind) and the café's
 * people. The desks, the board agents' consoles, the boards and the meeting table are the station's
 * (world/station/), in the street's colors. What it's all built with is in kit.ts.
 */

/** Puts up the street in `plan` (a cadde-style map). */
export function buildCadde(plan: MapPlan): World {
  const c = plan.config!;
  const b = plan.bounds;
  const pal = { hull: '#f3efe8', panel: '#d9d2c5', metal: '#a7adb5', glow: '#ffb547', paving: '#cfc8bc', frame: '#2f343b', ...(c.palette ?? {}) };
  const kit = caddeKit(plan, pal) as ReturnType<typeof caddeKit> & { offices?: OfficeView[] };
  const group = kit.group;

  const shell = buildShell(kit);
  let offices = 0;
  for (const p of c.props ?? []) PROPS[p.kind as CaddePropKind](kit, p, p.kind === 'office' ? offices++ : 0);
  // The CC0 drafts, which come in once they've loaded.
  const officeProps = (c.props ?? []).filter((p) => p.kind === 'office');
  officeProps.forEach((p, i) => {
    if (p.style === 'yonetim') return furnishSuite(kit, p);
    furnish(kit, p, i);
    themeOffice(kit, p, i, TEAM_COLORS[i] ?? '#8a94a6');
  });
  dress(kit, c.props ?? []);
  skylineOwn(kit, shell.near);
  buildArmchair(kit);
  buildBenches(kit);
  buildDesks(kit);
  const overflow = new Map<string, Interactable>();
  for (const def of plan.desks) kit.desks.set(def.id, placeSetting(kit, def, false).view);
  for (const def of plan.overflow) {
    const { view, it } = placeSetting(kit, def, true);
    kit.desks.set(def.id, view);
    overflow.set(def.id, it);
  }
  for (const def of plan.stations) kit.desks.set(def.id, agentConsole(kit, def, (g, parts) => meshy(g, 'kursu', { turn: Math.PI, replaces: parts })));
  // Its own table: a round walnut one, 2.2 m across and 76 cm high.
  const briefing = buildBriefing(kit, '🤝 Toplantı', (t) => meshy(t, 'konsey-masasi', { replaces: [...t.children] }));
  // Its own frames: a thin black bezel with brass corners, in place of the black box and its orange lines.
  const boardMeshes = buildBoards(kit, (g, bd, frame) => {
    const k = (bd.width + 0.1) / 3.3;
    meshy(g, 'pano-cercevesi', { scale: k, y: -(2.1 * k) / 2, replaces: frame });
  });
  const herald = buildBarista(kit);
  const life = streetLife(kit);
  const npcs = buildNpcs(kit, herald?.person);
  group.add(mergeByMaterial(kit.still));

  // Walking about: in through the gateway and out again, round what's in the way.
  const nav = new NavGrid(b, plan.obstacles!);
  const { doorAt, out } = shell;
  const inside: Pt = [plan.door.x, plan.door.z];
  const threshold: Pt = [doorAt.x + out[0] * 0.3, doorAt.z + out[1] * 0.3];
  const beyond: Pt = [doorAt.x + out[0] * 5, doorAt.z + out[1] * 5];
  const gongAt = kit.gong?.top;
  const views = kit.offices ?? [];
  const dusk = new THREE.Color('#ffd2a8');
  const day = new THREE.Color('#ffffff');
  const glassDay = new THREE.Color('#cfe8f5');
  const glassNight = new THREE.Color('#2b3a55');

  return {
    plan,
    group,
    colliders: kit.colliders,
    interactables: kit.interactables,
    pickables: [group],
    desks: kit.desks,
    boardMeshes,
    meetingBoard: briefing.board,
    meetingSign: briefing.sign,
    gong: kit.gong,
    nav,
    ways: {
      home: (seat, from) => ({ way: [...(from ? nav.route(from, inside) : nav.wayFrom(seat, inside)), threshold, beyond], chute: false }),
      in: (seat) => [beyond, threshold, ...nav.wayTo(inside, seat)],
    },
    // Rain falls on the street, not in the offices: they're cut out of it by their roofs (the camera keeps under them).
    rain: [{ area: b, top: () => 14 }],
    device: 'laptop',
    room: { wall: 0.5, enclosed: true },
    acoustics: { gong: gongAt ? { x: gongAt.x, y: gongAt.y - 1.8, z: gongAt.z } : null, windows: [{ x: 0, y: 2, z: 0 }] },
    herald,
    setBeanbags(outNow) {
      for (const [id, it] of overflow) {
        const show = outNow.has(id);
        kit.desks.get(id)!.group.visible = show;
        it.off = !show;
      }
      return [];
    },
    setLook(p: FloorPalette) {
      // The café's lights take the floor's own color, so each project's street is its own.
      kit.mats.accent.color.set(p.trim);
    },
    setProjectName(n) {
      shell.christen(n);
    },
    setZones(zones) {
      views.forEach((v, i) => {
        const z = zones[i];
        paintOffice(v, z?.name ?? `Ofis ${i + 1}`, z?.color ?? '#8a94a6');
      });
    },
    update(t, dt) {
      for (const p of kit.pulses) p.set(0.5 + 0.5 * Math.sin((t * p.rate + p.phase) * Math.PI * 2));
      for (const d of kit.desks.values()) {
        if (!d.vacancy.visible || !d.group.visible || d.def.station) continue;
        d.vacancy.position.y = d.vacancyY + Math.sin(t * 2 + d.def.x) * 0.06;
        d.vacancy.rotation.y = t * 1.2;
      }
      kit.gong?.update(dt);
      herald?.person.update(dt, t, false, false);
      life.update(t, dt);
      npcs.update(dt);
    },
    mood(lights, daylight) {
      // Out of doors: the sky's own light, warmer toward dusk; at night the lamps, the offices' ceilings and the city's windows come on.
      const dark = 1 - daylight;
      lights.sun.color.copy(day).lerp(dusk, Math.min(1, dark * 1.6));
      // Bright enough under the offices' roofs (which shade them from the sun) to see faces and furniture,
      // by day and, with their ceiling lights on, by night.
      lights.hemi.intensity = Math.max(lights.hemi.intensity, 1.05);
      lights.ambient.intensity = Math.max(lights.ambient.intensity, 0.7);
      for (const g of kit.night.glows) {
        const k = g.day + (g.night - g.day) * dark;
        if ('emissiveIntensity' in g.mat) g.mat.emissiveIntensity = k;
        else g.mat.opacity = k;
      }
      for (const l of kit.night.lamps) l.intensity = 9 * Math.max(0, dark - 0.3);
      kit.street.glass.color.copy(glassDay).lerp(glassNight, dark * 0.8);
      const fog = lights.scene.fog as THREE.Fog | null;
      if (fog) {
        fog.near = Math.max(fog.near, 80);
        fog.far = Math.max(fog.far, 220);
      }
    },
    dispose() {
      // Its geometry, and every material with a picture of its own (paving, towers, signs, boards); the
      // cached toon materials are everyone's, and stay.
      const freed = new Set<THREE.Material>();
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.userData.shared) return;
        m.geometry?.dispose();
        for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
          const map = (mat as THREE.MeshBasicMaterial).map;
          if (!map || freed.has(mat)) continue;
          map.dispose();
          mat.dispose();
          freed.add(mat);
        }
      });
      // And the street's own materials without a picture: what glows at night, the offices' colors, the glass.
      for (const g of kit.night.glows) {
        (g.mat as THREE.MeshToonMaterial).emissiveMap?.dispose();
        g.mat.dispose();
      }
      for (const v of views) v.accent.dispose();
      life.dispose();
      npcs.dispose();
      for (const m of [kit.street.glass, kit.mats.glow, kit.mats.accent, kit.mats.lamp, kit.mats.warn, kit.mats.glass]) m.dispose();
    },
  };
}
