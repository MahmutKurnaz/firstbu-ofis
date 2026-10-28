import './services.css';
import type { ServiceInfo, ServicesState } from '../../shared/protocol';
import { store } from '../state';
import { h, openModal, timeAgo } from './dom';
import { copy, copyButton, guessOs, openCommand, OS_LABEL, type Os } from './team';

/** Whether this page came over the office's Tailscale network, where every server has its own link. */
function onTailnet(s: ServicesState): boolean {
  return !!s.tailnet && location.hostname === s.tailnet;
}

export function serviceUrl(port: number, s = store.services): string {
  // Tailscale Serve points <office>.ts.net:<port> at the office, which relays it by the port.
  if (onTailnet(s)) return `https://${s.tailnet}:${port}`;
  // The tunnel lands on the office's own port, so it speaks whatever the office speaks.
  return `${location.protocol}//localhost:${port}`;
}

/**
 * One command that tunnels localhost:<port> to the office, which relays it to the worker's
 * server, and opens it once the tunnel is up. It uses the same SSH access as the office itself.
 */
export function serviceTunnel(s: ServicesState, port: number, os: Os): string {
  const open = openCommand(serviceUrl(port), os);
  return `ssh -N -o ExitOnForwardFailure=yes -o PermitLocalCommand=yes -o LocalCommand="${open}" -L ${port}:localhost:${s.port} ${s.ssh ?? 'you@your-server'}`;
}

/**
 * The command that opens every worker's server on someone's own computer by itself, as each one
 * starts (`agent-office tunnel`, src/server/tunnel/). It reaches the office the way this page did.
 */
export function autoTunnel(origin = location.origin): string {
  return origin === 'http://localhost:4600' ? 'agent-office tunnel' : `agent-office tunnel ${origin}`;
}

/** Whether the office is likely on another machine than this browser, so its workers' ports aren't already here. */
function elsewhere(s: ServicesState): boolean {
  return !!s.ssh || !/^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

function describe(svc: ServiceInfo): { who: string; color: string; branch?: string } {
  const w = store.workers.get(svc.workerId);
  return { who: w?.name ?? 'Bir çalışan', color: w?.color ?? '#8d99ae', branch: w?.worktree?.branch };
}

export function openServices() {
  let os = guessOs();
  let picked: number | null = null;
  let copied: number | null = null;
  const body = h('div.body.team.services');
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const tabs = h('div.os-tabs');
  const footer = h('footer', {}, h('span.grow', {}, 'Tüneller ofisten geçer, yani ofis parolası her sayfayı hâlâ korur. Bakarken terminali açık tut.'));
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Servisler', style: 'width:min(760px,100%)' },
    h('header', {}, h('h2', {}, '🌐 Servisler'), tabs, close),
    body,
    footer,
  );

  const pick = async (svc: ServiceInfo) => {
    const s = store.services;
    picked = svc.port;
    copied = (await copy(onTailnet(s) ? serviceUrl(svc.port) : serviceTunnel(s, svc.port, os))) ? svc.port : null;
    render();
  };

  const render = () => {
    const s = store.services;
    const direct = onTailnet(s);
    tabs.replaceChildren(
      ...(direct ? [] : (Object.keys(OS_LABEL) as Os[])).map((o) =>
        h('button.btn', { type: 'button', class: o === os ? 'on' : '', onclick: () => ((os = o), (copied = null), render()) }, OS_LABEL[o]),
      ),
    );
    footer.firstElementChild!.textContent = direct
      ? 'Her link ofisten geçer, yani ofis girişi her sayfayı hâlâ korur.'
      : 'Tüneller ofisten geçer, yani ofis parolası her sayfayı hâlâ korur. Bakarken terminali açık tut.';
    body.replaceChildren(
      h(
        'p.note',
        { style: 'margin:0 0 12px' },
        direct
          ? 'Çalışanların çalıştırdığı web sunucuları. Her birinin Tailscale ağında kendi linki var: aç ya da satıra tıklayıp ağdaki başka biri için kopyala.'
          : 'Çalışanların çalıştırdığı web sunucuları. Birine tıkla, onu kendi bilgisayarında açan bir komut kopyalansın — terminalde çalıştır, sayfa kendiliğinden açılır.',
      ),
    );
    if (!direct && elsewhere(s)) {
      body.append(
        h(
          'div.svc-auto',
          {},
          h('p', {}, '⚡ Hepsini kendiliğinden aç'),
          h(
            'p.note',
            {},
            'Bunu bilgisayarında çalıştır ve açık bırak. Bir çalışanın başlattığı her sunucu orada aynı portta açılır (',
            h('code', {}, 'localhost:5173'),
            ' çalışanınki), çalışan durdurunca da kapanır. Bilgisayarında ',
            h('code', {}, 'agent-office'),
            ' komutu olmalı: README\'deki kurulum satırı.',
          ),
          h('div.cmd', {}, h('pre', {}, autoTunnel()), copyButton('Kopyala', () => autoTunnel())),
        ),
      );
    }
    if (!s.items.length) {
      body.append(
        h(
          'div.svc-empty',
          {},
          h('p', {}, 'Henüz çalışan bir şey yok.'),
          h('p.note', {}, 'Bir çalışan web sunucusu başlattığında — ', h('code', {}, 'npm run dev'), ', a preview build, ', h('code', {}, 'python -m http.server'), ' — birkaç saniye içinde burada görünür. Şunu dene: “dev sunucusunu arka planda başlat, inceleyelim”.'),
        ),
      );
      return;
    }
    const list = h('ul.svc-list');
    for (const svc of s.items) {
      const { who, color, branch } = describe(svc);
      const on = picked === svc.port;
      const title = direct ? `${serviceUrl(svc.port)} adresini aç` : `${serviceUrl(svc.port)} adresini aç (ofis bu bilgisayarda çalışmıyorsa tünel gerekir)`;
      const open = h('a.btn', { href: serviceUrl(svc.port), target: '_blank', rel: 'noopener', title }, 'Aç ↗');
      open.addEventListener('click', (e) => e.stopPropagation());
      const li = h(
        'li',
        { class: on ? 'on' : '', tabindex: 0, role: 'button', title: direct ? 'Linki kopyala' : 'Tünel komutunu kopyala' },
        h('span.dot', { style: `background:${color}` }),
        h(
          'div.svc-main',
          {},
          h('div.svc-title', {}, svc.title || svc.command),
          h('div.svc-meta', {}, [who, branch ? `🌿 ${branch}` : '', svc.title ? svc.command : '', `başladı: ${timeAgo(svc.since)}`].filter(Boolean).join(' · ')),
        ),
        h('span.svc-port', {}, `:${svc.port}`),
        open,
      );
      li.addEventListener('click', () => void pick(svc));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void pick(svc);
        }
      });
      list.append(li);
    }
    body.append(list);

    const svc = s.items.find((i) => i.port === picked);
    if (svc && direct) {
      body.append(
        copied === svc.port
          ? h('p.team-status.ok', {}, `✅ ${serviceUrl(svc.port)} kopyalandı. Ağda ofise giriş yapmış herkes açabilir.`)
          : h('p.team-status', {}, `:${svc.port} için link: ${serviceUrl(svc.port)}`),
      );
    } else if (svc) {
      const cmd = serviceTunnel(s, svc.port, os);
      body.append(
        copied === svc.port
          ? h('p.team-status.ok', {}, `✅ Kopyalandı. Terminale yapıştır: tünel açılınca ${serviceUrl(svc.port)} adresini açar.`)
          : h('p.team-status', {}, `:${svc.port} için komut — terminalde çalıştır, ${serviceUrl(svc.port)} adresini açar.`),
        h('div.cmd', {}, h('pre', {}, cmd), copyButton('Kopyala', () => cmd)),
      );
    } else if (picked !== null) {
      body.append(h('p.team-status.error', {}, `:${picked} üzerindeki sunucu durdu.`));
    }
    if (direct) return;
    body.append(
      s.ssh
        ? h('p.note', {}, 'Ofisle aynı SSH erişimini kullanır. Kendin davetli değil misin (ofisi sen kurdun)? Şunu çalıştır: ', h('code', {}, `${s.deploy ?? 'deploy/aws.sh'} service <port>`), '.')
        : h('p.note', {}, 'Şunu değiştir: ', h('code', {}, 'you@your-server'), ' — ofisin makinesine nasıl SSH yaptığınla. Ofis bu bilgisayarda çalışıyorsa Aç\'a tıklaman yeter.'),
    );
  };

  const unsubs = [store.on('services', render), store.on('workers', render)];
  // Keeps "up 5m" fresh.
  const tick = setInterval(render, 30_000);
  const modal = openModal(el, {
    doing: '🌐 servis panosunda',
    onClose: () => {
      unsubs.forEach((u) => u());
      clearInterval(tick);
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
}
