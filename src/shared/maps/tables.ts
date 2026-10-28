// A table that was moved or turned (the map editor, features/mapedit): the seats at the tables are numbered with every table's
// inner side first (see planMap), so a table keeps the side that counts as its inner one wherever it's put.
import type { TableConfig } from './types.js';

/** Whether the table's `sides` +1 side (to its right, as it's turned) is the inner one, the way planMap works it out. */
export function rightIsInner(t: Pick<TableConfig, 'x' | 'z' | 'rotY' | 'flip'>): boolean {
  const r = t.rotY ?? 0;
  return (Math.cos(r) * t.x - Math.sin(r) * t.z <= 0) !== (t.flip === true);
}

/** Table `t` at (x, z) turned `rotY`, its `flip` set so the same side is the inner one as before (so no seat changes its number). */
export function movedTable(t: TableConfig, x: number, z: number, rotY: number): TableConfig {
  const was = rightIsInner(t);
  const to = { x, z, rotY };
  const flip = (Math.cos(rotY) * x - Math.sin(rotY) * z <= 0) !== was;
  const { flip: _old, ...rest } = t;
  return { ...rest, ...to, ...(flip ? { flip: true } : {}) };
}
