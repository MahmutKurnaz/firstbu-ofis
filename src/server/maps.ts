import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MapState } from '../shared/protocol.js';
import { CADDE } from '../shared/maps/cadde.js';
import { movedTable } from '../shared/maps/tables.js';
import { OFFICE_MAP, checkCustomMaps, isMapChoice, planOf, type CustomMap, type MapPlan } from '../shared/maps/index.js';

/** The id of the street as someone rearranged it (see saveEdit). */
export const EDIT_ID = 'duzen';

/** The most custom maps read, and the biggest file that's read as one. */
const MAX_FILES = 24;
const MAX_BYTES = 256 * 1024;

interface Saved {
  pick: string;
  by: string;
  at: number;
}

/**
 * The building's map (the office, the castle, or one of your own), picked in ⚙️ Settings by anyone
 * and kept in .agent-office/map.json. Everyone's on the same one. Maps of your own are JSON files in
 * .agent-office/maps/ (see docs/maps.md), read again whenever someone looks at the list.
 */
export class Maps {
  private saved?: Saved;
  private file: string;
  private dir: string;
  private custom: CustomMap[] = [];
  /** What the folder looked like when it was last read: each file's name, size and mtime. */
  private stamp = '';

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'map.json');
    this.dir = path.join(dataDir, 'maps');
    this.restore();
    this.reload();
  }

  /** The folder custom maps go in. */
  get folder(): string {
    return this.dir;
  }

  state(): MapState {
    const pick = this.pick();
    // Who picked it, while it's what they picked (not the office, while their map won't load).
    return { pick, custom: this.custom, ...(this.saved?.pick === pick ? { by: this.saved.by, at: this.saved.at } : {}) };
  }

  /** The map everyone's on: the one picked, while it's there to be had. */
  pick(): string {
    const p = this.saved?.pick;
    return p && isMapChoice(p, this.custom) ? p : OFFICE_MAP;
  }

  /** Where everything is on the building's map. */
  plan(): MapPlan {
    return planOf(this.pick(), this.custom);
  }

  /** False when there's no such map (or it won't load). Read the folder first (reload), so a map just added counts. */
  set(pick: string, by: string): boolean {
    if (!isMapChoice(pick, this.custom)) return false;
    this.saved = { pick, by, at: Date.now() };
    this.persist();
    return true;
  }

  /**
   * The street, rearranged by someone in the editor (see features/mapedit): its props as they put them, saved as a map of
   * your own that extends the street (`duzen.json`) and picked. Null if it went through, or why it didn't.
   */
  saveEdit(base: string, props: unknown, by: string, tables?: unknown): string | null {
    if (base !== 'cadde' && base !== EDIT_ID) return 'Yalnızca cadde haritası düzenlenebilir';
    // Someone changed the map to another while this was on its way: it's not for that one.
    if (this.pick() === 'castle' || this.pick() === 'station') return 'Harita bu arada değişti: düzenleme kaydedilmedi';
    if (!Array.isArray(props) || props.length > 400) return 'Eşya listesi geçersiz';
    const keep = ['kind', 'x', 'z', 'y', 'rotY', 'scale', 'width', 'height', 'length', 'color', 'light', 'model', 'style'];
    const clean = props.map((p) => {
      const o: Record<string, unknown> = {};
      if (typeof p === 'object' && p !== null) for (const k of keep) if ((p as Record<string, unknown>)[k] !== undefined) o[k] = (p as Record<string, unknown>)[k];
      if (o.color !== undefined && !(typeof o.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(o.color))) delete o.color;
      return o;
    });
    // Tables put somewhere else: the street's own list with those moved (a list in a map replaces the whole one).
    const moved = new Map<number, { x: number; z: number; rotY: number }>();
    if (tables !== undefined) {
      if (!Array.isArray(tables) || tables.length > 40) return 'Masa listesi geçersiz';
      for (const t of tables) {
        const o = (typeof t === 'object' && t !== null ? t : {}) as Record<string, unknown>;
        const base = CADDE.tables[Number(o.i)];
        const ok = [o.x, o.z, o.rotY].every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 500);
        if (!Number.isInteger(o.i) || !base || base.look || !ok) return 'Masa listesi geçersiz';
        moved.set(Number(o.i), { x: Number(o.x), z: Number(o.z), rotY: Number(o.rotY) });
      }
    }
    const changed = [...moved].some(([i, m]) => CADDE.tables[i].x !== m.x || CADDE.tables[i].z !== m.z || (CADDE.tables[i].rotY ?? 0) !== m.rotY);
    const json = {
      id: EDIT_ID,
      name: 'Cadde (düzenlenmiş)',
      icon: '✏️',
      description: 'Caddenin senin yerleştirdiğin hâli (düzenleme modu).',
      extends: 'cadde',
      props: clean,
      ...(changed ? { tables: CADDE.tables.map((t, i) => (moved.has(i) ? movedTable(t, moved.get(i)!.x, moved.get(i)!.z, moved.get(i)!.rotY) : t)) } : {}),
    };
    if (JSON.stringify(json).length > MAX_BYTES) return 'Harita çok büyük';
    const [checked] = checkCustomMaps([{ file: `${EDIT_ID}.json`, json }]);
    if (!checked?.config) return checked?.error ?? 'Harita geçersiz';
    try {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(path.join(this.dir, `${EDIT_ID}.json`), JSON.stringify(json, null, 2));
    } catch {
      return 'Harita dosyası yazılamadı';
    }
    // (what the folder looked like is by name, size and time: two edits of the same size in the same second look alike)
    this.stamp = '';
    this.reload();
    return this.set(EDIT_ID, by) ? null : 'Harita yüklenemedi';
  }

  /** Reads the custom maps again; true if anything in the folder changed. */
  reload(): boolean {
    let names: string[] = [];
    let extra: string[] = [];
    try {
      names = readdirSync(this.dir)
        .filter((f) => f.endsWith('.json'))
        .sort();
      extra = names.slice(MAX_FILES);
      names = names.slice(0, MAX_FILES);
    } catch {
      // no folder: no maps of your own
    }
    const stats = names.map((f) => {
      try {
        const s = statSync(path.join(this.dir, f));
        return { f, size: s.size, mtime: s.mtimeMs };
      } catch {
        return { f, size: -1, mtime: 0 };
      }
    });
    const stamp = JSON.stringify([stats, extra]);
    if (stamp === this.stamp) return false;
    this.stamp = stamp;
    const files = stats.map(({ f, size }) => {
      if (size > MAX_BYTES) return { file: f, json: undefined, error: `${MAX_BYTES / 1024} KB’ı aşıyor` };
      try {
        return { file: f, json: JSON.parse(readFileSync(path.join(this.dir, f), 'utf8')) as unknown };
      } catch (e) {
        return { file: f, json: undefined, error: `geçerli bir JSON değil (${(e as Error).message})` };
      }
    });
    const checked = checkCustomMaps(files.filter((f) => !f.error));
    this.custom = files.map((f) => (f.error ? { file: f.file, error: f.error } : checked.find((c) => c.file === f.file)!));
    for (const f of extra) this.custom.push({ file: f, error: `klasördeki yalnızca ilk ${MAX_FILES} harita okunur` });
    return true;
  }

  private restore() {
    try {
      const s = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<Saved>;
      if (typeof s.pick === 'string') this.saved = { pick: s.pick, by: typeof s.by === 'string' ? s.by : 'someone', at: typeof s.at === 'number' ? s.at : 0 };
    } catch {
      // never set: the office
    }
  }

  private persist() {
    try {
      writeFileSync(this.file, JSON.stringify(this.saved ?? {}, null, 2), { mode: 0o600 });
    } catch {
      // disk issues shouldn't take the office down
    }
  }
}
