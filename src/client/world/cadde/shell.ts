import { meshy } from './meshy';
import * as THREE from 'three';
import type { Pt } from '../../../shared/nav';
import { canvasTexture } from '../texture';
import { mesh, textPlane, toon } from '../toon';
import { box } from '../station/kit';
import type { CaddeKit } from './kit';

// The street itself: the paving, the boulevard down the middle, the city round it (towers whose
// windows light up at night), the edges you can't walk past, and the gateway at the south end where
// workers come in and go home, with the project's name over it.

/** How wide the boulevard down the middle is. */
const BOULEVARD = 18;
/** How far out the city goes past the street's edges. */
const CITY = 60;

/** A toon material of its own with a picture on it (never the cached toon() one: that's everyone's). */
function painted(map: THREE.Texture): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ map, gradientMap: (toon('#fff') as THREE.MeshToonMaterial).gradientMap });
}

/** Pale square paving stones, a joint every meter. */
function pavingTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(
    128,
    128,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 128, 128);
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fillRect(0, 0, 128, 3);
      c.fillRect(0, 0, 3, 128);
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(20, 30, 60, 40);
    },
    [1, 1],
  );
}

/** A tower's face: rows of windows by day, about half of them lit at night (its emissive map). */
function towerFaces(floors: number, bays: number, wall: string): { map: THREE.CanvasTexture; lights: THREE.CanvasTexture } {
  const map = canvasTexture(256, 256, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#9fc6e0';
    for (let i = 0; i < 4; i++) c.fillRect(i * 64 + 8, 40, 48, 170);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(bays / 4, floors);
  const lights = canvasTexture(64, 64 * floors, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 64 * floors);
    for (let f = 0; f < floors; f++)
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.5) continue;
        c.fillStyle = Math.random() < 0.2 ? '#9ec9ff' : '#ffd99a';
        c.fillRect(i * 16 + 2, f * 64 + 10, 12, 42);
      }
  });
  lights.wrapS = THREE.RepeatWrapping;
  lights.repeat.set(bays / 4, 1);
  return { map, lights };
}

const WALLS = ['#d9cfc0', '#b9c0c9', '#e3d6c4', '#9aa7b5', '#cbb8a2'];

/**
 * Puts up the street. Returns where the way in is and which way is out through it, where the city's
 * nearer row of buildings goes (kaykit.ts puts them up), and how to put the project's name over the gateway.
 */
export function buildShell(kit: CaddeKit): { doorAt: THREE.Vector3; out: Pt; near: { x: number; z: number; rotY: number; scale: number }[]; christen(name: string): void } {
  const b = kit.plan.bounds;
  const W = b.maxX - b.minX;
  const L = b.maxZ - b.minZ;
  // The paving, out under the city too, and the boulevard down the middle.
  const pave = pavingTexture('#cfc8bc');
  pave.repeat.set(W + CITY * 2, L + CITY * 2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + CITY * 2, L + CITY * 2), painted(pave));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  kit.group.add(ground);
  const blvd = pavingTexture('#e6e0d6');
  blvd.repeat.set(BOULEVARD / 2, L / 2);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(BOULEVARD, L), painted(blvd));
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.005;
  strip.receiveShadow = true;
  kit.group.add(strip);
  for (const sx of [-1, 1]) kit.still.add(mesh(box(0.25, 0.08, L), kit.street.curb, sx * (BOULEVARD / 2 + 0.12), 0.04, 0, false));

  // The edges: nobody walks off the street (workers going home go out through the gateway).
  const fence = (minX: number, maxX: number, minZ: number, maxZ: number) => kit.colliders.push({ minX, maxX, minZ, maxZ, top: 99, fence: true });
  fence(b.minX - 1, b.minX, b.minZ - 1, b.maxZ + 1);
  fence(b.maxX, b.maxX + 1, b.minZ - 1, b.maxZ + 1);
  fence(b.minX - 1, b.maxX + 1, b.minZ - 1, b.minZ);
  fence(b.minX - 1, b.maxX + 1, b.maxZ, b.maxZ + 1);

  // The city round it: a row of buildings just outside the edges, towers behind them.
  const city = new THREE.Group();
  let k = 0;
  const tower = (x: number, z: number, w: number, d: number, h: number) => {
    const floors = Math.max(2, Math.round(h / 3.3));
    const wall = WALLS[k++ % WALLS.length];
    const side = towerFaces(floors, Math.max(1, Math.round(d / 2.6)), wall);
    const front = towerFaces(floors, Math.max(1, Math.round(w / 2.6)), wall);
    const mat = (f: { map: THREE.CanvasTexture; lights: THREE.CanvasTexture }) => {
      const m = new THREE.MeshToonMaterial({ map: f.map, emissive: '#ffffff', emissiveMap: f.lights, emissiveIntensity: 0, gradientMap: (toon('#fff') as THREE.MeshToonMaterial).gradientMap });
      kit.night.glows.push({ mat: m, day: 0, night: 0.9 });
      return m;
    };
    const roof = toon(wall);
    const t = new THREE.Mesh(box(w, h, d), [mat(side), mat(side), roof, roof, mat(front), mat(front)]);
    t.position.set(x, h / 2, z);
    t.castShadow = true;
    city.add(t);
    city.add(mesh(box(w + 0.4, 0.4, d + 0.4), toon('#f4efe6'), x, h + 0.2, z, false));
  };
  const rand = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  // The nearer row is KayKit's buildings (see kaykit.ts), facing the street far enough out that the
  // biggest's front (0.8 of it at 5 × 1.9) stays behind the edge; behind them, towers.
  const near: { x: number; z: number; rotY: number; scale: number }[] = [];
  for (let x = b.minX + 4; x <= b.maxX - 4; x += 17) {
    near.push({ x, z: b.minZ - 9, rotY: 0, scale: 1.5 + rand(x) * 0.4 });
    // The way in is at the south end: leave the gateway's view down the road clear.
    if (Math.abs(x) > 12) near.push({ x, z: b.maxZ + 9, rotY: Math.PI, scale: 1.5 + rand(x + 9) * 0.4 });
  }
  for (let z = b.minZ + 6; z <= b.maxZ - 6; z += 17)
    for (const sx of [-1, 1]) near.push({ x: sx * (b.maxX + 9), z, rotY: -sx * (Math.PI / 2), scale: 1.5 + rand(z * sx) * 0.4 });
  const gap = 24;
  const tall = (i: number) => 34 + rand(i + 100) * 40;
  for (let x = b.minX - 6; x <= b.maxX + 6; x += 13) {
    tower(x, b.minZ - gap - 6, 11, 10, tall(x));
    if (Math.abs(x) > 12) tower(x, b.maxZ + gap + 6, 11, 10, tall(x + 50));
  }
  for (let z = b.minZ + 4; z <= b.maxZ - 4; z += 13) for (const sx of [-1, 1]) tower(sx * (b.maxX + gap + 6), z, 10, 11, tall(z * sx + 7));
  kit.group.add(city);

  // The gateway: two pillars and a beam over the way in, the project's name on it.
  const door = kit.plan.door;
  const doorAt = new THREE.Vector3(door.x, 0, b.maxZ);
  const gate = new THREE.Group();
  gate.position.copy(doorAt);
  for (const sx of [-1, 1]) gate.add(mesh(box(0.6, 5.2, 0.6), kit.street.frame, sx * 3.2, 2.6, 0));
  gate.add(mesh(box(7.2, 0.7, 0.7), kit.street.frame, 0, 5.4, 0));
  // Its own gateway (7 m between its posts, 4.6 m high), in place of the pillars and beam.
  meshy(gate, 'kapi', { replaces: [...gate.children] });
  kit.group.add(gate);
  let sign: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  const christen = (name: string) => {
    if (sign) {
      sign.removeFromParent();
      sign.geometry.dispose();
      sign.material.map?.dispose();
      sign.material.dispose();
    }
    sign = textPlane(`🏙️ ${name || 'Ajan Şehri'}`, { bg: '#2f343b', color: '#ffffff', border: '#ffb547', size: 72 });
    sign.scale.multiplyScalar(1.4);
    sign.position.set(0, 3.85, -0.3);
    sign.rotation.y = Math.PI;
    gate.add(sign);
  };
  christen('');
  return { doorAt, out: [0, 1], near, christen };
}
