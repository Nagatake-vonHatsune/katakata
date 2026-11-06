// Common Game interface (spec 11.3): each minigame renders one step and reports how it went.
import type { Grade } from '../core/srs';
import type { Step } from '../core/session';
import type { ItemContext } from '../core/types';

export interface StepResult {
  /** correct / wrong drive the schedule; seen = an intro card; rated = self-graded recall. */
  outcome: 'correct' | 'wrong' | 'seen' | 'rated';
  grade?: Grade;
}

export interface GameContext {
  body: HTMLElement;
  /** わからない: costs nothing, shows the answer. */
  dontKnow(onClick: () => void): HTMLElement;
  /** Ask teacher, report, and the one obvious next action. */
  footer(context: ItemContext, onNext: () => void, nextLabel?: string): HTMLElement;
}

export interface Game<S extends Step = Step> {
  id: 'kad' | 'cari' | 'susun';
  run(step: S, ctx: GameContext): Promise<StepResult>;
}
