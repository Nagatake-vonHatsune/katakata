// Builds practice sessions (spec 6) as a list of steps for the runner.
import { content, srsKey } from './content';
import { isDue, isKnown, weakness } from './srs';
import { state } from './state';
import { shuffle } from './ui';
import type { AppState, Card, ScenarioLine } from './types';
import { dialogueKey, dialogueReplyIds, nextChapter, stretchPack } from './progress';

export type Step =
  | { kind: 'intro'; cardId: string }
  | { kind: 'mc'; cardId: string; dir: 'ms2x' | 'x2ms'; retry?: boolean }
  | { kind: 'recall'; cardId: string; retry?: boolean }
  | { kind: 'susun'; frameId: string; retry?: boolean }
  /** board: a fixed set of objects (Cari Benda ⚡: six, extension and core objects mixed); otherwise the scene's drawn objects. */
  | { kind: 'cari'; sceneId: string; cardId: string; board?: string[]; retry?: boolean }
  /** Hear a dialogue line, choose the best reply of three (the reply is line `lineId`; the prompt is the line before it). */
  | { kind: 'reply'; lineId: string; retry?: boolean };

export type SessionKind = 'today' | 'sedia' | 'ulang' | 'kad' | 'cari' | 'susun' | 'dialogue' | 'stretch';

export interface Session {
  kind: SessionKind;
  chapter?: number;
  steps: Step[];
  /**
   * Set for a full dialogue play-through (the chapter dialogue, or the whole ⚡ dialogue): its key in state.dialogues
   * ('c04', 'x04'). The runner scores the first try of each reply step and records the play-through at the end.
   */
  dialogue?: string;
}

export const SECONDS_PER_STEP = 25;

export function estimateMinutes(steps: Step[]): number {
  return Math.max(1, Math.round((steps.length * SECONDS_PER_STEP) / 60));
}

export function gameOf(step: Step): 'kad' | 'susun' | 'cari' | 'reply' {
  return step.kind === 'susun' ? 'susun' : step.kind === 'cari' ? 'cari' : step.kind === 'reply' ? 'reply' : 'kad';
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
  // ⚡ cards: Malay-first recall after one correct answer, instead of waiting for reps >= 2 and interval >= 6.
  const ready = content.stretchCards.has(id) ? !!x && x.reps >= 1 : !!x && x.reps >= 2 && x.interval >= 6;
  if (card.recognise_only || !ready) return { kind: 'mc', cardId: id, dir: 'ms2x' };
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

/** A chapter's dialogue played through once: one reply step per line after the first, in order. */
export function buildDialogue(chapter: number): Session {
  return { kind: 'dialogue', chapter, dialogue: dialogueKey(chapter), steps: dialogueReplyIds(chapter).map((lineId) => ({ kind: 'reply' as const, lineId })) };
}

/** The ⚡ dialogue's reply lines (the lines that carry wrong replies), in order. */
export function stretchReplyIds(chapter: number): string[] {
  return stretchPack(chapter)?.scenario.lines.filter((l) => l.choices?.length).map((l) => l.id) ?? [];
}

/**
 * A ⚡ run (design note section 4): weak extension cards first, then up to 8 new ones, two ⚡ frames and three replies
 * from the ⚡ dialogue (the ones answered least). About 5 to 8 minutes; it can be repeated.
 */
export function buildStretch(chapter: number, s: AppState = state, now = new Date()): Session {
  const x = stretchPack(chapter);
  if (!x) return { kind: 'stretch', chapter, steps: [] };
  const ids = x.cards.map((c) => srsKey(c.id));
  const weak = ids.filter((id) => s.srs[id] && (!isKnown(s.srs[id]) || isDue(s.srs[id], now))).slice(0, 8);
  const unseen = ids.filter((id) => !s.srs[id]).slice(0, 8);
  const steps: Step[] = [...weak.map((id) => reviewStep(id, s)), ...newWordBlock(unseen)];
  if (!weak.length && !unseen.length) steps.push(...shuffle(ids).slice(0, 6).map((id) => reviewStep(id, s)));
  const frames = x.frames
    .slice()
    .sort((a, b) => (s.frames[a.id]?.correct ?? 0) - (s.frames[b.id]?.correct ?? 0) || (s.frames[a.id]?.tries ?? 0) - (s.frames[b.id]?.tries ?? 0))
    .slice(0, 2);
  steps.push(...frames.map((f) => ({ kind: 'susun' as const, frameId: f.id })));
  const order = stretchReplyIds(chapter);
  const replies = order
    .slice()
    .sort((a, b) => (s.lines?.[a]?.tries ?? 0) - (s.lines?.[b]?.tries ?? 0) || order.indexOf(a) - order.indexOf(b))
    .slice(0, 3)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  steps.push(...replies.map((lineId) => ({ kind: 'reply' as const, lineId })));
  steps.push(...stretchCari(chapter, s, unseen));
  return { kind: 'stretch', chapter, steps };
}

/** Objects on a Cari Benda ⚡ board. */
export const CARI_BOARD = 6;

/**
 * Cari Benda ⚡: up to three rounds, each asking for an extension object the learner has met (or meets earlier in this run), on a
 * board of six: the target, up to two other extension objects and core objects of the chapter's picture scene.
 */
export function stretchCari(chapter: number, s: AppState = state, introduced: string[] = [], rounds = 3): Step[] {
  const x = stretchPack(chapter);
  if (!x?.cari) return [];
  const met = new Set([...Object.keys(s.srs), ...introduced]);
  const drawn = x.cards.filter((c) => c.image);
  const core = x.cari.core.filter((id) => content.cards.get(id)?.image);
  const targets = shuffle(drawn.filter((c) => met.has(srsKey(c.id)))).slice(0, rounds);
  return targets.map((target) => {
    const others = shuffle(drawn.filter((c) => c.id !== target.id)).slice(0, 2).map((c) => c.id);
    const fill = shuffle(core).slice(0, CARI_BOARD - 1 - others.length);
    return { kind: 'cari' as const, sceneId: x.cari!.scene, cardId: target.id, board: shuffle([target.id, ...others, ...fill]) };
  });
}

/** The whole ⚡ dialogue: every reply line in order. */
export function buildStretchDialogue(chapter: number): Session {
  return { kind: 'stretch', chapter, dialogue: dialogueKey(chapter, true), steps: stretchReplyIds(chapter).map((lineId) => ({ kind: 'reply' as const, lineId })) };
}

export interface ReplyOption {
  ms: string;
  en: string;
  correct: boolean;
  /** The line this option is, for a core dialogue (another line of the same dialogue). */
  lineId?: string;
}

/**
 * The prompt and options of a reply step. ⚡ lines carry their own wrong replies (they differ in register or meaning).
 * A core chapter line has none, so its two wrong replies are other lines of the same dialogue, by the same speaker where
 * possible, never the prompt itself or a line with the same text.
 */
export function replyOptions(lineId: string): { prompt: ScenarioLine | null; answer: ScenarioLine; options: ReplyOption[]; before: ScenarioLine[] } {
  const ref = content.lines.get(lineId)!;
  const { line, lines, index } = ref;
  const prompt = index > 0 ? lines[index - 1] : null;
  const before = lines.slice(0, Math.max(0, index - 1));
  const right: ReplyOption = { ms: line.ms, en: line.en, correct: true, lineId: line.id };
  let wrong: ReplyOption[];
  if (line.choices?.length) {
    wrong = line.choices.slice(0, 2).map((ms, i) => ({ ms, en: line.choices_en?.[i] ?? '', correct: false }));
  } else {
    const others = lines.filter((l, i) => i !== index && i !== index - 1 && l.ms !== line.ms && l.ms !== prompt?.ms);
    const same = shuffle(others.filter((l) => l.speaker === line.speaker));
    const rest = shuffle(others.filter((l) => l.speaker !== line.speaker));
    wrong = [...same, ...rest].slice(0, 2).map((l) => ({ ms: l.ms, en: l.en, correct: false, lineId: l.id }));
  }
  return { prompt, answer: line, options: shuffle([right, ...wrong]), before };
}

/**
 * The dialogue lines a reply step shows besides its prompt and answer, so every line (and its note) is shown with its own line
 * (Sam, 17 Nov 2026, B2 answer 7): `lead` = the lines before the first reply step's prompt (shown before the prompt, in that step
 * only); `after` = the lines that follow the answer up to the next reply step's prompt, or to the end (shown after the answer).
 * Reply lines are the lines with wrong replies (⚡), or every line after the first (a chapter dialogue).
 */
export function lineContext(lineId: string): { lead: ScenarioLine[]; after: ScenarioLine[] } {
  const { lines, index } = content.lines.get(lineId)!;
  const stretch = lines.some((l) => l.choices?.length);
  const replies = lines.map((l, i) => ((stretch ? !!l.choices?.length : i > 0) ? i : -1)).filter((i) => i > 0);
  const lead = replies[0] === index ? lines.slice(0, Math.max(0, index - 1)) : [];
  const next = replies.find((i) => i > index);
  const after = lines.slice(index + 1, next === undefined ? lines.length : next - 1);
  return { lead, after };
}

/** Where to put a missed item again: a few steps later, so it "comes back later in the session". */
export function requeue(steps: Step[], index: number, step: Step): Step[] {
  if ((step as { retry?: boolean }).retry || step.kind === 'intro') return steps;
  const copy = { ...step, retry: true } as Step;
  const at = Math.min(steps.length, index + 4);
  return [...steps.slice(0, at), copy, ...steps.slice(at)];
}

/**
 * Multiple-choice options: the answer plus three distractors, preferring the same pack and part of speech.
 * ⚡ cards are distractors only once the learner has met them (and for other ⚡ cards of the same stage). For a ⚡ card the
 * closest options come first: the same ⚡ stage and part of speech, then the same chapter's class cards of that part of speech.
 */
export function distractors(card: Card, n = 3, s: AppState = state): Card[] {
  const isStretch = content.stretchCards.has(card.id);
  const all = [...content.cards.values()].filter(
    (c) =>
      c.id !== card.id &&
      c.term !== card.term &&
      c.gloss_ja !== card.gloss_ja &&
      c.gloss_en !== card.gloss_en &&
      (!content.stretchCards.has(c.id) || !!s.srs[c.id] || (isStretch && c.scene === card.scene)),
  );
  const samePos = shuffle(all.filter((c) => c.pos === card.pos && c.scene === card.scene));
  const sameChapter = isStretch ? shuffle(all.filter((c) => c.pos === card.pos && c.chapter === card.chapter && c.scene !== card.scene)) : [];
  const samePack = shuffle(all.filter((c) => c.scene === card.scene && c.pos !== card.pos));
  const any = shuffle(all.filter((c) => c.pos === card.pos));
  const out: Card[] = [];
  for (const c of [...samePos, ...sameChapter, ...samePack, ...any, ...shuffle(all)]) {
    if (out.length >= n) break;
    if (!out.some((o) => o.id === c.id || o.term === c.term || o.gloss_ja === c.gloss_ja)) out.push(c);
  }
  return out;
}
