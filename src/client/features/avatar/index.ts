// Your own character, made from Mahmut's photos (models/mahmut.glb), in the third-person views, and the
// camera angles to see it from: B goes round them (your hands, over the shoulder, from behind and above,
// the game view, and from the front).
import type { Ctx } from '../../core/context';
import { saveSettings } from '../../state';
import { toast } from '../../ui/dom';
import { loadModel } from '../../world/models';
import { CAM_PRESETS, DEFAULT_PRESET, nextPreset, presetIndex } from './logic';
import { PlayerAvatar } from './skin';

const KEY = 'ao-camera';

export function installAvatar(ctx: Ctx) {
  let avatar: PlayerAvatar | null = null;
  let preset = DEFAULT_PRESET;
  try {
    preset = presetIndex(localStorage.getItem(KEY));
  } catch {
    // storage blocked: the default
  }
  void loadModel('mahmut')
    .then((m) => {
      avatar = new PlayerAvatar(m);
      ctx.scene.add(avatar.root);
    })
    .catch((e: unknown) => console.warn("avatar: Mahmut's model didn't load", e));

  function apply(i: number, announce: boolean) {
    const p = ctx.player;
    const pr = CAM_PRESETS[i];
    p.setView(pr.third ? 'third' : 'first');
    if (pr.third) {
      p.camYaw = p.facing - Math.PI + pr.yaw;
      p.camPitch = pr.pitch;
      p.camDist = pr.dist;
    }
    ctx.settings.view = pr.third ? 'third' : 'first';
    saveSettings(ctx.settings);
    if (announce) toast(`📷 Kamera: ${pr.name} · B ile değiştir`);
  }

  ctx.keys.bind({
    code: 'KeyB',
    repeat: false,
    run: () => {
      preset = nextPreset(preset);
      try {
        localStorage.setItem(KEY, String(preset));
      } catch {
        // storage blocked
      }
      apply(preset, true);
    },
  });

  // How fast you're going, from where you were a moment ago (smoothed, so a stop or a start doesn't flick the clip).
  let speed = 0;
  let lastX = 0;
  let lastZ = 0;
  let started = false;
  ctx.ticks.add('me', ({ dt }) => {
    // The view you left off in (or the three-quarter one the first time), once the page is up.
    if (!started) {
      started = true;
      apply(preset, false);
    }
    const p = ctx.player;
    if (!avatar) {
      lastX = p.pos.x;
      lastZ = p.pos.z;
      return;
    }
    // Yours where you stand, in third person; the little Person for everything that poses it (a seat,
    // a car, the tee, the ladder) or when the camera's right in your face.
    const use = p.view === 'third' && !p.seat && !ctx.activities.any('takesCamera') && !ctx.activities.any('hidesHands') && !ctx.view.grip() && ctx.me.root.visible;
    avatar.root.visible = use;
    if (!use) {
      lastX = p.pos.x;
      lastZ = p.pos.z;
      return;
    }
    ctx.me.root.visible = false;
    avatar.root.position.copy(p.pos);
    avatar.root.position.y += p.stepOffset;
    avatar.root.rotation.y = p.facing;
    const v = dt > 0 ? Math.hypot(p.pos.x - lastX, p.pos.z - lastZ) / dt : 0;
    speed += (Math.min(v, 12) - speed) * Math.min(1, dt * 12);
    lastX = p.pos.x;
    lastZ = p.pos.z;
    avatar.update(dt, speed, p.grounded);
  });
}
