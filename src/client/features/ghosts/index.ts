// A worker's subagents (the Agent tool, which Claude Code's SubagentStart and SubagentStop hooks
// report: WorkerInfo.subagents) as little ghosts floating behind it while they run, each with its
// type over its head, so you can see at a glance who's farmed work out, and to how many.
import * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { store } from '../../state';
import { mesh, textSprite } from '../../world/toon';
import { ghostSlots } from './logic';

interface Ghost {
  group: THREE.Group;
  label: THREE.Sprite;
  phase: number;
}

const body = new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.55, depthWrite: false });
body.userData.outlineParameters = { visible: false };
const eye = new THREE.MeshBasicMaterial({ color: '#2b2d42' });
eye.userData.outlineParameters = { visible: false };

function makeGhost(type: string): Ghost {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CapsuleGeometry(0.16, 0.26, 6, 12), body, 0, 0.3, 0, false));
  // A wavy hem: a ring of little blobs round its bottom.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    group.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), body, Math.sin(a) * 0.12, 0.1, Math.cos(a) * 0.12, false));
  }
  for (const sx of [-1, 1]) group.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), eye, sx * 0.06, 0.5, 0.14, false));
  const label = textSprite(`👻 ${type}`, { size: 34 });
  label.scale.multiplyScalar(0.55);
  label.position.y = 0.85;
  group.add(label);
  // Big enough to see over a laptop from across the room.
  group.scale.setScalar(1.35);
  return { group, label, phase: Math.random() * Math.PI * 2 };
}

function dropGhost(g: Ghost) {
  g.group.removeFromParent();
  g.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && m !== (g.label as unknown as THREE.Mesh)) m.geometry.dispose();
  });
  g.label.material.map?.dispose();
  g.label.material.dispose();
}

export function installGhosts(ctx: Ctx) {
  /** Each worker's ghosts, by subagent id. */
  const shown = new Map<string, Map<string, Ghost>>();
  const at = new THREE.Vector3();
  ctx.ticks.add('others', ({ t }) => {
    const world = ctx.world();
    const live = new Set<string>();
    for (const w of store.workers.values()) {
      const subs = w.subagents ?? [];
      const desk = world.desks.get(w.deskId);
      if (!subs.length || !desk || !world.group.visible) continue;
      live.add(w.id);
      let mine = shown.get(w.id);
      if (!mine) shown.set(w.id, (mine = new Map()));
      for (const [id, g] of mine) if (!subs.some((s) => s.id === id)) (dropGhost(g), mine.delete(id));
      const slots = ghostSlots(subs.length);
      desk.group.getWorldPosition(at);
      const r = desk.def.rotY;
      subs.slice(0, slots.length).forEach((s, i) => {
        let g = mine!.get(s.id);
        if (!g) {
          g = makeGhost(s.type);
          mine!.set(s.id, g);
          ctx.scene.add(g.group);
        }
        const { dx, dz } = slots[i];
        // The desk's frame into the world's, then a slow bob and sway.
        g.group.position.set(at.x + Math.cos(r) * dx + Math.sin(r) * dz, at.y + 1.25 + Math.sin(t * 2 + g.phase) * 0.08, at.z - Math.sin(r) * dx + Math.cos(r) * dz);
        g.group.rotation.y = r + Math.PI + Math.sin(t * 0.8 + g.phase) * 0.3;
      });
    }
    // Gone home, or its subagents all done, or on another floor or map: its ghosts go too.
    for (const [id, mine] of shown) {
      if (live.has(id)) continue;
      for (const g of mine.values()) dropGhost(g);
      shown.delete(id);
    }
  });
}
