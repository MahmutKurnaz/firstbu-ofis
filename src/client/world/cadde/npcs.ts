import * as THREE from 'three';
import type { Person } from '../character';
import { NpcSkin } from '../character/npc';
import { loadModel, type ModelName } from '../models';
import type { CaddeKit } from './kit';

// The street's people who stay where they are (the ones who stroll are in ./passersby.ts): the greeter on the
// café's square, the barista behind the counter, the guard at the gateway, the old turtle by a bench. They
// aren't anyone's workers, and nothing waits on them but the greeter (who's the plan's herald, E to talk).

/** Who stands where: the model, its height (m), where, and which way it faces (0 is +z, toward the way in). */
interface Spot {
  npc: ModelName;
  height: number;
  x: number;
  z: number;
  rotY: number;
}

/** Puts them up; returns what animates them each frame. `herald` is the greeter's Person (the plan's herald), whose name tag and bubble stay. */
export function buildNpcs(kit: CaddeKit, herald?: Person): { update(dt: number): void; dispose(): void } {
  const skins: NpcSkin[] = [];
  let gone = false;
  const spots: Spot[] = [];
  const counter = kit.plan.config?.props?.find((q) => q.kind === 'counter');
  if (counter) {
    // Behind the counter, looking out over it at the café.
    const r = counter.rotY ?? 0;
    spots.push({ npc: 'npc-barista', height: 1.55, x: counter.x - Math.sin(r) * 1.3, z: counter.z - Math.cos(r) * 1.3, rotY: r });
  }
  // At the gateway, a little to one side of the way in, watching the street.
  const door = kit.plan.door;
  spots.push({ npc: 'npc-bekci', height: 1.7, x: door.x + 4.2, z: door.z - 1.2, rotY: Math.PI + 0.5 });
  // By the bench on the west side, toward the way in.
  spots.push({ npc: 'npc-dede', height: 1.2, x: -6.6, z: 19.9, rotY: -Math.PI / 2 - 0.4 });

  const hold = (host: THREE.Object3D, npc: ModelName, height: number, hideBody: boolean) =>
    loadModel(npc)
      .then((m) => {
        // The world was put away while it loaded: nothing to dress.
        if (!gone) skins.push(new NpcSkin(host, m, height, hideBody));
      })
      .catch(() => console.warn(`cadde: ${npc} didn't load`));
  if (herald) void hold(herald.root, 'npc-karsilayici', 1.5, true);
  for (const s of spots) {
    const host = new THREE.Group();
    host.position.set(s.x, 0, s.z);
    host.rotation.y = s.rotY;
    kit.group.add(host);
    void hold(host, s.npc, s.height, false);
    // Something to walk round (it isn't on the plan: only you meet it).
    kit.colliders.push({ minX: s.x - 0.35, maxX: s.x + 0.35, minZ: s.z - 0.35, maxZ: s.z + 0.35, top: 99 });
  }
  return {
    update: (dt) => skins.forEach((s) => s.update(dt, false)),
    dispose: () => {
      gone = true;
      skins.forEach((s) => s.dispose());
    },
  };
}
