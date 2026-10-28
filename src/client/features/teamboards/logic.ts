import type { OrduConfig, OrduRole } from '../../../shared/ordu';
import type { WorkerInfo, WorkerStatus } from '../../../shared/protocol';

// What the suite's boards say (see world/cadde/teamboard.ts): the rows each one draws, worked out from the
// army (ordu.json) and the workers. Pure, so it can be tested.

export interface Row {
  /** Who it is (the role's title, else its name). */
  who: string;
  /** What it's on, and what it's doing at this moment. */
  task: string;
  doing: string;
  status: WorkerStatus | 'absent';
  /** "Çalışıyor", "Seni bekliyor"… */
  label: string;
  /** How long it has been in this state (ms), or null when it has none (not hired). */
  since: number | null;
  /** Who it reports to. */
  reportsTo: string;
  /** Its subagents running now. */
  helpers: number;
  /** Its pull request, if it has one. */
  pr?: number;
}

export const STATUS_LABEL: Record<WorkerStatus | 'absent', string> = {
  starting: 'Başlıyor',
  idle: 'Görev bekliyor',
  working: 'Çalışıyor',
  needs_input: 'Sana soruyor',
  done: 'Bitirdi, seni bekliyor',
  exited: 'Çıktı',
  offline: 'Çevrimdışı',
  absent: 'Henüz işe alınmadı',
};

/** "şimdi", "12 dk", "3 sa 5 dk", "2 gün". */
export function ago(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa ${m % 60} dk`;
  return `${Math.floor(h / 24)} gün`;
}

/** How long a worker has been as it is: working since it started that stretch, waiting since it finished, else since it was hired. */
export function sinceOf(w: WorkerInfo, now: number): number {
  const at = w.status === 'working' ? (w.workingSince ?? w.createdAt) : w.status === 'done' || w.status === 'needs_input' ? (w.waitingSince ?? w.createdAt) : w.createdAt;
  return Math.max(0, now - at);
}

/** Who a role reports to: Mahmut for the lead, the lead for a team's first role, a team's first role for the rest. */
export function reportsTo(config: OrduConfig, role: OrduRole): string {
  const title = (r: OrduRole) => r.title ?? r.name;
  if (role.name === 'lead') return 'Mahmut';
  const team = config.offices.flatMap((o) => o.teams).find((t) => t.roles.some((r) => r.name === role.name));
  const first = team?.roles[0];
  const lead = config.offices.flatMap((o) => o.teams.flatMap((t) => t.roles)).find((r) => r.name === 'lead');
  if (first && first.name !== role.name && first.name !== 'lead') return title(first);
  return lead ? title(lead) : 'Mahmut';
}

/** The worker holding a role now: one still running or waiting, rather than one whose terminal ended. */
export function workerOf(workers: Iterable<WorkerInfo>, role: string): WorkerInfo | undefined {
  let found: WorkerInfo | undefined;
  for (const w of workers) if (w.role === role && (!found || (found.status === 'exited' && w.status !== 'exited'))) found = w;
  return found;
}

export function rowOf(config: OrduConfig, role: OrduRole, w: WorkerInfo | undefined, now: number): Row {
  const base = { who: role.title ?? role.name, reportsTo: reportsTo(config, role) };
  if (!w || w.status === 'exited') return { ...base, task: '—', doing: STATUS_LABEL.absent, status: 'absent', label: STATUS_LABEL.absent, since: null, helpers: 0 };
  return {
    ...base,
    task: w.task?.name ?? (w.prompt ? w.prompt.slice(0, 60) : 'Görev verilmedi'),
    doing: w.task?.summary ?? w.activity ?? '',
    status: w.status,
    label: STATUS_LABEL[w.status],
    since: sinceOf(w, now),
    helpers: w.subagents?.length ?? 0,
    pr: w.pr?.number,
  };
}

/** A team board's rows: the team of the `office`th office of the army, a row for each of its roles. */
export function teamRows(config: OrduConfig, office: number, workers: Iterable<WorkerInfo>, now: number): { name: string; color: string; rows: Row[] } | null {
  const o = config.offices[office];
  if (!o) return null;
  const list = [...workers];
  const roles = o.teams.flatMap((t) => t.roles);
  return { name: o.teams[0]?.name ?? o.name, color: o.teams[0]?.color ?? '#8a94a6', rows: roles.map((r) => rowOf(config, r, workerOf(list, r.name), now)) };
}

/** One line a team on the lead's board: how many of its roles are hired, working, and waiting on you, and the longest wait. */
export interface TeamLine {
  name: string;
  color: string;
  roles: number;
  hired: number;
  working: number;
  waiting: number;
  longestWait: number | null;
}

export function teamLines(config: OrduConfig, workers: Iterable<WorkerInfo>, now: number): TeamLine[] {
  const list = [...workers];
  return config.offices.map((o) => {
    const roles = o.teams.flatMap((t) => t.roles);
    const mine = roles.map((r) => workerOf(list, r.name)).filter((w): w is WorkerInfo => !!w && w.status !== 'exited');
    const waits = mine.filter((w) => w.status === 'done' || w.status === 'needs_input').map((w) => sinceOf(w, now));
    return {
      name: o.teams[0]?.name ?? o.name,
      color: o.teams[0]?.color ?? '#8a94a6',
      roles: roles.length,
      hired: mine.length,
      working: mine.filter((w) => w.status === 'working').length,
      waiting: waits.length,
      longestWait: waits.length ? Math.max(...waits) : null,
    };
  });
}

/** Who's waiting on you (done with a turn, or asking), the longest first. */
export function waiting(workers: Iterable<WorkerInfo>, now: number): { who: string; status: WorkerStatus; since: number; task: string }[] {
  return [...workers]
    .filter((w) => w.status === 'done' || w.status === 'needs_input')
    .map((w) => ({ who: w.name, status: w.status, since: sinceOf(w, now), task: w.task?.name ?? w.activity ?? '' }))
    .sort((a, b) => b.since - a.since);
}

const ORDER: Record<string, number> = { needs_input: 0, working: 1, done: 2, starting: 3, idle: 4, offline: 5, exited: 6 };

/** Everyone, those asking first, then those working, then those who've finished. */
export function everyone(config: OrduConfig | undefined, workers: Iterable<WorkerInfo>, now: number): Row[] {
  return [...workers]
    .filter((w) => w.status !== 'exited')
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || sinceOf(b, now) - sinceOf(a, now))
    .map((w) => {
      const role = config?.offices.flatMap((o) => o.teams.flatMap((t) => t.roles)).find((r) => r.name === w.role);
      return config && role ? rowOf(config, role, w, now) : { who: w.name, task: w.task?.name ?? '—', doing: w.task?.summary ?? w.activity ?? '', status: w.status, label: STATUS_LABEL[w.status], since: sinceOf(w, now), reportsTo: '', helpers: w.subagents?.length ?? 0 };
    });
}
