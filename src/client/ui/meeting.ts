import './meeting.css';
import { MEETING_PATTERNS, MEETING_PATTERN_IDS, fixedRounds, meetingSpend, meetingStage, outputProblem, slugify } from '../../shared/meetings';
import { fmtTokens, type Meeting, type MeetingPattern, type MeetingTurn } from '../../shared/protocol';
import type { Net } from '../net';
import { store } from '../state';
import { h, openModal, timeAgo, toast, STATUS_LABEL, type Modal } from './dom';
import { confirmDialog } from './prompt';
import { providerPicker } from './provider';
import { officePrompt } from './prompts';
import { issueVars } from './github/prompts';
import { dictateField } from './dictate';

/** What a meeting called from an issue, a PR or a task starts out with. */
export interface MeetingPreset {
  pattern?: MeetingPattern;
  prompt?: string;
  title?: string;
  pr?: number;
  issue?: number;
}

export interface MeetingActions {
  openTerminal(workerId: string): void;
  /** Push the meeting's branch and open a pull request for it, through the head of the table's worker. */
  openPr(workerId: string): void;
}

/** A meeting about a GitHub issue: the form filled in with it. */
export function issueMeeting(n: number, title: string): MeetingPreset {
  return { issue: n, title: `#${n} ${title}`, prompt: officePrompt('issue.meeting', issueVars({ number: n, title })) };
}

const PART_LABEL: Record<MeetingTurn['state'], string> = { waiting: '⏳ sırada', sent: '📨 devredildi', working: '💬 üstünde', done: '✅ yazıldı' };

/**
 * The meeting room's window. With a meeting at the table it shows how it's going (and stops it, or
 * clears the table once it's over); otherwise, or with a preset from an issue or a PR, it's the form
 * that calls one.
 */
export function openMeeting(net: Net, actions: MeetingActions, preset?: MeetingPreset) {
  const close = h('button.btn.close', { 'aria-label': 'Kapat' }, '✕');
  const title = h('h2', {}, '🤝 Toplantı odası');
  const body = h('div.body.meeting');
  const foot = h('footer');
  const el = h('div.modal.meeting-window', { role: 'dialog', 'aria-label': 'Toplantı odası' }, h('header', {}, title, close), body, foot);
  let view: 'status' | 'form' = preset || !store.meeting.current ? 'form' : 'status';
  let form: ReturnType<typeof meetingForm> | null = null;
  const render = () => {
    if (view === 'status' && store.meeting.current) {
      form = null;
      title.textContent = '🤝 Toplantı odası';
      renderStatus(store.meeting.current, body, foot, net, actions, () => {
        view = 'form';
        render();
      });
      return;
    }
    if (!form) {
      form = meetingForm(net, preset, () => modal.close(), () => {
        view = 'status';
        render();
      });
      title.textContent = '🤝 Toplantı çağır';
      body.replaceChildren(form.body);
      foot.replaceChildren(...form.foot);
    }
    form.refresh();
  };
  const offs = [store.on('meeting', render), store.on('workers', () => view === 'status' && render()), store.on('pulls', () => form?.refresh())];
  const modal: Modal = openModal(el, { doing: '🤝 toplantı odasında', onClose: () => offs.forEach((off) => off()) });
  close.addEventListener('click', () => modal.close());
  render();
}

function renderStatus(m: Meeting, body: HTMLElement, foot: HTMLElement, net: Net, actions: MeetingActions, callAnother: () => void) {
  const p = MEETING_PATTERNS[m.pattern];
  const running = m.status === 'running';
  const pill = h('span.pill', { class: running ? 'working' : m.status === 'done' ? 'done' : 'needs_input' }, running ? 'toplantıda' : ({ done: 'bitti', stopped: 'durduruldu' } as Record<string, string>)[m.status] ?? m.status);
  const seats = h(
    'ul.meeting-seats',
    {},
    ...m.seats.map((s, i) => {
      const w = s.workerId ? store.workers.get(s.workerId) : undefined;
      const t = m.turns.find((x) => x.seat === i);
      const part = running ? (t ? `${PART_LABEL[t.state]}: ${t.doing}` : '👂 dinliyor') : '';
      return h(
        'li',
        {},
        h('span.dot', { style: `background:${w?.color ?? '#adb5bd'}` }),
        h('b', {}, s.role),
        h('span.muted', {}, `${i === 0 ? 'masanın başı · ' : ''}${s.workerName ?? '…'}`),
        w ? h('span.pill', { class: w.status }, STATUS_LABEL[w.status]) : h('span.pill.exited', {}, 'eve gitti'),
        part ? h('span.meeting-part', { title: t?.file ?? '' }, part) : null,
        s.tokens ? h('span.muted', {}, `${fmtTokens(s.tokens)} token`) : null,
        w ? h('button.btn.small', { type: 'button', onclick: () => actions.openTerminal(w.id) }, '🖥️ Terminal') : null,
      );
    }),
  );
  const where = m.worktree ? h('span', {}, '🌿 ', h('code', {}, m.worktree.branch), m.commit ? ` · commit edildi ${m.commit}` : '') : null;
  const review = m.review?.url ? h('a', { href: m.review.url, target: '_blank', rel: 'noopener noreferrer' }, `🔍 PR #${m.pr} üzerindeki inceleme ↗`) : m.review?.error ? h('span.bad', {}, `İnceleme gönderilemedi: ${m.review.error}`) : null;
  body.replaceChildren(
    ...present(
    h('div.meeting-head', {}, pill, h('b', {}, `${p.icon} ${p.label}`), h('span.meeting-title', { title: m.prompt }, m.title)),
    h('p.meeting-line', {}, running ? `${meetingStage(m)} · çağıran: ${m.calledBy} ${timeAgo(new Date(m.startedAt).toISOString())}` : m.status === 'done' ? `✅ ${m.output} ${m.round} turda yazıldı` : `⛔ ${m.round}. turda durdu: ${m.reason ?? 'durduruldu'}`),
    m.tokens ? h('p.meeting-spend', { title: `${m.tokens.toLocaleString()} token, önbellek okumaları dahil` }, `💸 ${meetingSpend(m)}${running ? ' şimdiye kadar' : ''}`) : null,
    seats,
    h('div.meeting-out', {}, h('div.meeting-out-head', {}, h('b', {}, '📄 '), h('code', {}, m.output), where, review), h('pre.meeting-preview', {}, m.preview?.trim() ? m.preview : running ? 'Henüz bir şey yazılmadı.' : 'Hiçbir şey yazılmadı.')),
    store.meeting.past.length
      ? h('details.meeting-past', {}, h('summary', {}, `Önceki toplantılar (${store.meeting.past.length})`), h('ul', {}, ...store.meeting.past.map((r) => h('li', { title: `Çağıran: ${r.calledBy}` }, h('b', {}, r.title), h('div.muted', {}, r.summary)))))
      : null,
    ),
  );
  const head = m.seats[0]?.workerId ? store.workers.get(m.seats[0].workerId) : undefined;
  foot.replaceChildren(
    ...present(
    h('span.grow', {}, running ? 'Toplantı bittikten sonra çalışanlar masada kalır, böylece terminallerini okuyabilirsin.' : 'Odayı boşaltmak çalışanları eve gönderir. Commit edilmiş çıktı dalında kalır.'),
    running ? h('button.btn', { type: 'button', onclick: () => confirmDialog('Toplantı durdurulsun mu?', `Çalışanlar bulundukları yerde durur ve masada kalır. ${m.output} ancak yazılmışsa vardır.`, 'Durdur', () => net.send({ t: 'meeting.stop' })) }, '⛔ Toplantıyı durdur') : null,
    !running && m.commit && head?.worktree ? h('button.btn', { type: 'button', title: `${m.worktree?.branch} dalını gönder ve PR aç`, onclick: () => actions.openPr(head.id) }, head.pr ? `🔀 PR #${head.pr.number}` : '🔀 PR aç') : null,
    !running ? h('button.btn', { type: 'button', onclick: () => net.send({ t: 'meeting.clear' }) }, '🧹 Odayı boşalt') : null,
    !running ? h('button.btn.primary', { type: 'button', onclick: callAnother }, '🤝 Toplantı çağır…') : null,
    ),
  );
}

const present = (...xs: (Node | null)[]): Node[] => xs.filter((x): x is Node => x !== null);

/** The form that calls a meeting: the pattern, what it's about, who sits down, the output, the round limit. */
function meetingForm(net: Net, preset: MeetingPreset | undefined, done: () => void, back: () => void) {
  let pattern: MeetingPattern = preset?.pattern ?? 'debate';
  let roles: string[] = [];
  let outputTouched = false;
  const patterns = h('div.meeting-patterns', { role: 'radiogroup', 'aria-label': 'Düzen' });
  const about = h('textarea', { rows: 4, placeholder: 'Çözülecek soru ya da yapılacak görev: örn. “Köpek A* mı yoksa navmesh mi kullanmalı?”', 'aria-label': 'Toplantının konusu' }) as HTMLTextAreaElement;
  about.value = preset?.prompt ?? '';
  const titleIn = h('input', { type: 'text', placeholder: 'Başlık (isteğe bağlı): yoksa ilk satır', maxlength: 100, 'aria-label': 'Başlık' }) as HTMLInputElement;
  titleIn.value = preset?.title ?? '';
  const outputIn = h('input', { type: 'text', 'aria-label': 'Çıktı dosyası', spellcheck: 'false' }) as HTMLInputElement;
  const outputNote = h('small.muted');
  const prSel = h('select.provider-select', { 'aria-label': 'Pull request' }) as HTMLSelectElement;
  const prRow = h('div.meeting-field', {}, h('label', {}, 'Pull request'), prSel);
  const partsIn = h('textarea', { rows: 3, placeholder: 'src/server/\nsrc/client/\nsrc/shared/', 'aria-label': 'Parçalar', spellcheck: 'false' }) as HTMLTextAreaElement;
  const partsRow = h('div.meeting-field', {}, h('label', {}, 'Parçalar, her satıra bir tane'), partsIn, h('small.muted', {}, 'Haritacılara sırayla dağıtılır: dosyalar, klasörler, modüller ya da issue’lar.'));
  const count = h('b');
  const minus = h('button.btn.small', { type: 'button', 'aria-label': 'Daha az çalışan' }, '−');
  const plus = h('button.btn.small', { type: 'button', 'aria-label': 'Daha çok çalışan' }, '+');
  const roleList = h('div.meeting-roles');
  const roundsSel = h('select.provider-select.meeting-rounds', { 'aria-label': 'Tur sınırı' }) as HTMLSelectElement;
  // A pattern that always runs the same rounds says so, where a locked control would look broken.
  const roundsFixed = h('span.meeting-fixed');
  const roundsNote = h('small.muted');
  const provider = providerPicker(store.project, 'meeting-provider', 'Çalışanlar');
  const busy = h('p.meeting-busy');
  const submit = h('button.btn.primary', { type: 'submit' }, '🤝 Toplantıyı başlat');
  const cancel = h('button.btn', { type: 'button', onclick: store.meeting.current ? back : done }, store.meeting.current ? '← Geri' : 'Vazgeç');

  const def = () => MEETING_PATTERNS[pattern];
  const slug = () => slugify(titleIn.value.trim() || about.value.trim().split('\n')[0] || 'meeting', 32);
  const pr = () => Number(prSel.value) || undefined;
  const syncOutput = () => {
    if (!outputTouched) outputIn.value = def().output(slug(), pr());
    const problem = outputProblem(outputIn.value.trim());
    outputNote.textContent = problem ? `⚠️ ${problem}` : pattern === 'review' ? 'Bu dosya yazılınca biter; ofis onu PR’a tek bir inceleme olarak gönderir.' : store.project?.branch ? 'Bu dosya yazılınca biter; ofis onu toplantının kendi dalına commit eder.' : 'Bu dosya yazılınca biter.';
    outputNote.classList.toggle('bad', !!problem);
  };
  const renderRoles = () => {
    const d = def();
    count.textContent = String(roles.length);
    minus.toggleAttribute('disabled', roles.length <= d.seats.min);
    plus.toggleAttribute('disabled', roles.length >= d.seats.max);
    roleList.replaceChildren(
      ...roles.map((r, i) => {
        const input = h('input', { type: 'text', value: r, maxlength: 40, 'aria-label': `Rol ${i + 1}` }) as HTMLInputElement;
        input.addEventListener('input', () => (roles[i] = input.value));
        return h('div.meeting-role', {}, h('span.muted', {}, i === 0 ? '👑' : `${i + 1}`), input);
      }),
    );
  };
  const pickPattern = (p: MeetingPattern) => {
    pattern = p;
    const d = def();
    roles = d.roles.slice(0, d.seats.default);
    for (const b of patterns.children) b.classList.toggle('on', (b as HTMLElement).dataset.pattern === p);
    for (const b of patterns.children) b.setAttribute('aria-checked', String((b as HTMLElement).dataset.pattern === p));
    const fixed = fixedRounds(d);
    const limits = Array.from({ length: d.rounds.max - d.rounds.min + 1 }, (_, i) => d.rounds.min + i);
    roundsSel.replaceChildren(...limits.map((n) => h('option', { value: String(n) }, `${n} tur`)));
    roundsSel.value = String(d.rounds.default);
    roundsSel.classList.toggle('hidden', !!fixed);
    roundsFixed.classList.toggle('hidden', !fixed);
    roundsFixed.textContent = fixed ? `🔒 ${fixed.line}` : '';
    roundsFixed.title = fixed?.why ?? '';
    roundsNote.textContent = fixed ? fixed.stages : `${d.rounds.min} – ${d.rounds.max}.${d.roundsNote ?? ''}`.trim();
    prRow.classList.toggle('hidden', d.needs !== 'pr');
    partsRow.classList.toggle('hidden', d.needs !== 'parts');
    renderRoles();
    syncOutput();
  };
  for (const id of MEETING_PATTERN_IDS) {
    const d = MEETING_PATTERNS[id];
    patterns.append(h('button.meeting-pattern', { type: 'button', role: 'radio', 'data-pattern': id, onclick: () => pickPattern(id) }, h('b', {}, `${d.icon} ${d.label}`), h('small', {}, d.blurb)));
  }
  minus.addEventListener('click', () => {
    if (roles.length > def().seats.min) roles.pop();
    renderRoles();
  });
  plus.addEventListener('click', () => {
    if (roles.length < def().seats.max) roles.push(def().roles[roles.length] ?? `Worker ${roles.length + 1}`);
    renderRoles();
  });
  outputIn.addEventListener('input', () => {
    outputTouched = true;
    syncOutput();
  });
  titleIn.addEventListener('input', syncOutput);
  about.addEventListener('input', syncOutput);
  prSel.addEventListener('change', syncOutput);

  const bodyEl = h(
    'form.meeting-form',
    {},
    patterns,
    h('div.meeting-field', {}, h('label', {}, 'Ne hakkında?'), dictateField(about)),
    h('div.meeting-field', {}, titleIn),
    prRow,
    partsRow,
    h('div.meeting-field', {}, h('label', {}, 'Çıktı dosyası'), outputIn, outputNote),
    h('div.meeting-field', {}, h('label.meeting-count', {}, 'Masadaki çalışanlar', minus, count, plus), roleList),
    h('div.meeting-field', {}, h('label', {}, 'Tur sınırı'), roundsSel, roundsFixed, roundsNote),
    provider.element,
    busy,
  ) as HTMLFormElement;
  bodyEl.noValidate = true;

  const send = () => {
    if (store.meeting.current?.status === 'running') return;
    const prompt = about.value.trim();
    if (!prompt) return about.focus();
    if (def().needs === 'pr' && !pr()) return prSel.focus();
    const parts = partsIn.value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (def().needs === 'parts' && parts.length < roles.length - 1) {
      toast(`En az ${roles.length - 1} parça yaz, her satıra bir tane, ya da daha az çalışan oturt`, 'warn');
      return partsIn.focus();
    }
    const output = outputIn.value.trim();
    if (outputProblem(output)) return outputIn.focus();
    if (!provider.valid()) return;
    net.send({
      t: 'meeting.start',
      pattern,
      prompt,
      title: titleIn.value.trim() || undefined,
      output,
      roles: roles.map((r) => r.trim()),
      parts: def().needs === 'parts' ? parts : undefined,
      pr: def().needs === 'pr' ? pr() : undefined,
      issue: preset?.issue,
      rounds: Number(roundsSel.value) || undefined,
      provider: provider.value(),
      model: provider.model(),
      effort: provider.effort(),
    });
    toast(`🤝 ${def().label} toplantısı çağrılıyor: çalışanlar toplantı odasına gidiyor`);
    done();
  };
  bodyEl.addEventListener('submit', (e) => {
    e.preventDefault();
    send();
  });
  submit.addEventListener('click', (e) => {
    e.preventDefault();
    send();
  });

  /** Keeps what depends on the board and the room up to date: the open PRs, and whether the room is free. */
  const refresh = () => {
    const open = store.pulls.items.filter((p) => p.state === 'OPEN');
    const want = prSel.value || (preset?.pr ? String(preset.pr) : '');
    const opts: (readonly [string, string])[] = open.map((p) => [String(p.number), `#${p.number} ${p.title}`] as const);
    if (preset?.pr && !open.some((p) => p.number === preset.pr)) opts.unshift([String(preset.pr), `#${preset.pr}`]);
    const key = JSON.stringify(opts);
    if (prSel.dataset.key !== key) {
      prSel.dataset.key = key;
      prSel.replaceChildren(h('option', { value: '' }, open.length || preset?.pr ? 'Bir pull request seç…' : 'Açık pull request yok'), ...opts.map(([v, label]) => h('option', { value: v }, label.length > 70 ? `${label.slice(0, 69)}…` : label)));
      prSel.value = want;
      syncOutput();
    }
    const m = store.meeting.current;
    const taken = m?.status === 'running';
    busy.textContent = taken ? `Oda, bitene ya da biri durdurana kadar “${m.title}” toplantısıyla meşgul.` : m ? `Bunu başlatmak son toplantının çalışanlarını eve gönderir.` : '';
    submit.toggleAttribute('disabled', taken);
  };
  pickPattern(pattern);
  if (preset?.pr) prSel.value = String(preset.pr);
  refresh();
  setTimeout(() => (preset?.prompt ? titleIn : about).focus(), 0);
  return { body: bodyEl, foot: [h('span.grow', {}, 'Az tur ve sonda bir dosya: toplantıları ucuz tutan bu.'), cancel, submit], refresh };
}
