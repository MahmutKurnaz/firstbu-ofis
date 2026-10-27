// The latest report each role wrote, from the folders under ordu.json's reportDir (one per task).
import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkerInfo } from '../../shared/protocol.js';
import { allRoles, reportLine, type OrduConfig, type RoleReport } from '../../shared/ordu.js';

const HEAD = 4096;
const MAX_TASKS = 200;

function head(file: string): string | undefined {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const buf = Buffer.alloc(HEAD);
    const n = readSync(fd, buf, 0, HEAD, 0);
    return buf.subarray(0, n).toString('utf8');
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

interface Found { task: string; kind: 'report' | 'verify'; file: string; at: number }

/** report.md and verify.md in the newest task folders (and always in `own`, the hired roles' tasks), newest first. */
function scan(root: string, own: Iterable<string>): Found[] {
  let tasks: string[];
  try {
    const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
      let at = 0;
      try {
        at = statSync(join(root, d.name)).mtimeMs;
      } catch {
        // gone since the listing
      }
      return { name: d.name, at };
    });
    const names = new Set(dirs.map((d) => d.name));
    const newest = dirs.sort((a, b) => b.at - a.at).slice(0, MAX_TASKS).map((d) => d.name);
    tasks = [...new Set([...newest, ...[...own].filter((t) => names.has(t))])];
  } catch {
    return [];
  }
  const found: Found[] = [];
  for (const task of tasks) {
    for (const kind of ['report', 'verify'] as const) {
      const file = join(root, task, `${kind}.md`);
      try {
        found.push({ task, kind, file, at: statSync(file).mtimeMs });
      } catch {
        // no such report in this task
      }
    }
  }
  return found.sort((a, b) => b.at - a.at);
}

/**
 * One report per role that has one. A role whose worker carries its task (`roleTask`) gets that task's
 * file: verify.md for a verify-… role, report.md for the rest. A verify role with no task of its own
 * shows the newest verify.md (the last verdict is the team's); other roles without one show nothing,
 * rather than all of them showing the same report.
 */
export function readReports(projectDir: string, config: OrduConfig, workers: Pick<WorkerInfo, 'role' | 'roleTask'>[]): RoleReport[] {
  if (!config.reportDir) return [];
  const rel = config.reportDir.replace(/\/+$/, '');
  const taskOf = new Map(workers.filter((w) => w.role && w.roleTask).map((w) => [w.role as string, w.roleTask as string]));
  const found = scan(join(projectDir, rel), taskOf.values());
  if (!found.length) return [];
  const out: RoleReport[] = [];
  for (const role of allRoles(config)) {
    const kind = role.name.startsWith('verify') ? 'verify' : 'report';
    const task = taskOf.get(role.name);
    const pick = task ? found.find((f) => f.task === task && f.kind === kind) : kind === 'verify' ? found.find((f) => f.kind === kind) : undefined;
    if (!pick) continue;
    const text = head(pick.file);
    if (text === undefined) continue;
    out.push({ role: role.name, task: pick.task, ...reportLine(text), file: `${rel}/${pick.task}/${pick.kind}.md`, at: pick.at });
  }
  return out;
}
