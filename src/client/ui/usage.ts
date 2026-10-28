import { fmtCost, fmtTokens, tokensOf, type AgentProvider, type Usage } from '../../shared/protocol';
import { store } from '../state';
import { $, h } from './dom';
import { providerUsageState, providerUsageTracked, resolvedProvider } from './provider';

export { fmtCost, fmtTokens, tokensOf };

function displayedCost(u: Usage): string {
  return u.costKnown === false ? 'maliyet yok' : fmtCost(u.cost);
}

/** e.g. "$0.42 · 38k tokens"; OpenCode's amount is explicitly an estimate. */
export function usageLabel(u: Usage, provider: AgentProvider = 'claude'): string {
  const money = provider === 'codex' && u.costKnown !== true
    ? 'maliyet yok'
    : u.costKnown === false
      ? 'maliyet yok'
      : `${fmtCost(u.cost)}${provider === 'opencode' ? ' bildirilen' : ''}`;
  // DeepSeek Harness reports what is in the context window, not a token split.
  if (provider === 'dsh') {
    const window = u.contextSize !== undefined ? ` / ${fmtTokens(u.contextSize)}` : '';
    const spend = u.costKnown === true ? `${fmtCost(u.cost)} · ` : '';
    return `${u.incomplete ? 'Kısmi: ' : ''}${spend}${fmtTokens(tokensOf(u))}${window} bağlam`;
  }
  return `${u.incomplete ? 'Kısmi: ' : ''}${money} · ${fmtTokens(tokensOf(u))} token`;
}

/** The breakdown behind a figure, for a tooltip. */
export function usageTitle(u: Usage, provider: AgentProvider = 'claude'): string {
  const money = provider === 'codex' && u.costKnown !== true ? 'maliyet yok' : u.costKnown === false ? 'maliyet yok' : fmtCost(u.cost);
  const calls = provider === 'codex' || u.callsKnown === false
    ? 'API çağrı sayısı yok'
    : provider === 'opencode'
      ? `${u.calls} bildirilen çağrı`
      : `${u.calls} API çağrısı`;
  const dshContext = u.contextSize !== undefined ? `${fmtTokens(u.contextSize)} bağlam token’ının ${fmtTokens(tokensOf(u))} tanesi` : `${fmtTokens(tokensOf(u))} bağlam token’ı`;
  return [
    ...(u.incomplete ? ['Kısmi metrikler: oturum geçmişinin bir kısmı hâlâ yükleniyor ya da yok.'] : []),
    provider === 'codex'
      ? `Codex ana oturum metrikleri; alt ajan kullanımı dahil değil; ${money}; ${calls}`
      : provider === 'opencode'
        ? `OpenCode’un bildirdiği tahmin ${money}; model/sağlayıcı tahmini, fatura değil; ${calls}`
        : provider === 'dsh'
          ? `ACP üzerinden DeepSeek Harness bağlam kullanımı: ${dshContext}; oturum maliyeti ${u.costKnown === true ? money : 'yok'}; ${calls}`
          : `${money}, ${calls} için`,
    `girdi ${fmtTokens(u.input)} · çıktı ${fmtTokens(u.output)}`,
    `akıl yürütme ${fmtTokens(u.reasoning ?? 0)}`,
    `önbellek yazma ${fmtTokens(u.cacheWrite)} · önbellek okuma ${fmtTokens(u.cacheRead)}`,
  ].join('\n');
}

export function overBudget(): boolean {
  const s = store.usage;
  return s.budget !== undefined && s.today.cost >= s.budget;
}

/** New hires are refused: the daily budget is spent and the office runs with --budget-pause. */
export const hiringPaused = () => store.usage.pauseHiring && overBudget();

/** The sidebar's spend lines: what the workers at their desks cost, today's total and the budget. */
export function renderUsage() {
  const s = store.usage;
  let now = 0;
  let currentOpenCodeCost = 0;
  let currentOpenCodeTokens = 0;
  let currentOpenCodeInput = 0;
  let currentOpenCodeOutput = 0;
  let currentOpenCodeReasoning = 0;
  let currentOpenCodeCacheWrite = 0;
  let currentOpenCodeCacheRead = 0;
  let currentOpenCodeReports = 0;
  let currentOpenCodeCostUnknown = false;
  let currentOpenCodeIncomplete = false;
  let openCodeWaiting = false;
  let currentCodexCost = 0;
  let currentCodexTokens = 0;
  let currentCodexInput = 0;
  let currentCodexOutput = 0;
  let currentCodexReasoning = 0;
  let currentCodexCacheWrite = 0;
  let currentCodexCacheRead = 0;
  let currentCodexReports = 0;
  let currentCodexCostUnknown = false;
  let currentCodexIncomplete = false;
  let codexWaiting = false;
  let currentDshTokens = 0;
  let currentDshContext = 0;
  let currentDshReports = 0;
  let currentDshCost = 0;
  let currentDshCostKnown = false;
  let dshWaiting = false;
  let untracked = false;
  for (const w of store.workers.values()) {
    if (w.kind !== 'agent') continue;
    const provider = resolvedProvider(w.provider, store.project);
    const state = providerUsageState(provider, store.project, w.usage);
    if (state === 'untracked') untracked = true;
    if (provider === 'opencode') {
      if (!w.usage) {
        openCodeWaiting = true;
        continue;
      }
      currentOpenCodeReports++;
      if (w.usage.incomplete) currentOpenCodeIncomplete = true;
      currentOpenCodeTokens += tokensOf(w.usage);
      currentOpenCodeInput += w.usage.input;
      currentOpenCodeOutput += w.usage.output;
      currentOpenCodeReasoning += w.usage.reasoning ?? 0;
      currentOpenCodeCacheWrite += w.usage.cacheWrite;
      currentOpenCodeCacheRead += w.usage.cacheRead;
      if (w.usage.costKnown === false) currentOpenCodeCostUnknown = true;
      else currentOpenCodeCost += w.usage.cost;
    }
    if (provider === 'codex') {
      if (!w.usage) {
        codexWaiting = true;
        continue;
      }
      currentCodexReports++;
      if (w.usage.incomplete) currentCodexIncomplete = true;
      currentCodexTokens += tokensOf(w.usage);
      currentCodexInput += w.usage.input;
      currentCodexOutput += w.usage.output;
      currentCodexReasoning += w.usage.reasoning ?? 0;
      currentCodexCacheWrite += w.usage.cacheWrite;
      currentCodexCacheRead += w.usage.cacheRead;
      if (w.usage.costKnown !== true) currentCodexCostUnknown = true;
      else currentCodexCost += w.usage.cost;
    }
    if (provider === 'dsh') {
      if (!w.usage) {
        dshWaiting = true;
        continue;
      }
      currentDshReports++;
      currentDshTokens += tokensOf(w.usage);
      if (w.usage.contextSize !== undefined) currentDshContext = Math.max(currentDshContext, w.usage.contextSize);
      if (w.usage.costKnown === true) {
        currentDshCost += w.usage.cost;
        currentDshCostKnown = true;
      }
    }
    if (providerUsageTracked(provider, store.project, w.usage) && w.usage?.costKnown !== false && !w.usage?.incomplete) now += w.usage?.cost ?? 0;
  }
  const head = $('workers-cost');
  head.textContent = now > 0 ? fmtCost(now) : '';
  head.title = 'Mevcut masalar: izlenen Claude Code maliyetleri artı bildirilen OpenCode ve DeepSeek Harness tahminleri; Codex ana oturum token’ları aşağıda görünür; maliyeti olmayan ya da geçmişi kısmi oturumlar hariç.';

  const el = $('usage');
  const any = s.total.calls > 0 || s.budget !== undefined || untracked || currentOpenCodeReports > 0 || openCodeWaiting || currentCodexReports > 0 || codexWaiting || currentDshReports > 0 || dshWaiting;
  el.classList.toggle('hidden', !any);
  if (!any) return;
  const over = overBudget();
  el.classList.toggle('over', over);
  const rows: HTMLElement[] = [];
  if (s.total.calls > 0 || s.budget !== undefined) {
    rows.push(
      h(
        'div.row',
        {},
        h('span', {}, '💸 Claude Code bugün'),
        h('b', { title: usageTitle(s.today, 'claude') }, displayedCost(s.today)),
        s.budget !== undefined ? h('span.muted', {}, `/ ${fmtCost(s.budget)}`) : h('span.muted', {}, `· ${fmtTokens(tokensOf(s.today))} token`),
      ),
    );
  }
  if (s.budget !== undefined) {
    const pct = Math.min(100, (s.today.cost / s.budget) * 100);
    const state = over ? (s.pauseHiring ? 'Bütçe bitti — yarına kadar yeni işe alım yok' : 'Bütçe bitti') : `bugünkü bütçenin %${Math.round(pct)}’i`;
    rows.push(h('div.budget', { class: over ? 'over' : pct >= 80 ? 'near' : '', title: state, role: 'progressbar', 'aria-valuenow': Math.round(pct) }, h('div.fill', { style: `width:${pct}%` })));
  }
  if (s.total.calls > 0 || s.budget !== undefined) rows.push(h('div.row.muted', { title: usageTitle(s.total, 'claude') }, `Claude Code toplam ${displayedCost(s.total)} · ${fmtTokens(tokensOf(s.total))} token`));
  if (currentOpenCodeReports > 0) {
    const amount = currentOpenCodeCostUnknown ? 'maliyet yok' : `${fmtCost(currentOpenCodeCost)} bildirilen`;
    rows.push(
      h(
        'div.row.muted',
        {
          title: [
            'OpenCode mevcut masa metrikleri model/sağlayıcı tahminidir, fatura değil.',
            `girdi ${fmtTokens(currentOpenCodeInput)} · çıktı ${fmtTokens(currentOpenCodeOutput)}`,
            `akıl yürütme ${fmtTokens(currentOpenCodeReasoning)}`,
            `önbellek yazma ${fmtTokens(currentOpenCodeCacheWrite)} · önbellek okuma ${fmtTokens(currentOpenCodeCacheRead)}`,
          ].join('\n'),
        },
        `OpenCode ${currentOpenCodeIncomplete ? 'kısmi' : 'mevcut masalar'} ${amount} · ${fmtTokens(currentOpenCodeTokens)} token`,
      ),
    );
  }
  if (openCodeWaiting) rows.push(h('div.row.muted', { title: 'OpenCode kullanımı ilk metrik raporundan sonra görünür.' }, 'OpenCode metrikleri ilk raporu bekliyor'));
  if (currentCodexReports > 0) {
    const amount = currentCodexCostUnknown ? 'maliyet yok' : fmtCost(currentCodexCost);
    rows.push(
      h(
        'div.row.muted',
        {
          title: [
            'Codex mevcut masa metrikleri sadece ana oturumu kapsar; alt ajan kullanımı dahil değil; maliyet yok.',
            `girdi ${fmtTokens(currentCodexInput)} · çıktı ${fmtTokens(currentCodexOutput)}`,
            `akıl yürütme ${fmtTokens(currentCodexReasoning)}`,
            `önbellek yazma ${fmtTokens(currentCodexCacheWrite)} · önbellek okuma ${fmtTokens(currentCodexCacheRead)}`,
          ].join('\n'),
        },
        `Codex ${currentCodexIncomplete ? 'kısmi' : 'mevcut masalar'} ${amount} · ${fmtTokens(currentCodexTokens)} token`,
      ),
    );
  }
  if (codexWaiting) rows.push(h('div.row.muted', { title: 'Codex kullanımı ilk ana oturum metrik raporundan sonra görünür; alt ajan kullanımı dahil değil.' }, 'Codex metrikleri ilk raporu bekliyor'));
  if (currentDshReports > 0) {
    const context = currentDshContext > 0 ? ` / ${fmtTokens(currentDshContext)}` : '';
    const spend = currentDshCostKnown ? `${fmtCost(currentDshCost)} · ` : '';
    rows.push(
      h(
        'div.row.muted',
        {
          title: [
            'DeepSeek Harness, her turdan sonra ACP \u00fczerinden her oturumun ba\u011flam penceresindekini bildirir; maliyet sadece harness sa\u011flarsa g\u00f6r\u00fcn\u00fcr ve asla fatura de\u011fildir.',
            `${currentDshReports} çalışan · ${fmtTokens(currentDshTokens)}${context} bağlam token’ı`,
          ].join('\n'),
        },
        `DeepSeek Harness mevcut masalar ${spend}${fmtTokens(currentDshTokens)}${context} bağlam`,
      ),
    );
  }
  if (dshWaiting) rows.push(h('div.row.muted', { title: 'DeepSeek Harness kullanımı ilk ACP kullanım güncellemesinden sonra görünür.' }, 'DeepSeek Harness metrikleri ilk raporu bekliyor'));
  if (untracked) {
    rows.push(h('div.row.muted', { title: 'Özel sağlayıcı kullanımını ofis bildirmez.' }, 'Özel kullanım izlenmiyor · bütçe ve toplamlar sadece Claude Code’u kapsar'));
  }
  el.replaceChildren(...rows);
}
