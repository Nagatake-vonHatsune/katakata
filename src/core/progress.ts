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

function hasStamp(kind: Stamp['kind'], date: string, chapter?: number): boolean {
  return state.stamps.some((x) => x.kind === kind && (kind === 'day' ? x.date === date : x.chapter === chapter));
}

/** Award any stamps that are now due. Returns the new ones. */
export function awardStamps(practisedToday: boolean): Stamp[] {
  const today = dayKey();
  const fresh: Stamp[] = [];
  if (practisedToday && !hasStamp('day', today)) fresh.push({ id: uid('st'), kind: 'day', date: today });
  for (const ch of content.chapters) {
    if (isReady(ch.chapter) && !hasStamp('ready', today, ch.chapter))
      fresh.push({ id: uid('st'), kind: 'ready', date: today, chapter: ch.chapter });
    const p = chapterProgress(ch.chapter);
    if (p.total && p.known === p.total && !hasStamp('chapter', today, ch.chapter))
      fresh.push({ id: uid('st'), kind: 'chapter', date: today, chapter: ch.chapter });
  }
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
