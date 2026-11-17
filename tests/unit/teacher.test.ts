// Teacher mode (Sam, 17 Nov 2026): class runs never change the learner, the unlock bypass is teacher-mode only, the keys,
// and the class slides.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import * as db from '../../src/core/db';
import { activities, buildSlides, ClassRun, optionCount, rightOption, type Slide } from '../../src/core/classroom';
import { content } from '../../src/core/content';
import { keyAction } from '../../src/core/keys';
import { addStudySeconds, awardStamps, checkpoints, recordDialogue, stretchOpen, stretchUnlocked } from '../../src/core/progress';
import { foldRecords, Scorer } from '../../src/core/score';
import { newSrs, Rating, review } from '../../src/core/srs';
import * as st from '../../src/core/state';
import { defaultPrefs, loadTeacher, setTeacher, teacher } from '../../src/core/teacher';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('teacher-mode keys', () => {
  it('→ / Space / PageDown = next, ← / PageUp = back, 1 to 4 choose, R reveal, H translations, P play', () => {
    for (const key of ['ArrowRight', ' ', 'PageDown']) expect(keyAction({ key })).toEqual({ kind: 'next' });
    for (const key of ['ArrowLeft', 'PageUp']) expect(keyAction({ key })).toEqual({ kind: 'back' });
    for (const n of [1, 2, 3, 4]) expect(keyAction({ key: String(n) })).toEqual({ kind: 'choose', n });
    expect(keyAction({ key: 'r' })).toEqual({ kind: 'reveal' });
    expect(keyAction({ key: 'R' })).toEqual({ kind: 'reveal' });
    expect(keyAction({ key: 'h' })).toEqual({ kind: 'translations' });
    expect(keyAction({ key: 'P' })).toEqual({ kind: 'audio' });
  });
  it('ignores other keys, shortcuts with Ctrl / Cmd / Alt, and typing in a text field', () => {
    expect(keyAction({ key: 'x' })).toBeNull();
    expect(keyAction({ key: 'Enter' })).toBeNull();
    expect(keyAction({ key: '0' })).toBeNull();
    expect(keyAction({ key: 'r', ctrlKey: true })).toBeNull();
    expect(keyAction({ key: 'ArrowRight', metaKey: true })).toBeNull();
    expect(keyAction({ key: '1', target: { tagName: 'input' } })).toBeNull();
    expect(keyAction({ key: 'p', target: { tagName: 'TEXTAREA' } })).toBeNull();
  });
});

describe('teacher mode is a device setting', () => {
  it('is off by default, saved under its own key, never in the learner state', async () => {
    expect(defaultPrefs().on).toBe(false);
    await loadTeacher();
    expect(teacher.on).toBe(false);
    await setTeacher({ on: true });
    expect(await db.get('teacher')).toMatchObject({ on: true });
    expect(JSON.stringify(st.state)).not.toMatch(/"teacher"|lajuTimer/);
    await setTeacher({ on: false });
  });
});

describe('the unlock bypass applies only in teacher mode', () => {
  it('⚡ is locked for a new learner, open in teacher mode; the learner\'s own progress (stretchOpen) is unchanged', () => {
    const s = st.defaultState();
    for (const x of content.stretch) {
      expect(stretchOpen(x.chapter, s)).toBe(false);
      expect(stretchUnlocked(x.chapter, s, false)).toBe(false);
      expect(stretchUnlocked(x.chapter, s, true)).toBe(true);
    }
    expect(stretchUnlocked(99, s, true)).toBe(false); // no pack, nothing to open
  });
  it('class activities are offered for every chapter whatever the learner has done', () => {
    for (const ch of content.chapters) {
      const ids = activities({ kind: 'chapter', chapter: ch.chapter }).map((a) => a.id);
      expect(ids).toEqual(expect.arrayContaining(['words', 'frames', 'dialogue', 'xframes', 'xdialogue']));
      if (content.stretch.find((x) => x.chapter === ch.chapter)!.cards.length) expect(ids).toContain('xwords');
    }
  });
});

describe('a class run never changes the learner', () => {
  it('state, flames, records and the saved copy are identical after a class run that "plays" everything', async () => {
    // A learner with some progress.
    const s = st.defaultState();
    s.profile = { name: 'Test Learner', onboarded: true };
    const c4 = content.chapters.find((c) => c.chapter === 4)!;
    for (const id of c4.sedia_kelas.cards.slice(0, 5)) s.srs[id] = review(newSrs(), Rating.Good);
    s.stamps.push({ id: 'st-1', kind: 'ready', date: '2026-11-10', chapter: 2 });
    await st.replaceState(s);
    const before = clone(st.state);
    const flamesBefore = content.chapters.map((c) => checkpoints(c.chapter).map((x) => x.lit));
    const savedBefore = clone(await db.get('state'));

    st.beginClassRun();
    expect(st.inClassRun()).toBe(true);
    // Everything a game or the session runner could write during play:
    st.update((x) => {
      for (const c of c4.cards) x.srs[c.id] = review(x.srs[c.id], Rating.Good);
      for (const f of c4.frames) x.frames[f.id] = { tries: 1, correct: 1 };
      for (const l of c4.scenario.lines) x.lines[l.id] = { tries: 1, correct: 1 };
      recordDialogue(x, 'c04', 9, 9);
      x.kanaSeen['ms-c04-001'] = 3;
      x.howToSeen.kad = true;
      const sc = new Scorer();
      sc.hit('kad', true, 500);
      foldRecords(x.scores, sc, 'session');
    });
    addStudySeconds(600);
    awardStamps(true);
    // A whole class run through the ⚡ 4 dialogue and frames, answering every step.
    for (const act of ['xdialogue', 'xframes', 'words', 'laju'] as const) {
      const run = new ClassRun(buildSlides({ kind: 'chapter', chapter: 4 }, act));
      while (!run.done) {
        run.choose(1);
        run.next();
      }
    }
    expect(st.state.stamps.length).toBeGreaterThan(before.stamps.length); // the copy did change …
    await st.saveNow(); // … but is never saved
    st.endClassRun();

    expect(st.inClassRun()).toBe(false);
    expect(st.state).toEqual(before);
    expect(content.chapters.map((c) => checkpoints(c.chapter).map((x) => x.lit))).toEqual(flamesBefore);
    await new Promise((r) => setTimeout(r, 20));
    expect(await db.get('state')).toEqual(savedBefore);
  });
  it('a language change during a class run is kept (display settings are not learner data)', () => {
    const before = clone(st.state);
    st.beginClassRun();
    st.update((x) => {
      x.settings.lang = 'en';
      x.srs['ms-c01-001'] = review(undefined, Rating.Easy);
    });
    st.endClassRun();
    expect(st.state.settings.lang).toBe('en');
    expect(st.state.srs).toEqual(before.srs);
  });
});

describe('class slides', () => {
  const all = (act: Parameters<typeof buildSlides>[1]) => content.chapters.flatMap((c) => buildSlides({ kind: 'chapter', chapter: c.chapter }, act));
  it('dialogues: one slide per line, in order; a ⚡ reply step has three options and exactly one right', () => {
    for (const ch of content.chapters) {
      const slides = buildSlides({ kind: 'chapter', chapter: ch.chapter }, 'dialogue');
      expect(slides.map((s) => (s as { lineId: string }).lineId)).toEqual(ch.scenario.lines.map((l) => l.id));
      expect(slides.every((s) => s.kind === 'line')).toBe(true);
    }
    const replies = all('xdialogue').filter((s): s is Extract<Slide, { kind: 'reply' }> => s.kind === 'reply');
    expect(replies.length).toBeGreaterThan(50);
    for (const r of replies) {
      expect(r.options).toHaveLength(3);
      expect(r.options.filter((o) => o.correct)).toHaveLength(1);
      expect(r.options[rightOption(r)!].ms).toBe(content.lines.get(r.lineId)!.line.ms);
    }
  });
  it('frames: the bank holds the sentence\'s tiles plus the ⚡ decoys, never in sentence order', () => {
    for (const s of [...all('frames'), ...all('xframes')]) {
      if (s.kind !== 'frame') throw new Error('not a frame');
      const f = content.frames.get(s.frameId)!;
      const words = f.example.split(/\s+/);
      expect(s.bank.slice().sort()).toEqual([...words, ...(f.decoys ?? [])].sort());
      if (words.length > 1) expect(s.bank.filter((w) => !(f.decoys ?? []).includes(w)).join(' ')).not.toBe(f.example);
    }
  });
  it('Next reveals first where a slide has an answer, then moves on; a dialogue line just moves on; Back goes back unrevealed', () => {
    const run = new ClassRun(buildSlides({ kind: 'chapter', chapter: 4 }, 'xdialogue'));
    expect(run.slide!.kind).toBe('line');
    expect(run.next()).toBe('moved');
    expect(run.slide!.kind).toBe('reply');
    expect(run.choose(2)).toBe(true);
    expect(run.chosen).toBe(1);
    expect(run.next()).toBe('revealed');
    expect(run.choose(1)).toBe(false); // no change after the reveal
    expect(run.next()).toBe('moved');
    expect(run.back()).toBe(true);
    expect(run.revealed).toBe(false);
    expect(run.chosen).toBeNull();
    expect(run.choose(9)).toBe(false); // only three options
  });
  it('number keys place frame tiles in order; Laju! marks at once and counts the right answers', () => {
    const fr = new ClassRun(buildSlides({ kind: 'chapter', chapter: 4 }, 'xframes'));
    const s = fr.slide as Extract<Slide, { kind: 'frame' }>;
    fr.choose(1);
    fr.choose(1);
    expect(fr.built).toEqual([0, 1]);
    expect(optionCount(s)).toBe(s.bank.length);
    const lj = new ClassRun(buildSlides({ kind: 'chapter', chapter: 4 }, 'laju'));
    const right = rightOption(lj.slide!)!;
    lj.choose(right + 1);
    expect(lj.revealed).toBe(true);
    expect(lj.right).toBe(1);
  });
  it('Jambatan scenes, Cari Benda boards and Nombor & Masa parts all make slides', () => {
    for (const sc of content.scenes.filter((x) => x.world.id === 'jambatan')) expect(buildSlides({ kind: 'scene', sceneId: sc.id }, 'words').length).toBe(sc.cards.length);
    const board = activities({ kind: 'chapter', chapter: 4 }).find((a) => a.id === 'cari');
    expect(board?.count).toBeGreaterThan(0);
    for (const part of ['nombor', 'hari', 'bulan', 'pecahan', 'wang', 'masa'] as const) {
      expect(buildSlides({ kind: 'nombor', part }, 'nombor')).toHaveLength(8);
      expect(buildSlides({ kind: 'nombor', part }, 'explore')).toEqual([{ kind: 'explore', part }]);
    }
  });
});
