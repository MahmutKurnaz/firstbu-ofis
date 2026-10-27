// The Ekipler panel's rows: every role of the floor's ordu.json, in its order, with the worker hired
// for it and its latest report. Pure, so it's tested without a page.
import type { OrduRole, OrduView, RoleReport, WorkerInfo } from '../../../shared/protocol';

export interface RoleRow {
  /** The office's and the team's names. */
  office: string;
  team: string;
  /** The team's color. */
  color: string;
  role: OrduRole;
  worker?: WorkerInfo;
  report?: RoleReport;
}

export function roleRows(view: OrduView, workers: Iterable<WorkerInfo>): RoleRow[] {
  const byRole = new Map<string, WorkerInfo>();
  for (const w of workers) if (w.role && !byRole.has(w.role)) byRole.set(w.role, w);
  const reports = new Map(view.reports.map((r) => [r.role, r]));
  return view.config.offices.flatMap((o) =>
    o.teams.flatMap((t) =>
      t.roles.map((role): RoleRow => ({
        office: o.name,
        team: t.name,
        color: t.color,
        role,
        ...(byRole.has(role.name) ? { worker: byRole.get(role.name) } : {}),
        ...(reports.has(role.name) ? { report: reports.get(role.name) } : {}),
      })),
    ),
  );
}

/** A worker's status, in Turkish, for the panel. */
export const DURUM: Record<string, string> = {
  starting: 'başlıyor',
  idle: 'hazır',
  working: 'çalışıyor',
  needs_input: 'seni bekliyor',
  done: 'bitti',
  exited: 'kapandı',
  offline: 'uykuda',
};
