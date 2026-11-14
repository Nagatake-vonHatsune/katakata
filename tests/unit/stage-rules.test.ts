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
  // Since 14 Nov 2026 the ledger has L-1289 «baiklah» (Sam: a word in its own right, placed Ch14), so «Baiklah» is no longer read
  // as baik + -lah and the fixture below, which uses it as its -lah example, no longer fails. The fixture is a Cikgu Sensai file
  // and is not edited here; the rule itself (R4) still holds for any other -lah word (next test). Remove this entry when Cikgu
  // Sensai's fixture uses another word (the test after it says when).
  const KNOWN_DIVERGENT = new Set(['lah-in-answer-key-fails']);
  it('runs all 77 shared fixtures with the expected result (one known divergence, see KNOWN_DIVERGENT)', () => {
    expect(cases).toHaveLength(77);
    const wrong = cases.filter((c: any) => !fixtureAgrees(c, runFixtureCase(checker, c))).map((c: any) => c.id);
    expect(wrong.filter((id: string) => !KNOWN_DIVERGENT.has(id))).toEqual([]);
  });
  it('the known divergence is only the word «baiklah»; R4 still stops a test that requires -lah on another word', () => {
    const base = cases.find((c: any) => c.id === 'lah-in-answer-key-fails');
    const withText = (text: string) => ({ ...base, segments: [{ ...base.segments[0], text }] });
    expect(fixtureAgrees(base, runFixtureCase(checker, base))).toBe(false); // when this turns true, delete KNOWN_DIVERGENT
    for (const text of ['Takpelah, saya tunggu.', 'Tidak mengapalah, saya tunggu.']) {
      const c = withText(text);
      expect(fixtureAgrees(c, runFixtureCase(checker, c)), text).toBe(true);
    }
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

describe('written -lah (Kata-Kata addition, 13 Nov 2026)', () => {
  const seg = (chapter: number, text: string) => [{ unit: `fixture-c${chapter}`, chapter, source: 'fixture', text, kind: 'model' }];
  const found = (chapter: number, text: string) => {
    const r = checker.inspect(seg(chapter, text));
    return [...Object.values(r.violations), ...Object.values(r.ledger_gaps)].map((e: any) => `${e.check}:${e.term}`);
  };
  it('reads «takpelah» as takpe + lah, like bolehkah, from chapter 17', () => {
    expect(found(17, 'Takpelah. Kita cari kedai lain.')).toEqual([]);
    expect(found(17, 'Bolehkah saya masuk?')).toEqual([]);
  });
  it('does not read it before the particle row is placed, nor in words that only end in -lah', () => {
    expect(found(16, 'Takpelah.')).toContain('ledger gap:takpelah');
    // masalah, adalah and salah have no ledger row; what matters is that none is read as a base + lah.
    const lah = (text: string) => checker.inspect(seg(17, text)).derivations.filter((d: any) => d.rule === '-lah');
    expect(lah('Itu masalah saya. Dia adalah guru. Itu salah.')).toEqual([]);
    expect(lah('Takpelah.')).toHaveLength(1);
    expect(found(17, 'Xyzlah.')).toContain('ledger gap:xyzlah');
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
