// ⚙️ Settings: team notifications, the worker limit, upgrades, the holiday theme, the building's map,
// the office's prompts and default worker, and whether merged workers go home by themselves.
import path from 'node:path';
import { OPEN_CODE_MODEL_MAX } from '../../../shared/providers.js';
import { MAX_WORKER_LIMIT, parseWorkerLimit } from '../../machine.js';
import { OFFICE_MAP } from '../../../shared/maps/index.js';
import { isThemePick } from '../../../shared/theme.js';
import { PROMPTS, PROMPT_MAX, isPromptId } from '../../../shared/prompts.js';
import type { SettingsClientMsg } from '../../../shared/protocol.js';
import type { Ctx } from '../../office/context.js';
import { str } from '../../office/input.js';
import type { HandlerMap, ViewPieces } from './types.js';

/** The floor's Services board: its own workers' web servers. */
export const servicesView: ViewPieces['services'] = (ctx, floor) => ctx.servicesState(floor);

/**
 * Tells everyone about the maps, after a pick or a read of the folder. When the map everyone's on
 * changed (`was` before), everyone's off their seats (each browser forgets them too, see the
 * client's 'map'), and hears what it is now: `who` picked it, or a map of your own broke or came back.
 */
export const mapNews = (ctx: Ctx, was: string, who?: string) => {
  const { maps } = ctx;
  const now = maps.pick();
  if (now !== was) for (const other of ctx.clients.values()) delete other.peer.seat;
  ctx.broadcast({ t: 'map', state: maps.state() });
  if (now === was) return;
  const plan = maps.plan();
  // Without a pick, a map of your own broke (back to the office) or was fixed (back to it).
  const why = now === OFFICE_MAP ? `: "${was}" haritası yüklenmiyor (⚙️ Ayarlar’a bak)` : ': yeniden yükleniyor';
  ctx.toastAll(who ? `${who} binanın haritasını değiştirdi: ${plan.icon} ${plan.name}` : `Binanın haritası artık ${plan.icon} ${plan.name}${why}`);
};

export const settingsHandlers = {
  'notify.webhook'(ctx, c, msg) {
    const who = c.peer.name;
    const url = str(msg.url, 4096).trim();
    const err = ctx.webhook.set(url, who);
    ctx.warn(c, err);
    if (!err) ctx.toastAll(url ? `📣 ${who} ekip bildirimlerini kurdu` : `${who} ekip bildirimlerini kapattı`);
  },
  'notify.test'(ctx, c) {
    const who = c.peer.name;
    void ctx.webhook.test(who).then((err) => ctx.sendTo(c, { t: 'toast', text: err ?? '📣 Deneme mesajı gönderildi', level: err ? 'warn' : 'info' }));
  },
  'machine.limit'(ctx, c, msg) {
    const who = c.peer.name;
    if (!ctx.meOf(c.accountId).admin) return ctx.warn(c, 'Çalışan sınırını yalnızca yöneticiler değiştirebilir');
    const limit = msg.limit === null ? undefined : parseWorkerLimit(msg.limit);
    if (msg.limit !== null && limit === undefined) return ctx.warn(c, `Çalışan sınırı 1 ile ${MAX_WORKER_LIMIT} arasında bir tam sayı olmalı`);
    const err = ctx.machine.setLimit(limit, who);
    if (err) return ctx.warn(c, err);
    const now = ctx.machine.limit;
    ctx.toastAll(limit !== undefined ? `⚙️ ${who} çalışan sınırını ${now} yaptı` : now === undefined ? `⚙️ ${who} çalışan sınırını kaldırdı` : `⚙️ ${who} çalışan sınırını eski hâline getirdi: ${now} (--max-workers)`);
    ctx.pumpQueues();
  },
  'upgrade.check'(ctx) {
    void ctx.upgrader.check();
  },
  'upgrade.start'(ctx, c) {
    const who = c.peer.name;
    void ctx.upgrader.start(who).then((err) => {
      if (err) ctx.warn(c, err);
      else ctx.toastAll(`${who} ofisi güncelliyor — yeni sürüm kurulunca yeniden başlayacak`);
    });
  },
  'theme.set'(ctx, c, msg) {
    const who = c.peer.name;
    if (!isThemePick(msg.pick)) return;
    if (msg.pick === ctx.themes.state().pick) return;
    ctx.themes.set(msg.pick, who);
    const now = ctx.themes.state().active;
    ctx.toastAll(
      msg.pick === 'halloween'
        ? `🎃 ${who} ofisi Cadılar Bayramı için süsledi`
        : msg.pick === 'christmas'
          ? `🎄 ${who} ofisi Noel için süsledi`
          : msg.pick === 'off'
            ? `${who} bayram süslerini indirdi`
            : `📅 ${who} süsleri takvime göre değişecek şekilde ayarladı${now ? ` (şimdi ${now === 'halloween' ? 'Cadılar Bayramı 🎃' : 'Noel 🎄'} zamanı)` : ''}`,
    );
  },
  'sky.clock'(ctx, c, msg) {
    const real = msg.real === true;
    if (real === !!ctx.sky.state.realTime) return;
    ctx.sky.setClock(real);
    ctx.toastAll(real ? `🕰️ ${c.peer.name} gökyüzünü gerçek saate bağladı` : `⏩ ${c.peer.name} gökyüzünü saatte bir tam gün geçecek şekilde ayarladı`);
  },
  'map.set'(ctx, c, msg) {
    const who = c.peer.name;
    // Someone opened the list, or picked a map: either way the folder of maps of your own is read again first.
    const was = ctx.maps.pick();
    const reloaded = ctx.maps.reload();
    if (msg.map === undefined || !ctx.maps.set(str(msg.map, 64), who)) {
      if (reloaded) mapNews(ctx, was);
      if (msg.map !== undefined) ctx.warn(c, 'Bu adda bir harita yok ya da yüklenmiyor: ⚙️ Ayarlar’a bak');
      return;
    }
    mapNews(ctx, was, who);
  },
  'map.edit'(ctx, c, msg) {
    const who = c.peer.name;
    if (!ctx.meOf(c.accountId).admin) return ctx.warn(c, 'Haritayı yalnızca yöneticiler düzenleyebilir');
    const was = ctx.maps.pick();
    const err = ctx.maps.saveEdit(str(msg.base, 64), msg.props, who);
    if (err) return ctx.warn(c, err);
    mapNews(ctx, was, who);
  },
  'leaveOnMerge.set'(ctx, c, msg) {
    const who = c.peer.name;
    const on = msg.on === true;
    if (on === ctx.leaveOnMerge.on) return;
    ctx.leaveOnMerge.set(on, who);
    ctx.toastAll(on ? `🏠 ${who} çalışanların pull request’leri birleşince kendiliğinden eve gitmesini ayarladı` : `🪑 ${who} pull request’i birleşen çalışanların eve gönderilene kadar kalmasını ayarladı`);
    // The ones already merged go now.
    if (on) for (const f of ctx.floors.values()) f.sendLandedHome();
  },
  'prompts.set'(ctx, c, msg) {
    const who = c.peer.name;
    if (!ctx.meOf(c.accountId).admin) return ctx.warn(c, 'Ofisin prompt’larını yalnızca yöneticiler değiştirebilir');
    if (!isPromptId(msg.id) || (msg.text !== null && typeof msg.text !== 'string')) return;
    const custom = !!ctx.prompts.state().custom[msg.id];
    const err = ctx.prompts.setPrompt(msg.id, msg.text === null ? null : str(msg.text, PROMPT_MAX + 1), who);
    if (err) return ctx.warn(c, err);
    const now = !!ctx.prompts.state().custom[msg.id];
    const { label } = PROMPTS[msg.id];
    if (now) ctx.toastAll(`📝 ${who} “${label}” prompt’unu yeniden yazdı`);
    else if (custom) ctx.toastAll(`📝 ${who} “${label}” prompt’unu varsayılana döndürdü`);
  },
  'prompts.agent'(ctx, c, msg) {
    const who = c.peer.name;
    if (!ctx.meOf(c.accountId).admin) return ctx.warn(c, 'Ofisin varsayılan çalışanını yalnızca yöneticiler seçebilir');
    const ch = msg.choice;
    if (ch !== null && (!ch || typeof ch !== 'object')) return;
    const choice = ch && {
      provider: ch.provider,
      model: ch.model === undefined || ch.model === '' ? undefined : str(ch.model, OPEN_CODE_MODEL_MAX + 1),
      effort: ch.effort === undefined ? undefined : ch.effort,
    };
    const err = ctx.prompts.setAgent(choice, who);
    if (err) return ctx.warn(c, err);
    ctx.toastAll(choice ? `🤖 ${who} ofisin varsayılan çalışanını ayarladı` : `🤖 ${who} ofisin varsayılan çalışanını eski hâline getirdi: ${path.basename(ctx.cfg.agentCmd)}`);
  },
} satisfies HandlerMap<SettingsClientMsg>;
