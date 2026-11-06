// Points for fun, never for punishment (spec P6: no lives, no buzzers, nothing taken away).
// A right answer earns base points, a speed bonus and a combo multiplier; a miss just resets the combo.
// Scores never touch the review schedule: SM-2 only sees right / wrong / self-rating.

export type ScoreGame = 'kad' | 'cari' | 'susun' | 'laju';

const BASE: Record<ScoreGame, number> = { kad: 10, cari: 10, susun: 20, laju: 10 };
/** [fast, quick] answer times in ms: under fast earns +5 (⚡⚡), under quick +2 (⚡). */
const SPEED: Record<ScoreGame, [number, number]> = { kad: [3000, 6000], cari: [4000, 8000], susun: [10000, 20000], laju: [2000, 4000] };
const MAX_COMBO_STEPS = 10; // ×1.0 for the first answer in a row, up to ×2.0 from the eleventh

export interface Hit {
  points: number;
  /** 0 none, 1 quick (+2), 2 fast (+5) */
  speed: 0 | 1 | 2;
  combo: number;
  mult: number;
}

export function multiplier(combo: number): number {
  return 1 + Math.min(Math.max(combo - 1, 0), MAX_COMBO_STEPS) / 10;
}

export function speedLevel(game: ScoreGame, ms: number): 0 | 1 | 2 {
  const [fast, quick] = SPEED[game];
  return ms < fast ? 2 : ms < quick ? 1 : 0;
}

export class Scorer {
  score = 0;
  combo = 0;
  bestCombo = 0;
  right = 0;
  fastestMs: number | null = null;

  /** Record one answer. `base` overrides the game's base points (a "Hard" self-rating earns less). */
  hit(game: ScoreGame, correct: boolean, ms: number, base = BASE[game]): Hit {
    if (!correct) {
      this.combo = 0;
      return { points: 0, speed: 0, combo: 0, mult: 1 };
    }
    this.combo++;
    this.right++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (game !== 'susun' && (this.fastestMs === null || ms < this.fastestMs)) this.fastestMs = ms;
    const speed = speedLevel(game, ms);
    const mult = multiplier(this.combo);
    const points = Math.round((base + (speed === 2 ? 5 : speed === 1 ? 2 : 0)) * mult);
    this.score += points;
    return { points, speed, combo: this.combo, mult };
  }
}

export interface ScoreRecords {
  bestSession: number;
  bestCombo: number;
  fastestMs: number | null;
  total: number;
  lajuBest: number;
  lajuPlays: number;
}

export function emptyRecords(): ScoreRecords {
  return { bestSession: 0, bestCombo: 0, fastestMs: null, total: 0, lajuBest: 0, lajuPlays: 0 };
}

/** Fold a finished round into the records. Returns which personal bests it beat. */
export function foldRecords(r: ScoreRecords, s: Scorer, kind: 'session' | 'laju'): { score: boolean; combo: boolean; fastest: boolean } {
  const beat = {
    score: s.score > 0 && s.score > (kind === 'laju' ? r.lajuBest : r.bestSession),
    combo: s.bestCombo > 0 && s.bestCombo > r.bestCombo,
    fastest: s.fastestMs !== null && (r.fastestMs === null || s.fastestMs < r.fastestMs),
  };
  r.total += s.score;
  if (kind === 'laju') {
    r.lajuPlays++;
    r.lajuBest = Math.max(r.lajuBest, s.score);
  } else r.bestSession = Math.max(r.bestSession, s.score);
  r.bestCombo = Math.max(r.bestCombo, s.bestCombo);
  if (beat.fastest) r.fastestMs = s.fastestMs;
  return beat;
}

/** Merge two savefiles' records: keep the better of each. */
export function mergeRecords(a: ScoreRecords, b: ScoreRecords): ScoreRecords {
  const fast = [a.fastestMs, b.fastestMs].filter((x): x is number => x !== null);
  return {
    bestSession: Math.max(a.bestSession, b.bestSession),
    bestCombo: Math.max(a.bestCombo, b.bestCombo),
    fastestMs: fast.length ? Math.min(...fast) : null,
    total: Math.max(a.total, b.total),
    lajuBest: Math.max(a.lajuBest, b.lajuBest),
    lajuPlays: Math.max(a.lajuPlays, b.lajuPlays),
  };
}

export function seconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}
