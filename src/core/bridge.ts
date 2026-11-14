// Jambatan (spec 2 stage 3, spec 10.5): hand the learner's words to Hanashishou.
// The file is read by Hanashishou's "Bring words from Kata-Kata" screen (hanashishou/src/bridge/katakata.ts).
// Card state is SM-2 in both apps, so progress carries over as-is.
import hanashishou from '../../content/bridge/hanashishou-ms.json';
import { content, srsKey } from './content';
import type { AppState, SrsState } from './types';

export const HANASHISHOU_URL = 'https://hanashishou.vonhatsune.workers.dev/';
/** Hanashishou's import screen, in the learner's interface language. */
export const hanashishouImportUrl = (lang: string) => `${HANASHISHOU_URL}#/katakata?ui=${encodeURIComponent(lang)}`;
export const WORD_LIBRARY_KIND = 'katakata-word-library';

const inHanashishou = new Set(Object.keys((hanashishou as { words: Record<string, unknown> }).words).map((w) => w.toLowerCase()));

/**
 * The Hanashishou words a card term stands for. A term with slash alternatives ("pintu masuk / pintu keluar", "krew / kru")
 * is matched one alternative at a time, each as a whole word (or phrase), never as a part of a word; "(Kak)" style notes
 * are dropped. The whole term counts first, so a deck word spelt with a slash would still join.
 * Hanashishou's planImport matches the exported word to its deck as a whole word only, so the export below sends each
 * matching alternative as its own entry.
 */
export function hanashishouForms(term: string): string[] {
  const whole = term.trim().toLowerCase();
  if (inHanashishou.has(whole)) return [whole];
  const alts = whole
    .replace(/\([^)]*\)/g, ' ')
    .split('/')
    .map((a) => a.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(alts.filter((a) => inHanashishou.has(a)))];
}

export function isInHanashishou(term: string): boolean {
  return hanashishouForms(term).length > 0;
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
  /** Hanashishou band to start Malay at: always 1 (Sam, 14 Nov 2026). Hanashishou's own adaptive rule moves a learner to band 2. */
  suggestedBand: 1;
  words: WordLibraryEntry[];
}

// Sam, 14 Nov 2026: suggest Hanashishou band 1 after Stage 1 (chapters 1 to 9) and band 1 after Stage 2 (chapters 10 to 18);
// band 2 is left to Hanashishou's adaptive rule.
export function suggestedBand(_s: AppState): 1 {
  return 1;
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
    // One entry per Hanashishou word the card stands for; a card with none is sent under its own term.
    const forms = hanashishouForms(card.term);
    for (const word of forms.length ? forms : [card.term]) {
      words.push({
        word,
        gloss_en: card.gloss_en,
        gloss_ja: card.gloss_ja,
        chapter: card.chapter,
        scene: card.scene,
        inHanashishou: forms.length > 0,
        srs: { ease, interval, reps, due, lapses },
      });
    }
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
