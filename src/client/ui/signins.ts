import './signins.css';
import type { SignInKind, SignInState } from '../../shared/protocol';
import type { Net } from '../net';
import { store } from '../state';
import { h, openModal, type Modal } from './dom';
import { confirmDialog } from './prompt';
import { copyButton } from './team';

const NAMES: Record<SignInKind, string> = { claude: 'Claude', github: 'GitHub' };

let open: { modal: Modal; say(why?: string): void } | null = null;

/**
 * 🔐 Girişlerin: the Claude plan your workers run on and the GitHub account the office acts as
 * for you, both your own (see server/signins.ts). The office runs the sign-in itself and hands you
 * the page to open; or paste a token; admins may use the office machine's own instead.
 * `why` says what sent you here (hiring a worker before signing in, say).
 */
export function openSignIns(net: Net, why?: string) {
  if (open) return open.say(why);
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const banner = h('p.team-status', { hidden: true });
  const cards = h('div.signins');
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Girişlerin', style: 'width:min(640px,100%)' },
    h('header', {}, h('h2', {}, '🔐 Girişlerin'), close),
    h(
      'div.body.team',
      {},
      h('p.note.lead', {}, 'Çalışanların kendi Claude planında çalışır, ofis de GitHub\'da senin adına hareket eder: yorumlar, birleştirmeler ve pull request\'ler senin adınla görünür. Bunları yalnızca senin çalışanların kullanır.'),
      banner,
      cards,
      h('p.note', {}, 'Ya da herhangi bir masada 🐚 shell aç: sen olarak çalışır, orada ', h('code', {}, 'claude auth login'), ' and ', h('code', {}, 'gh auth login'), ' yazmak da seni giriş yaptırır.'),
    ),
  );

  // Kept across renders, so a half-typed code or token survives the next update.
  const inputs = {
    code: h('input', { type: 'text', placeholder: 'Kodu buraya yapıştır', 'aria-label': 'Giriş sayfasındaki kod', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement,
    claude: h('input', { type: 'password', placeholder: 'sk-ant-oat01-…', 'aria-label': 'Claude token', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement,
    github: h('input', { type: 'password', placeholder: 'ghp_… ya da github_pat_…', 'aria-label': 'GitHub token', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement,
  };

  const say = (text?: string) => {
    banner.hidden = !text;
    banner.textContent = text ?? '';
  };

  const button = (label: string, onClick: () => void, cls = '') => {
    const b = h('button.btn', { type: 'button', class: cls }, label);
    b.addEventListener('click', onClick);
    return b;
  };

  const tokenRow = (which: SignInKind) => {
    const input = inputs[which];
    const save = h('button.btn', { type: 'submit' }, 'Kaydet');
    const form = h('form.invite-row', {}, input, save) as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const token = input.value.trim();
      if (!token) return input.focus();
      net.send({ t: 'signins.token', which, token });
      input.value = '';
    });
    return form;
  };

  const card = (which: SignInKind, s: SignInState, office: boolean) => {
    const status =
      s.status === 'ok'
        ? h('span.signin-who.ok', {}, '✅ ', s.how === 'office' ? `Ofisin kendisi${s.who ? ` (${s.who})` : ''}` : (s.who ?? 'Giriş yapıldı'))
        : s.status === 'busy'
          ? h('span.signin-who', {}, '⏳ Giriş yapılıyor…')
          : h('span.signin-who.none', {}, 'Giriş yapılmadı');
    const head = h('div.team-head', {}, h('h4', {}, which === 'claude' ? '✳️ Claude' : '🐙 GitHub'), status);
    const body = h('div.signin-body');
    const box = h('section.signin', { class: s.status }, head, body);
    if (s.error) body.append(h('p.team-status.error', {}, s.error));

    if (s.pending) {
      const url = s.pending.url && /^https:\/\//.test(s.pending.url) ? s.pending.url : undefined;
      if (!url) {
        body.append(h('p.note', {}, `${NAMES[which]} girişi başlatılıyor…`));
      } else if (which === 'claude') {
        const send = h('button.btn.primary', { type: 'submit' }, s.pending.sent ? 'Kontrol ediliyor…' : 'Gönder');
        if (s.pending.sent) send.setAttribute('disabled', '');
        const form = h('form.invite-row', {}, inputs.code, send) as HTMLFormElement;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const code = inputs.code.value.trim();
          if (!code) return inputs.code.focus();
          net.send({ t: 'signins.code', code });
          inputs.code.value = '';
        });
        body.append(
          h('ol.signin-steps', {}, h('li', {}, h('a.btn.primary', { href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Claude giriş sayfasını aç ↗'), ' ve kendi hesabınla giriş yap.'), h('li', {}, 'Sana bir kod gösterir. Buraya yapıştır:', form)),
        );
      } else {
        const code = s.pending.code ?? '';
        body.append(
          h(
            'ol.signin-steps',
            {},
            h('li', {}, 'Tek kullanımlık kodunu kopyala:', h('div.cmd', {}, h('pre.signin-code', {}, code), copyButton('Kopyala', () => code))),
            h('li', {}, h('a.btn.primary', { href: url, target: '_blank', rel: 'noopener noreferrer' }, 'github.com/login/device adresini aç ↗'), ' ve kodu orada gir.'),
            h('li', {}, 'GitHub onaylayınca burası kendiliğinden güncellenir.'),
          ),
        );
      }
      body.append(h('div.signin-actions', {}, button('Vazgeç', () => net.send({ t: 'signins.cancel', which }))));
      return box;
    }

    if (s.status === 'ok') {
      const change = button(s.how === 'office' ? 'Bunun yerine kendiminkini kullan' : 'Çıkış yap', () => {
        if (s.how === 'office') return net.send({ t: 'signins.signout', which });
        confirmDialog(`${NAMES[which]} oturumu kapatılsın mı?`, which === 'claude' ? 'Bundan sonra işe aldığın çalışanlar yeni bir giriş ister. Çalışmakta olanlar devam eder.' : 'Tekrar giriş yapana kadar ofis GitHub\'da senin adına hareket etmez.', 'Çıkış yap', () => net.send({ t: 'signins.signout', which }));
      });
      body.append(h('div.signin-actions', {}, change));
      return box;
    }

    // Not signed in (or busy looking): the ways in.
    const start = button(`${NAMES[which]} ile giriş yap`, () => net.send({ t: 'signins.start', which }), 'primary');
    const actions = h('div.signin-actions', {}, start);
    if (office) actions.append(button('Ofisinkini kullan', () => net.send({ t: 'signins.office', which })));
    body.append(
      actions,
      which === 'claude'
        ? h('p.note', {}, 'Ya da bir token yapıştır: kendi bilgisayarında şunu çalıştır: ', h('code', {}, 'claude setup-token'), ' (ya da bir Anthropic API anahtarı kullan).')
        : h('p.note', {}, 'Ya da bir GitHub token yapıştır (', h('a', { href: 'https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=Agent%20Office', target: '_blank', rel: 'noopener noreferrer' }, 'birini oluştur'), ' repo, read:org ve workflow izinleriyle).'),
      tokenRow(which),
    );
    return box;
  };

  const render = () => {
    const s = store.signins;
    const typing = document.activeElement;
    cards.replaceChildren();
    if (!s) {
      cards.append(h('p.empty', {}, store.me.account ? 'Yükleniyor…' : 'Ortak ofis parolasıyla çalışanlar ofisin kendi girişleriyle çalışır.'));
      return;
    }
    cards.append(card('claude', s.claude, s.office), card('github', s.github, s.office));
    if (typing instanceof HTMLInputElement && Object.values(inputs).includes(typing) && typing.isConnected) typing.focus();
    // Once both are sorted, whatever sent you here is too.
    if (s.claude.status === 'ok' && s.github.status === 'ok') say();
  };

  const unsub = store.on('signins', render);
  const modal = openModal(el, {
    onClose: () => {
      unsub();
      open = null;
    },
  });
  close.addEventListener('click', () => modal.close());
  open = { modal, say };
  say(why);
  render();
  net.send({ t: 'signins.get' });
}

/** Whether the panel should greet someone who just came in: their Claude sign-in still to do. */
export function needsSigningIn(): boolean {
  const s = store.signins;
  return !!store.me.account && !!s && s.claude.status === 'none' && s.claude.how === 'login';
}
