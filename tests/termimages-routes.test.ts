import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Ctx } from '../src/server/office/context.js';
import { routes } from '../src/server/http/routes/index.js';
import { termImageRoutes } from '../src/server/http/routes/termimages.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('both routes are registered, GET, session-only', () => {
  for (const [r, p] of [[termImageRoutes.list, '/api/term/images'], [termImageRoutes.one, '/api/term/image']] as const) {
    assert.equal(r.path, p);
    assert.equal(r.method, 'GET');
    assert.equal(r.auth, 'session');
    assert.ok(routes.includes(r), `${p} is in routes`);
  }
});

test('they come after every public route', () => {
  const last = routes.map((r) => r.auth).lastIndexOf('public');
  for (const r of [termImageRoutes.list, termImageRoutes.one]) assert.ok(routes.indexOf(r) > last);
  // and before the catch-all bundle (which has no method and answers every path)
  const catchAll = routes.findIndex((r) => r.prefix === '/' || r.prefix === '');
  if (catchAll >= 0) assert.ok(routes.indexOf(termImageRoutes.one) < catchAll);
});

function fakeRes() {
  const out = { status: 0, headers: {} as Record<string, string>, body: Buffer.alloc(0) };
  const res = {
    writeHead(status: number, headers: Record<string, string>) {
      out.status = status;
      out.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    },
    end(b?: string | Buffer) {
      out.body = Buffer.from(b ?? '');
    },
  };
  return { res, out };
}

async function call(route: typeof termImageRoutes.list | typeof termImageRoutes.one, ctx: unknown, query: string) {
  const { res, out } = fakeRes();
  const url = new URL(`http://x${route.path}?${query}`);
  await route.handle(ctx as Ctx, { req: {}, res, url, path: url.pathname, session: {} } as never);
  return out;
}

test('routes answer 404 / 400 / 200 with the safe headers', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-termroutes-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'shots'));
  writeFileSync(path.join(dir, 'shots', 'a.png'), PNG);
  const ctx = { floors: new Map([['f1', { dir, workers: new Map([['w1', {}]]) }]]) };

  assert.equal((await call(termImageRoutes.list, ctx, 'floor=nope&worker=w1')).status, 404);
  assert.equal((await call(termImageRoutes.one, ctx, 'floor=nope&worker=w1&path=shots/a.png')).status, 404);
  assert.equal((await call(termImageRoutes.list, ctx, 'floor=f1&worker=nope')).status, 404);
  assert.equal((await call(termImageRoutes.one, ctx, 'floor=f1&worker=nope&path=shots/a.png')).status, 404);
  assert.equal((await call(termImageRoutes.one, ctx, 'floor=f1&worker=w1')).status, 400);
  assert.equal((await call(termImageRoutes.one, ctx, 'floor=f1&worker=w1&path=../x.png')).status, 404);

  const list = await call(termImageRoutes.list, ctx, 'floor=f1&worker=w1');
  assert.equal(list.status, 200);
  assert.equal(list.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(list.body.toString()).images.map((i: { path: string }) => i.path), ['shots/a.png']);

  const one = await call(termImageRoutes.one, ctx, 'floor=f1&worker=w1&path=shots/a.png');
  assert.equal(one.status, 200);
  assert.equal(one.headers['content-type'], 'image/png');
  assert.equal(one.headers['cache-control'], 'no-store');
  assert.equal(one.headers['x-content-type-options'], 'nosniff');
  assert.match(one.headers['content-security-policy'], /default-src 'none'/);
  assert.match(one.headers['content-security-policy'], /sandbox/);
  assert.equal(one.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(one.headers['content-length'], String(PNG.length));
  assert.ok(one.body.equals(PNG));
});

test('a worker with a worktree lists that folder, not the floor', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'office-termroutes-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'wt'));
  writeFileSync(path.join(dir, 'wt', 'in.png'), PNG);
  writeFileSync(path.join(dir, 'out.png'), PNG);
  const ctx = { floors: new Map([['f1', { dir, workers: new Map([['w1', { worktree: { path: 'wt' } }]]) }]]) };
  const list = await call(termImageRoutes.list, ctx, 'floor=f1&worker=w1');
  assert.deepEqual(JSON.parse(list.body.toString()).images.map((i: { path: string }) => i.path), ['in.png']);
  assert.equal((await call(termImageRoutes.one, ctx, 'floor=f1&worker=w1&path=../out.png')).status, 404);
});
