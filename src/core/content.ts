import { packs as livePacks } from 'virtual:katakata-content';
import type { Lang } from './i18n';
import type { Card, DuniaPack, Frame, KelasPack, Pack, ScenarioLine, StretchPack } from './types';

/** A dialogue line with where it sits: its chapter, whether it is ⚡ content, and its position in its pack's dialogue. */
export interface LineRef {
  line: ScenarioLine;
  chapter: number;
  stretch: boolean;
  index: number;
  lines: ScenarioLine[];
}

export interface Content {
  chapters: KelasPack[];
  scenes: DuniaPack[];
  /** ⚡ stages, one per chapter that has one. Kept out of chapters, scenes and the learning path. */
  stretch: StretchPack[];
  cards: Map<string, Card>;
  /** IDs of ⚡ cards: never introduced by Today's practice or Sedia Kelas, and no distractors until met. */
  stretchCards: Set<string>;
  frames: Map<string, Frame & { chapter: number; stretch?: boolean }>;
  lines: Map<string, LineRef>;
  /** Dunia cards that recycle a live Kelas word share that word's schedule. */
  alias: Map<string, string>;
  /** The order new words are introduced in. */
  path: string[];
  sceneName(sceneId: string, lang: Lang): string;
}

export function norm(term: string): string {
  return term.toLowerCase().replace(/[.!?,]/g, '').trim();
}

export function buildContent(packs: Pack[]): Content {
  const chapters = packs.filter((p): p is KelasPack => p.kind === 'kelas').sort((a, b) => a.chapter - b.chapter);
  const scenes = packs.filter((p): p is DuniaPack => p.kind === 'dunia').sort((a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id));
  const stretch = packs.filter((p): p is StretchPack => p.kind === 'stretch').sort((a, b) => a.chapter - b.chapter);
  const cards = new Map<string, Card>();
  const stretchCards = new Set<string>();
  const frames = new Map<string, Frame & { chapter: number; stretch?: boolean }>();
  const lines = new Map<string, LineRef>();
  for (const p of packs) for (const c of p.cards) cards.set(c.id, c);
  for (const x of stretch) for (const c of x.cards) stretchCards.add(c.id);
  for (const ch of chapters) for (const f of ch.frames) frames.set(f.id, { ...f, chapter: ch.chapter });
  for (const x of stretch) for (const f of x.frames) frames.set(f.id, { ...f, chapter: x.chapter, stretch: true });
  for (const p of [...chapters, ...stretch])
    p.scenario.lines.forEach((line, index) => lines.set(line.id, { line, chapter: p.chapter, stretch: p.kind === 'stretch', index, lines: p.scenario.lines }));

  const kelasByTerm = new Map<string, string>();
  for (const ch of chapters) for (const c of ch.cards) kelasByTerm.set(norm(c.term), c.id);
  const alias = new Map<string, string>();
  for (const s of scenes)
    for (const c of s.cards) {
      const k = kelasByTerm.get(norm(c.term));
      if (k) alias.set(c.id, k);
    }

  // Learning path: each chapter's core words, then its primed scene, then the
  // rest of the chapter. Live scenes whose chapter is not live come last.
  const path: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    const real = alias.get(id) ?? id;
    if (!seen.has(real) && cards.has(real)) {
      seen.add(real);
      path.push(real);
    }
  };
  const usedScenes = new Set<string>();
  for (const ch of chapters) {
    for (const id of ch.sedia_kelas.cards) push(id);
    // The Sedia Kelas scene first, then any other scene that primes this chapter.
    const primed = scenes
      .filter((s) => s.chapter === ch.chapter)
      .sort((a, b) => Number(b.id === ch.sedia_kelas.scene) - Number(a.id === ch.sedia_kelas.scene));
    for (const scene of primed) {
      usedScenes.add(scene.id);
      for (const c of scene.cards) push(c.id);
    }
    for (const c of ch.cards) if (!c.recognise_only) push(c.id);
    for (const c of ch.cards) if (c.recognise_only) push(c.id);
  }
  for (const s of scenes) if (!usedScenes.has(s.id)) for (const c of s.cards) push(c.id);

  return {
    chapters,
    scenes,
    stretch,
    cards,
    stretchCards,
    frames,
    lines,
    alias,
    path,
    sceneName(sceneId, lang) {
      if (sceneId.startsWith('kelas-')) {
        const ch = chapters.find((c) => `kelas-${c.id}` === sceneId);
        return ch ? (lang === 'ja' ? ch.scenario.title_ja ?? ch.title.ms : ch.scenario.title_en ?? ch.title.en) : sceneId;
      }
      const x = stretch.find((p) => `stretch-${p.id}` === sceneId);
      if (x) return `${x.chapter} ⚡`;
      const s = scenes.find((x) => `dunia-${x.id}` === sceneId);
      return s ? `${s.title.ms}` : sceneId;
    },
  };
}

export const content: Content = buildContent(livePacks);

/** The schedule key for a card (Dunia recycled words point at their Kelas card). */
export function srsKey(cardId: string): string {
  return content.alias.get(cardId) ?? cardId;
}

/** Japanese learners see Japanese; English and Malay interfaces show the English meaning. */
export function gloss(card: Card, lang: Lang): string {
  return lang === 'ja' ? card.gloss_ja : card.gloss_en;
}
