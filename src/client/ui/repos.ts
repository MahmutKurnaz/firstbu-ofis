import './repos.css';
import type { WorkerInfo } from '../../shared/protocol';
import { isBusy } from '../../shared/status';
import { store } from '../state';
import { h, openModal } from './dom';

// A worker across repositories (see WorkerInfo.repos): one task in worktrees of several floors'
// projects, all on the same branch, with a pull request in each repository it commits to.

/** Each of a worker's repositories, its own floor's first (no `floor`): the folder in its workspace, and its pull request. */
export function workerRepos(w: WorkerInfo): { floor?: string; name: string; pr?: { number: number; url: string } }[] {
  if (!w.worktree) return [];
  return [{ name: w.worktree.path.split(/[\\/]/).pop() || 'project', pr: w.pr }, ...(w.repos ?? []).map((r) => ({ floor: r.floor, name: r.name, pr: r.pr }))];
}

export interface RepoPullsActions {
  /** Its own floor's pull request, in the PR window. */
  openPull(number: number, url: string): void;
  /** Push and open the ones still missing ('worker.pr'). */
  openMissing(): void;
  /** The Changes window, on that repository's tab. */
  changes(repo?: string): void;
}

/**
 * O at the desk of a worker across repositories, once it has a pull request: each repository with
 * its pull request (or none yet) and its changes, and a button that opens the missing ones.
 */
export function openRepoPulls(workerId: string, actions: RepoPullsActions) {
  const title = h('h2');
  const note = h('p', { style: 'margin:0 0 12px;font-weight:700' });
  const list = h('ul.repo-pulls');
  const close = h('button.btn', { type: 'button' }, 'Kapat');
  const missing = h('button.btn.primary', { type: 'button' }, '🔀 Eksik PR\'ları aç');
  const el = h('div.modal', { role: 'dialog', 'aria-label': 'Pull request\'ler' }, h('header', {}, title), h('div.body', {}, note, list), h('footer', {}, h('span.grow'), close, missing));

  const render = () => {
    const w = store.workers.get(workerId);
    if (!w?.worktree) return modal.close();
    const repos = workerRepos(w);
    title.textContent = `🔀 ${w.name} çalışanının pull request'leri`;
    note.textContent = `${repos.length} depoya yayılan tek bir değişiklik, hepsi 🌿 ${w.worktree.branch} üzerinde. Commit attığı her depo kendi pull request'ini alır ve her biri diğerlerini listeler.`;
    list.replaceChildren(
      ...repos.map((r) => {
        const floor = r.floor ? store.floors.find((f) => f.id === r.floor)?.name : store.currentFloor()?.name;
        const pr = r.pr;
        return h(
          'li',
          {},
          h('span.name', {}, `📁 ${r.name}`, h('small', {}, floor ? `${floor} katı${r.floor ? '' : ' · bu kat'}` : 'artık binada değil')),
          pr
            ? h('button.btn', { type: 'button', title: r.floor ? 'GitHub\'da aç' : 'Aç', onclick: () => (r.floor ? window.open(pr.url, '_blank', 'noopener') : (modal.close(), actions.openPull(pr.number, pr.url))) }, `🔀 #${pr.number}${r.floor ? ' ↗' : ''}`)
            : h('span.none', {}, 'Henüz PR yok'),
          h('button.btn', { type: 'button', title: `${w.name} çalışanının ${r.name} içinde değiştirdikleri`, onclick: () => (modal.close(), actions.changes(r.floor)) }, '🌿 Değişiklikler'),
        );
      }),
    );
    const busy = isBusy(w.status);
    missing.classList.toggle('hidden', repos.every((r) => r.pr));
    missing.disabled = !!w.prOpening || busy;
    missing.textContent = w.prOpening ? '⏳ Açılıyor…' : '🔀 Eksik PR\'ları aç';
    missing.title = busy ? `${w.name} hâlâ çalışıyor — bitmesini bekle` : 'Commit\'i olup henüz pull request\'i olmayan her depoda dalı gönderir ve orada bir PR açar';
  };

  const unsub = store.on('workers', () => render());
  const modal = openModal(el, { doing: '🔀 pull request\'lere bakıyor', onClose: () => unsub() });
  close.addEventListener('click', () => modal.close());
  missing.addEventListener('click', () => actions.openMissing());
  render();
  setTimeout(() => close.focus(), 30);
}
