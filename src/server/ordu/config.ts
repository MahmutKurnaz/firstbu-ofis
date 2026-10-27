// Reads a floor's army: <project>/.agent-office/ordu.json, or one made up from its .claude/agents.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { deriveOrdu, parseAgentFrontmatter, parseOrdu, type AgentFile, type OrduConfig } from '../../shared/ordu.js';

export interface LoadedOrdu {
  config: OrduConfig;
  /** 'file': ordu.json; 'derived': made from .claude/agents (no ordu.json, or a broken one); 'none': neither. */
  source: 'file' | 'derived' | 'none';
  /** Why ordu.json couldn't be used, in Turkish. */
  error?: string;
  /** The project's .claude/agents names, which `agent` in ordu.json refers to. */
  agents: string[];
}

const MAX_FILE = 256 * 1024;
const MAX_AGENTS = 64;

function readSmall(file: string): string | undefined {
  try {
    if (statSync(file).size > MAX_FILE) return undefined;
    return readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

/** The agent files in <project>/.claude/agents, by their frontmatter (the file name when it has none). */
export function agentFiles(projectDir: string): AgentFile[] {
  const dir = join(projectDir, '.claude', 'agents');
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().slice(0, MAX_AGENTS);
  } catch {
    return [];
  }
  return names.map((f) => {
    const md = readSmall(join(dir, f));
    const front = md ? parseAgentFrontmatter(md) : null;
    return front ?? { name: f.slice(0, -3) };
  });
}

/** `dataDir` is the floor's .agent-office folder. */
export function loadOrdu(projectDir: string, dataDir: string): LoadedOrdu {
  const agentList = agentFiles(projectDir);
  const agents = agentList.map((a) => a.name);
  const file = join(dataDir, 'ordu.json');
  let error: string | undefined;
  if (existsSync(file)) {
    const text = readSmall(file);
    if (text === undefined) error = 'ordu.json okunamadı: dosya 256 KB\'tan büyük ya da açılamıyor';
    else {
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch (e) {
        error = `ordu.json okunamadı: geçerli JSON değil (${e instanceof Error ? e.message : String(e)})`;
      }
      if (!error) {
        const parsed = parseOrdu(raw);
        if (typeof parsed !== 'string') return { config: parsed, source: 'file', agents };
        error = `ordu.json okunamadı: ${parsed}`;
      }
    }
  }
  const derived = deriveOrdu(agentList);
  return { config: derived, source: derived.offices.length ? 'derived' : 'none', ...(error ? { error } : {}), agents };
}
