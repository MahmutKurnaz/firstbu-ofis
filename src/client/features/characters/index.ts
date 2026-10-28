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
export const CHARACTER_MODELS: Readonly<Record<string, ModelName>> = {
  aslan: 'aslan',
  'aslan-sevimli': 'aslan-sevimli',
  'kizil-panda': 'kizil-panda',
  susamuru: 'susamuru',
  kaplan: 'kaplan',
  tavsan: 'tavsan',
  geyik: 'geyik',
  mirket: 'mirket',
  tilki: 'tilki',
  koala: 'koala',
  panda: 'panda',
  sincap: 'sincap',
  ceylan: 'ceylan',
  penguen: 'penguen',
  baykus: 'baykus',
  kurt: 'kurt',
  ayi: 'ayi',
  fil: 'fil',
  zurafa: 'zurafa',
  kedi: 'kedi',
  golden: 'golden',
  kunduz: 'kunduz',
  kartal: 'kartal',
  bukalemun: 'bukalemun',
  kanguru: 'kanguru',
};

/** How tall each stands (m), as docs/karakterler.md has them; the rest the lion's 1.85. */
export const CHARACTER_HEIGHT: Readonly<Partial<Record<ModelName, number>>> = { 'kizil-panda': 1.55, susamuru: 1.65, kaplan: 1.95, tavsan: 1.7, geyik: 1.95, mirket: 1.3, tilki: 1.75, koala: 1.6, panda: 1.9, sincap: 1.4, ceylan: 1.8, penguen: 1.5, baykus: 1.6, kurt: 1.85, ayi: 2.0, fil: 2.0, zurafa: 2.1, kedi: 1.65, golden: 1.8, kunduz: 1.55, kartal: 1.85, bukalemun: 1.6, kanguru: 1.9, "npc-barista": 1.55, "npc-bekci": 1.7, "npc-cicekci": 1.2, "npc-kurye": 1.8, "npc-dede": 1.2, "npc-rehber": 1.9, "npc-karsilayici": 1.5 };

/** The model a worker with `role` wears on a floor whose army is `config`, or undefined. */
export function characterOf(config: Parameters<typeof findRole>[0] | undefined, role: string | undefined): ModelName | undefined {
  if (!config || !role) return undefined;
  const key = findRole(config, role)?.role.character;
  return key ? CHARACTER_MODELS[key] : undefined;
}

export function installCharacters(ctx: Ctx, deps: { workerViews: Map<string, WorkerView> }) {
  /** Each worker wearing a character, by the worker model itself: it keeps it on while it's walked out (sent home), after it's left workerViews. */
  const skins = new Map<WorkerView['model'], { skin: AnimalSkin | null; model: ModelName; id: string }>();
  ctx.ticks.add('others', ({ dt }) => {
    for (const [id, view] of deps.workerViews) {
      const want = characterOf(store.ordu?.config, store.workers.get(id)?.role);
      const have = skins.get(view.model);
      // No longer a character (its role or the floor's army changed): back to itself.
      if (have && have.model !== want) {
        have.skin?.dispose();
        skins.delete(view.model);
      }
      if (!want) continue;
      if (skins.has(view.model)) continue;
      const entry: { skin: AnimalSkin | null; model: ModelName; id: string } = { skin: null, model: want, id };
      skins.set(view.model, entry);
      loadModel(want)
        .then((m) => {
          if (skins.get(view.model) !== entry) return;
          // Sat at its desk: its root is in the desk's seat, where the seat has it (not up dancing on the
          // desk), and the desk is one to sit at (not a kiosk or a lectern, which are stood at).
          const seated = () => {
            const desk = ctx.world().desks.get(view.deskId);
            return !!desk && !desk.def.station && view.model.root.parent === desk.seatAnchor && view.model.root.position.lengthSq() < 1e-4;
          };
          entry.skin = new AnimalSkin(view.model, m, seated, CHARACTER_HEIGHT[want]);
        })
        .catch((e: unknown) => {
          // Tried again next frame (a model that won't load keeps warning, rather than going quiet).
          if (skins.get(view.model) === entry) skins.delete(view.model);
          console.warn(`characters: ${want} didn't load`, e);
        });
    }
    for (const [model, have] of skins) {
      // Gone from the scene (it's left, or its floor or map was put away): it's done with.
      if (!model.root.parent) {
        have.skin?.dispose();
        skins.delete(model);
      } else have.skin?.update(dt);
    }
  });
}
