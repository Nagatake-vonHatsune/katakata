// Spaced repetition (spec 10.4): FSRS via ts-fsrs (MIT licence).
import { createEmptyCard, fsrs, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { SrsState } from './types';

export { Rating };
export type { Grade };

const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 });

function toFsrs(s: SrsState): FsrsCard {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as FsrsCard;
}

function fromFsrs(c: FsrsCard): SrsState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : undefined,
  };
}

export function newSrs(now = new Date()): SrsState {
  return fromFsrs(createEmptyCard(now));
}

export function review(s: SrsState | undefined, grade: Grade, now = new Date()): SrsState {
  const card = s ? toFsrs(s) : createEmptyCard(now);
  return fromFsrs(scheduler.next(card, now, grade).card);
}

export function isDue(s: SrsState, now = new Date()): boolean {
  return new Date(s.due).getTime() <= now.getTime();
}

/** A card counts as "known" once it has been answered well at least once and is not freshly lapsed. */
export function isKnown(s: SrsState | undefined): boolean {
  return !!s && s.reps > 0 && s.state !== 3 /* Relearning */ && s.stability >= 1;
}

/** Higher = weaker. Used for "hardest words" and the teacher's weakest-words list. */
export function weakness(s: SrsState): number {
  return s.lapses * 3 + s.difficulty - Math.min(s.stability, 30) / 10;
}
