// The Ekipler panel's page side: offices → teams → roles, each with its worker's status, what it's
// doing and its latest report, and the buttons to open its terminal, give it work or hire it.
import type { OrduView } from '../../../shared/protocol';
import { h } from '../../ui/dom';
import { DURUM, roleRows, type RoleRow } from './ui';
import './ui.css';

export interface PanelDeps {
  openTerminal(workerId: string): void;
  /** Give a working role a task: its next prompt. */
  tell(workerId: string, prompt: string): void;
  /** Hire a worker for a role, with a task or none. */
  hire(role: string, prompt?: string): void;
}

/** Which role's prompt box is open, and for what: kept across re-renders so typing isn't lost. */
interface Asking { role: string; kind: 'tell' | 'hire'; text: string }

export class OrduPanel {
  private asking: Asking | null = null;

  constructor(private readonly body: HTMLElement, private readonly deps: PanelDeps) {}

  render(view: OrduView | null, workers: Iterable<import('../../../shared/protocol').WorkerInfo>) {
    // Mid-typing in its prompt box: leave the panel alone so the box keeps its focus and caret. (Only
    // the box: the button that just opened it has the focus too, and the box still has to be drawn.)
    const typing = document.activeElement instanceof HTMLElement && document.activeElement.classList.contains('ordu-input') && this.body.contains(document.activeElement);
    if (this.asking && typing) return;
    this.body.replaceChildren(...this.content(view, workers));
  }

  private content(view: OrduView | null, workers: Iterable<import('../../../shared/protocol').WorkerInfo>): Node[] {
    if (!view) return [h('p.ordu-note', {}, 'Ekipler yükleniyor…')];
    const out: Node[] = [];
    if (view.error) out.push(h('p.ordu-note.bad', {}, `⚠️ ${view.error}. Rolleri .claude/agents dosyalarından gösteriyorum.`));
    else if (view.source === 'derived') out.push(h('p.ordu-note', {}, 'ordu.json yok: roller .claude/agents dosyalarından. Ofis ve ekipleri kendin düzenlemek için ordu/sablonlar/ içinden bir şablonu .agent-office/ordu.json olarak kopyala.'));
    if (view.source === 'none') {
      out.push(h('p.ordu-note', {}, 'Bu projede rol yok. ordu/sablonlar/ içinden bir şablonu projenin .agent-office/ordu.json dosyası olarak kopyala.'));
      return out;
    }
    let office = '';
    let team = '';
    let teamEl: HTMLElement | null = null;
    for (const row of roleRows(view, workers)) {
      if (row.office !== office) {
        office = row.office;
        team = '';
        out.push(h('h4.ordu-office', {}, `🏢 ${office}`));
      }
      if (row.team !== team) {
        team = row.team;
        teamEl = h('ul.ordu-team', { style: `--team:${row.color}` });
        out.push(h('div.ordu-team-name', { style: `--team:${row.color}` }, team), teamEl);
      }
      teamEl?.append(this.roleEl(row));
    }
    return out;
  }

  private roleEl(row: RoleRow): HTMLElement {
    const { role, worker: w, report } = row;
    const status = w?.status ?? 'none';
    const asking = this.asking?.role === role.name ? this.asking : null;
    const what = w ? (w.status === 'needs_input' ? `🙋 ${w.activity ?? 'Cevabını bekliyor'}` : w.activity || w.title) : role.resident ? 'Lider: işe al, hep masasında kalır' : undefined;
    const verdict = report?.verdict ? h('span.ordu-verdict', { class: report.verdict === 'GEÇTİ' ? 'pass' : 'fail', title: report.file }, report.verdict) : null;
    const reportText = report?.status ? h('span.ordu-report', { title: report.file }, `📄 ${report.status}`) : null;
    const buttons = w
      ? [
          h('button.ordu-btn', { type: 'button', onclick: () => this.deps.openTerminal(w.id), title: `${w.name} terminalini aç` }, '💻 Terminal'),
          h('button.ordu-btn', { type: 'button', onclick: () => this.open(role.name, 'tell'), title: 'Bu role yeni bir iş ver' }, '📝 İş ver'),
        ]
      : [h('button.ordu-btn.hire', { type: 'button', onclick: () => this.open(role.name, 'hire'), title: `${role.name} rolüne bir ajan işe al` }, '➕ İşe al')];
    return h(
      'li.ordu-role',
      { class: status },
      h('span.ordu-dot', { class: status, title: w ? (DURUM[w.status] ?? w.status) : 'boş masa' }),
      h('span.ordu-name', {}, h('b', {}, w?.name ?? role.title ?? role.name), h('span.ordu-sub', {}, role.name), what ? h('span.ordu-what', {}, what) : null, reportText, verdict),
      h('span.ordu-actions', {}, ...buttons),
      asking ? this.promptEl(asking, w?.id) : null,
    );
  }

  private open(role: string, kind: Asking['kind']) {
    this.asking = this.asking?.role === role && this.asking.kind === kind ? null : { role, kind, text: '' };
    this.redraw?.();
  }

  /** The panel asks whoever owns it to draw it again (set by installOrdu). */
  redraw?: () => void;

  private promptEl(asking: Asking, workerId: string | undefined): HTMLElement {
    const close = () => {
      this.asking = null;
      (document.activeElement as HTMLElement | null)?.blur();
      this.redraw?.();
    };
    const send = () => {
      const text = input.value.trim();
      if (asking.kind === 'tell') {
        if (!text || !workerId) return;
        this.deps.tell(workerId, text);
      } else this.deps.hire(asking.role, text || undefined);
      close();
    };
    const input = h('input.ordu-input', {
      type: 'text',
      value: asking.text,
      placeholder: asking.kind === 'tell' ? 'Ne yapsın?' : 'İlk işi (boş bırakabilirsin)',
      'aria-label': asking.kind === 'tell' ? 'Verilecek iş' : 'İşe alırken ilk iş',
      oninput: () => void (asking.text = input.value),
      onkeydown: (e: Event) => {
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter') send();
        else if (k === 'Escape') close();
        e.stopPropagation();
      },
    }) as HTMLInputElement;
    queueMicrotask(() => input.focus());
    return h(
      'div.ordu-ask',
      {},
      input,
      h('button.ordu-btn.go', { type: 'button', onclick: send }, asking.kind === 'tell' ? 'Gönder' : 'İşe al'),
      h('button.ordu-btn', { type: 'button', onclick: close, 'aria-label': 'Vazgeç' }, '✕'),
    );
  }
}
