import type { Circle, Rect } from '../nav.js';
import { VIEWPORT } from './airlock.js';
import { PROP_SIZE, boxFootprint } from './props.js';
import type { PropConfig } from './types.js';

/*
 * The pieces a station-style map can put up (MapConfig.props), and how much floor each takes, as
 * ./props.ts has the castle's. How each one looks is the station builder's (world/station/).
 */

export const STATION_PROP_KINDS = {
  /** A hull rib across the hall at `z`: a column up each side wall, and a beam across the ceiling between them. */
  rib: 'Bir gövde kaburgası: her yan duvarda bir sütun, tavanda bir kiriş',
  /** A window cut through the wall it's on, its sill at `y`, `width` by `height`: space shows through it. */
  viewport: 'Uzaya bakan bir pencere',
  /** A light pod hanging from the ceiling, down to `y`. */
  lamp: 'Tavandan sarkan bir ışık kapsülü',
  /** A strip of light let into the deck, `width` by `length` along `rotY`. */
  strip: 'Güvertede bir ışık şeridi',
  /** A display on a wall, its middle at `y`, `width` by `height`, facing `rotY`. */
  screen: 'Duvarda bir ekran',
  /** A round holo-table, a globe turning over it. */
  hologram: 'Üzerinde dünya dönen bir holo masa',
  /** A hydroponics planter against a wall, `width` wide. */
  planter: 'Bir hidroponik saksı',
  /** A stack of cargo crates. */
  crate: 'Kargo sandıkları',
  /** The gong a merged pull request rings (one per map). */
  gong: 'Merge gongu',
  /** A drinks dispenser: a cup perks you up, like the office's coffee. */
  dispenser: 'Bir içecek makinesi (kahve)',
  /** A console table with nothing to sit at, `width` by `length`. */
  table: 'Oturağı olmayan bir konsol masası',
} as const;
export type StationPropKind = keyof typeof STATION_PROP_KINDS;

/** The size of a holo-table, a planter and the rest, before `scale`. */
export const STATION_SIZE = {
  hologram: 1.25,
  planter: { width: 2.4, depth: 0.7 },
  crate: 1.5,
  dispenser: { width: 1.3, depth: 0.7 },
  lamp: 0.5,
} as const;

/** How much floor a station's prop takes: a box, a circle, or none (it's on a wall, in the deck or up in the air). */
export function stationFootprint(p: PropConfig): { rect?: Rect; circle?: Circle } | null {
  const s = p.scale ?? 1;
  const r = p.rotY ?? 0;
  switch (p.kind) {
    case 'hologram':
      return { circle: [p.x, p.z, STATION_SIZE.hologram * s] };
    case 'planter':
      return { rect: boxFootprint(p.x, p.z, (p.width ?? STATION_SIZE.planter.width) * s, STATION_SIZE.planter.depth * s, r) };
    case 'crate':
      return { rect: boxFootprint(p.x, p.z, STATION_SIZE.crate * s, STATION_SIZE.crate * s, r) };
    case 'gong':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.gong.width, PROP_SIZE.gong.depth, r) };
    case 'dispenser':
      return { rect: boxFootprint(p.x, p.z, STATION_SIZE.dispenser.width * s, STATION_SIZE.dispenser.depth * s, r) };
    case 'table':
      return { rect: boxFootprint(p.x, p.z, p.width ?? 1.4, p.length ?? 3, r) };
    default:
      return null;
  }
}

/** How high up a station's prop that's on a wall or hangs from the ceiling reaches (0 for what stands on the deck). */
export function stationTop(p: PropConfig): number {
  switch (p.kind) {
    case 'viewport':
      return (p.y ?? VIEWPORT.y) + (p.height ?? VIEWPORT.height);
    case 'screen':
      return (p.y ?? 2.6) + (p.height ?? 1.4) / 2;
    case 'lamp':
      return p.y ?? 0;
    default:
      return 0;
  }
}
