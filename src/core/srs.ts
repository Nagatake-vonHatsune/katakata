// Spaced repetition (spec 10.4): SM-2, the same algorithm and the same card state as Hanashishou
// (hanashishou/src/vocab/scheduler/sm2.ts), so a word's progress carries over unchanged when a learner
// moves on. SM-2: P. A. Wozniak (1987). About 20 lines, no library, no licence to check.
import type { SrsState } from './types';

/** SM-2 grades as Hanashishou uses them: 0 = wrong, 3 = hard, 4 = good, 5 = easy. */
export type Grade = 0 | 3 | 4 | 5;
export const Rating = { Again: 0, Hard: 3, Good: 4, Easy: 5 } as const satisfies Record<string, Grade>;

const DAY = 24 * 60 * 60 * 1000;

export function newSrs(now = new Date()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, due: now.getTime(), lapses: 0 };
}

/** Identical to Hanashishou's sm2.review, plus `last` (when it was reviewed) for savefile merges. */
export function review(s: SrsState | undefined, grade: Grade, now = new Date()): SrsState {
  let { ease, interval, reps, lapses } = s ?? newSrs(now);
  if (grade < 3) {
    reps = 0;
    interval = 0; // relearn: comes back in the same session / soon
    lapses += 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  const t = now.getTime();
  const due = interval === 0 ? t + 10 * 60 * 1000 : t + interval * DAY;
  return { ease, interval, reps, due, lapses, last: t };
}

export function isDue(s: SrsState, now = new Date()): boolean {
  return s.due <= now.getTime();
}

/** Known = answered correctly at least once since its last miss. */
export function isKnown(s: SrsState | undefined): boolean {
  return !!s && s.reps > 0 && s.interval >= 1;
}

/** Higher = weaker. Used for "hardest words" and the teacher's weakest-words list. */
export function weakness(s: SrsState): number {
  return s.lapses * 3 + (2.5 - s.ease) * 4 - Math.min(s.interval, 30) / 10;
}

/** Saves made before the switch to SM-2 held FSRS state; keep reps, lapses and due date. */
export function migrateSrs(raw: Record<string, unknown>): SrsState {
  if (typeof raw.ease === 'number' && typeof raw.interval === 'number') return raw as unknown as SrsState;
  const due = typeof raw.due === 'string' ? Date.parse(raw.due) : Number(raw.due) || Date.now();
  const last = typeof raw.last_review === 'string' ? Date.parse(raw.last_review) : undefined;
  return {
    ease: 2.5,
    interval: Math.max(0, Math.round(Number(raw.scheduled_days) || 0)),
    reps: Number(raw.reps) || 0,
    due,
    lapses: Number(raw.lapses) || 0,
    last,
  };
}
