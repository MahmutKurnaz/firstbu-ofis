// Where a worker's subagent ghosts float: pure, so it can be tested without a scene.

/** The most ghosts shown round one desk (as many as the server keeps: MAX_SUBAGENTS). */
export const MAX_GHOSTS = 6;

/**
 * Where each of `n` ghosts floats, in the desk's own frame (+z is behind the worker's seat, x across
 * it): in an arc behind the worker, 0.55 m apart, the outer ones a little further back.
 */
export function ghostSlots(n: number): { dx: number; dz: number }[] {
  const count = Math.max(0, Math.min(MAX_GHOSTS, Math.floor(n)));
  return Array.from({ length: count }, (_, i) => {
    const k = i - (count - 1) / 2;
    return { dx: k * 0.55, dz: 1.75 + Math.abs(k) * 0.18 };
  });
}
