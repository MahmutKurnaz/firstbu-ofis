import * as THREE from 'three';
import type { MapPlan } from '../../../shared/maps';
import type { Kit } from '../station/kit';
import { lit, materials } from '../station/kit';
import { toon, toonUnique } from '../toon';

// What the street is built with: the station's Kit (its desks, consoles, boards and meeting table are
// the street's too, in the street's colors) and what only a street has: paving, glass, and the parts
// that change between day and night (see CaddeKit.night).

/** The most street lamps that light the street for real at night (the rest just glow). */
export const MAX_LAMPS = 6;

export interface StreetMats {
  paving: THREE.Material;
  boulevard: THREE.Material;
  curb: THREE.Material;
  soil: THREE.Material;
  frame: THREE.Material;
  wood: THREE.Material;
  /** The offices' glass, which goes darker and bluer at night. */
  glass: THREE.MeshBasicMaterial;
}

/** What changes with the hour: bulbs and lit windows (0 by day, 1 at night), and the lamps' lights. */
export interface Night {
  glows: { mat: THREE.MeshToonMaterial | THREE.MeshBasicMaterial; day: number; night: number }[];
  lamps: THREE.PointLight[];
}

export interface CaddeKit extends Kit {
  street: StreetMats;
  night: Night;
}

export function caddeKit(plan: MapPlan, pal: Record<string, string>): CaddeKit {
  const group = new THREE.Group();
  const glass = new THREE.MeshBasicMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  glass.userData.outlineParameters = { visible: false };
  const kit: CaddeKit = {
    plan,
    group,
    still: new THREE.Group(),
    colliders: [],
    interactables: [],
    // The station's furniture in an office's colors: warm padded benches, light grey frames (its own
    // are nearly black, which in a sunny street office read as holes in the floor).
    mats: { ...materials({ hull: pal.hull, panel: pal.panel, metal: pal.metal, glow: pal.glow }), pad: toon('#9b7a62'), metalDark: toon('#8a919b') },
    height: plan.height,
    desks: new Map(),
    lights: [],
    spinners: [],
    pulses: [],
    floorAt: () => 0,
    street: {
      paving: toon(pal.paving),
      boulevard: toon('#e4ded3'),
      curb: toon('#9d978c'),
      soil: toon('#6b4f3a'),
      frame: toon(pal.frame),
      wood: toon('#b98a5e'),
      glass,
    },
    night: { glows: [], lamps: [] },
  };
  return kit;
}

/** A material that glows: `day` bright by day, `night` bright at night (see Night). */
export function glow(kit: CaddeKit, color: string, day = 0, night = 1): THREE.MeshToonMaterial {
  const m = toonUnique(color);
  m.emissive.set(color);
  m.emissiveIntensity = day;
  kit.night.glows.push({ mat: m, day, night });
  return m;
}

/** Something that's only light (a lamp's globe at night): unlit, its color faded in with the dark. */
export function lightOnly(kit: CaddeKit, color: string, night = 0.45): THREE.MeshBasicMaterial {
  const m = lit(color, { opacity: 0 });
  kit.night.glows.push({ mat: m, day: 0, night });
  return m;
}
