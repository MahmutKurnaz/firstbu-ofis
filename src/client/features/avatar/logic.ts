// Your own character (the 3D one made from Mahmut's photos) and the camera angles to see it from.
// Pure, so it can be tested without a scene.

/** How tall your character stands (m). */
export const AVATAR_HEIGHT = 1.8;

/** A camera angle: first person (your hands), or the orbit camera behind (or in front of) you. */
export interface CamPreset {
  id: string;
  /** What the toast says when you switch to it. */
  name: string;
  third: boolean;
  /** Turned from straight behind you, in radians (π is in front of you, looking back at your face). */
  yaw: number;
  /** How high over you the camera looks down from (radians), and how far back it stands (m). */
  pitch: number;
  dist: number;
}

export const CAM_PRESETS: readonly CamPreset[] = [
  { id: 'first', name: 'Birinci şahıs (ellerin)', third: false, yaw: 0, pitch: 0, dist: 0 },
  { id: 'omuz', name: 'Omuz üstü', third: true, yaw: 0, pitch: 0.12, dist: 2.6 },
  { id: 'ucceDort', name: 'Arkadan yukarıdan (3/4)', third: true, yaw: 0, pitch: 0.42, dist: 5.2 },
  { id: 'oyun', name: 'Oyun görünümü', third: true, yaw: 0, pitch: 0.85, dist: 9.5 },
  { id: 'on', name: 'Önden (yüzün)', third: true, yaw: Math.PI, pitch: 0.18, dist: 3.4 },
];

/** The one you start with: from behind and above, a three-quarter view. */
export const DEFAULT_PRESET = 2;

/** The one after `i`, going round. */
export const nextPreset = (i: number): number => (i + 1) % CAM_PRESETS.length;

/** A stored value as an index into CAM_PRESETS, or the default if it isn't one. */
export function presetIndex(v: unknown): number {
  const n = typeof v === 'string' ? (/^\d+$/.test(v) ? Number(v) : NaN) : typeof v === 'number' ? v : NaN;
  return Number.isInteger(n) && n >= 0 && n < CAM_PRESETS.length ? n : DEFAULT_PRESET;
}

/** How fast the clips' own steps carry you (m/s), as made: the walk by the walking pace, the run by the run's. */
export const WALK_PACE = 1.4;
export const RUN_PACE = 6;
/** Slower than this, you're standing; up to this, walking (m/s). */
export const STILL = 0.3;
export const WALK_UP_TO = 2.4;

export type Clip = 'idle' | 'walk' | 'run' | 'jump';

/**
 * Which clip to play at `speed` (m/s over the ground), and how fast to play it so the feet keep up with the floor
 * rather than sliding: in the air a jump; standing, the idle; a stroll the walk; anything quicker the run, played
 * slower or faster to match (a brisk walk is a jog, the way it looks at 4.6 m/s).
 */
export function gaitFor(speed: number, grounded: boolean): { clip: Clip; rate: number } {
  if (!grounded) return { clip: 'jump', rate: 1 };
  if (!(speed > STILL)) return { clip: 'idle', rate: 1 };
  if (speed <= WALK_UP_TO) return { clip: 'walk', rate: speed / WALK_PACE };
  return { clip: 'run', rate: Math.min(1.5, Math.max(0.4, speed / RUN_PACE)) };
}

/** Which clip a name in the model is, by what it contains (the model's own: idle, walk, run, jump, wave, sit). */
export function clipOf(name: string): Clip | undefined {
  const n = name.toLowerCase();
  return n.includes('jump') ? 'jump' : n.includes('run') ? 'run' : n.includes('walk') ? 'walk' : n.includes('idle') ? 'idle' : undefined;
}
