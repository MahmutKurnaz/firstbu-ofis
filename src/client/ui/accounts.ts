import './accounts.css';
import type { AccountInvite, AccountRole, ServerMsg } from '../../shared/protocol';
import type { Net } from '../net';
import { store } from '../state';
import { h, openModal, timeAgo } from './dom';
import { confirmDialog } from './prompt';
import { copyButton } from './team';

export const inviteLink = (v: AccountInvite) => `${location.origin}/join#${v.token}`;

function expiresIn(t: number): string {
  const d = Math.round((t - Date.now()) / 86_400_000);
  return d >= 1 ? `${d} gün sonra bitiyor` : 'bugün bitiyor';
}

let onInvited: ((msg: Extract<ServerMsg, { t: 'accounts.invited' }>) => void) | null = null;

export function routeAccountsMessage(msg: ServerMsg) {
  if (msg.t === 'accounts.invited') onInvited?.(msg);
}

/** 🔑 Hesaplar, for admins: invite people by link, list them, change their role or revoke them. */
export function openAccounts(net: Net) {
  let status: HTMLElement | null = null;
  /** The invite just made, shown big until the next one. */
  let fresh: AccountInvite | null = null;
  const body = h('div.body.team.accounts');
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const signedInAs = h('span.grow');
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Hesaplar', style: 'width:min(680px,100%)' },
    h('header', {}, h('h2', {}, '🔑 Hesaplar'), close),
    body,
    h('footer', {}, signedInAs),
  );

  const nameInput = h('input', { type: 'text', maxlength: 24, placeholder: 'Adı (isteğe bağlı)', 'aria-label': 'Adı', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const roleSelect = h('select', { 'aria-label': 'Rol' }, h('option', { value: 'member' }, 'Üye'), h('option', { value: 'admin' }, 'Yönetici')) as HTMLSelectElement;
  const inviteBtn = h('button.btn.primary', { type: 'submit' }, 'Davet linki oluştur');
  const form = h('form.invite-row', {}, nameInput, roleSelect, inviteBtn) as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    inviteBtn.disabled = true;
    net.send({ t: 'accounts.invite', name: nameInput.value.trim() || undefined, role: roleSelect.value as AccountRole });
  });

  const render = () => {
    const s = store.accounts;
    const me = store.me;
    signedInAs.textContent = me.account ? `${me.account.name} olarak giriş yaptın (${me.account.role === 'admin' ? 'yönetici' : 'üye'}).` : "Ortak ofis parolasıyla giriş yaptın.";
    const typing = document.activeElement === nameInput;
    body.replaceChildren();
    if (!s) return body.append(h('p.empty', {}, 'Yükleniyor…'));

    body.append(
      h('label', {}, 'Birini davet et'),
      form,
      h('p.note', {}, 'Kendi adı ve parolasıyla tek bir hesap açan bir link alırsın. Bir kez çalışır, 7 gün sonra geçersiz olur. Adı boş bırakırsan kişi kendi adını seçer.'),
    );
    if (status) body.append(status);
    if (fresh) {
      const v = fresh;
      body.append(h('div.cmd', {}, h('pre', {}, inviteLink(v)), copyButton('Kopyala', () => inviteLink(v))));
    }
    if (store.invites) body.append(h('p.note', {}, 'Bu ofiste önce içeri girmenin bir yoluna da ihtiyaçları var: 👥 Takım arkadaşlarını davet et\'e bak.'));

    const list = h('ul.team-list');
    for (const a of s.accounts) {
      const you = me.account?.name === a.name;
      const seen = a.online ? 'in the office' : a.lastSeenAt ? `son görülme: ${timeAgo(a.lastSeenAt)}` : 'never came in';
      const role = h('button.btn', { type: 'button', title: a.role === 'admin' ? 'Yöneticiliği al' : 'Hesapları yönetmesine de izin ver' }, a.role === 'admin' ? 'Üye yap' : 'Yönetici yap');
      role.addEventListener('click', () => net.send({ t: 'accounts.role', accountId: a.id, role: a.role === 'admin' ? 'member' : 'admin' }));
      const revoke = h('button.btn.danger', { type: 'button', title: `${a.name} hesabını sil` }, 'Geri al');
      revoke.addEventListener('click', () =>
        confirmDialog(
          `${a.name} hesabı geri alınsın mı?`,
          `Hesabı silinir ve her yerde hemen oturumu kapanır. Yazdığı terminaller çalışmaya devam eder. ${s.sharedPassword ? `${a.name} ortak ofis parolasını da biliyorsa onunla girmeye devam edebilir: aşağıdan kapat.` : ''}`,
          'Geri al',
          () => net.send({ t: 'accounts.revoke', accountId: a.id }),
        ),
      );
      list.append(
        h(
          'li',
          {},
          h('span.dot', { class: a.online ? 'on' : '', title: seen }),
          h('span.name', {}, a.name, you ? h('span.you', {}, ' (you)') : null),
          h('span.role', { class: a.role }, a.role),
          h('span.keys', { title: `Davet eden: ${a.createdBy}` }, seen),
          you ? null : role,
          you ? null : revoke,
        ),
      );
    }
    if (!s.accounts.length) list.append(h('li.empty', {}, 'Henüz kimsenin hesabı yok'));
    body.append(h('h4', {}, 'Kişiler ', h('span.count', {}, String(s.accounts.length))), list);

    if (s.invites.length) {
      const invites = h('ul.team-list');
      for (const v of s.invites) {
        const cancel = h('button.btn', { type: 'button', title: 'Link çalışmaz olur' }, 'Vazgeç');
        cancel.addEventListener('click', () => {
          if (fresh?.id === v.id) fresh = null;
          net.send({ t: 'accounts.cancel', inviteId: v.id });
        });
        invites.append(
          h(
            'li',
            {},
            h('span.name', {}, v.name ?? h('i', {}, 'they pick a name')),
            h('span.role', { class: v.role }, v.role),
            h('span.keys', { title: `Oluşturan: ${v.createdBy}, ${timeAgo(v.createdAt)}` }, expiresIn(v.expiresAt)),
            copyButton('Linki kopyala', () => inviteLink(v)),
            cancel,
          ),
        );
      }
      body.append(h('h4', {}, 'Açık davetler ', h('span.count', {}, String(s.invites.length))), invites);
    }

    // The shared password: the old way in, kept as a fallback until everyone has an account.
    const toggle = h('button.btn', { type: 'button', class: s.sharedPassword ? 'danger' : '' }, s.sharedPassword ? 'Kapat' : 'Tekrar aç');
    const canSwitchOff = me.account?.role === 'admin';
    if (s.sharedPassword && !canSwitchOff) toggle.setAttribute('disabled', '');
    toggle.addEventListener('click', () => {
      if (!s.sharedPassword) return net.send({ t: 'accounts.shared', on: true });
      confirmDialog(
        'Ortak parola kapatılsın mı?',
        'Bundan sonra yalnızca kendi hesabı olanlar giriş yapabilir. Ortak parolayla girenlerin oturumu hemen kapanır.',
        'Kapat',
        () => net.send({ t: 'accounts.shared', on: false }),
      );
    });
    body.append(
      h('div.team-head', {}, h('h4', {}, 'Ortak ofis parolası'), toggle),
      h(
        'p.note',
        {},
        s.sharedPassword
          ? 'Açık. Bilen herkes yönetici olarak girer ve istediği adı seçer. Herkesin hesabı olunca kapat; böylece birinin hesabını geri almak onu gerçekten dışarıda bırakır.'
          : 'Kapalı: yalnızca hesaplar giriş yapabilir. Tüm yöneticiler dışarıda kalırsa ofisin makinesinde agent-office accounts password on çalıştır.',
        s.sharedPassword && !canSwitchOff ? h('b', {}, ' Kapatmadan önce kendine yönetici hesabı aç ve onunla giriş yap.') : null,
      ),
    );
    if (typing) nameInput.focus();
  };

  onInvited = (msg) => {
    inviteBtn.disabled = false;
    if (msg.error || !msg.invite) {
      status = h('p.team-status.error', {}, msg.error ?? 'Davet oluşturulamadı');
      return render();
    }
    fresh = msg.invite;
    nameInput.value = '';
    status = h('p.team-status.ok', {}, `✅ Bu linki ${msg.invite.name ?? 'kişiye'} gönder. Bir kez çalışır, 7 gün sonra geçersiz olur.`);
    render();
  };
  // No longer an admin (someone changed your role): the list isn't yours to see any more.
  const unsubs = [store.on('accounts', render), store.on('me', () => (store.me.admin ? render() : modal.close()))];
  const modal = openModal(el, {
    onClose: () => {
      unsubs.forEach((u) => u());
      onInvited = null;
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
  setTimeout(() => nameInput.focus(), 30);
  net.send({ t: 'accounts.get' });
}
