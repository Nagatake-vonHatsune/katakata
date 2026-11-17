// Memory cards, the mistake log, progress reports and student slots (Sam, 17 Nov 2026).
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import * as db from '../../src/core/db';
import { content } from '../../src/core/content';
import { groupMistakes, logMistake, MISTAKE_CAP, mergeMistakes, recordMistake } from '../../src/core/mistakes';
import { buildReportHtml, extractReport, reportHtmlFilename, scriptJson } from '../../src/core/progressreport';
import { buildSavefile, cardFilename, mergeStates, parseSavefile, SAVEFILE_KIND, sha256, stableStringify } from '../../src/core/savefile';
import { newSrs, Rating, review } from '../../src/core/srs';
import * as st from '../../src/core/state';
import { addSlot, autosaves, deleteSlot, loadIntoCurrent, loadSlots, matchSlots, ME, sameStudent, slots, slotState, switchSlot, undoLastLoad, updateSlot } from '../../src/core/slots';
import { readStudentFile } from '../../src/teacher/files';
import { addReports, mistakesAcrossClass } from '../../src/teacher/merge';
import type { AppState } from '../../src/core/types';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const c4 = content.chapters.find((c) => c.chapter === 4)!;
const c5 = content.chapters.find((c) => c.chapter === 5)!;

function learner(name: string, words: number, lang: AppState['settings']['lang'] = 'ja'): AppState {
  const s = st.defaultState();
  s.profile = { name, onboarded: true };
  s.settings.lang = lang;
  for (const id of c4.sedia_kelas.cards.slice(0, words)) s.srs[id] = review(newSrs(), Rating.Good);
  recordMistake(s, { id: c4.sedia_kelas.cards[0], game: 'kad-mc', answer: 'wrong meaning', right: 'right meaning' });
  recordMistake(s, { id: c4.frames[0].id, game: 'susun', answer: 'a b c', right: c4.frames[0].example, decoys: [] });
  return s;
}

describe('the mistake log', () => {
  it('records item, game, answer, right answer and date, and counts per item', () => {
    const s = st.defaultState();
    recordMistake(s, { id: 'ms-c04-001', game: 'kad-mc', answer: 'x', right: 'y' });
    recordMistake(s, { id: 'ms-c04-001', game: 'laju', answer: null, right: 'y' });
    expect(s.mistakes.log).toHaveLength(2);
    expect(s.mistakes.log[0]).toMatchObject({ id: 'ms-c04-001', game: 'kad-mc', answer: 'x', right: 'y' });
    expect(Date.parse(s.mistakes.log[0].date)).not.toBeNaN();
    expect(s.mistakes.counts['ms-c04-001']).toBe(2);
  });
  it('keeps the most recent 300 entries and every per-item count', () => {
    const s = st.defaultState();
    for (let i = 0; i < 350; i++) recordMistake(s, { id: `item-${i % 7}`, game: 'cari', answer: String(i), right: 'r', date: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() });
    expect(MISTAKE_CAP).toBe(300);
    expect(s.mistakes.log).toHaveLength(300);
    expect(s.mistakes.log[0].answer).toBe('50');
    expect(s.mistakes.log[299].answer).toBe('349');
    expect(Object.values(s.mistakes.counts).reduce((a, b) => a + b, 0)).toBe(350);
  });
  it('old saves migrate to an empty log, schemaVersion unchanged', () => {
    const old = clone(st.defaultState()) as unknown as Record<string, unknown>;
    delete old.mistakes;
    delete old.nombor;
    const m = st.migrate(old as AppState & Record<string, unknown>);
    expect(m.schemaVersion).toBe(1);
    expect(m.mistakes).toEqual({ log: [], counts: {} });
    expect(m.nombor).toEqual({});
  });
  it('a merge unions the logs and keeps the larger count', () => {
    const a = learner('A', 1);
    const b = clone(a);
    recordMistake(b, { id: 'x', game: 'reply', answer: 'p', right: 'q' });
    const m = mergeMistakes(a.mistakes, b.mistakes);
    expect(m.log).toHaveLength(3);
    expect(m.counts.x).toBe(1);
    expect(mergeStates(a, b).mistakes.log).toHaveLength(3);
  });
  it('groups by item with the answers, the right answer and the card note', () => {
    const s = learner('A', 2);
    const g = groupMistakes(s);
    const card = content.cards.get(c4.sedia_kelas.cards[0])!;
    expect(g.find((x) => x.id === card.id)).toMatchObject({ kind: 'card', text: card.term, answers: ['wrong meaning'], count: 1 });
    expect(g.find((x) => x.id === c4.frames[0].id)).toMatchObject({ kind: 'frame', text: c4.frames[0].example });
  });
  it('a class run never writes to it', () => {
    st.replaceState(learner('A', 1));
    const before = clone(st.state.mistakes);
    st.beginClassRun();
    logMistake({ id: 'ms-c04-002', game: 'reply', answer: 'x', right: 'y' });
    expect(st.state.mistakes.log.length).toBe(before.log.length + 1);
    st.endClassRun();
    expect(st.state.mistakes).toEqual(before);
  });
});

describe('memory cards', () => {
  it('round trip: save, load, identical state, checksum checked', async () => {
    const s = st.migrate(learner('Aiko Test', 5) as AppState & Record<string, unknown>);
    s.nombor = { masa: { plays: 2, best: 7, total: 8, last: '2026-11-16T00:00:00Z' } };
    const file = await buildSavefile(s, new Date('2026-11-17T09:00:00Z'));
    expect(file.kind).toBe(SAVEFILE_KIND);
    const text = JSON.stringify(file);
    const back = await parseSavefile(text);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.file.state).toEqual(s);
    const tampered = JSON.parse(text);
    tampered.state.srs[c4.sedia_kelas.cards[0]].reps = 99;
    expect(await parseSavefile(JSON.stringify(tampered))).toEqual({ ok: false, reason: 'checksum' });
    expect(cardFilename('Aiko-Test', new Date(2026, 10, 17))).toBe('katakata-card_Aiko-Test_2026-11-17.json');
  });
  it('an old savefile (no mistake log) still loads, with an empty log', async () => {
    const old = clone(learner('Old', 3)) as unknown as Record<string, unknown>;
    delete old.mistakes;
    delete old.nombor;
    const file = { app: 'katakata', kind: SAVEFILE_KIND, schemaVersion: 1, savedAt: '2026-11-10T00:00:00Z', checksum: await sha256(stableStringify(old)), state: old };
    const r = await parseSavefile(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.state.mistakes).toEqual({ log: [], counts: {} });
      expect(r.file.state.profile.name).toBe('Old');
    }
  });
});

describe('the name-match prompt', () => {
  it('matches slots by name, without case or spaces; tells a different student from an unknown one', () => {
    const list = [{ id: ME, name: 'Sam', createdAt: '', chapter: 1, words: 0 }, { id: 's1', name: 'Aiko  Test', createdAt: '', chapter: 4, words: 9 }];
    expect(matchSlots(list, ' aiko test ').map((x) => x.id)).toEqual(['s1']);
    expect(matchSlots(list, 'Ben')).toEqual([]);
    expect(matchSlots(list, '')).toEqual([]);
    expect(sameStudent('Aiko', 'aiko')).toBe('same');
    expect(sameStudent('Aiko', 'Ben')).toBe('different');
    expect(sameStudent('', 'Ben')).toBe('unknown');
  });
});

describe('student slots', () => {
  it('switching keeps every slot apart, saves the slot it leaves, and keeps the device display settings', async () => {
    await st.replaceState(learner('Sam', 3, 'en'));
    await loadSlots();
    const sam = clone(st.state);
    const ben = await addSlot(learner('Ben', 8, 'ja'));
    expect(slots().active).toBe(ME);
    expect(st.state).toEqual(sam); // adding a slot does not touch the active learner
    await switchSlot(ben.id);
    expect(slots().active).toBe(ben.id);
    expect(st.state.profile.name).toBe('Ben');
    expect(st.state.settings.lang).toBe('en'); // the device's language
    expect(Object.keys(st.state.srs)).toHaveLength(8);
    // Ben plays a round.
    st.update((s) => {
      s.srs[c5.cards[0].id] = review(undefined, Rating.Good);
      recordMistake(s, { id: c4.cards[21].id, game: 'kad-mc', answer: 'x', right: 'y' });
    });
    await switchSlot(ME);
    expect(st.state).toEqual(sam); // Sam is exactly as before
    const benNow = (await slotState(ben.id))!;
    expect(Object.keys(benNow.srs)).toHaveLength(9);
    expect(benNow.mistakes.log).toHaveLength(3);
    expect(benNow.settings.lang).toBe('ja'); // Ben's own settings stay in his card
    expect(await deleteSlot(ME)).toBe(false);
  });
  it('updating a slot from a card auto-saves it first and merges the card in', async () => {
    await loadSlots();
    const ben = slots().list.find((x) => x.name === 'Ben')!;
    const card = clone((await slotState(ben.id))!);
    card.srs[c5.cards[1].id] = review(undefined, Rating.Good);
    const n = (await autosaves()).length;
    await updateSlot(ben.id, card, 'merge');
    const a = await autosaves();
    expect(a.length).toBe(Math.min(3, n + 1));
    expect(a[a.length - 1]).toMatchObject({ reason: 'update', slot: ben.id, name: 'Ben' });
    expect(Object.keys((await slotState(ben.id))!.srs)).toHaveLength(10);
    expect(st.state.profile.name).toBe('Sam'); // the active learner is untouched
  });
  it('loading a card into the current learner auto-saves it first, and Undo puts it back', async () => {
    const before = clone(st.state);
    await loadIntoCurrent(learner('Sam', 12, 'en'), 'replace');
    expect(Object.keys(st.state.srs)).toHaveLength(12);
    const a = await autosaves();
    expect(a[a.length - 1]).toMatchObject({ reason: 'load', slot: ME });
    expect(await undoLastLoad()).toBe(true);
    expect(st.state.srs).toEqual(before.srs);
    expect(await db.get('state')).toBeTruthy();
  });
});

describe('the progress report', () => {
  it('is one self-contained HTML file whose embedded JSON parses, in en or ja, with the Malay shown', async () => {
    const s = st.migrate(learner('Aiko <Test>', 6) as AppState & Record<string, unknown>);
    s.questions.push({ id: 'q1', createdAt: '2026-11-16T00:00:00Z', type: 'usage', text: 'When do I say «kesian»?', context: { kind: 'general' }, answered: false });
    for (const lang of ['en', 'ja', 'ms'] as const) {
      const { html, report } = buildReportHtml(s, lang, new Date('2026-11-17T09:00:00Z'));
      expect(html.startsWith('<!doctype html>')).toBe(true);
      expect(html).toContain(`<html lang="${lang === 'ja' ? 'ja' : 'en'}">`);
      // Self-contained: no external fonts, scripts, stylesheets or images.
      expect(html).not.toMatch(/<link|@import|url\(|src=|https?:\/\//);
      expect(html.match(/<script/g)).toHaveLength(1);
      expect(html).toContain('type="application/json" id="katakata-report"');
      expect(html).toContain('Aiko &lt;Test&gt;');
      expect(html).toContain('lang="ms"');
      expect(html).toContain('@page{size:A4');
      const back = extractReport(html)!;
      expect(back.student).toBe('Aiko <Test>');
      expect(back).toEqual({ ...JSON.parse(JSON.stringify(report)), source: 'html' });
      expect(back.mistakes!.length).toBe(2);
      expect(back.progress!.length).toBe(content.chapters.length);
      expect(back.nextSteps!.length).toBeGreaterThan(0);
      expect(back.nextSteps![0]).toContain('chapter 4'); // the chapter the student is on, not chapter 1
    }
    expect(buildReportHtml(s, 'ja').html).toContain('見直す間違い');
    expect(buildReportHtml(s, 'en').html).toContain('Mistakes to review');
    expect(reportHtmlFilename('Aiko', new Date(2026, 10, 17))).toBe('katakata-report_Aiko_2026-11-17.html');
    expect(scriptJson({ a: '</script><!--' })).not.toMatch(/<\/script|<!--/);
  });
  it('the Teacher Desk reads a progress report, a memory card and the old report file', async () => {
    const a = st.migrate(learner('Aiko', 6) as AppState & Record<string, unknown>);
    const b = st.migrate(learner('Ben', 4) as AppState & Record<string, unknown>);
    const html = await readStudentFile(buildReportHtml(a, 'ja').html);
    const card = await readStudentFile(JSON.stringify(await buildSavefile(b)));
    const old = await readStudentFile(JSON.stringify({ app: 'katakata', kind: 'katakata-teacher-report', version: 1, student: 'Chie', createdAt: '2026-11-01T00:00:00Z' }));
    const junk = await readStudentFile('<html><body>hello</body></html>');
    expect(html.ok && html.report.source).toBe('html');
    expect(card.ok && card.report.source).toBe('card');
    expect(card.ok && card.report.student).toBe('Ben');
    expect(card.ok && card.report.mistakes!.length).toBe(2);
    expect(old.ok && old.report.student).toBe('Chie');
    expect(junk.ok).toBe(false);
    const all = addReports([], [html, card, old].map((r) => (r.ok ? r.report : null)));
    expect(all.reports.map((r) => r.student)).toEqual(['Aiko', 'Ben', 'Chie']);
    const cm = mistakesAcrossClass(all.reports);
    expect(cm[0].students.sort()).toEqual(['Aiko', 'Ben']);
  });
});
