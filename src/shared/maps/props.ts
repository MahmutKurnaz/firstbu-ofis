import type { Circle, Rect } from '../nav.js';
import type { PropConfig } from './types.js';

/*
 * The pieces a castle-style map can put up (MapConfig.props), and how much floor each takes: what
 * walkers go round (shared/nav.ts) and, in the builder, what you bump into. How each one looks is the
 * style's builder's (world/castle/). A station's are in ./station-props.ts.
 */

export const PROP_KINDS = {
  /** A stone pillar, floor to ceiling. `scale` widens it. */
  pillar: 'Yerden tavana bir taş sütun',
  /** A torch in an iron sconce on a wall or a pillar, `y` up, burning toward `rotY`. */
  torch: 'Duvarda ya da sütunda bir mum tutacağında meşale',
  /** An iron fire bowl on legs. */
  brazier: 'Ayaklı demir bir kasede ateş',
  /** An iron ring of candles hanging from the roof, at `y`. */
  chandelier: 'Tavandan sarkan bir mum halkası',
  /** A long banner hanging on a wall, its top at `y`, `width` by `height`, facing `rotY`. */
  banner: 'Duvarda asılı bir sancak',
  /** A tall pointed stained-glass window in a wall, its sill at `y`. */
  window: 'Uzun bir vitray pencere',
  /** A round stained-glass window, its middle at `y`, `width` across. */
  rose: 'Yuvarlak bir vitray pencere',
  /** A carpet runner on the floor, `width` by `length` along `rotY`. */
  carpet: 'Bir uzun halı',
  /** A knight in stone on a plinth. */
  statue: 'Kaide üzerinde taştan bir şövalye',
  /** A suit of armour on a stand. */
  armor: 'Bir zırh takımı',
  /** A shield with crossed swords, hung on a wall at `y`. */
  shield: 'Duvarda bir kalkan ve çapraz kılıçlar',
  /** A great fireplace against a wall, `width` wide. */
  hearth: 'Bir şömine',
  /** The gong a merged pull request rings (one per map). */
  gong: 'Merge gongu',
  /** Casks of ale on a rack: a drink perks you up, like the office's coffee. */
  cask: 'Bira fıçıları (kahve)',
  /** A table with nothing to sit at, `width` by `length`. */
  table: 'Oturağı olmayan bir masa',
  /** A tall iron candle stand. */
  candles: 'Bir şamdan',
} as const;
export type PropKind = keyof typeof PROP_KINDS;

/** The floor a `w` by `d` box takes, centered on (x, z) and turned `rotY` (its `d` along rotY). */
export function boxFootprint(x: number, z: number, w: number, d: number, rotY = 0): Rect {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  const hx = (w * c + d * s) / 2;
  const hz = (w * s + d * c) / 2;
  return [x - hx, x + hx, z - hz, z + hz];
}

/** The size of a pillar, a hearth and the rest, before `scale`. */
export const PROP_SIZE = {
  pillar: 1.3,
  brazier: 0.55,
  statue: 1.3,
  armor: 0.42,
  hearth: { width: 3.6, depth: 1.1 },
  gong: { width: 2.1, depth: 0.7 },
  cask: { width: 1.7, depth: 1.0 },
  candles: 0.3,
} as const;

/** How much floor a prop takes: a box, a circle, or none (it's on a wall or up in the air). */
export function propFootprint(p: PropConfig): { rect?: Rect; circle?: Circle } | null {
  const s = p.scale ?? 1;
  const r = p.rotY ?? 0;
  switch (p.kind) {
    case 'pillar':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.pillar * s, PROP_SIZE.pillar * s, r) };
    case 'brazier':
      return { circle: [p.x, p.z, PROP_SIZE.brazier * s] };
    case 'statue':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.statue * s, PROP_SIZE.statue * s, r) };
    case 'armor':
      return { circle: [p.x, p.z, PROP_SIZE.armor * s] };
    case 'candles':
      return { circle: [p.x, p.z, PROP_SIZE.candles * s] };
    case 'hearth':
      return { rect: boxFootprint(p.x, p.z, (p.width ?? PROP_SIZE.hearth.width) * s, PROP_SIZE.hearth.depth * s, r) };
    case 'gong':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.gong.width, PROP_SIZE.gong.depth, r) };
    case 'cask':
      return { rect: boxFootprint(p.x, p.z, PROP_SIZE.cask.width * s, PROP_SIZE.cask.depth * s, r) };
    case 'table':
      return { rect: boxFootprint(p.x, p.z, p.width ?? 1.4, p.length ?? 3, r) };
    default:
      return null;
  }
}

/** How high up a prop that hangs on a wall or from the roof reaches (0 for what stands on the floor). */
export function propTop(p: PropConfig): number {
  const y = p.y ?? 0;
  switch (p.kind) {
    case 'window':
      return y + (p.height ?? 5);
    case 'rose':
      return y + (p.width ?? 4.5) / 2;
    case 'banner':
    case 'chandelier':
      return y;
    case 'torch':
    case 'shield':
      return y + 0.5;
    default:
      return 0;
  }
}
