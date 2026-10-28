// The pictures in a worker's folder, for the Images tab of its terminal: the list (newest first), and one picture.
import path from 'node:path';
import type { Ctx } from '../../office/context.js';
import { str } from '../../office/input.js';
import { listImages, readImage } from '../../termimages.js';
import { workspaceOf } from '../../worktrees.js';
import { send } from '../util.js';
import type { Route } from '../router.js';
import { floorParam } from './files.js';

/** The folder a worker works in on the floor `url` names, or what to answer when there's no such worker. */
function folderOf(ctx: Ctx, url: URL): { root: string } | { status: number; error: string } {
  const floor = floorParam(ctx, url);
  if (!floor) return { status: 404, error: 'Böyle bir kat yok' };
  const info = floor.workers.get(str(url.searchParams.get('worker'), 32));
  if (!info) return { status: 404, error: 'Böyle bir çalışan yok' };
  const rel = workspaceOf(info);
  return { root: rel ? path.join(floor.dir, rel) : floor.dir };
}

export const termImageRoutes = {
  list: {
    method: 'GET',
    path: '/api/term/images',
    auth: 'session',
    async handle(ctx, { res, url }) {
      const r = folderOf(ctx, url);
      if ('error' in r) return send(res, r.status, { error: r.error });
      return send(res, 200, { images: await listImages(r.root) }, { 'cache-control': 'no-store' });
    },
  },
  one: {
    method: 'GET',
    path: '/api/term/image',
    auth: 'session',
    async handle(ctx, { res, url }) {
      const r = folderOf(ctx, url);
      if ('error' in r) return send(res, r.status, { error: r.error });
      const file = str(url.searchParams.get('path'), 4096);
      if (!file) return send(res, 400, { error: 'Hatalı istek' });
      const img = await readImage(r.root, file);
      if ('error' in img) return send(res, img.status, { error: img.error });
      res.writeHead(200, {
        'content-type': img.type,
        'content-length': String(img.body.length),
        // The worker may change it again any moment.
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        // Opened on its own (an SVG, say), it still can't run anything on the office's origin.
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'cross-origin-resource-policy': 'same-origin',
      });
      res.end(img.body);
    },
  },
} satisfies Record<string, Route>;
