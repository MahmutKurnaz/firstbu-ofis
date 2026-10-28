import './queue.css';
import type { AgentProvider, QueueTask, Usage } from '../../shared/protocol';
import type { Net } from '../net';
import { store } from '../state';
import { h, openModal, timeAgo, STATUS_LABEL } from './dom';
import { confirmDialog } from './prompt';
import { providerPicker, providerLabel, providerUsageState, providerWaitingLabel, resolvedProvider, modelBadge } from './provider';
import { officeFull } from '../../shared/machine';
import { dictateField } from './dictate';

export interface QueueActions {
  openTerminal(workerId: string): void;
}

/** The queue task's name, linked to its GitHub issue when it has one. */
function taskTitle(t: QueueTask): HTMLElement {
  if (t.issue === undefined) return h('div.queue-title', { title: t.prompt }, t.title);
  const issue = store.issues.items.find((i) => i.number === t.issue);
  const text = t.title.startsWith(`#${t.issue}`) ? t.title : `#${t.issue} ${t.title}`;
  return h('div.queue-title', { title: t.prompt }, issue ? h('a', { href: issue.url, target: '_blank', rel: 'noopener' }, text) : text);
}

function outcome(t: QueueTask): string {
  switch (t.outcome) {
    case 'done':
      return t.pr ? 'bitti' : 'bitti, henüz PR bulunamadı';
    case 'exited':
      return t.error ? `durdu: ${t.error}` : 'bitmeden durdu';
    case 'killed':
      return 'eve gönderildi';
    case 'failed':
      return `başlatılamadı: ${t.error ?? 'bilinmeyen hata'}`;
    default:
      return '';
  }
}

export function openQueue(net: Net, actions: QueueActions) {
  const body = h('div.body.queue');
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const limitValue = h('b');
  const minus = h('button.btn', { type: 'button', title: 'Aynı anda daha az çalışan', 'aria-label': 'Aynı anda daha az çalışan' }, '−');
  const plus = h('button.btn', { type: 'button', title: 'Aynı anda daha çok çalışan', 'aria-label': 'Aynı anda daha çok çalışan' }, '+');
  const limit = h('div.queue-limit', { title: 'Kuyruğun aynı anda kaç çalışanı meşgul tuttuğu. 0 duraklatır.' }, 'Aynı anda çalışan', minus, limitValue, plus);
  minus.addEventListener('click', () => net.send({ t: 'queue.limit', maxWorkers: store.queue.maxWorkers - 1 }));
  plus.addEventListener('click', () => net.send({ t: 'queue.limit', maxWorkers: store.queue.maxWorkers + 1 }));
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Görev kuyruğu', style: 'width:min(800px,100%)' },
    h('header', {}, h('h2', {}, '📋 Görev kuyruğu'), limit, close),
    body,
    h('footer', {}, h('span.grow', {}, 'Sen yokken de kuyruk devam eder. Duraklatmak için “aynı anda çalışan” sayısını 0 yap.')),
  );

  const ta = h('textarea', { rows: 2, placeholder: 'Sıradaki boş çalışan için bir görev yaz…', 'aria-label': 'Yeni görev' }) as HTMLTextAreaElement;
  const provider = providerPicker(store.project, 'queue-provider');
  const addBtn = h('button.btn.primary', { type: 'submit' }, 'Kuyruğa ekle');
  const form = h('form.queue-add', {}, dictateField(ta), provider.element, addBtn) as HTMLFormElement;
  form.noValidate = true;
  const submit = () => {
    const text = ta.value.trim();
    if (!text) {
      ta.focus();
      return;
    }
    if (!provider.valid()) return;
    net.send({ t: 'queue.add', prompt: text, provider: provider.value(), model: provider.model(), effort: provider.effort() });
    ta.value = '';
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });

  const section = (title: string, tasks: QueueTask[], extra?: HTMLElement) => {
    if (!tasks.length) return null;
    return h('div', {}, h('h4', {}, title, h('span.count', {}, String(tasks.length)), extra ?? null), h('ul.queue-list', {}, ...tasks.map(row)));
  };

  const row = (t: QueueTask): HTMLElement => {
    const w = t.workerId ? store.workers.get(t.workerId) : undefined;
    const meta: string[] = [];
    const buttons: HTMLElement[] = [];
    const badge = modelBadge(t.provider, t.model, t.effort);
    const model = badge ? ` · başlangıç: ${badge}` : '';
    const usageSuffix = (provider: AgentProvider | undefined, usage?: Usage) => {
      const state = providerUsageState(provider, store.project, usage);
      if (state === 'untracked') return ' · kullanım izlenmiyor';
      if (state !== 'waiting') return '';
      const waiting = providerWaitingLabel(provider, store.project);
      return waiting ? ` · ${waiting}` : '';
    };
    let pos: string | null = null;
    if (t.status === 'running') {
      const selectedProvider = providerLabel(t.provider ?? w?.provider, store.project);
      meta.push(`⚙️ ${selectedProvider}${model}${usageSuffix(t.provider ?? w?.provider, w?.usage)}`);
      meta.push(`${t.workerName ?? 'bir çalışan'} · ${w ? STATUS_LABEL[w.status] ?? w.status : 'gitti'}`);
      if (t.branch) meta.push(`🌿 ${t.branch}`);
      if (t.startedAt) meta.push(`başladı ${timeAgo(t.startedAt)}`);
      meta.push(`ekleyen: ${t.addedBy}`);
      if (w) {
        buttons.push(h('button.btn', { type: 'button', onclick: () => actions.openTerminal(w.id) }, '🖥️ Terminal'));
        buttons.push(
          h('button.btn', {
            type: 'button',
            title: 'Çalışanı eve gönder; görev durdurulmuş sayılır',
            onclick: () => confirmDialog(`${w.name} durdurulsun mu?`, `Bu, ${w.name} çalışanını eve gönderir ve görevi durdurur. Sonra yeniden kuyruğa alabilirsin.`, 'Durdur', () => net.send({ t: 'worker.kill', workerId: w.id })),
          }, '⏹ Durdur'),
        );
      }
    } else if (t.status === 'queued') {
      const queued = store.queue.tasks.filter((x) => x.status === 'queued');
      const i = queued.indexOf(t);
      pos = String(i + 1);
      meta.push(`⚙️ ${providerLabel(t.provider, store.project)}${model}${usageSuffix(t.provider, w?.usage)}`);
      meta.push(`ekleyen: ${t.addedBy} ${timeAgo(t.addedAt)}`);
      buttons.push(h('button.btn', { type: 'button', title: 'Yukarı taşı', 'aria-label': 'Yukarı taşı', disabled: i === 0, onclick: () => net.send({ t: 'queue.move', taskId: t.id, delta: -1 }) }, '↑'));
      buttons.push(h('button.btn', { type: 'button', title: 'Aşağı taşı', 'aria-label': 'Aşağı taşı', disabled: i === queued.length - 1, onclick: () => net.send({ t: 'queue.move', taskId: t.id, delta: 1 }) }, '↓'));
      buttons.push(h('button.btn', { type: 'button', title: 'Kuyruktan çıkar', 'aria-label': 'Kaldır', onclick: () => net.send({ t: 'queue.remove', taskId: t.id }) }, '✕'));
    } else {
      meta.push(`⚙️ ${providerLabel(t.provider, store.project)}${model}${usageSuffix(t.provider, w?.usage)}`);
      meta.push(outcome(t));
      if (t.workerName) meta.push(t.workerName);
      if (t.branch) meta.push(`🌿 ${t.branch}`);
      if (t.finishedAt) meta.push(timeAgo(t.finishedAt));
      if (t.pr) buttons.push(h('a.btn', { href: t.pr.url, target: '_blank', rel: 'noopener', title: t.pr.title }, `🔀 PR #${t.pr.number}${t.pr.state === 'MERGED' ? ' ✓' : t.pr.state === 'DRAFT' ? ' (taslak)' : ''}`));
      if (w) buttons.push(h('button.btn', { type: 'button', onclick: () => actions.openTerminal(w.id) }, '🖥️ Terminal'));
      buttons.push(h('button.btn', { type: 'button', title: 'Kuyruğa geri koy', onclick: () => net.send({ t: 'queue.retry', taskId: t.id }) }, '↻ Yeniden kuyruğa al'));
      buttons.push(h('button.btn', { type: 'button', title: 'Unut gitsin', 'aria-label': 'Kaldır', onclick: () => net.send({ t: 'queue.remove', taskId: t.id }) }, '✕'));
    }
    return h(
      'li',
      { class: t.status },
      pos ? h('span.pos', {}, pos) : null,
      h('div.queue-main', {}, taskTitle(t), h('div.queue-meta', {}, meta.join(' · '))),
      h('div.queue-actions', {}, ...buttons),
    );
  };

  // The form stays put and only the list below it re-renders, so worker updates don't pull focus out of the textarea.
  const list = h('div');
  body.append(form, list);

  const render = () => {
    const q = store.queue;
    limitValue.textContent = q.maxWorkers === 0 ? 'Duraklatıldı' : String(q.maxWorkers);
    minus.toggleAttribute('disabled', q.maxWorkers <= 0);
    const running = q.tasks.filter((t) => t.status === 'running');
    const queued = q.tasks.filter((t) => t.status === 'queued');
    const done = q.tasks.filter((t) => t.status === 'done').slice().reverse();
    const m = store.machine;
    const parts: (HTMLElement | null)[] = [
      h(
        'p.note',
        {},
        'Ya da 📌 Issue panosunu aç ve bir issue’da ',
        h('b', {}, 'Kuyruğa ekle'),
        ' düğmesine tıkla. Bir masa boşsa ve kuyruğun çalışan görevi ',
        h('b', {}, q.maxWorkers === 0 ? '0' : String(q.maxWorkers)),
        " taneden azsa, sıradaki görev kendi git worktree’sinde yeni bir çalışan alır (kendi işe aldığın çalışanlar sayılmaz). Issue’lar başlarken GitHub’da atanır, PR çıkınca bağlanır.",
      ),
      queued.length && officeFull(m)
        ? h('p.note', {}, `⏸ Ofis ${m.limit} çalışan sınırında, bu yüzden sıradaki görev biri eve gidene kadar bekler. Görevi biten bir kuyruk çalışanı yer açmak için kendiliğinden eve gider.`)
        : null,
      section('🤖 Üstünde çalışılıyor', running),
      section('⏳ Sırada', queued),
      section('✅ Bitti', done, h('button.btn', { type: 'button', onclick: () => net.send({ t: 'queue.clear' }) }, 'Temizle')),
      running.length + queued.length + done.length ? null : h('div.queue-empty', {}, 'Kuyrukta henüz bir şey yok.'),
    ];
    list.replaceChildren(...parts.filter((n): n is HTMLElement => n !== null));
  };

  // The machine reports every few seconds; only a change to whether the office is full shows here.
  let full = '';
  const machineChanged = () => {
    const k = `${officeFull(store.machine)}|${store.machine.limit}`;
    if (k === full) return;
    full = k;
    render();
  };
  const unsubs = [store.on('queue', render), store.on('workers', render), store.on('issues', render), store.on('machine', machineChanged)];
  const tick = setInterval(render, 30_000);
  const modal = openModal(el, {
    doing: '📥 kuyrukta',
    onClose: () => {
      unsubs.forEach((u) => u());
      clearInterval(tick);
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
  setTimeout(() => ta.focus(), 30);
}
