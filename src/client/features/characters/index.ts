// Our own characters (F4): a worker hired for a role of the floor's ordu.json whose `character` we have a
// model for (the lion lead: `aslan`) is drawn as that character instead of the little Claude worker.
// The models load only once someone's wearing one.
import type { Ctx } from '../../core/context';
import { findRole } from '../../../shared/ordu';
import { store } from '../../state';
import { AnimalSkin } from '../../world/character/animal';
import { loadModel, type ModelName } from '../../world/models';
import type { WorkerView } from '../workers/views';

/** The characters there's a model for, by ordu.json's `character` key. */
export const CHARACTER_MODELS: Readonly<Record<string, ModelName>> = { aslan: 'aslan' };

/** The model a worker with `role` wears on a floor whose army is `config`, or undefined. */
export function characterOf(config: Parameters<typeof findRole>[0] | undefined, role: string | undefined): ModelName | undefined {
  if (!config || !role) return undefined;
  const key = findRole(config, role)?.role.character;
  return key ? CHARACTER_MODELS[key] : undefined;
}

export function installCharacters(ctx: Ctx, deps: { workerViews: Map<string, WorkerView> }) {
  const skins = new Map<string, { skin: AnimalSkin | null; model: ModelName; view: WorkerView }>();
  ctx.ticks.add('others', ({ dt }) => {
    for (const [id, view] of deps.workerViews) {
      const want = characterOf(store.ordu?.config, store.workers.get(id)?.role);
      const have = skins.get(id);
      // Gone, or a different worker in the same slot, or no longer a character: back to itself.
      if (have && (have.view !== view || have.model !== want)) {
        have.skin?.dispose();
        skins.delete(id);
      }
      if (!want || skins.has(id)) continue;
      const entry: { skin: AnimalSkin | null; model: ModelName; view: WorkerView } = { skin: null, model: want, view };
      skins.set(id, entry);
      void loadModel(want)
        .then((m) => {
          if (skins.get(id) !== entry) return;
          // Sat at its desk: its root is in the desk's seat (not out walking about the hall).
          const seated = () => {
            const desk = ctx.world().desks.get(view.deskId);
            return !!desk && view.model.root.parent === desk.seatAnchor;
          };
          entry.skin = new AnimalSkin(view.model, m, seated);
        })
        .catch(() => console.warn(`characters: ${want} didn't load`));
    }
    for (const [id, have] of skins) {
      if (!deps.workerViews.has(id)) {
        have.skin?.dispose();
        skins.delete(id);
      } else have.skin?.update(dt);
    }
  });
}
