import { describe, expect, it } from 'vitest';
import { emptyRecords, foldRecords, mergeRecords, multiplier, Scorer, speedLevel } from '../../src/core/score';

describe('points', () => {
  it('never subtracts: a miss scores 0 and only resets the combo', () => {
    const s = new Scorer();
    s.hit('kad', true, 10000);
    s.hit('kad', true, 10000);
    const miss = s.hit('kad', false, 500);
    expect(miss.points).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.score).toBe(10 + 11);
    expect(s.bestCombo).toBe(2);
  });

  it('adds a speed bonus per game', () => {
    expect(speedLevel('kad', 2000)).toBe(2);
    expect(speedLevel('kad', 5000)).toBe(1);
    expect(speedLevel('kad', 7000)).toBe(0);
    expect(speedLevel('susun', 12000)).toBe(1);
    expect(new Scorer().hit('kad', true, 1000).points).toBe(15);
    expect(new Scorer().hit('susun', true, 30000).points).toBe(20);
  });

  it('caps the combo multiplier at x2', () => {
    expect(multiplier(1)).toBe(1);
    expect(multiplier(3)).toBeCloseTo(1.2);
    expect(multiplier(11)).toBe(2);
    expect(multiplier(40)).toBe(2);
  });

  it('a Hard self-rating keeps the combo with fewer points', () => {
    const s = new Scorer();
    expect(s.hit('kad', true, 9000, 6).points).toBe(6);
    expect(s.combo).toBe(1);
  });

  it('keeps personal bests and merges savefiles by the better value', () => {
    const r = emptyRecords();
    const s = new Scorer();
    s.hit('laju', true, 1500);
    s.hit('laju', true, 2500);
    const beat = foldRecords(r, s, 'laju');
    expect(beat).toEqual({ score: true, combo: true, fastest: true });
    expect(r.lajuBest).toBe(s.score);
    expect(r.bestSession).toBe(0);
    expect(r.fastestMs).toBe(1500);
    const again = foldRecords(r, new Scorer(), 'session');
    expect(again).toEqual({ score: false, combo: false, fastest: false });
    const m = mergeRecords(r, { ...emptyRecords(), bestSession: 99, fastestMs: 900 });
    expect(m.bestSession).toBe(99);
    expect(m.fastestMs).toBe(900);
    expect(m.lajuBest).toBe(r.lajuBest);
  });
});
