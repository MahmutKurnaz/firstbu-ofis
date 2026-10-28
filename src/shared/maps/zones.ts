import { officeBox, officeDoor } from './cadde-props.js';
import type { MapPlan } from './types.js';

/*
 * A map's zones: on a street (cadde), each glass office is one, the seats inside it are its team's,
 * and the offices of a project's ordu.json go into them in order, the first into the first. Hiring a
 * role seats it in its own office (see server/ordu/hire.ts), and the office's sign and door are its
 * team's (see features/ordu/). Other maps have none.
 */

export interface MapZone {
  index: number;
  x: number;
  z: number;
  /** Across its front, and how deep. */
  width: number;
  length: number;
  /** The way its door faces. */
  rotY: number;
  /** Just outside its door, facing it. */
  door: { x: number; z: number; rotY: number };
  /** The seats inside it, regular then overflow, as the plan has them. */
  desks: string[];
}

const cache = new WeakMap<MapPlan, MapZone[]>();

/** The zones of `plan`, in the order its offices are listed. */
export function mapZones(plan: MapPlan): MapZone[] {
  const hit = cache.get(plan);
  if (hit) return hit;
  const offices = plan.style === 'cadde' ? (plan.config?.props ?? []).filter((p) => p.kind === 'office') : [];
  const seats = [...plan.desks, ...plan.overflow];
  const zones = offices.map((p, index): MapZone => {
    const o = officeBox(p);
    const inside = (x: number, z: number) => {
      const dx = x - o.x;
      const dz = z - o.z;
      // Into the office's own frame: across its front, and toward its door.
      const side = dx * Math.cos(o.rotY) - dz * Math.sin(o.rotY);
      const out = dx * Math.sin(o.rotY) + dz * Math.cos(o.rotY);
      return Math.abs(side) < o.width / 2 && Math.abs(out) < o.length / 2;
    };
    return { index, x: o.x, z: o.z, width: o.width, length: o.length, rotY: o.rotY, door: officeDoor(p), desks: seats.filter((d) => inside(d.x, d.z)).map((d) => d.id) };
  });
  cache.set(plan, zones);
  return zones;
}

/** Which zone the seat `deskId` is in, or -1. */
export function zoneOf(plan: MapPlan, deskId: string): number {
  return mapZones(plan).findIndex((z) => z.desks.includes(deskId));
}
