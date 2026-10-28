// The meeting room's patterns: how 2–5 workers at the table work on one question or task together.
// The server runs them (server/meetings.ts); the client offers them when a meeting is called.

import { fmtCost, fmtTokens, type Meeting, type MeetingPattern, type MeetingRecord } from './protocol.js';

export interface PatternDef {
  icon: string;
  label: string;
  /** What happens, in a line. */
  blurb: string;
  /** A role per chair, the head of the table first; a meeting takes the first few. */
  roles: readonly string[];
  /** How many workers sit down: the fewest, the most, and how many by default. */
  seats: { min: number; max: number; default: number };
  /** The round limit: the fewest, the most, and the default. Fixed when min equals max. */
  rounds: { min: number; max: number; default: number };
  /** What a round is, for the dialog, when the limit is a range to pick from. */
  roundsNote?: string;
  /** The rounds by name, in order, when the pattern always runs the same ones. */
  stages?: readonly string[];
  /** Where the output goes when whoever calls the meeting doesn't say (`slug` is the meeting's title as a file name). */
  output(slug: string, pr?: number): string;
  /** Needs a pull request (the review panel) or a list of parts (map-reduce). */
  needs?: 'pr' | 'parts';
}

export const MEETING_PATTERNS: Record<MeetingPattern, PatternDef> = {
  debate: {
    icon: '🗣️',
    label: 'Tartışma',
    blurb: 'Her çalışan bir öneri sunar, sonra ötekileri eleştirir; son turda masanın başı kararı yazar.',
    roles: ['Başkan', 'Pragmatik', 'Şüpheci', 'Sadeleştirici', 'Kullanıcı savunucusu'],
    seats: { min: 2, max: 5, default: 3 },
    rounds: { min: 2, max: 4, default: 3 },
    roundsNote: 'Önce öneriler, her ek turda bir eleştiri turu, sonra karar.',
    output: (slug) => `docs/decisions/${slug}.md`,
  },
  lead: {
    icon: '🧭',
    label: 'Lider ve ekip',
    blurb: 'Lider işi parçalara böler, ekipten her biri bir parçayı yapar, lider hepsini birleştirip yazar.',
    roles: ['Lider', 'Mühendis', 'Mühendis', 'Mühendis', 'Mühendis'],
    seats: { min: 2, max: 5, default: 3 },
    rounds: { min: 3, max: 3, default: 3 },
    stages: ['Planlama', 'Uygulama', 'Birleştirme'],
    output: (slug) => `docs/meetings/${slug}.md`,
  },
  mapreduce: {
    icon: '🗂️',
    label: 'Böl ve birleştir',
    blurb: 'Aynı iş her parça (dosya, modül, konu) üzerinde aynı anda yürür; masanın başı sonuçları birleştirir.',
    roles: ['Birleştirici', 'Parça işçisi', 'Parça işçisi', 'Parça işçisi', 'Parça işçisi'],
    seats: { min: 2, max: 5, default: 3 },
    rounds: { min: 2, max: 2, default: 2 },
    stages: ['Dağıt', 'Birleştir'],
    output: (slug) => `docs/meetings/${slug}.md`,
    needs: 'parts',
  },
  redblue: {
    icon: '🛡️',
    label: 'Kırmızı / mavi',
    blurb: 'Kırmızı değişikliğe saldırır (hatalar, güvenlik), mavi ayakta kalanları düzeltir, tur tur; mavi yazıya döker.',
    roles: ['Mavi takım', 'Kırmızı takım'],
    seats: { min: 2, max: 2, default: 2 },
    rounds: { min: 1, max: 5, default: 3 },
    roundsNote: 'Her turda bir saldırı ve bir düzeltme; kırmızı bir şey bulamazsa erken biter.',
    output: (slug) => `docs/reviews/${slug}.md`,
  },
  review: {
    icon: '🔍',
    label: 'İnceleme paneli',
    blurb: 'İncelemeciler pull request’i kendi bakış açılarından okur; masanın başı hepsini tek bir incelemede birleştirip PR’a yazar.',
    roles: ['Doğruluk', 'Güvenlik', 'Performans ve sadelik', 'Testler', 'API tasarımı'],
    seats: { min: 2, max: 5, default: 3 },
    rounds: { min: 2, max: 2, default: 2 },
    stages: ['İncelemeler', 'Birleşik inceleme'],
    output: (_slug, pr) => `reviews/pr-${pr ?? 'n'}.md`,
    needs: 'pr',
  },
};

export const MEETING_PATTERN_IDS = Object.keys(MEETING_PATTERNS) as MeetingPattern[];

export function isMeetingPattern(v: unknown): v is MeetingPattern {
  // Own keys only: `in` would also take the prototype's (constructor, toString…), and those crash the server.
  return typeof v === 'string' && Object.hasOwn(MEETING_PATTERNS, v);
}

/**
 * The round notes' folder at the top of a meeting's worktree. It's left out of the meeting's commit and
 * cleared away with the room (a copy stays in the floor's .agent-office/meetings/). Not under
 * .agent-office/: Claude Code asks before writing there in a worktree nested in the project.
 */
export const MEETING_NOTES_DIR = '.meeting';

/** A title as a file or branch name: "Pick a cache!" → "pick-a-cache". */
export function slugify(s: string, max = 40): string {
  return (
    s
      .toLowerCase()
      .replace(/ı/g, 'i')
      .normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/, '') || 'meeting'
  );
}

/**
 * Why an output path can't be used, or undefined when it's fine: a file inside the checkout, not in
 * the office's own folder or git's.
 */
export function outputProblem(p: string): string | undefined {
  if (!p.trim()) return 'Toplantının hangi dosyayı yazacağını söyle';
  if (p.length > 200) return 'Bu çıktı yolu çok uzun';
  if (/^[/\\]|^[a-zA-Z]:/.test(p)) return 'Çıktı dosyası projenin içine gider: projeye göre göreli bir yol ver';
  const parts = p.split(/[/\\]/);
  if (parts.some((x) => x === '..' || x === '.' || x === '')) return 'Çıktı yolunda boş, . ya da .. parçalar olamaz';
  if (parts[0] === '.git' || parts[0] === '.agent-office' || parts[0] === MEETING_NOTES_DIR) return `Çıktı ${parts[0]}/ içine gidemez`;
  if (/[\0-\x1f]/.test(p)) return 'Çıktı yolunda denetim karakterleri var';
  return undefined;
}

/** "3 rounds" / "round 2 of 3". */
const rounds = (n: number) => `${n} tur`;

/**
 * For a pattern that always runs the same rounds, what the dialog shows in place of a limit to set:
 * the line ("3 rounds · fixed by the Lead & team workflow"), its rounds by name, and why, for the
 * tooltip. Undefined when the limit is a range to pick from.
 */
export function fixedRounds(p: PatternDef): { line: string; stages: string; why: string } | undefined {
  if (p.rounds.min !== p.rounds.max) return undefined;
  const n = rounds(p.rounds.max);
  const stages = (p.stages ?? []).join(' → ');
  return { line: `${n} · ${p.label} akışı tarafından sabit`, stages, why: `${p.label} her zaman ${n} sürer${stages ? `: ${stages}` : ''}. Her biri akışın bir adımıdır, eklenecek ya da çıkarılacak bir şey yok.` };
}

/** The spend, e.g. "1.2M tokens · $2.40" (or without the cost when a provider doesn't report it). */
export function meetingSpend(m: Pick<Meeting, 'tokens' | 'cost' | 'costKnown'>): string {
  return `${fmtTokens(m.tokens)} token${m.costKnown ? ` · ${fmtCost(m.cost)}` : m.cost > 0 ? ` · ${fmtCost(m.cost)}+` : ''}`;
}

/** What's on the table in a line: "Round 2 of 3 · critiquing". */
export function meetingStage(m: Meeting): string {
  const doing = [...new Set(m.turns.filter((t) => t.state !== 'done').map((t) => t.doing))].join(', ');
  return `Tur ${m.round}/${m.rounds}${doing ? ` · ${doing}` : ''}`;
}

/**
 * The line on the room's door once a meeting is over: pattern, rounds, tokens, cost, and the output
 * file it wrote (and where), or why it stopped.
 */
export function meetingSummary(m: Meeting): string {
  const p = MEETING_PATTERNS[m.pattern];
  const ran = m.status === 'done' ? rounds(m.round) : `tur ${m.round}/${m.rounds}`;
  const head = `${p.icon} ${p.label} · ${ran} · ${meetingSpend(m)}`;
  if (m.status === 'stopped') return `${head} · ⛔ ${m.reason ?? 'durduruldu'}`;
  if (m.status === 'running') return head;
  const where = m.review?.url ? ' · PR’a yazıldı' : m.review?.error ? ` · yazılamadı: ${m.review.error}` : m.commit ? ` ${m.worktree?.branch} dalına` : m.worktree ? ` ${m.worktree.branch} dalının worktree’sinde` : '';
  return `${head} · ✅ ${m.output}${where}`;
}

export function meetingRecord(m: Meeting): MeetingRecord {
  return { id: m.id, pattern: m.pattern, title: m.title, status: m.status, summary: meetingSummary(m), calledBy: m.calledBy, finishedAt: m.finishedAt ?? Date.now(), branch: m.worktree?.branch, output: m.output };
}
