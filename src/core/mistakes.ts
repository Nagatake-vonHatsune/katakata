// The mistake log (Sam, 17 Nov 2026): every wrong answer in every game, for the progress report and the Teacher Desk.
// The log keeps the most recent MISTAKE_CAP entries; the count per item is kept for good. Class runs (teacher mode) play on a
// copy of the learner (beginClassRun), so nothing they do reaches this log.
import { content } from './content';
import { DAYS, FRACTIONS, formatMoney, formatNumber, MONTHS, RELATIVE, type Question, type Shown } from './nombor';
import { state, update } from './state';
import type { AppState, MistakeEntry, MistakeGame, MistakeLog } from './types';

export const MISTAKE_CAP = 300;

/** Add one wrong answer: the log keeps the newest MISTAKE_CAP entries, the item's count goes up by one. */
export function recordMistake(s: AppState, e: Omit<MistakeEntry, 'date'> & { date?: string }): void {
  const log: MistakeLog = (s.mistakes ??= { log: [], counts: {} });
  const entry: MistakeEntry = { ...e, date: e.date ?? new Date().toISOString() };
  if (!entry.decoys?.length) delete entry.decoys;
  log.log.push(entry);
  if (log.log.length > MISTAKE_CAP) log.log.splice(0, log.log.length - MISTAKE_CAP);
  log.counts[entry.id] = (log.counts[entry.id] ?? 0) + 1;
}

/** Record a wrong answer for the current learner (saved like any other progress). */
export function logMistake(e: Omit<MistakeEntry, 'date'>): void {
  update((s) => recordMistake(s, e));
}

/** Merge two logs (savefile merge): entries unioned and sorted by date (newest MISTAKE_CAP kept), counts the larger of each. */
export function mergeMistakes(a: MistakeLog | undefined, b: MistakeLog | undefined): MistakeLog {
  const key = (e: MistakeEntry) => `${e.date}|${e.id}|${e.game}|${e.answer ?? ''}`;
  const m = new Map<string, MistakeEntry>();
  for (const e of [...(a?.log ?? []), ...(b?.log ?? [])]) m.set(key(e), e);
  const log = [...m.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-MISTAKE_CAP);
  const counts = { ...(a?.counts ?? {}) };
  for (const [k, v] of Object.entries(b?.counts ?? {})) counts[k] = Math.max(counts[k] ?? 0, v);
  return { log, counts };
}

/** A Nombor & Masa option as text (for the log): the Malay, or the number, time, date … it shows. */
export function shownLabel(s: Shown): string {
  switch (s.kind) {
    case 'number': return formatNumber(s.n);
    case 'phone': return s.phone;
    case 'day': return DAYS[s.day];
    case 'relative': return RELATIVE[s.offset];
    case 'month': return MONTHS[s.month - 1];
    case 'date': return `${s.day}/${s.month}/${s.year}`;
    case 'fraction': return FRACTIONS.find((f) => f.id === s.id)?.sym ?? s.id;
    case 'decimal': return s.value;
    case 'percent': return `${s.value}%`;
    case 'money': return formatMoney(s.cents);
    case 'time': return `${s.h}:${String(s.m).padStart(2, '0')}`;
    case 'ms': return s.text;
  }
}

/** The item ID of a Nombor & Masa question: one per part and right answer. */
export function nomborItem(q: Question): string {
  return `nombor:${q.part}:${q.reading.text}`;
}

export interface MistakeItem {
  id: string;
  kind: 'card' | 'frame' | 'line' | 'nombor';
  game: MistakeGame;
  /** The Malay of the item (the word, the sentence, the line, or the number's reading). */
  text: string;
  /** Its meaning in English and Japanese, where the content has one. */
  en?: string;
  ja?: string;
  right: string;
  /** What was answered, newest first, without repeats (null = «わからない»). */
  answers: Array<string | null>;
  decoys?: string[];
  /** Wrong answers over all time. */
  count: number;
  last: string;
  chapter?: number;
  note?: string;
  note_ja?: string;
}

/** The log grouped by item, most-missed first (then the most recent): "Mistakes to review". */
export function groupMistakes(s: AppState = state, limit = 40): MistakeItem[] {
  const by = new Map<string, MistakeItem>();
  for (const e of [...(s.mistakes?.log ?? [])].reverse()) {
    let it = by.get(e.id);
    if (!it) {
      it = { id: e.id, kind: 'card', game: e.game, text: e.right, right: e.right, answers: [], count: s.mistakes.counts[e.id] ?? 1, last: e.date };
      const card = content.cards.get(e.id);
      const frame = content.frames.get(e.id);
      const line = content.lines.get(e.id);
      if (card) Object.assign(it, { kind: 'card', text: card.term, en: card.gloss_en, ja: card.gloss_ja, chapter: card.chapter, note: card.note ?? undefined, note_ja: card.note_ja ?? undefined });
      else if (frame) Object.assign(it, { kind: 'frame', text: frame.example, en: frame.meaning_en, ja: frame.meaning_ja ?? undefined, chapter: frame.chapter });
      else if (line) Object.assign(it, { kind: 'line', text: line.line.ms, en: line.line.en, chapter: line.chapter, note: line.line.note, note_ja: line.line.note_ja });
      else if (e.id.startsWith('nombor:')) Object.assign(it, { kind: 'nombor', text: e.right });
      by.set(e.id, it);
    }
    if (!it.answers.includes(e.answer) && it.answers.length < 3) it.answers.push(e.answer);
    if (e.decoys?.length) it.decoys = [...new Set([...(it.decoys ?? []), ...e.decoys])];
  }
  return [...by.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit);
}
