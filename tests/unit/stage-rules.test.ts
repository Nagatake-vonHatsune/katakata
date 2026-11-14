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
  it('runs all 81 shared fixtures with the expected result', () => {
    expect(cases).toHaveLength(81);
    const wrong = cases.filter((c: any) => !fixtureAgrees(c, runFixtureCase(checker, c))).map((c: any) => c.id);
    expect(wrong).toEqual([]);
  });
  it('matches a two-word disallowed form as the two words in order', () => {
    const seg = (text: string, kind = 'model') => [{ unit: 'fixture-c01', chapter: 1, source: 'fixture', text, kind }];
    const bad = (text: string) => Object.values(checker.inspect(seg(text)).violations).filter((e: any) => e.check === 'malaysian-form').map((e: any) => e.term);
    expect(bad('Sila tanda tangan di sini.')).toEqual(['tanda tangan']);
    expect(bad('Sila tandatangan di sini.')).toEqual([]);
    expect(bad('tangan tanda')).toEqual([]);
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

describe('Hanashishou bridge-batch rows (Kata-Kata addition, step 6b, 14 Nov 2026)', () => {
  const seg = (chapter: number, text: string) => [{ unit: `fixture-c${chapter}`, chapter, source: 'fixture', text, kind: 'model' }];
  const row = (id: string, malay: string, origin: string, place = '') => ({ ID: id, Malay: malay, 'Kata-Kata place': place, 'Affix tag': 'root', Origin: origin, 'Review status': 'Draft', POS: '' });
  const keys = (c: any, text: string) => Object.values(c.inspect(seg(10, text)).violations).map((e: any) => `${e.check}:${e.term}`);
  it('an unplaced bridge row is not a ledger entry (it must not turn «biasanya» into biasa + -nya)', () => {
    const base = [row('L-0001', 'biasanya', 'Vocab Bank v2', 'Ch10')];
    const withBridge = [...base, row('L-1351', 'biasa', 'Hanashishou bridge batch 1 (Sam approved 14 Nov)')];
    expect(keys(new Checker({ ledger: base }), 'Biasanya saya pergi.')).toEqual([]);
    expect(keys(new Checker({ ledger: withBridge }), 'Biasanya saya pergi.')).toEqual([]);
  });
  it('an unplaced row of any other origin still blocks (as before)', () => {
    const other = [row('L-0001', 'biasanya', 'Vocab Bank v2', 'Ch10'), row('L-0002', 'biasa', 'Vocab Bank v2')];
    expect(keys(new Checker({ ledger: other }), 'Biasanya saya pergi.')).toEqual(['ledger:biasa']);
  });
});
