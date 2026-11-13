// Jambatan (spec 2 stage 3, spec 10.5): hand the learner's words to Hanashishou.
// The file is read by Hanashishou's "Bring words from Kata-Kata" screen (hanashishou/src/bridge/katakata.ts).
// Card state is SM-2 in both apps, so progress carries over as-is.
import hanashishou from '../../content/bridge/hanashishou-ms.json';
import { content, srsKey } from './content';
import { isReady } from './progress';
import type { AppState, SrsState } from './types';

export const HANASHISHOU_URL = 'https://hanashishou.vonhatsune.workers.dev/';
/** Hanashishou's import screen, in the learner's interface language. */
export const hanashishouImportUrl = (lang: string) => `${HANASHISHOU_URL}#/katakata?ui=${encodeURIComponent(lang)}`;
export const WORD_LIBRARY_KIND = 'katakata-word-library';

const inHanashishou = new Set(Object.keys((hanashishou as { words: Record<string, unknown> }).words).map((w) => w.toLowerCase()));

export function isInHanashishou(term: string): boolean {
  return inHanashishou.has(term.toLowerCase());
}

export interface WordLibraryEntry {
  word: string;
  gloss_en: string;
  gloss_ja: string;
  chapter: number;
  scene: string;
  inHanashishou: boolean;
  srs: Omit<SrsState, 'last'>;
}

export interface WordLibrary {
  app: 'katakata';
  kind: typeof WORD_LIBRARY_KIND;
  version: 1;
  student: string;
  exportedAt: string;
  uiLang: AppState['settings']['lang'];
  /** Hanashishou band to start Malay at: 2 once every Stage 1 class chapter (1 to 9) is "ready", else 1. */
  suggestedBand: 1 | 2;
  words: WordLibraryEntry[];
}

// Stage 1 (A1) is chapters 1 to 9; Stage 2 chapters (10 and later) do not move the starting band.
export const STAGE1_LAST_CHAPTER = 9;

export function suggestedBand(s: AppState): 1 | 2 {
  const stage1 = content.chapters.filter((c) => c.chapter <= STAGE1_LAST_CHAPTER);
  return stage1.length > 0 && stage1.every((c) => isReady(c.chapter, s)) ? 2 : 1;
}

/** Every word the learner has met (has a schedule for), with its SM-2 state. */
export function buildWordLibrary(s: AppState, now = new Date()): WordLibrary {
  const words: WordLibraryEntry[] = [];
  const seen = new Set<string>();
  for (const card of content.cards.values()) {
    const key = srsKey(card.id);
    const st = s.srs[key];
    if (!st || seen.has(card.term.toLowerCase())) continue;
    seen.add(card.term.toLowerCase());
    const { ease, interval, reps, due, lapses } = st;
    words.push({
      word: card.term,
      gloss_en: card.gloss_en,
      gloss_ja: card.gloss_ja,
      chapter: card.chapter,
      scene: card.scene,
      inHanashishou: isInHanashishou(card.term),
      srs: { ease, interval, reps, due, lapses },
    });
  }
  return {
    app: 'katakata',
    kind: WORD_LIBRARY_KIND,
    version: 1,
    student: s.profile.name,
    exportedAt: now.toISOString(),
    uiLang: s.settings.lang,
    suggestedBand: suggestedBand(s),
    words,
  };
}
