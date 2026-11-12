import 'fake-indexeddb/auto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { looksAffixed, runAffixGuard } from '../../tools/affix-guard.mjs';
import { content, srsKey } from '../../src/core/content';
import { pronTips, toKana } from '../../src/core/kana';
import { sayAs } from '../../src/core/tts';
import { buildReport, isReport, reportFilename } from '../../src/core/report';
import { buildSavefile, mergeStates, parseSavefile } from '../../src/core/savefile';
import { buildSedia, buildToday, newWordBlock, requeue } from '../../src/core/session';
import { isKnown, migrateSrs, newSrs, Rating, review } from '../../src/core/srs';
import { defaultState } from '../../src/core/state';
import { streak } from '../../src/core/progress';
import { addReports, groupQuestions } from '../../src/teacher/merge';
import { buildWordLibrary, isInHanashishou } from '../../src/core/bridge';

function allPacks() {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith('.json') ? [join(d, n)] : []));
  return walk(join(__dirname, '../../content/ms')).map((f) => JSON.parse(readFileSync(f, 'utf8')));
}

describe('affix guard', () => {
  it('spots ber-/be-/me- shapes but not look-alikes like Mei', () => {
    expect(looksAffixed('bekerja')).toBe(true);
    expect(looksAffixed('membeli')).toBe(true);
    expect(looksAffixed('berapa')).toBe(true);
    expect(looksAffixed('Mei')).toBe(false);
    expect(looksAffixed('besar')).toBe(false);
  });
  it('passes the whole v2 Vocab Bank with no flags (spec 11.4)', () => {
    expect(runAffixGuard(allPacks()).flags).toEqual([]);
  });
  it('flags an untagged me- verb', () => {
    const pack = { kind: 'kelas', id: 'x', cards: [{ id: 'ms-x-1', term: 'membaca', affix_tag: 'root' }] };
    expect(runAffixGuard([pack]).flags).toHaveLength(1);
  });
});

describe('katakana hints', () => {
  it.each([
    ['Selamat pagi', 'セラマッ パギ'],
    ['terima kasih', 'テリマ カシ'],
    ['makan', 'マカン'],
    ['tumpang tanya', 'トゥンパン タニャ'],
    ['syarikat', 'シャリカッ'],
    ['Assalamualaikum', 'アッサラムアライクム'],
    ['Apa khabar?', 'アパ カバー'],
    ['surat khabar', 'スラッ カバー'],
    ['versi akhir', 'ヴェルシ アキル'],
  ])('%s -> %s', (ms, kana) => expect(toKana(ms)).toBe(kana));
  it('gives the final-consonant tip for makan', () => expect(pronTips('makan')).toContain('final'));
  it('the voice says kabar, the screen keeps khabar', () => {
    expect(sayAs('Apa khabar?')).toBe('Apa kabar?');
    expect(sayAs('Khabar baik. Surat khabar.')).toBe('Kabar baik. Surat kabar.');
    expect(sayAs('akhir')).toBe('akhir');
  });
});

describe('content', () => {
  it('ships all nine chapters and twenty Dunia scenes', () => {
    expect(content.chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(content.scenes.filter((s) => s.world.id !== 'jambatan')).toHaveLength(20);
  });
  it('every Dunia scene has enough pictures for Cari Benda', () => {
    for (const s of content.scenes.filter((x) => x.world.id !== 'jambatan')) expect(s.cards.filter((c) => c.image).length, s.id).toBeGreaterThanOrEqual(4);
  });
  it('learning path starts with Chapter 1 core words and has no duplicates', () => {
    expect(content.cards.get(content.path[0])!.chapter).toBe(1);
    expect(new Set(content.path).size).toBe(content.path.length);
  });
});

describe('scheduler', () => {
  it('Good on a new card schedules it later and counts as known', () => {
    const now = new Date('2026-11-06T00:00:00Z');
    const s = review(newSrs(now), Rating.Good, now);
    expect(s).toMatchObject({ reps: 1, interval: 1, lapses: 0 });
    expect(s.due).toBe(now.getTime() + 86_400_000);
    expect(isKnown(s)).toBe(true);
  });
  it('Again keeps it unknown', () => {
    const s = review(undefined, Rating.Again, new Date());
    expect(isKnown(s)).toBe(false);
  });
});

describe('sessions', () => {
  it('a first session introduces 8 new words, each tested after it is met', () => {
    const today = buildToday(defaultState());
    const intros = today.steps.filter((s) => s.kind === 'intro');
    expect(intros).toHaveLength(8);
    for (const i of intros) {
      const at = today.steps.indexOf(i);
      expect(today.steps.findIndex((s, j) => j > at && s.kind === 'mc' && s.cardId === (i as { cardId: string }).cardId)).toBeGreaterThan(at);
    }
  });
  it('newWordBlock interleaves intro and test', () => {
    expect(newWordBlock(['a', 'b']).map((s) => s.kind)).toEqual(['intro', 'intro', 'mc', 'mc']);
  });
  it('a missed item comes back later, once', () => {
    const steps = newWordBlock(['a', 'b', 'c']);
    const missed = steps[2];
    const after = requeue(steps, 2, missed);
    expect(after).toHaveLength(steps.length + 1);
    expect(requeue(after, 3, { ...missed, retry: true } as never)).toHaveLength(after.length);
  });
  it('Sedia Kelas for Ch2 includes both frames and its scene', () => {
    const s = buildSedia(2, defaultState());
    expect(s.steps.filter((x) => x.kind === 'susun')).toHaveLength(2);
    expect(s.steps.some((x) => x.kind === 'cari' && x.sceneId === 'pejabat-pagi')).toBe(true);
  });
});

describe('SM-2 parity with Hanashishou', () => {
  // Same inputs as Hanashishou's sm2.review must give the same outputs.
  it('matches the SM-2 interval sequence 1, 6, 15 at ease 2.5', () => {
    const t0 = new Date('2026-11-06T00:00:00Z');
    const a = review(newSrs(t0), Rating.Good, t0);
    const b = review(a, Rating.Good, t0);
    const c = review(b, Rating.Good, t0);
    expect([a.interval, b.interval, c.interval]).toEqual([1, 6, 15]);
    expect(a.ease).toBeCloseTo(2.5);
  });
  it('a miss resets reps, counts a lapse and comes back in 10 minutes', () => {
    const t0 = new Date('2026-11-06T00:00:00Z');
    const s = review(review(newSrs(t0), Rating.Good, t0), Rating.Again, t0);
    expect(s).toMatchObject({ reps: 0, interval: 0, lapses: 1 });
    expect(s.due).toBe(t0.getTime() + 600_000);
    expect(s.ease).toBeCloseTo(1.7);
  });
  it('migrates an old FSRS save', () => {
    const m = migrateSrs({ due: '2026-11-10T00:00:00.000Z', stability: 3, difficulty: 5, scheduled_days: 4, reps: 2, lapses: 1, state: 2, last_review: '2026-11-06T00:00:00.000Z' });
    expect(m).toEqual({ ease: 2.5, interval: 4, reps: 2, due: Date.parse('2026-11-10T00:00:00.000Z'), lapses: 1, last: Date.parse('2026-11-06T00:00:00.000Z') });
  });
});

describe('savefile', () => {
  it('round-trips and rejects edited files', async () => {
    const st = defaultState();
    st.srs[srsKey('ms-c01-002')] = review(undefined, Rating.Good);
    const file = await buildSavefile(st);
    const ok = await parseSavefile(JSON.stringify(file));
    expect(ok.ok).toBe(true);
    const tampered = JSON.parse(JSON.stringify(file));
    tampered.state.profile.name = 'someone else';
    expect(await parseSavefile(JSON.stringify(tampered))).toEqual({ ok: false, reason: 'checksum' });
    expect(await parseSavefile('{"hello":1}')).toEqual({ ok: false, reason: 'not_savefile' });
  });
  it('merge keeps the newer review and unions questions', () => {
    const a = defaultState();
    const b = defaultState();
    a.srs.x = { ...newSrs(), reps: 1, last: Date.parse('2026-11-01T00:00:00Z') };
    b.srs.x = { ...newSrs(), reps: 3, last: Date.parse('2026-11-05T00:00:00Z') };
    a.questions.push({ id: 'q1', createdAt: '', type: 'other', text: 'a', context: { kind: 'general' }, answered: false });
    b.questions.push({ id: 'q1', createdAt: '', type: 'other', text: 'a', context: { kind: 'general' }, answered: true });
    b.questions.push({ id: 'q2', createdAt: '', type: 'other', text: 'b', context: { kind: 'general' }, answered: false });
    const m = mergeStates(a, b);
    expect(m.srs.x.reps).toBe(3);
    expect(m.questions).toHaveLength(2);
    expect(m.questions.find((q) => q.id === 'q1')!.answered).toBe(true);
  });
});

describe('streak with rest days', () => {
  it('one rest day does not break it; two do', () => {
    const s = defaultState();
    s.stamps = ['2026-11-01', '2026-11-03', '2026-11-04'].map((date, i) => ({ id: String(i), kind: 'day' as const, date }));
    expect(streak(s, '2026-11-05')).toBe(3);
    expect(streak(s, '2026-11-08')).toBe(0);
  });
});

describe('teacher report and desk', () => {
  const q = (id: string, text: string, chapter: number) => ({ id, createdAt: '', type: 'usage' as const, text: '', context: { kind: 'card' as const, text, chapter }, answered: false });
  it('names the file and omits unticked sections', () => {
    const r = buildReport('Tanaka', { questions: [], reports: [], progress: [], weakest: [], minutes: 42 }, { questions: true, reports: true, progress: true, weakest: true, minutes: false }, new Date(2026, 10, 6));
    expect(isReport(r)).toBe(true);
    expect('minutesThisWeek' in r).toBe(false);
    expect(reportFilename('Tanaka', new Date(2026, 10, 6))).toBe('katakata_Tanaka_2026-11-06.json');
  });
  it('counts how many students asked about the same word, newest file per student', () => {
    const mk = (student: string, createdAt: string, qs: ReturnType<typeof q>[]) => ({ ...buildReport(student, { questions: qs, reports: [], progress: [], weakest: [], minutes: 0 }, { questions: true, reports: false, progress: false, weakest: false, minutes: false }), createdAt });
    const { reports, rejected } = addReports([], [
      mk('A', '2026-11-01', [q('1', 'kami', 2)]),
      mk('A', '2026-11-05', [q('2', 'kami', 2), q('3', 'harga', 3)]),
      mk('B', '2026-11-05', [q('4', 'kami', 2)]),
      { not: 'a report' },
    ]);
    expect(rejected).toBe(1);
    expect(reports).toHaveLength(2);
    const g = groupQuestions(reports);
    expect(g[0]).toMatchObject({ chapter: 2, about: 'kami', students: ['A', 'B'] });
    expect(g[1].chapter).toBe(3);
  });
});

describe('Hanashishou bridge', () => {
  it('exports met words with SM-2 state in the shared shape', () => {
    const st = defaultState();
    st.profile.name = 'Aiko';
    st.srs[srsKey('ms-c01-002')] = review(undefined, Rating.Good, new Date('2026-11-06T00:00:00Z'));
    const lib = buildWordLibrary(st, new Date('2026-11-06T00:00:00Z'));
    expect(lib).toMatchObject({ app: 'katakata', kind: 'katakata-word-library', version: 1, student: 'Aiko', suggestedBand: 1 });
    expect(lib.words).toHaveLength(1);
    expect(Object.keys(lib.words[0].srs).sort()).toEqual(['due', 'ease', 'interval', 'lapses', 'reps']);
  });
  it('knows which words Hanashishou teaches', () => {
    expect(isInHanashishou('pejabat pos')).toBe(true);
    expect(isInHanashishou('Selamat pagi')).toBe(false);
  });
  it('ships Jambatan scenes after the class track', () => {
    const bridge = content.scenes.filter((s) => s.world.id === 'jambatan');
    expect(bridge.length).toBeGreaterThanOrEqual(4);
    expect(bridge.every((s) => s.chapter === 9)).toBe(true);
  });
});
