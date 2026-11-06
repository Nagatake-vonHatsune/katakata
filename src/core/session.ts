// Builds practice sessions (spec 6) as a list of steps for the runner.
import { content, srsKey } from './content';
import { isDue, isKnown, weakness } from './srs';
import { state } from './state';
import { shuffle } from './ui';
import type { AppState, Card } from './types';
import { nextChapter } from './progress';

export type Step =
  | { kind: 'intro'; cardId: string }
  | { kind: 'mc'; cardId: string; dir: 'ms2x' | 'x2ms'; retry?: boolean }
  | { kind: 'recall'; cardId: string; retry?: boolean }
  | { kind: 'susun'; frameId: string; retry?: boolean }
  | { kind: 'cari'; sceneId: string; cardId: string; retry?: boolean };

export type SessionKind = 'today' | 'sedia' | 'ulang' | 'kad' | 'cari' | 'susun';

export interface Session {
  kind: SessionKind;
  chapter?: number;
  steps: Step[];
}

export const SECONDS_PER_STEP = 25;

export function estimateMinutes(steps: Step[]): number {
  return Math.max(1, Math.round((steps.length * SECONDS_PER_STEP) / 60));
}

export function gameOf(step: Step): 'kad' | 'susun' | 'cari' {
  return step.kind === 'susun' ? 'susun' : step.kind === 'cari' ? 'cari' : 'kad';
}

function liveIds(): Set<string> {
  return new Set([...content.cards.keys()].map(srsKey));
}

export function dueIds(s: AppState = state, now = new Date()): string[] {
  const live = liveIds();
  return Object.entries(s.srs)
    .filter(([id, x]) => live.has(id) && isDue(x, now))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

export function newIds(n: number, s: AppState = state, pool: string[] = content.path): string[] {
  const out: string[] = [];
  for (const raw of pool) {
    const id = srsKey(raw);
    if (!s.srs[id] && !out.includes(id)) out.push(id);
    if (out.length >= n) break;
  }
  return out;
}

export function reviewStep(id: string, s: AppState = state): Step {
  const card = content.cards.get(id)!;
  const x = s.srs[id];
  if (card.recognise_only || !x || x.reps < 2 || x.interval < 6) return { kind: 'mc', cardId: id, dir: 'ms2x' };
  return Math.random() < 0.5 ? { kind: 'recall', cardId: id } : { kind: 'mc', cardId: id, dir: 'x2ms' };
}

/** intro A, intro B, test A, intro C, test B, ... so each new word is tested a little after it is met. */
export function newWordBlock(ids: string[]): Step[] {
  const steps: Step[] = [];
  ids.forEach((id, i) => {
    steps.push({ kind: 'intro', cardId: id });
    if (i > 0) steps.push({ kind: 'mc', cardId: ids[i - 1], dir: 'ms2x' });
  });
  if (ids.length) steps.push({ kind: 'mc', cardId: ids[ids.length - 1], dir: 'ms2x' });
  return steps;
}

function framePick(chapter: number, n: number, s: AppState = state): string[] {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!ch) return [];
  return ch.frames
    .slice()
    .sort((a, b) => (s.frames[a.id]?.correct ?? 0) - (s.frames[b.id]?.correct ?? 0) || (s.frames[a.id]?.tries ?? 0) - (s.frames[b.id]?.tries ?? 0))
    .slice(0, n)
    .map((f) => f.id);
}

export function cariCards(sceneId: string): Card[] {
  return content.scenes.find((x) => x.id === sceneId)?.cards.filter((c) => c.image) ?? [];
}

/** Scenes ready for Cari Benda: enough drawable objects, some already met. */
function cariScene(s: AppState, extraKnown: string[] = []): string | null {
  const met = new Set([...Object.keys(s.srs), ...extraKnown]);
  const ok = content.scenes
    .map((sc) => ({ id: sc.id, met: cariCards(sc.id).filter((c) => met.has(srsKey(c.id))).length }))
    .filter((x) => x.met >= 3 && cariCards(x.id).length >= 4);
  return ok.length ? ok[Math.floor(Math.random() * ok.length)].id : null;
}

function cariRounds(sceneId: string, n: number, s: AppState, extraKnown: string[] = []): Step[] {
  const met = new Set([...Object.keys(s.srs), ...extraKnown]);
  const cards = cariCards(sceneId);
  const known = shuffle(cards.filter((c) => met.has(srsKey(c.id))));
  const rest = shuffle(cards.filter((c) => !met.has(srsKey(c.id))));
  return [...known, ...rest].slice(0, n).map((c) => ({ kind: 'cari', sceneId, cardId: c.id }));
}

/** 今日の練習: due reviews, then 5 to 8 new words, one frame drill, one game. */
export function buildToday(s: AppState = state, now = new Date()): Session {
  const due = dueIds(s, now).slice(0, 12);
  const nNew = due.length >= 12 ? 3 : due.length > 6 ? 5 : 8;
  const fresh = newIds(nNew, s);
  const reviews = due.map((id) => reviewStep(id, s));
  const warm = reviews.slice(0, 3);
  const steps: Step[] = [...warm, ...newWordBlock(fresh), ...reviews.slice(3)];
  const chapter = fresh.length ? content.cards.get(fresh[0])!.chapter : nextChapter(s);
  const learnedChapters = new Set([...Object.keys(s.srs), ...fresh].map((id) => content.cards.get(id)?.chapter));
  const fch = learnedChapters.has(chapter) && content.chapters.some((c) => c.chapter === chapter) ? chapter : nextChapter(s);
  if (Object.keys(s.srs).length + fresh.length >= 5) steps.push(...framePick(fch, 1, s).map((frameId) => ({ kind: 'susun' as const, frameId })));
  const scene = cariScene(s, fresh);
  if (scene) steps.push(...cariRounds(scene, 3, s, fresh));
  return { kind: 'today', steps };
}

/** 授業の準備: the chapter's core words, its two frames, and its scene. */
export function buildSedia(chapter: number, s: AppState = state, now = new Date()): Session {
  const ch = content.chapters.find((c) => c.chapter === chapter)!;
  const core = ch.sedia_kelas.cards.map(srsKey);
  const unseen = core.filter((id) => !s.srs[id]).slice(0, 8);
  const weak = core.filter((id) => s.srs[id] && (!isKnown(s.srs[id]) || isDue(s.srs[id], now))).slice(0, 8);
  const steps: Step[] = [...weak.map((id) => reviewStep(id, s)), ...newWordBlock(unseen)];
  if (!unseen.length && !weak.length) steps.push(...shuffle(core).slice(0, 8).map((id) => reviewStep(id, s)));
  steps.push(...ch.sedia_kelas.frames.map((frameId) => ({ kind: 'susun' as const, frameId })));
  const scene = ch.sedia_kelas.scene;
  if (scene && content.scenes.some((x) => x.id === scene) && cariCards(scene).length >= 4) steps.push(...cariRounds(scene, 3, s, unseen));
  return { kind: 'sedia', chapter, steps };
}

/** 復習: reviews only. When nothing is due, the weakest words. */
export function buildUlang(s: AppState = state, now = new Date()): Session {
  let ids = dueIds(s, now).slice(0, 25);
  if (!ids.length) {
    const live = liveIds();
    ids = Object.entries(s.srs)
      .filter(([id, x]) => live.has(id) && x.reps > 0)
      .sort((a, b) => weakness(b[1]) - weakness(a[1]))
      .slice(0, 10)
      .map(([id]) => id);
  }
  return { kind: 'ulang', steps: ids.map((id) => reviewStep(id, s)) };
}

export function buildKad(s: AppState = state, now = new Date()): Session {
  const due = dueIds(s, now);
  const live = liveIds();
  const others = shuffle(Object.keys(s.srs).filter((id) => live.has(id) && !due.includes(id)));
  return { kind: 'kad', steps: [...due, ...others].slice(0, 10).map((id) => reviewStep(id, s)) };
}

export function buildCari(sceneId: string, s: AppState = state): Session {
  return { kind: 'cari', steps: cariRounds(sceneId, 6, s) };
}

export function buildSusun(chapter: number, s: AppState = state): Session {
  return { kind: 'susun', chapter, steps: shuffle(framePick(chapter, 4, s)).map((frameId) => ({ kind: 'susun' as const, frameId })) };
}

/** Where to put a missed item again: a few steps later, so it "comes back later in the session". */
export function requeue(steps: Step[], index: number, step: Step): Step[] {
  if ((step as { retry?: boolean }).retry || step.kind === 'intro') return steps;
  const copy = { ...step, retry: true } as Step;
  const at = Math.min(steps.length, index + 4);
  return [...steps.slice(0, at), copy, ...steps.slice(at)];
}

/** Multiple-choice options: the answer plus three distractors, preferring the same pack and part of speech. */
export function distractors(card: Card, n = 3): Card[] {
  const all = [...content.cards.values()].filter((c) => c.id !== card.id && c.term !== card.term && c.gloss_ja !== card.gloss_ja && c.gloss_en !== card.gloss_en);
  const samePos = shuffle(all.filter((c) => c.pos === card.pos && c.scene === card.scene));
  const samePack = shuffle(all.filter((c) => c.scene === card.scene && c.pos !== card.pos));
  const any = shuffle(all.filter((c) => c.pos === card.pos));
  const out: Card[] = [];
  for (const c of [...samePos, ...samePack, ...any, ...shuffle(all)]) {
    if (out.length >= n) break;
    if (!out.some((o) => o.id === c.id || o.term === c.term || o.gloss_ja === c.gloss_ja)) out.push(c);
  }
  return out;
}
