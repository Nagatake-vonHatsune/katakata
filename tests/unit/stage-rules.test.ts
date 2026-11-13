import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runAffixGuard } from '../../tools/affix-guard.mjs';
import { Checker, fixtureAgrees, placedChapter, runFixtureCase } from '../../tools/stage-rules.mjs';

const rulesDir = join(__dirname, '../../content/rules');
const source = JSON.parse(readFileSync(join(rulesDir, 'SOURCE.json'), 'utf8'));
const cases = JSON.parse(readFileSync(join(rulesDir, 'stage-rules-fixtures.json'), 'utf8')).cases;
const checker = new Checker();

describe('stage rules (shared with Cikgu Sensai)', () => {
  it('the copied rule files are unedited (hashes in content/rules/SOURCE.json)', () => {
    for (const [name, f] of Object.entries<{ sha256: string }>(source.files))
      expect(createHash('sha256').update(readFileSync(join(rulesDir, name))).digest('hex'), name).toBe(f.sha256);
  });
  it('runs all 72 shared fixtures with the expected result', () => {
    expect(cases).toHaveLength(72);
    const wrong = cases.filter((c: any) => !fixtureAgrees(c, runFixtureCase(checker, c))).map((c: any) => c.id);
    expect(wrong).toEqual([]);
  });
  it('reads placement strictly from the place column', () => {
    expect(placedChapter('Ch1 (moved from Ch2; reviewed in Ch2)')).toBe(1);
    expect(placedChapter('Ch12 (unit 12A); Jambatan · Daily life')).toBe(12);
    expect(placedChapter('Dunia · Rumah terbuka (primes Ch9)')).toBe(9);
    expect(placedChapter('Ch15 (waits for Ch10)')).toBe(15);
    expect(placedChapter('Retired: duplicate of L-0330')).toBeNull();
    expect(placedChapter('')).toBeNull();
  });
  it('gates ter- forms tagged root at 16, and superlatives at 6 only', () => {
    for (const w of ['tertinggal', 'terlepas', 'terlupa']) expect([...checker.families(w, 15)]).toEqual(['ter- accident']);
    expect(checker.families('termurah', 6).size).toBe(0);
    expect(checker.families('masakan', 2).size).toBe(0);
  });
});

describe('stage-aware affix guard', () => {
  const pack = (chapter: number, term: string, tag = 'root') => ({ kind: 'kelas', id: `t${chapter}`, chapter, cards: [{ id: `ms-t-${chapter}`, term, affix_tag: tag }] });
  it('checks each text at its own chapter', () => {
    expect(runAffixGuard([pack(9, 'bercakap')]).flags).toHaveLength(1);
    expect(runAffixGuard([pack(10, 'bercakap')]).flags).toHaveLength(0);
  });
  it('a later chapter chunk never exempts its words in Stage 1', () => {
    // Even tagged chunk, a Stage 2 form in a chapter 9 pack fails: exemptions start at their own chapter.
    expect(runAffixGuard([pack(9, 'berjumpa', 'chunk')]).flags.some((f) => f.check === 'affix')).toBe(true);
    expect(runAffixGuard([pack(9, 'Selamat berkenalan', 'chunk')]).flags).toHaveLength(0);
  });
  it('holds Stage 2 Kelas packs to every check (ledger placement and gaps too)', () => {
    expect(runAffixGuard([pack(10, 'menyewa')]).flags.some((f) => f.check === 'affix')).toBe(true);
    expect(runAffixGuard([pack(10, 'jiran')]).flags).toHaveLength(0);
    expect(runAffixGuard([pack(10, 'blok')]).flags.some((f) => f.check === 'ledger')).toBe(true);
    expect(runAffixGuard([pack(9, 'blok')]).flags).toHaveLength(0);
  });
});
