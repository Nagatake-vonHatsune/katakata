import { packs as livePacks } from 'virtual:katakata-content';
import type { Card, DuniaPack, Frame, KelasPack, Pack } from './types';

export interface Content {
  chapters: KelasPack[];
  scenes: DuniaPack[];
  cards: Map<string, Card>;
  frames: Map<string, Frame & { chapter: number }>;
  /** Dunia cards that recycle a live Kelas word share that word's schedule. */
  alias: Map<string, string>;
  /** The order new words are introduced in. */
  path: string[];
  sceneName(sceneId: string, lang: 'ja' | 'en'): string;
}

export function norm(term: string): string {
  return term.toLowerCase().replace(/[.!?,]/g, '').trim();
}

export function buildContent(packs: Pack[]): Content {
  const chapters = packs.filter((p): p is KelasPack => p.kind === 'kelas').sort((a, b) => a.chapter - b.chapter);
  const scenes = packs.filter((p): p is DuniaPack => p.kind === 'dunia');
  const cards = new Map<string, Card>();
  const frames = new Map<string, Frame & { chapter: number }>();
  for (const p of packs) for (const c of p.cards) cards.set(c.id, c);
  for (const ch of chapters) for (const f of ch.frames) frames.set(f.id, { ...f, chapter: ch.chapter });

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
    const scene = scenes.find((s) => s.id === ch.sedia_kelas.scene);
    if (scene) {
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
    cards,
    frames,
    alias,
    path,
    sceneName(sceneId, lang) {
      if (sceneId.startsWith('kelas-')) {
        const ch = chapters.find((c) => `kelas-${c.id}` === sceneId);
        return ch ? (lang === 'ja' ? ch.scenario.title_ja ?? ch.title.ms : ch.scenario.title_en ?? ch.title.en) : sceneId;
      }
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

export function gloss(card: Card, lang: 'ja' | 'en'): string {
  return lang === 'ja' ? card.gloss_ja : card.gloss_en;
}
