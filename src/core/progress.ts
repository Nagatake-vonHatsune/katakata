import { content, srsKey } from './content';
import { dayKey, daysBetween, uid, weekKeys } from './dates';
import { isKnown, weakness } from './srs';
import { state, update } from './state';
import type { AppState, Stamp } from './types';

export function knownCount(s: AppState = state): number {
  return Object.values(s.srs).filter(isKnown).length;
}

export function chapterProgress(chapter: number, s: AppState = state) {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!ch) return { known: 0, total: 0, coreKnown: 0, coreTotal: 0 };
  const known = ch.cards.filter((c) => isKnown(s.srs[srsKey(c.id)])).length;
  const coreKnown = ch.sedia_kelas.cards.filter((id) => isKnown(s.srs[srsKey(id)])).length;
  return { known, total: ch.cards.length, coreKnown, coreTotal: ch.sedia_kelas.cards.length };
}

export function sceneProgress(sceneId: string, s: AppState = state) {
  const sc = content.scenes.find((x) => x.id === sceneId);
  if (!sc) return { known: 0, total: 0 };
  return { known: sc.cards.filter((c) => isKnown(s.srs[srsKey(c.id)])).length, total: sc.cards.length };
}

/** Sedia Kelas is done when every core word is known and both frames were built correctly. */
export function isReady(chapter: number, s: AppState = state): boolean {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!ch) return false;
  const p = chapterProgress(chapter, s);
  const framesOk = ch.sedia_kelas.frames.every((f) => (s.frames[f]?.correct ?? 0) > 0);
  return p.coreKnown === p.coreTotal && framesOk;
}

/** The first chapter not yet ready (what "next class" means for a self-paced learner). */
export function nextChapter(s: AppState = state): number {
  const ch = content.chapters.find((c) => !isReady(c.chapter, s));
  return (ch ?? content.chapters[content.chapters.length - 1])?.chapter ?? 1;
}

function hasStamp(kind: Stamp['kind'], date: string, chapter?: number, s: AppState = state): boolean {
  return s.stamps.some((x) => x.kind === kind && (kind === 'day' ? x.date === date : x.chapter === chapter));
}

// ---- 🔥 checkpoints and the ⚡ stage (docs/STRETCH-STAGE-design.md; Sam's decisions of 15 Nov 2026) ----

export type CheckpointKind = 'ready' | 'dialogue' | 'chapter';

export interface Checkpoint {
  kind: CheckpointKind;
  /** Items in this checkpoint's bar segment, and how many are done. */
  done: number;
  total: number;
  /** The condition is true now. */
  met: boolean;
  /** Lit: stamped, or met now. Once stamped it stays lit, even if a card lapses. */
  lit: boolean;
}

/** Reply lines of a chapter dialogue: every line but the first (line i is the reply to line i - 1). */
export function dialogueReplyIds(chapter: number): string[] {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  return ch && ch.scenario.lines.length >= 2 ? ch.scenario.lines.slice(1).map((l) => l.id) : [];
}

/** True when every reply line of the chapter dialogue has been answered at least once. */
export function dialogueDone(chapter: number, s: AppState = state): boolean {
  const ids = dialogueReplyIds(chapter);
  return ids.length > 0 && ids.every((id) => (s.lines?.[id]?.tries ?? 0) > 0);
}

/**
 * The chapter's checkpoints, in bar order: 1 class prep, 2 the chapter dialogue played once, 3 every card known.
 * A chapter has the dialogue checkpoint only if its pack has scenario lines, and the last one only if it has cards of its
 * own (chapter 18, a review pack, has none), so chapters 1 to 17 have 3 and chapter 18 has 2.
 */
export function checkpoints(chapter: number, s: AppState = state): Checkpoint[] {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!ch) return [];
  const p = chapterProgress(chapter, s);
  const framesBuilt = ch.sedia_kelas.frames.filter((f) => (s.frames[f]?.correct ?? 0) > 0).length;
  const out: Checkpoint[] = [];
  const push = (kind: CheckpointKind, done: number, total: number, met: boolean) =>
    out.push({ kind, done, total, met, lit: met || hasStamp(kind, '', chapter, s) });
  push('ready', p.coreKnown + framesBuilt, p.coreTotal + ch.sedia_kelas.frames.length, isReady(chapter, s));
  const replies = dialogueReplyIds(chapter);
  if (replies.length) push('dialogue', replies.filter((id) => (s.lines?.[id]?.tries ?? 0) > 0).length, replies.length, dialogueDone(chapter, s));
  if (ch.cards.length) {
    const prep = new Set(ch.sedia_kelas.cards);
    const rest = ch.cards.filter((c) => !prep.has(c.id));
    push('chapter', rest.filter((c) => isKnown(s.srs[srsKey(c.id)])).length, rest.length, p.known === p.total);
  }
  return out;
}

export function stretchPack(chapter: number) {
  return content.stretch.find((x) => x.chapter === chapter);
}

/** ⚡ is open: the chapter has a ⚡ stage and every 🔥 is lit. */
export function stretchOpen(chapter: number, s: AppState = state): boolean {
  const cps = checkpoints(chapter, s);
  return !!stretchPack(chapter) && cps.length > 0 && cps.every((c) => c.lit);
}

/** ⚡ progress: extension cards known and ⚡ frames built. Done when both are complete (the 'stretch' stamp). */
export function stretchProgress(chapter: number, s: AppState = state) {
  const x = stretchPack(chapter);
  if (!x) return { known: 0, total: 0, framesBuilt: 0, framesTotal: 0, done: false };
  const known = x.cards.filter((c) => isKnown(s.srs[srsKey(c.id)])).length;
  const framesBuilt = x.frames.filter((f) => (s.frames[f.id]?.correct ?? 0) > 0).length;
  return { known, total: x.cards.length, framesBuilt, framesTotal: x.frames.length, done: known === x.cards.length && framesBuilt === x.frames.length };
}

/** Chapters whose ⚡ just opened and whose one-time "⚡ is open" notice has not been shown (howToSeen key stretch-N). */
export function unseenStretchOpen(s: AppState = state): number[] {
  return content.stretch.filter((x) => stretchOpen(x.chapter, s) && !s.howToSeen[`stretch-${x.chapter}`]).map((x) => x.chapter);
}

/** Award any stamps that are now due. Returns the new ones. */
export function awardStamps(practisedToday: boolean): Stamp[] {
  const today = dayKey();
  const fresh: Stamp[] = [];
  if (practisedToday && !hasStamp('day', today)) fresh.push({ id: uid('st'), kind: 'day', date: today });
  for (const ch of content.chapters) {
    if (isReady(ch.chapter) && !hasStamp('ready', today, ch.chapter))
      fresh.push({ id: uid('st'), kind: 'ready', date: today, chapter: ch.chapter });
    if (dialogueDone(ch.chapter) && !hasStamp('dialogue', today, ch.chapter))
      fresh.push({ id: uid('st'), kind: 'dialogue', date: today, chapter: ch.chapter });
    const p = chapterProgress(ch.chapter);
    if (p.total && p.known === p.total && !hasStamp('chapter', today, ch.chapter))
      fresh.push({ id: uid('st'), kind: 'chapter', date: today, chapter: ch.chapter });
  }
  for (const x of content.stretch)
    if (stretchProgress(x.chapter).done && !hasStamp('stretch', today, x.chapter))
      fresh.push({ id: uid('st'), kind: 'stretch', date: today, chapter: x.chapter });
  if (fresh.length) update((s) => s.stamps.push(...fresh));
  return fresh;
}

/**
 * Gentle streak: consecutive practice days, where a single rest day (お休み)
 * between two practice days does not break the run.
 */
export function streak(s: AppState = state, today = dayKey()): number {
  const days = [...new Set(s.stamps.filter((x) => x.kind === 'day').map((x) => x.date))].sort().reverse();
  if (!days.length || daysBetween(days[0], today) > 2) return 0;
  let n = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i], days[i - 1]) <= 2) n++;
    else break;
  }
  return n;
}

export function addStudySeconds(sec: number): void {
  if (sec <= 0) return;
  const k = dayKey();
  update((s) => (s.studySeconds[k] = (s.studySeconds[k] ?? 0) + Math.min(sec, 3600)));
}

export function minutesThisWeek(s: AppState = state): number {
  const secs = weekKeys().reduce((n, k) => n + (s.studySeconds[k] ?? 0), 0);
  return Math.round(secs / 60);
}

export function weakestWords(limit = 10, s: AppState = state) {
  return Object.entries(s.srs)
    .filter(([id, x]) => x.reps > 0 && content.cards.has(id) && (x.lapses > 0 || x.ease < 2.2))
    .sort((a, b) => weakness(b[1]) - weakness(a[1]))
    .slice(0, limit)
    .map(([id, x]) => {
      const c = content.cards.get(id)!;
      return { id, term: c.term, gloss_en: c.gloss_en, chapter: c.chapter, lapses: x.lapses };
    });
}
