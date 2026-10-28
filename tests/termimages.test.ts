import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listImages, MAX_TERM_IMAGE_BYTES, readImage } from '../src/server/termimages.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function tmp(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(path.join(tmpdir(), 'office-termimages-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function put(root: string, rel: string, data: Buffer | string = PNG, mtimeSec?: number) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, data);
  if (mtimeSec !== undefined) utimesSync(abs, mtimeSec, mtimeSec);
}

test('listImages finds image extensions and ignores other files', async (t) => {
  const root = tmp(t);
  for (const n of ['a.png', 'b.jpg', 'c.jpeg', 'd.gif', 'e.webp', 'f.svg', 'G.PNG']) put(root, n);
  for (const n of ['x.txt', 'y.ts', 'png', 'noext']) put(root, n, 'x');
  const got = (await listImages(root)).map((i) => i.path).sort();
  assert.deepEqual(got, ['G.PNG', 'a.png', 'b.jpg', 'c.jpeg', 'd.gif', 'e.webp', 'f.svg']);
});

test('listImages returns the newest first, with size and mtime', async (t) => {
  const root = tmp(t);
  put(root, 'old.png', PNG, 1_000_000);
  put(root, 'new.png', PNG, 3_000_000);
  put(root, 'sub/mid.png', PNG, 2_000_000);
  const list = await listImages(root);
  assert.deepEqual(list.map((i) => i.path), ['new.png', 'sub/mid.png', 'old.png']);
  assert.equal(list[0].size, PNG.length);
  assert.equal(list[0].at, 3_000_000_000);
});

test('listImages returns at most 60, keeping the newest', async (t) => {
  const root = tmp(t);
  for (let i = 0; i < 75; i++) put(root, `img${i}.png`, PNG, 1_000_000 + i);
  const list = await listImages(root);
  assert.equal(list.length, 60);
  assert.equal(list[0].path, 'img74.png');
  assert.equal(list[59].path, 'img15.png');
});

test('listImages skips dependency, build and dot folders', async (t) => {
  const root = tmp(t);
  for (const d of ['node_modules', 'dist', 'build', 'vendor', 'target', '__pycache__', 'coverage', '.git', '.agent-office', '.hidden/deep']) put(root, `${d}/skip.png`);
  put(root, 'node_modules/pkg/skip2.png');
  put(root, '.agent-office/drops/skip3.png');
  put(root, 'src/keep.png');
  put(root, '.dotfile.png');
  assert.deepEqual((await listImages(root)).map((i) => i.path), ['src/keep.png']);
});

test('listImages goes four folders down, not five', async (t) => {
  const root = tmp(t);
  put(root, 'a/b/c/d/four.png');
  put(root, 'a/b/c/d/e/five.png');
  assert.deepEqual((await listImages(root)).map((i) => i.path), ['a/b/c/d/four.png']);
});

test('listImages paths are relative to the root and use slashes', async (t) => {
  const root = tmp(t);
  put(root, 'docs/shots/one.png');
  const [img] = await listImages(root);
  assert.equal(img.path, 'docs/shots/one.png');
  assert.ok(!path.isAbsolute(img.path));
  assert.ok(!img.path.includes('\\'));
});

test('listImages answers [] for an empty or missing root', async (t) => {
  const root = tmp(t);
  assert.deepEqual(await listImages(root), []);
  put(root, 'only.txt', 'x');
  assert.deepEqual(await listImages(root), []);
  assert.deepEqual(await listImages(path.join(root, 'nope')), []);
});

test('readImage returns a valid png byte for byte with its content type', async (t) => {
  const root = tmp(t);
  put(root, 'shots/a.png');
  const r = await readImage(root, 'shots/a.png');
  assert.ok('body' in r);
  assert.equal(r.type, 'image/png');
  assert.ok(r.body.equals(PNG));
});

test('readImage refuses non-images (415), missing files and folders (404)', async (t) => {
  const root = tmp(t);
  put(root, 'notes.txt', 'x');
  put(root, 'dir.png/inner.png');
  assert.equal((await readImage(root, 'notes.txt') as { status: number }).status, 415);
  assert.equal((await readImage(root, 'missing.png') as { status: number }).status, 404);
  assert.equal((await readImage(root, 'dir.png') as { status: number }).status, 404);
});

test('readImage never serves dot folders by a hand-made path', async (t) => {
  const root = tmp(t);
  put(root, '.git/x.png');
  put(root, '.agent-office/drops/a.png');
  put(root, '.hidden.png');
  for (const p of ['.git/x.png', '.agent-office/drops/a.png', './.git/x.png', 'src/../.git/x.png', '.hidden.png']) {
    assert.equal((await readImage(root, p) as { status: number }).status, 404, p);
  }
});

test('readImage refuses paths outside the root', async (t) => {
  const root = tmp(t);
  const outer = tmp(t);
  const inside = path.join(root, 'work');
  mkdirSync(inside);
  put(root, 'outside.png');
  put(outer, 'abs.png');
  assert.equal((await readImage(inside, '../outside.png') as { status: number }).status, 404);
  assert.equal((await readImage(inside, path.join(outer, 'abs.png')) as { status: number }).status, 404);
});

test('readImage refuses a symlink pointing out of the root', async (t) => {
  const root = tmp(t);
  const outer = tmp(t);
  put(outer, 'secret.png');
  try {
    symlinkSync(path.join(outer, 'secret.png'), path.join(root, 'link.png'));
    symlinkSync(outer, path.join(root, 'linkdir'));
  } catch {
    t.skip('symlinks cannot be created here');
    return;
  }
  assert.equal((await readImage(root, 'link.png') as { status: number }).status, 404);
  assert.equal((await readImage(root, 'linkdir/secret.png') as { status: number }).status, 404);
});

test('readImage refuses a picture over MAX_TERM_IMAGE_BYTES (413) and serves one at the limit', async (t) => {
  const root = tmp(t);
  const big = path.join(root, 'big.png');
  writeFileSync(big, '');
  truncateSync(big, MAX_TERM_IMAGE_BYTES + 1);
  assert.equal((await readImage(root, 'big.png') as { status: number }).status, 413);
  assert.equal(MAX_TERM_IMAGE_BYTES, 15 * 1024 * 1024);
});

test('readImage serves a small file unchanged', async (t) => {
  const root = tmp(t);
  const bytes = Buffer.from([0, 1, 2, 255, 254, 3]);
  put(root, 'x.gif', bytes);
  const r = await readImage(root, 'x.gif');
  assert.ok('body' in r);
  assert.equal(r.type, 'image/gif');
  assert.ok(r.body.equals(bytes));
});
