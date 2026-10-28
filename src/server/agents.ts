import path from 'node:path';
import { AGENT_PROVIDERS, PROVIDER_META, isAgentEffort, providerMeta, providerNames, type AgentProvider } from '../shared/providers.js';

/**
 * Finds the provider represented by the configured executable.  Keep this deliberately based on
 * the final path component: --agent may be an absolute path, and Windows paths can be supplied
 * while the office itself is running under a POSIX shell. A Windows npm launcher (`pi.cmd`) counts as
 * its executable too.
 */
export function configuredProvider(command: string): AgentProvider {
  const base = path.basename(command.replaceAll('\\', '/')).toLowerCase().replace(/\.(?:exe|cmd|bat|com)$/, '');
  return AGENT_PROVIDERS.find((p) => PROVIDER_META[p].bin === base) ?? 'custom';
}

/** The providers an office started with `configured` can hire: the ones it knows, and a custom --agent only when that's what it was started with. */
export function agentProviders(configured: AgentProvider): AgentProvider[] {
  return AGENT_PROVIDERS.filter((p) => p !== 'custom' || configured === 'custom');
}

/** The command a provider's CLI runs as: the office's --agent when that's this provider, else its own executable. */
export function providerCommand(provider: AgentProvider, agentCmd: string): string {
  return configuredProvider(agentCmd) === provider ? agentCmd : (PROVIDER_META[provider].bin ?? agentCmd);
}

export function validateWorkerModel(kind: 'agent' | 'shell', provider: AgentProvider | undefined, model: unknown): string | undefined {
  if (model === undefined) return undefined;
  if (kind === 'shell') return 'Shell çalışanların ajan modeli yoktur';
  const meta = providerMeta(provider);
  if (!meta?.validModel) return `Model yalnızca ${providerNames((m) => !!m.validModel)} çalışanları için seçilebilir`;
  return meta.validModel(model) ? undefined : meta.invalidModel;
}

/** A reasoning effort for a worker: a flag of its provider's CLI, an OpenCode model's variant, or DSH's reasoning_effort configuration option. */
export function validateWorkerEffort(kind: 'agent' | 'shell', provider: AgentProvider | undefined, effort: unknown): string | undefined {
  if (effort === undefined) return undefined;
  if (kind === 'shell') return 'Shell çalışanların akıl yürütme eforu yoktur';
  if (!providerMeta(provider)?.takesEffort) return `Akıl yürütme eforu yalnızca ${providerNames((m) => !!m.takesEffort)} çalışanları için seçilebilir`;
  return isAgentEffort(effort) ? undefined : 'Geçersiz efor (low, medium, high, xhigh ya da max olmalı)';
}
