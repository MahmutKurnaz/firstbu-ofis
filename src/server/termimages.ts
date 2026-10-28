// The pictures in a worker's folder, for the Images tab of its terminal (client/ui/termimages.ts): the newest
// first, found a few folders down (never in node_modules, .git or other dot folders), and one to read.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { changedImageType } from '../shared/protocol.js';
import { insideCheckout } from './changes.js';
import type { ImageResult } from './decor.js';

export interface TermImage {
  /** Relative to the worker's folder. */
  path: string;
  size: number;
  /** Modified, ms since the epoch. */
  at: number;
}

const SKIP = new Set(['node_modules', 'dist', 'build', 'vendor', 'target', '__pycache__', 'coverage']);
const MAX_DEPTH = 4;
const MAX_SEEN = 5000;
const LIST_MAX = 60;
/** The biggest picture sent back to a browser. */
export const MAX_TERM_IMAGE_BYTES = 15 * 1024 * 1024;

/** The pictures under `root` (png, jpg, gif, webp, svg), newest first, at most LIST_MAX. */
export async function listImages(root: string): Promise<TermImage[]> {
  const found: TermImage[] = [];
  let seen = 0;
  const walk = async (dir: string, depth: number) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (++seen > MAX_SEEN) return;
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < MAX_DEPTH) await walk(abs, depth + 1);
      } else if (e.isFile() && changedImageType(e.name)) {
        try {
          const s = await stat(abs);
          found.push({ path: path.relative(root, abs), size: s.size, at: Math.round(s.mtimeMs) });
        } catch {
          // gone since it was listed
        }
      }
    }
  };
  await walk(root, 0);
  return found.sort((a, b) => b.at - a.at).slice(0, LIST_MAX);
}

/** One picture of the folder, if it's one (by its name), inside it, and not too big. */
export async function readImage(root: string, file: string): Promise<ImageResult> {
  const type = changedImageType(file);
  if (!type) return { status: 415, error: 'Yalnızca resimler' };
  // A dot folder's pictures aren't listed, and aren't served by a hand-made path either.
  if (file.split(/[\\/]/).some((part) => part.startsWith('.') && part !== '.' && part !== '..')) return { status: 404, error: 'Bu dosya listede değil' };
  const abs = await insideCheckout(root, file);
  if (!abs) return { status: 404, error: 'Bu dosya çalışanın klasöründe değil' };
  try {
    const s = await stat(abs);
    if (!s.isFile()) return { status: 404, error: 'Bu bir dosya değil' };
    if (s.size > MAX_TERM_IMAGE_BYTES) return { status: 413, error: `Bu resim ${MAX_TERM_IMAGE_BYTES / 1024 / 1024} MB’ı aşıyor` };
    return { type, body: await readFile(abs) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { status: 404, error: 'Bu dosya artık yok' };
    return { status: 500, error: (err as Error).message };
  }
}
