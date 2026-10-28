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
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isInteger(n) && n >= 0 && n < CAM_PRESETS.length ? n : DEFAULT_PRESET;
}

/** What your character is doing, for picking its clip. */
export interface MoveState {
  moving: boolean;
  running: boolean;
  grounded: boolean;
}

export type Clip = 'idle' | 'walk' | 'run' | 'jump';

/** Which clip to play: in the air, a jump; on the ground, running or walking while you move, else standing. */
export function clipFor(s: MoveState): Clip {
  if (!s.grounded) return 'jump';
  if (!s.moving) return 'idle';
  return s.running ? 'run' : 'walk';
}

/** Which clip a name in the model is, by what it contains (the model's own: idle, walk, run, jump, wave, sit). */
export function clipOf(name: string): Clip | undefined {
  const n = name.toLowerCase();
  return n.includes('jump') ? 'jump' : n.includes('run') ? 'run' : n.includes('walk') ? 'walk' : n.includes('idle') ? 'idle' : undefined;
}
