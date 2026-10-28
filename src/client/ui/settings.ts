import './settings.css';
import type { Net } from '../net';
import type { OfficeSound } from '../sound';
import { store, type NeedsYouSound, type Settings, type ViewMode } from '../state';
import { askNotifyPermission, notifyPermission, type DesktopNotifier } from '../notify';
import type { ThemePick, WebhookKind } from '../../shared/protocol';
import { THEME_PICKS } from '../../shared/theme';
import { mapChoices } from '../../shared/maps';
import { dogSetting } from './settings-dog';
import { h, openModal, timeAgo } from './dom';
import { agentFields, choiceLabel, officeChoice } from './provider';
import { openPromptEditor, rewrittenPrompts } from './prompts';
import { outsideSetting } from './settings-sky';
import { choiceRow } from './settings-rows';

const VIEWS: [ViewMode, string, string][] = [
  ['first', '👀 Birinci şahıs', 'Kendi gözlerinden gör. Etrafa bakmak için ofise tıkla, kullanmak için nesnelere tıkla. Esc fareyi serbest bırakır.'],
  ['third', '🎥 Üçüncü şahıs', 'Karakterini arkadan takip et. Kamerayı çevirmek için sürükle, yakınlaştırmak için kaydır, kullanmak için nesnelere tıkla.'],
];

const THEME_LABEL: Record<ThemePick, string> = { auto: '📅 Takvime göre', halloween: '🎃 Cadılar Bayramı', christmas: '🎄 Yılbaşı', off: 'Kapalı' };

const WEBHOOK_NAME: Record<WebhookKind, string> = { slack: 'Slack', discord: 'Discord', other: 'bir webhook' };

/** The categories down the side of ⚙️ Settings. */
export type SettingsPane = 'you' | 'sound' | 'notify' | 'building' | 'workers';

const PANES: { id: SettingsPane; icon: string; label: string; blurb: string }[] = [
  { id: 'you', icon: '🧍', label: 'Sen', blurb: 'Nasıl göründüğün, ofisi nasıl gördüğün ve nasıl giriş yaptığın.' },
  { id: 'sound', icon: '🔊', label: 'Ses ve konuşma', blurb: 'Ofisin sana ne kadar gürültülü geldiği ve sesli sohbetin nasıl çalıştığı.' },
  { id: 'notify', icon: '🔔', label: 'Bildirimler', blurb: 'Başka yerdeyken, birine ihtiyacı olan ya da işi biten bir çalışandan haberdar ol.' },
  { id: 'building', icon: '🏢', label: 'Bina', blurb: 'Harita, süsler, gökyüzü, köpek ve yeni katların nereye klonlandığı.' },
  { id: 'workers', icon: '🤖', label: 'Çalışanlar', blurb: 'Çalışanların neyle başladığı, aynı anda kaç tanesinin çalıştığı, ne zaman eve gittikleri ve ofisin onlara ne söylediği.' },
];

/** Who a setting is for, shown by its name: some are yours alone, some the whole office's. */
type Scope = 'you' | 'floor' | 'office';
const SCOPE: Record<Scope, [label: string, title: string]> = {
  you: ['Sadece sen', 'Sadece senin için, bu tarayıcıda saklanır'],
  floor: ['Bu kat', 'Bu kattaki herkes için aynı'],
  office: ['Herkes', 'Binadaki herkes için aynı'],
};

/** One setting: its name and who it's for, then whatever sets it. */
const setting = (title: string, scope: Scope | null, ...body: Node[]) =>
  h('div.setting', {}, h('div.setting-head', {}, h('h4', {}, title), scope && h('span.scope', { class: scope, title: SCOPE[scope][1] }, SCOPE[scope][0])), ...body);

/** Where ⚙️ Settings was last, so it opens there again. */
let lastPane: SettingsPane = 'you';

/** `outside` describes the sky over the office (see describeSky), once the server has said. `first` opens on that category instead of the last one. */
export function openSettings(net: Net, settings: Settings, onChange: (s: Settings) => void, onCharacter: () => void, sound: Pick<OfficeSound, 'ding' | 'needsYou'>, notifier: DesktopNotifier, onSignOut: () => void, outside?: { now: string; live: boolean }, first?: SettingsPane) {
  const seg = h('div.seg', { role: 'radiogroup', 'aria-label': 'Kamera görünümü' });
  const note = h('p.setting-note');
  const paint = () => {
    seg.replaceChildren(
      ...VIEWS.map(([view, label]) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(settings.view === view),
            class: settings.view === view ? 'on' : '',
            onclick: () => {
              if (settings.view === view) return;
              settings = { ...settings, view };
              onChange(settings);
              paint();
            },
          },
          label,
        ),
      ),
    );
    note.textContent = VIEWS.find(([v]) => v === settings.view)![2];
  };
  paint();

  /** A volume slider with its mute button. Dragging it turns the sound back on; letting go plays `preview`. */
  const volumeRow = (label: string, level: 'volume' | 'music', muted: 'muted' | 'musicMuted', preview?: () => void) => {
    const slider = h('input', { type: 'range', min: 0, max: 100, step: 1, 'aria-label': label });
    const pct = h('span.vol-pct');
    const mute = h('button.btn', { type: 'button' });
    const row = h('div.volume', {}, mute, slider, pct);
    const paint = () => {
      const v = Math.round(settings[level] * 100);
      slider.value = String(v);
      slider.style.setProperty('--fill', `${v}%`);
      pct.textContent = settings[muted] ? 'Sessiz' : `${v}%`;
      mute.textContent = settings[muted] ? '🔊 Sesi aç' : '🔇 Sustur';
      mute.setAttribute('aria-pressed', String(settings[muted]));
      mute.classList.toggle('danger', settings[muted]);
      row.classList.toggle('muted', settings[muted]);
    };
    paint();
    slider.addEventListener('input', () => {
      settings = { ...settings, [level]: Number(slider.value) / 100, [muted]: false };
      onChange(settings);
      paint();
    });
    if (preview) slider.addEventListener('change', preview);
    mute.addEventListener('click', () => {
      settings = { ...settings, [muted]: !settings[muted] };
      onChange(settings);
      paint();
      if (!settings[muted]) preview?.();
    });
    return row;
  };
  const soundRow = volumeRow('Ofis sesleri seviyesi', 'volume', 'muted', () => sound.ding('done'));

  /** Changes some of your own settings, and has the office take them up. */
  const change = (some: Partial<Settings>) => {
    settings = { ...settings, ...some };
    onChange(settings);
  };
  // Voice chat: an open mic, or muted until you hold V.
  const talkRow = choiceRow('Sesli sohbet', [[false, '🎙️ Açık mikrofon'], [true, '✋ Bas-konuş']], () => settings.pushToTalk, (pushToTalk) => change({ pushToTalk }));
  const musicRow = volumeRow('Müzik kutusu seviyesi', 'music', 'musicMuted');

  // The swish of the book's pages at the bookshelf, on or off.
  const pagesRow = choiceRow('Kitaplıkta sayfa çevirme sesi', [[true, '📖 Açık'], [false, 'Kapalı']], () => settings.pageTurns, (pageTurns) => change({ pageTurns }));
  // The alarm when a worker stops to ask you something; picking one plays it.
  const alarmRow = choiceRow<NeedsYouSound>('Bir çalışan sana ihtiyaç duyunca', [['once', '🔔 Bir kez çal'], ['remind', '🔁 Hatırlatıp dur'], ['off', '🔕 Kapalı']], () => settings.needsYouSound, (needsYouSound) => {
    change({ needsYouSound });
    if (needsYouSound !== 'off') sound.needsYou();
  });

  // The building's holiday theme, for everyone.
  const themeRow = h('div.seg', { role: 'radiogroup', 'aria-label': 'Bayram teması' });
  const themeNote = h('p.setting-note');
  const paintTheme = () => {
    const { pick, active, by, at } = store.theme;
    themeRow.replaceChildren(
      ...THEME_PICKS.map((p) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(pick === p),
            class: pick === p ? 'on' : '',
            onclick: () => {
              if (store.theme.pick !== p) net.send({ t: 'theme.set', pick: p });
            },
          },
          THEME_LABEL[p],
        ),
      ),
    );
    const now =
      active === 'halloween'
        ? 'Cadılar Bayramı: çalışanlar zombi, ellerin ölümsüz bir büyücünün elleri, köpek kostümlü, gökyüzü ürkütücü ve her yerde balkabağı fenerleri var.'
        : active === 'christmas'
          ? 'Yılbaşı: çalışanlar elf, ellerinde eldiven var, köpek Rudolph ve dışarıda kar yağıyor.'
          : 'Şu an süs yok.';
    const how = pick === 'auto' ? ' Takvime göre Ekim boyunca Cadılar Bayramı, Aralık boyunca Yılbaşı.' : '';
    themeNote.textContent = `${now}${how} Binadaki herkes için aynı${by ? `, ayarlayan: ${by}${at ? ` ${timeAgo(at)}` : ''}` : ''}.`;
  };
  paintTheme();

  // The building's map, for everyone: the office, the castle, the space station, or one of your own. Opening Settings
  // has the office read its folder of maps again, so one you just added or fixed shows up.
  net.send({ t: 'map.set' });
  const mapRow = h('div.seg', { role: 'radiogroup', 'aria-label': 'Harita' });
  const mapNote = h('p.setting-note');
  const mapBad = h('p.setting-note.bad', { style: 'white-space: pre-line' });
  const paintMap = () => {
    const { pick, by, at, custom } = store.map;
    const choices = mapChoices(custom);
    mapRow.replaceChildren(
      ...choices.map((m) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(pick === m.id),
            class: pick === m.id ? 'on' : '',
            disabled: !!m.error,
            title: m.error ? `${m.id} yüklenmiyor: ${m.error}` : m.description,
            onclick: () => {
              if (!m.error && store.map.pick !== m.id) net.send({ t: 'map.set', map: m.id });
            },
          },
          `${m.icon} ${m.name}`,
        ),
      ),
    );
    const now = choices.find((m) => m.id === pick) ?? choices[0];
    mapNote.textContent = `${now.description} Her katta, binadaki herkes için aynı${by ? `, seçen: ${by}${at ? ` ${timeAgo(at)}` : ''}` : ''}. Kendi haritaların ofisin .agent-office/maps/ klasörüne JSON olarak girer (bkz. docs/maps.md).`;
    const broken = choices.filter((m) => m.error);
    mapBad.textContent = broken.map((m) => `⚠️ ${m.id} yüklenmiyor: ${m.error}`).join('\n');
    mapBad.hidden = !broken.length;
  };
  paintMap();

  // Desktop notifications: this browser's permission, then your own on/off.
  const notifyRow = h('div.seg');
  const notifyNote = h('p.setting-note');
  const paintNotify = () => {
    const perm = notifyPermission();
    const on = perm === 'granted' && settings.notify;
    notifyRow.replaceChildren();
    if (perm === 'default') {
      notifyRow.append(
        h(
          'button.btn.primary',
          {
            type: 'button',
            onclick: async () => {
              if ((await askNotifyPermission()) === 'granted') {
                settings = { ...settings, notify: true };
                onChange(settings);
                notifier.sample();
              }
              paintNotify();
            },
          },
          '🔔 Bildirimleri aç',
        ),
      );
    } else if (perm === 'granted') {
      for (const [value, label] of [
        [true, '🔔 Açık'],
        [false, '🔕 Kapalı'],
      ] as const) {
        notifyRow.append(
          h(
            'button.btn',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(on === value),
              class: on === value ? 'on' : '',
              onclick: () => {
                settings = { ...settings, notify: value };
                onChange(settings);
                paintNotify();
              },
            },
            label,
          ),
        );
      }
      if (on) notifyRow.append(h('button.btn', { type: 'button', onclick: () => notifier.sample() }, 'Bir örnek göster'));
    }
    notifyNote.textContent =
      perm === 'unsupported'
        ? 'Bu tarayıcı burada ofisten bildirim gösteremiyor. https ya da localhost gerekir (SSH tüneli de sayılır).'
        : perm === 'denied'
          ? 'Tarayıcın ofisten gelen bildirimleri engelliyor. Site ayarlarından izin ver (adresin solundaki simge), sonra bunu yeniden aç.'
          : 'Başka bir sekmede ya da uygulamadayken bir çalışan sana ihtiyaç duyarsa ya da işini bitirirse bildirim gelir. Tıklayınca doğrudan o çalışana gidersin: masasında, terminali açık olarak belirirsin. Sekme başlığı, birini bekleyen çalışanları her durumda sayar.';
  };
  paintNotify();

  // The office's Slack / Discord webhook, shared by everyone.
  const hookStatus = h('p.setting-note');
  const hookInput = h('input', { type: 'text', placeholder: 'https://hooks.slack.com/services/…', 'aria-label': 'Slack ya da Discord webhook URL’si', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  const hookSave = h('button.btn.primary', { type: 'button' }, 'Kaydet');
  const hookTest = h('button.btn', { type: 'button' }, 'Test gönder');
  const hookRemove = h('button.btn.danger', { type: 'button' }, 'Kaldır');
  const hookActions = h('div.seg', { style: 'margin-top:8px' }, hookTest, hookRemove);
  const paintHook = () => {
    const { webhook, error, lastSentAt } = store.notify;
    hookActions.classList.toggle('hidden', !webhook);
    hookSave.textContent = webhook ? 'Değiştir' : 'Kaydet';
    hookStatus.classList.toggle('bad', !!error);
    hookStatus.textContent = !webhook
      ? 'Slack ya da Discord’dan bir gelen webhook yapıştır; bir çalışan yanıt beklediğinde ya da işini bitirdiğinde ve kimsenin terminali açık olmadığında ofis o kanala mesaj atar. Ofisteki herkes için geçerli.'
      : error
        ? `⚠️ ${WEBHOOK_NAME[webhook.kind]} (${webhook.hint}) adresine gönderilemedi: ${error}`
        : `📣 ${WEBHOOK_NAME[webhook.kind]} (${webhook.hint}) adresine gönderiliyor, ayarlayan: ${webhook.by} ${timeAgo(webhook.at)}${lastSentAt ? ` · son mesaj ${timeAgo(lastSentAt)}` : ''}.`;
  };
  paintHook();
  const saveHook = () => {
    const url = hookInput.value.trim();
    if (!url) return hookInput.focus();
    net.send({ t: 'notify.webhook', url });
    hookInput.value = '';
  };
  hookSave.addEventListener('click', saveHook);
  hookInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveHook();
  });
  hookTest.addEventListener('click', () => net.send({ t: 'notify.test' }));
  hookRemove.addEventListener('click', () => net.send({ t: 'notify.webhook', url: '' }));

  // The worker everyone starts on, unless whoever starts one picks another. Admins pick it.
  const agent = agentFields(store.project, 'office-agent', officeChoice(store.project));
  let agentTouched = false;
  agent.element.addEventListener('change', () => (agentTouched = true));
  agent.element.addEventListener('input', () => (agentTouched = true));
  const agentSave = h('button.btn.primary', { type: 'button' }, 'Kaydet');
  const agentBack = h('button.btn', { type: 'button' });
  const agentActions = h('div.seg', { style: 'margin-top:8px' }, agentSave, agentBack);
  const agentNow = h('p.outside-now');
  const agentNote = h('p.setting-note');
  const paintAgent = () => {
    const admin = store.me.admin;
    const picked = store.prompts.agent;
    const now = officeChoice(store.project);
    agent.element.classList.toggle('hidden', !admin);
    agentActions.classList.toggle('hidden', !admin);
    agentNow.classList.toggle('hidden', admin);
    agentNow.textContent = choiceLabel(now);
    agentBack.classList.toggle('hidden', !picked);
    agentBack.textContent = `${store.project?.agentCmd.split(' ')[0].split(/[\\/]/).pop() ?? '--agent'} ayarına dön`;
    if (!agentTouched) agent.set(now);
    agentNote.textContent =
      'Her çalışan bununla başlar: masada işe alınanlar, panolardan issue ya da PR verilenler, kuyruktan alınanlar, pano ajanları ve toplantılar. Birini başlattığın yerde ✏️ Düzenle sadece onun için başka birini seçer.' +
      (picked ? ` Ayarlayan: ${picked.by} ${timeAgo(picked.at)}.` : ' Ofisin başlatıldığı ajan, kendi varsayılan modeliyle.') +
      (admin ? '' : ' Yöneticiler değiştirebilir.');
  };
  paintAgent();
  agentSave.addEventListener('click', () => {
    if (!agent.valid()) return;
    agentTouched = false;
    net.send({ t: 'prompts.agent', choice: agent.choice() });
  });
  agentBack.addEventListener('click', () => {
    agentTouched = false;
    net.send({ t: 'prompts.agent', choice: null });
  });

  // The prompts the office writes for workers by itself, for the whole office. Admins rewrite them.
  const promptsOpen = h('button.btn', { type: 'button', onclick: () => openPromptEditor(net) });
  const promptsNote = h('p.setting-note');
  const paintPrompts = () => {
    const n = rewrittenPrompts();
    promptsOpen.textContent = store.me.admin ? '📝 Prompt’ları düzenle…' : '📝 Prompt’lara bak…';
    promptsNote.textContent =
      '🤖 Çalışana ver, 🔍 İncele ve panoların diğer düğmelerinin çalışana söyledikleri, kuyruğun göreve eklediği not, pano ajanlarının brifingleri, toplantı odasının bölümleri ve tabela yazarının talimatları. ' +
      (n ? `${n} tanesi yeniden yazılmış.` : 'Hepsi ofisin yazdığı gibi.') +
      (store.me.admin ? '' : ' Yöneticiler yeniden yazabilir.');
  };
  paintPrompts();

  // The most workers the office runs at once, across every floor. Admins set it.
  const limitInput = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Aynı anda en fazla çalışan', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  const limitSave = h('button.btn.primary', { type: 'button' }, 'Sınırı ayarla');
  const limitClear = h('button.btn', { type: 'button' });
  const limitRow = h('div.webhook', {}, limitInput, limitSave, limitClear);
  const limitNote = h('p.setting-note');
  const paintLimit = () => {
    const m = store.machine;
    const admin = store.me.admin;
    limitRow.classList.toggle('hidden', !admin);
    limitInput.placeholder = m.ceiling ? `1 – ${m.ceiling}` : 'örn. 6';
    limitClear.textContent = m.ceiling ? `${m.ceiling} değerine dön` : 'Sınır yok';
    limitClear.classList.toggle('hidden', !m.set);
    const now =
      m.limit === undefined
        ? `Sınır yok: ofis her boş koltuk için bir çalışan işe alır. Şu an bütün katlarda ${m.workers} çalışan var.`
        : `Bütün katlarda aynı anda en fazla ${m.limit} çalışan (şu an ${m.workers}), shell’ler ve pano ajanları dahil. Bunun ötesinde işe alım reddedilir.`;
    const from = m.set ? ` Ayarlayan: ${m.set.by} ${timeAgo(m.set.at)}.` : '';
    const cap = m.ceiling ? ` Ofis --max-workers ${m.ceiling} ile başlatıldı, bu yüzden daha yükseğe çıkamaz.` : '';
    limitNote.textContent = now + from + cap + (admin ? '' : ' Yöneticiler değiştirebilir.');
  };
  paintLimit();
  const saveLimit = () => {
    const n = Number(limitInput.value.trim());
    if (!limitInput.value.trim() || !Number.isInteger(n) || n < 1) return limitInput.focus();
    net.send({ t: 'machine.limit', limit: n });
    limitInput.value = '';
  };
  limitSave.addEventListener('click', saveLimit);
  limitInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveLimit();
  });
  limitClear.addEventListener('click', () => net.send({ t: 'machine.limit', limit: null }));

  // Whether a worker whose pull request merged goes home by itself, for everyone.
  const leaveRow = h('div.seg', { role: 'radiogroup', 'aria-label': 'PR’ı birleşen çalışanlar' });
  const leaveNote = h('p.setting-note');
  const paintLeave = () => {
    const { on, by, at } = store.leaveOnMerge;
    leaveRow.replaceChildren(
      ...([
        [true, '🏠 Kendiliğinden eve gitsin'],
        [false, '🪑 Eve gönderilene kadar kalsın'],
      ] as const).map(([value, label]) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(on === value),
            class: on === value ? 'on' : '',
            onclick: () => {
              if (store.leaveOnMerge.on !== value) net.send({ t: 'leaveOnMerge.set', on: value });
            },
          },
          label,
        ),
      ),
    );
    const now = on
      ? 'Bir çalışanın PR’ı birleşince, çalışmayı ya da seni beklemeyi bırakır bırakmaz ve kimsenin terminali açık değilse eve gider; worktree’si ve dalı silinir. Commit edilmemiş değişiklikleri olan ya da GitHub’da olmayan commit’leri bulunan worktree korunur.'
      : 'PR’ı birleşen çalışan, biri onu eve gönderene kadar masasında mor çerçeveyle kalır. Açarsan zaten birleşmiş olanlar da gider.';
    leaveNote.textContent = `${now} Binadaki herkes için aynı${by ? `, ayarlayan: ${by}${at ? ` ${timeAgo(at)}` : ''}` : ''}.`;
  };
  paintLeave();

  // Where the elevator clones new projects on the office's machine. Admins move it.
  const dirInput = h('input', { type: 'text', placeholder: '~/Workspace', 'aria-label': 'Çalışma klasörü', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  const dirSave = h('button.btn.primary', { type: 'button' }, 'Kaydet');
  const dirDefault = h('button.btn', { type: 'button' }, 'Varsayılanı kullan');
  const dirRow = h('div.webhook', {}, dirInput, dirSave);
  const dirActions = h('div.seg', { style: 'margin-top:8px' }, dirDefault);
  const dirNote = h('p.setting-note');
  const paintDir = () => {
    const { dir, custom, by, at } = store.projectsDir;
    const admin = store.me.admin;
    dirInput.value = dir;
    dirRow.classList.toggle('hidden', !admin);
    dirActions.classList.toggle('hidden', !admin || !custom);
    dirNote.textContent =
      `Asansörden gelen yeni projeler ofisin makinesinde ${dir}/<owner>/<repo> içine klonlanır.` +
      (custom && by && at ? ` Ayarlayan: ${by} ${timeAgo(at)}.` : '') +
      (admin ? ' Orada zaten bulunan aynı deponun klasörü olduğu gibi kullanılır. Mevcut katlar olduğu yerde kalır.' : ' Bir yönetici taşıyabilir.');
  };
  paintDir();
  const saveDir = () => {
    const dir = dirInput.value.trim();
    if (!dir) return dirInput.focus();
    if (dir !== store.projectsDir.dir) net.send({ t: 'floor.projectsDir', dir });
  };
  dirSave.addEventListener('click', saveDir);
  dirInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveDir();
  });
  dirDefault.addEventListener('click', () => net.send({ t: 'floor.projectsDir', dir: '' }));

  // The dog on this floor: its name, breed and coat, for everyone here (see settings-dog.ts).
  const { section: dogSection, paint: paintDog } = dogSetting(net, (body) => setting('Ofis köpeği', 'floor', ...body));

  // What the sky's doing, and which clock it keeps (see settings-sky.ts).
  const sky = outside && outsideSetting(net, outside, (body) => setting('Dışarısı', 'office', ...body));
  const account = store.me.account;
  const signOut = h('button.btn', { type: 'button' }, '🚪 Çıkış yap');
  signOut.addEventListener('click', onSignOut);
  const character = h('button.btn', { type: 'button' }, account ? '🧍 Görünümünü değiştir' : '🧍 Görünümünü ve adını değiştir');
  const panes: Record<SettingsPane, Node[]> = {
    you: [
      setting('Karakterin', null, character),
      setting('Kamera görünümü', 'you', seg, note),
      setting('Giriş', null, h('div.volume', {}, signOut), h('p.setting-note', {}, account ? `${account.name} olarak, kendi hesabınla (${account.role}).` : 'Ortak ofis parolasıyla.')),
    ],
    sound: [
      setting('Ofis sesleri', 'you', soundRow, h('p.setting-note', {}, 'Yazan çalışanlar, ayak sesleri, kahve makinesi, dışarıdaki kuşlar ve yağmur, köpek, bir çalışan bitirince çalan zil ve birine ihtiyacı olunca çalan alarm. Sesli sohbet etkilenmez.')),
      setting('Bir çalışan sana ihtiyaç duyunca', 'you', alarmRow, h('p.setting-note', {}, 'Bir çalışan sana bir şey sormak için durduğu ya da izin istediği anda bir alarm çalar. Hatırlatıp dur, biri o çalışanın terminalini açana kadar her 30 saniyede bir alarmı yumuşakça tekrar çalar. Ofis sesleri kadar yüksektir.')),
      setting('Kitaplıkta sayfa çevirme sesi', 'you', pagesRow, h('p.setting-note', {}, 'Bir doküman açarken ya da içinde gezinirken, elindeki kitap her sayfa çevirdiğinde hafif bir hışırtı duyulur. Kitaplığın üstündeki 🔈 de bunu kapatır.')),
      setting('Müzik kutusu', 'you', musicRow, h('p.setting-note', {}, 'Salondaki müzik kutusu. Kattaki herkes aynı şarkıyı duyar, yaklaştıkça daha yüksek; bu, sadece senin için ne kadar yüksek olduğunu ayarlar.')),
      setting('Voice chat', 'you', talkRow, h('p.setting-note', {}, 'Hangisi olursa olsun, V sesli sohbete katılır, V’ye basılı tutunca konuşursun, bırakınca susarsın; M sesi kapatır ya da açar. Bas-konuşta sessiz katılırsın. Sesli sohbetten ☰ menüsünden çıkarsın.')),
    ],
    notify: [
      setting('Masaüstü bildirimleri', 'you', notifyRow, notifyNote),
      setting('Ekip bildirimleri (Slack / Discord)', 'office', h('div.webhook', {}, hookInput, hookSave), hookActions, hookStatus),
    ],
    building: [
      setting('Harita', 'office', mapRow, mapNote, mapBad),
      setting('Bayram teması', 'office', themeRow, themeNote),
      ...(sky ? [sky.section] : []),
      dogSection,
      setting('Çalışma klasörü', 'office', dirRow, dirActions, dirNote),
    ],
    workers: [
      setting('Varsayılan çalışan', 'office', agentNow, agent.element, agentActions, agentNote),
      setting('Çalışan sınırı', 'office', limitRow, limitNote),
      setting('PR’ı birleşen çalışanlar', 'office', leaveRow, leaveNote),
      setting('Prompt’lar', 'office', promptsOpen, promptsNote),
    ],
  };

  // The categories down the side, the one picked on the right.
  const nav = h('nav.settings-nav', { role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Ayarlar' });
  const tabs = new Map<SettingsPane, HTMLButtonElement>();
  const bodies = new Map<SettingsPane, HTMLElement>();
  for (const p of PANES) {
    const tab = h('button.settings-tab', { type: 'button', role: 'tab', onclick: () => show(p.id) }, h('span.icon', { 'aria-hidden': 'true' }, p.icon), h('span', {}, p.label)) as HTMLButtonElement;
    tabs.set(p.id, tab);
    nav.append(tab);
    bodies.set(p.id, h('section.settings-pane', { role: 'tabpanel', 'aria-label': p.label }, h('div.settings-head', {}, h('h3', {}, `${p.icon} ${p.label}`), h('p', {}, p.blurb)), ...panes[p.id]));
  }
  const show = (id: SettingsPane) => {
    lastPane = id;
    for (const [t, tab] of tabs) {
      tab.classList.toggle('on', t === id);
      tab.setAttribute('aria-selected', String(t === id));
      tab.tabIndex = t === id ? 0 : -1;
    }
    for (const [t, body] of bodies) body.classList.toggle('hidden', t !== id);
    bodies.get(id)!.scrollTop = 0;
    // On a phone the categories are a row across the top that scrolls sideways.
    tabs.get(id)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  nav.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = PANES.findIndex((p) => p.id === lastPane);
    const next = PANES[(i + step + PANES.length) % PANES.length].id;
    show(next);
    tabs.get(next)!.focus();
  });

  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const el = h('div.modal.settings', { role: 'dialog', 'aria-label': 'Ayarlar' }, h('header', {}, h('h2', {}, '⚙️ Ayarlar'), close), h('div.settings-body', {}, nav, ...bodies.values()));
  const offNotify = store.on('notify', paintHook);
  const offDog = store.on('dog', paintDog);
  const offTheme = store.on('theme', paintTheme);
  const offMap = store.on('map', paintMap);
  const offLeave = store.on('leaveOnMerge', paintLeave);
  const offLimit = [store.on('machine', paintLimit), store.on('me', paintLimit)];
  const offDir = [store.on('projectsDir', paintDir), store.on('me', paintDir)];
  const offPrompts = [store.on('prompts', paintAgent), store.on('prompts', paintPrompts), store.on('me', paintAgent), store.on('me', paintPrompts)];
  const modal = openModal(el, {
    doing: '⚙️ ayarlarda',
    onClose: () => {
      offNotify();
      offDog();
      offTheme();
      sky?.off();
      offMap();
      offLeave();
      offLimit.forEach((off) => off());
      offDir.forEach((off) => off());
      offPrompts.forEach((off) => off());
    },
  });
  show(first ?? lastPane);
  close.addEventListener('click', () => modal.close());
  character.addEventListener('click', () => {
    modal.close();
    onCharacter();
  });
}
