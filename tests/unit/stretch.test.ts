// The ⚡ stage (Build A, 15 Nov 2026): checkpoints, unlock, moved cards, decoys, the reply step, migrate, merge, contrast.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content, srsKey } from '../../src/core/content';
import { chapterProgress, checkpoints, dialogueReplyIds, isReady, stretchOpen, stretchProgress, unseenStretchOpen } from '../../src/core/progress';
import { buildDialogue, buildSedia, buildStretch, buildToday, distractors, replyOptions, reviewStep, stretchReplyIds } from '../../src/core/session';
import { mergeStates } from '../../src/core/savefile';
import { newSrs, Rating, review } from '../../src/core/srs';
import { defaultState, migrate, MOVED_CARDS, moveCards } from '../../src/core/state';
import type { AppState, Stamp } from '../../src/core/types';
import { bankTiles, isBuilt, tiles } from '../../src/games/susun-ayat';
import { segmentWidths } from '../../src/views/stretch';

const root = join(__dirname, '../..');
const x04 = content.stretch.find((x) => x.chapter === 4)!;
const known = () => ({ ...review(undefined, Rating.Good), last: Date.now() });
const stamp = (kind: Stamp['kind'], chapter: number, date = '2026-11-01'): Stamp => ({ id: `${kind}-${chapter}-${date}`, kind, date, chapter });

/** A learner who reached every checkpoint of a chapter now (no stamps). */
function finished(chapter: number, s: AppState = defaultState()): AppState {
  const ch = content.chapters.find((c) => c.chapter === chapter)!;
  for (const id of [...ch.sedia_kelas.cards, ...ch.cards.map((c) => c.id)]) s.srs[srsKey(id)] = known();
  for (const f of ch.sedia_kelas.frames) s.frames[f] = { tries: 1, correct: 1 };
  for (const id of dialogueReplyIds(chapter)) s.lines[id] = { tries: 1, correct: 1 };
  return s;
}

describe('⚡ content', () => {
  it('ships ⚡ 4 only: 19 extension cards, 6 frames with decoys, 14 dialogue lines with 5 reply steps', () => {
    expect(content.stretch.map((x) => x.id)).toEqual(['x04']);
    expect(x04.cards).toHaveLength(19);
    expect(x04.cards.map((c) => c.id)).toEqual(Array.from({ length: 19 }, (_, i) => `ms-x04-${String(i + 1).padStart(3, '0')}`));
    expect(x04.frames).toHaveLength(6);
    for (const f of x04.frames) {
      expect(f.decoys!.length, f.id).toBeGreaterThan(0);
      for (const d of f.decoys!) expect(tiles(f.example), f.id).not.toContain(d);
    }
    expect(x04.scenario.lines).toHaveLength(14);
    expect(stretchReplyIds(4)).toHaveLength(5);
  });
  it('keeps ⚡ cards out of chapters, the learning path, Sedia Kelas and prep counts', () => {
    const ids = new Set(x04.cards.map((c) => c.id));
    expect(content.chapters.some((ch) => ch.cards.some((c) => ids.has(c.id)) || ch.sedia_kelas.cards.some((id) => ids.has(id)))).toBe(false);
    expect(content.path.some((id) => ids.has(id))).toBe(false);
    expect(content.scenes.some((s) => s.cards.some((c) => ids.has(c.id)))).toBe(false);
    // Prep counts (Sedia Kelas, the Teacher Desk's "Ch4 prep") do not change when every ⚡ card is known.
    const s = defaultState();
    const before = chapterProgress(4, s);
    for (const c of x04.cards) s.srs[c.id] = known();
    expect(chapterProgress(4, s)).toEqual(before);
    // Today's practice never introduces a ⚡ card, and Sedia Kelas never shows one.
    expect(buildToday(defaultState()).steps.some((st) => 'cardId' in st && ids.has(st.cardId))).toBe(false);
    expect(buildSedia(4, defaultState()).steps.some((st) => 'cardId' in st && ids.has(st.cardId))).toBe(false);
  });
  it('a ⚡ card is no distractor until it is met; a ⚡ card draws from its own stage first', () => {
    const ids = new Set(x04.cards.map((c) => c.id));
    const s = defaultState();
    const core = content.chapters[3].cards[0];
    for (let i = 0; i < 30; i++) expect(distractors(core, 3, s).some((c) => ids.has(c.id))).toBe(false);
    const beri = content.cards.get('ms-x04-001')!;
    const opts = distractors(beri, 3, s);
    expect(opts.some((c) => ids.has(c.id) || c.chapter === 4)).toBe(true);
  });
  it('⚡ cards come to Malay-first recall after one correct answer', () => {
    const s = defaultState();
    s.srs['ms-x04-008'] = review(undefined, Rating.Good);
    const kinds = new Set(Array.from({ length: 40 }, () => { const st = reviewStep('ms-x04-008', s); return st.kind === 'mc' ? st.dir : st.kind; }));
    expect(kinds.has('recall') || kinds.has('x2ms')).toBe(true);
    const core = content.chapters[3].cards[0].id;
    s.srs[core] = review(undefined, Rating.Good);
    expect(reviewStep(core, s)).toEqual({ kind: 'mc', cardId: core, dir: 'ms2x' });
  });
});

describe('🔥 checkpoints', () => {
  it('three per chapter (prep, the dialogue, every word), two for chapter 18 (no cards of its own)', () => {
    for (const ch of content.chapters.filter((c) => c.chapter < 18))
      expect(checkpoints(ch.chapter, defaultState()).map((c) => c.kind), `chapter ${ch.chapter}`).toEqual(['ready', 'dialogue', 'chapter']);
    expect(checkpoints(18, defaultState()).map((c) => c.kind)).toEqual(['ready', 'dialogue']);
  });
  it('a new learner has none lit; meeting each condition lights its flame', () => {
    const s = defaultState();
    expect(checkpoints(4, s).map((c) => c.lit)).toEqual([false, false, false]);
    const f = finished(4);
    expect(isReady(4, f)).toBe(true);
    expect(checkpoints(4, f).map((c) => c.lit)).toEqual([true, true, true]);
    expect(checkpoints(4, f).every((c) => c.done === c.total)).toBe(true);
  });
  it('lights from existing stamps on first launch (a learner who finished chapter 4 before the update)', () => {
    const s = defaultState();
    s.stamps = [stamp('ready', 4), stamp('chapter', 4)];
    expect(checkpoints(4, s).map((c) => [c.kind, c.lit])).toEqual([['ready', true], ['dialogue', false], ['chapter', true]]);
    s.stamps.push(stamp('dialogue', 4));
    expect(checkpoints(4, s).every((c) => c.lit)).toBe(true);
  });
  it('once lit a flame stays lit: a lapse lowers the bar but not the flame', () => {
    const s = finished(4);
    s.stamps = [stamp('ready', 4), stamp('dialogue', 4), stamp('chapter', 4)];
    const id = srsKey(content.chapters[3].sedia_kelas.cards[0]);
    s.srs[id] = review(s.srs[id], Rating.Again);
    const cps = checkpoints(4, s);
    expect(cps[0].met).toBe(false);
    expect(cps[0].done).toBeLessThan(cps[0].total);
    expect(cps.every((c) => c.lit)).toBe(true);
    expect(stretchOpen(4, s)).toBe(true);
  });
  it('the dialogue checkpoint needs every reply line answered once, right or wrong', () => {
    const s = defaultState();
    const ids = dialogueReplyIds(4);
    expect(ids).toHaveLength(content.chapters[3].scenario.lines.length - 1);
    for (const id of ids.slice(0, -1)) s.lines[id] = { tries: 1, correct: 0 };
    expect(checkpoints(4, s)[1].lit).toBe(false);
    s.lines[ids[ids.length - 1]] = { tries: 1, correct: 0 };
    expect(checkpoints(4, s)[1].lit).toBe(true);
    expect(buildDialogue(4).steps.map((st) => (st as { lineId: string }).lineId)).toEqual(ids);
  });
});

describe('⚡ unlock', () => {
  it('opens when every flame is lit, only for a chapter with a ⚡ stage', () => {
    expect(stretchOpen(4, defaultState())).toBe(false);
    expect(stretchOpen(4, finished(4))).toBe(true);
    expect(stretchOpen(5, finished(5))).toBe(false);
  });
  it('the one-time notice is pending until howToSeen stretch-4 is set', () => {
    const s = finished(4);
    expect(unseenStretchOpen(s)).toEqual([4]);
    s.howToSeen['stretch-4'] = true;
    expect(unseenStretchOpen(s)).toEqual([]);
  });
  it('a ⚡ run: new extension cards in an intro block, two ⚡ frames and three replies', () => {
    const run = buildStretch(4, finished(4));
    expect(run.steps.filter((s) => s.kind === 'intro')).toHaveLength(8);
    expect(run.steps.filter((s) => s.kind === 'susun')).toHaveLength(2);
    expect(run.steps.filter((s) => s.kind === 'susun').every((s) => (s as { frameId: string }).frameId.startsWith('ms-x04-f'))).toBe(true);
    expect(run.steps.filter((s) => s.kind === 'reply')).toHaveLength(3);
  });
  it('⚡ done (the stretch stamp condition): every extension card known and every ⚡ frame built once', () => {
    const s = finished(4);
    for (const c of x04.cards) s.srs[c.id] = known();
    expect(stretchProgress(4, s).done).toBe(false);
    for (const f of x04.frames) s.frames[f.id] = { tries: 1, correct: 1 };
    expect(stretchProgress(4, s)).toMatchObject({ known: 19, total: 19, framesBuilt: 6, framesTotal: 6, done: true });
  });
});

describe('moved cards (Jambatan → ⚡ 4)', () => {
  it('maps the 7 promoted Jambatan IDs to live ⚡ cards with the same word; the old IDs are retired', () => {
    expect(Object.keys(MOVED_CARDS)).toHaveLength(7);
    const importer = readFileSync(join(root, 'tools/import_hanashishou_bridge.py'), 'utf8');
    for (const [from, to] of Object.entries(MOVED_CARDS)) {
      expect(content.cards.has(from), from).toBe(false);
      expect(content.cards.get(to)?.scene, to).toBe('stretch-x04');
      expect(importer).toContain(`"${from}"`);
    }
    expect(content.cards.get(MOVED_CARDS['ms-j-social-22'])!.term).toBe('beri');
  });
  it('migrate copies the old schedule once, and never over a schedule the new ID already has', () => {
    const old = { ...review(undefined, Rating.Good), last: 1 };
    const m = migrate({ srs: { 'ms-j-social-22': old } } as never);
    expect(m.srs['ms-x04-001']).toEqual(old);
    expect(m.srs['ms-j-social-22']).toEqual(old);
    const mine = { ...newSrs(), reps: 4, interval: 20, last: 2 };
    expect(moveCards({ 'ms-j-social-22': old, 'ms-x04-001': mine })['ms-x04-001']).toEqual(mine);
    // So a learner who knew «beri» from Jambatan starts ⚡ 4 with it known.
    expect(stretchProgress(4, m).known).toBe(1);
  });
});

describe('migrate (schemaVersion stays 1)', () => {
  it('adds state.lines to an older state and keeps it when present', () => {
    const m = migrate({ schemaVersion: 1, srs: {}, frames: {} } as never);
    expect(m.schemaVersion).toBe(1);
    expect(m.lines).toEqual({});
    expect(migrate({ lines: { a: { tries: 2, correct: 1 } } } as never).lines).toEqual({ a: { tries: 2, correct: 1 } });
  });
});

describe('savefile merge with the new stamp kinds and lines', () => {
  it('one chapter stamp per kind and chapter (the earliest date wins); day stamps per date; lines take the max', () => {
    const a = defaultState();
    const b = defaultState();
    a.stamps = [stamp('dialogue', 4, '2026-11-10'), stamp('stretch', 4, '2026-11-12'), { id: 'd1', kind: 'day', date: '2026-11-10' }];
    b.stamps = [stamp('dialogue', 4, '2026-11-08'), stamp('ready', 4, '2026-11-08'), stamp('stretch', 4, '2026-11-12'), { id: 'd2', kind: 'day', date: '2026-11-11' }];
    a.lines = { 'ms-c04-s02': { tries: 1, correct: 0, last: '2026-11-10' } };
    b.lines = { 'ms-c04-s02': { tries: 3, correct: 2, last: '2026-11-11' }, 'ms-x04-d02': { tries: 1, correct: 1 } };
    const m = mergeStates(a, b);
    const of = (kind: string) => m.stamps.filter((s) => s.kind === kind);
    expect(of('dialogue')).toHaveLength(1);
    expect(of('dialogue')[0].date).toBe('2026-11-08');
    expect(of('stretch')).toHaveLength(1);
    expect(of('ready')).toHaveLength(1);
    expect(of('day')).toHaveLength(2);
    expect(m.lines['ms-c04-s02']).toEqual({ tries: 3, correct: 2, last: '2026-11-11' });
    expect(m.lines['ms-x04-d02']).toEqual({ tries: 1, correct: 1 });
    // A merged learner who finished chapter 4 on the other device keeps their flames.
    expect(checkpoints(4, mergeStates(defaultState(), { ...b, stamps: [...b.stamps, stamp('chapter', 4)] })).map((c) => c.lit)).toEqual([true, true, true]);
  });
  it('an older savefile (no lines, old Jambatan IDs) merges into the ⚡ IDs', () => {
    const older = migrate({ srs: { 'ms-j-office-44': { ...review(undefined, Rating.Good), last: 5 } } } as never);
    const m = mergeStates(defaultState(), older);
    expect(m.srs['ms-x04-007']).toBeDefined();
    expect(m.lines).toEqual({});
  });
});

describe('Susun Ayat decoys', () => {
  it('the bank holds every tile of the sentence and the decoys; a decoy in the answer is wrong', () => {
    const f = x04.frames[0];
    const bank = bankTiles(f.example, f.decoys);
    expect(bank.slice().sort()).toEqual([...tiles(f.example), ...f.decoys!].sort());
    expect(isBuilt(tiles(f.example), f.example)).toBe(true);
    const withDecoy = tiles(f.example).map((w) => (w === 'selepas' ? 'sebelum' : w));
    expect(isBuilt(withDecoy, f.example)).toBe(false);
    expect(isBuilt([...tiles(f.example), f.decoys![0]], f.example)).toBe(false);
  });
  it('a frame without decoys is unchanged: the bank is the sentence, never already in order', () => {
    const f = content.chapters[3].frames[1];
    for (let i = 0; i < 20; i++) {
      const b = bankTiles(f.example);
      expect(b.slice().sort()).toEqual(tiles(f.example).slice().sort());
      expect(b.join(' ')).not.toBe(f.example);
    }
  });
});

describe('the reply step', () => {
  it('a ⚡ line: the line before is the prompt, three options, exactly one right, the wrong ones authored', () => {
    for (const id of stretchReplyIds(4)) {
      const r = replyOptions(id);
      const line = content.lines.get(id)!.line;
      expect(r.prompt).not.toBeNull();
      expect(r.options).toHaveLength(3);
      expect(r.options.filter((o) => o.correct).map((o) => o.ms)).toEqual([line.ms]);
      expect(r.options.filter((o) => !o.correct).map((o) => o.ms).sort()).toEqual(line.choices!.slice().sort());
    }
  });
  it('a core line: two other lines of the same dialogue as wrong replies, never the prompt or the answer', () => {
    for (const ch of content.chapters)
      for (const id of dialogueReplyIds(ch.chapter)) {
        const r = replyOptions(id);
        const right = r.options.filter((o) => o.correct);
        expect(right, id).toHaveLength(1);
        expect(right[0].lineId).toBe(id);
        const wrong = r.options.filter((o) => !o.correct);
        expect(wrong.length, id).toBe(2);
        for (const w of wrong) {
          expect(w.lineId).not.toBe(r.prompt!.id);
          expect(w.ms).not.toBe(r.answer.ms);
          expect(content.lines.get(w.lineId!)!.chapter).toBe(ch.chapter);
        }
      }
  });
});

describe('the 🔥 bar', () => {
  it('segments are proportional to item counts, none under 15 %', () => {
    const w = segmentWidths([28, 9, 49]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0.15 - 1e-9);
    expect(w[2]).toBeGreaterThan(w[0]);
    expect(segmentWidths([34, 19])).toHaveLength(2);
    expect(segmentWidths([0, 0, 0])).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
});

describe('the ⚡ blue accent (design note section 3, WCAG 2.x)', () => {
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  const block = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', at));
    return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  };
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const themes: Record<string, string> = {
    'kancil-light': ':root',
    'kancil-dark': ":root[data-theme='dark']",
    'cyan-light': ":root[data-palette='cyan']",
    'cyan-dark': ":root[data-palette='cyan'][data-theme='dark']",
    'royal-light': ":root[data-palette='royal']",
    'royal-dark': ":root[data-palette='royal'][data-theme='dark']",
    'rebel-light': ":root[data-palette='rebel']",
    'rebel-dark': ":root[data-palette='rebel'][data-theme='dark']",
  };
  const expected: Record<string, [string, string, string]> = {
    'kancil-light': ['#1a5bc8', '#ffffff', '#e3ecfb'],
    'kancil-dark': ['#7cb4ff', '#08142b', '#1b2b45'],
    'cyan-light': ['#1d55c4', '#ffffff', '#e2eafb'],
    'cyan-dark': ['#86b8ff', '#071a33', '#1a2a47'],
    'royal-light': ['#1f4fbf', '#ffffff', '#e3e9fa'],
    'royal-dark': ['#8ab4ff', '#0a1530', '#1f2a4a'],
    'rebel-light': ['#0064a8', '#ffffff', '#dcedf8'],
    'rebel-dark': ['#5fd0ff', '#03192a', '#0f3047'],
  };
  for (const [name, sel] of Object.entries(themes))
    it(`${name}: the design note's values, text pairs ≥ 4.5, the bar against its track ≥ 3`, () => {
      const v = block(sel);
      expect([v.stretch, v['stretch-ink'], v['stretch-soft']]).toEqual(expected[name]);
      expect(ratio(v.stretch, v.surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v.stretch, v.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v.stretch, v['surface-2'])).toBeGreaterThanOrEqual(3);
      expect(ratio(v['stretch-ink'], v.stretch)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v.stretch, v['stretch-soft'])).toBeGreaterThanOrEqual(4.5);
    });
  it('the dark values under prefers-color-scheme match the data-theme=dark ones', () => {
    for (const p of ['', "[data-palette='cyan']", "[data-palette='royal']", "[data-palette='rebel']"]) {
      const media = block(`  :root${p}:not([data-theme='light'])`);
      const attr = block(`:root${p}[data-theme='dark']`);
      expect([media.stretch, media['stretch-ink'], media['stretch-soft']]).toEqual([attr.stretch, attr['stretch-ink'], attr['stretch-soft']]);
    }
  });
});
