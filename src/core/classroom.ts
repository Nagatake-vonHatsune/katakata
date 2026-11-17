// Class runs (teacher mode, Sam 17 Nov 2026): a chapter, a Jambatan scene, a Cari Benda board or a Nombor & Masa part, shown
// on a projector one slide at a time and paced by the teacher. Everything is open, whatever the device's learner has unlocked.
// Slides are built from the content only; the run (src/views/classroom.ts) plays on a copy of the learner (beginClassRun in
// state.ts), so nothing here can reach the learner's data. Kept free of DOM code so it can be tested.
import { content, srsKey } from './content';
import { round, type NumberLevel, type PartId, type Question } from './nombor';
import { stretchPack } from './progress';
import { cariCards, CARI_BOARD, distractors, type ReplyOption } from './session';
import { shuffle } from './ui';

export type ClassSource =
  | { kind: 'chapter'; chapter: number }
  /** A Jambatan scene (its words and Laju!). */
  | { kind: 'scene'; sceneId: string }
  /** A Cari Benda board: any Dunia scene with at least four drawn objects. */
  | { kind: 'board'; sceneId: string }
  | { kind: 'nombor'; part: PartId };

export type ClassActivity = 'words' | 'frames' | 'dialogue' | 'xwords' | 'xframes' | 'xdialogue' | 'cari' | 'xcari' | 'laju' | 'nombor' | 'explore';

export type Slide =
  | { kind: 'word'; cardId: string }
  /** bank: the tiles in their shuffled order (with ⚡ decoys). */
  | { kind: 'frame'; frameId: string; bank: string[] }
  /** One line of a dialogue scene; the lines before it are on screen too. */
  | { kind: 'line'; lineId: string; index: number; lines: string[] }
  /** A reply step: the class calls out one of the options, then the teacher reveals. */
  | { kind: 'reply'; lineId: string; index: number; lines: string[]; options: ReplyOption[] }
  | { kind: 'cari'; sceneId: string; cardId: string; board: string[] }
  | { kind: 'laju'; cardId: string; options: string[] }
  | { kind: 'nm'; part: PartId; q: Question }
  /** Nombor & Masa: the part's hands-on explorer (roll the numbers, turn the calendar, spin the clock). */
  | { kind: 'explore'; part: PartId };

/** At most this many Cari Benda rounds in one class run. */
export const CLASS_CARI_ROUNDS = 8;

function chapterPack(n: number) {
  return content.chapters.find((c) => c.chapter === n);
}

/** The chapter's picture scene for Cari Benda (its Sedia Kelas scene, when it has at least four drawn objects). */
export function chapterBoard(n: number): string | null {
  const scene = chapterPack(n)?.sedia_kelas.scene;
  return scene && content.scenes.some((s) => s.id === scene) && cariCards(scene).length >= 4 ? scene : null;
}

/** Dunia scenes that make a Cari Benda board. */
export function boards(): string[] {
  return content.scenes.filter((s) => cariCards(s.id).length >= 4).map((s) => s.id);
}

export function jambatanScenes(): string[] {
  return content.scenes.filter((s) => s.world.id === 'jambatan').map((s) => s.id);
}

function lajuPool(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const c = content.cards.get(id);
    const k = srsKey(id);
    if (!c || c.recognise_only || seen.has(k)) continue;
    seen.add(k);
    out.push(id);
  }
  return out;
}

/** What a source offers, with the number of slides each activity would have (0 = not offered). */
export function activities(src: ClassSource): Array<{ id: ClassActivity; count: number }> {
  const out: Array<{ id: ClassActivity; count: number }> = [];
  const push = (id: ClassActivity, count: number) => count > 0 && out.push({ id, count });
  if (src.kind === 'chapter') {
    const ch = chapterPack(src.chapter);
    const x = stretchPack(src.chapter);
    if (ch) {
      push('words', ch.sedia_kelas.cards.length);
      push('frames', ch.frames.length);
      push('dialogue', ch.scenario.lines.length);
    }
    if (x) {
      push('xwords', x.cards.length);
      push('xframes', x.frames.length);
      push('xdialogue', x.scenario.lines.length);
    }
    const board = chapterBoard(src.chapter);
    if (board) push('cari', Math.min(CLASS_CARI_ROUNDS, cariCards(board).length));
    if (x?.cari) push('xcari', Math.min(CLASS_CARI_ROUNDS, x.cards.filter((c) => c.image).length));
    if (ch) push('laju', lajuPool([...ch.cards.map((c) => c.id), ...ch.sedia_kelas.cards]).length);
  } else if (src.kind === 'scene') {
    const sc = content.scenes.find((s) => s.id === src.sceneId);
    if (sc) {
      push('words', sc.cards.length);
      if (cariCards(sc.id).length >= 4) push('cari', Math.min(CLASS_CARI_ROUNDS, cariCards(sc.id).length));
      push('laju', lajuPool(sc.cards.map((c) => c.id)).length);
    }
  } else if (src.kind === 'board') {
    push('cari', Math.min(CLASS_CARI_ROUNDS, cariCards(src.sceneId).length));
  } else {
    push('explore', 1);
    push('nombor', 8);
  }
  return out;
}

function dialogueSlides(lines: Array<{ id: string; choices?: string[]; choices_en?: string[]; ms: string; en: string }>, stretch: boolean): Slide[] {
  const ids = lines.map((l) => l.id);
  return lines.map((l, index) => {
    if (stretch && l.choices?.length && index > 0) {
      const right: ReplyOption = { ms: l.ms, en: l.en, correct: true, lineId: l.id };
      const wrong = l.choices.slice(0, 2).map((ms, i) => ({ ms, en: l.choices_en?.[i] ?? '', correct: false }));
      return { kind: 'reply' as const, lineId: l.id, index, lines: ids, options: shuffle([right, ...wrong]) };
    }
    return { kind: 'line' as const, lineId: l.id, index, lines: ids };
  });
}

function cariSlides(sceneId: string, targets: string[], board?: (target: string) => string[]): Slide[] {
  const all = cariCards(sceneId).map((c) => c.id);
  return shuffle(targets)
    .slice(0, CLASS_CARI_ROUNDS)
    .map((cardId) => ({ kind: 'cari' as const, sceneId, cardId, board: board ? board(cardId) : all }));
}

function lajuSlides(ids: string[]): Slide[] {
  return shuffle(lajuPool(ids)).map((cardId) => {
    const card = content.cards.get(cardId)!;
    return { kind: 'laju' as const, cardId, options: shuffle([cardId, ...distractors(card).map((c) => c.id)]) };
  });
}

/** The slides of one class activity. Option and tile orders are fixed here, so Back shows the same slide again. */
export function buildSlides(src: ClassSource, activity: ClassActivity, level: NumberLevel = 'n10'): Slide[] {
  if (src.kind === 'nombor') {
    if (activity === 'explore') return [{ kind: 'explore', part: src.part }];
    return activity === 'nombor' ? round(src.part, Math.random, level).map((q) => ({ kind: 'nm' as const, part: src.part, q })) : [];
  }
  if (src.kind === 'board') return activity === 'cari' ? cariSlides(src.sceneId, cariCards(src.sceneId).map((c) => c.id)) : [];
  if (src.kind === 'scene') {
    const sc = content.scenes.find((s) => s.id === src.sceneId);
    if (!sc) return [];
    if (activity === 'words') return sc.cards.map((c) => ({ kind: 'word' as const, cardId: c.id }));
    if (activity === 'cari') return cariSlides(sc.id, cariCards(sc.id).map((c) => c.id));
    if (activity === 'laju') return lajuSlides(sc.cards.map((c) => c.id));
    return [];
  }
  const ch = chapterPack(src.chapter);
  const x = stretchPack(src.chapter);
  const frameSlide = (f: { id: string; example: string; decoys?: string[] }): Slide => ({ kind: 'frame', frameId: f.id, bank: bankOrder(f.example, f.decoys ?? []) });
  switch (activity) {
    case 'words':
      return ch ? ch.sedia_kelas.cards.map((cardId) => ({ kind: 'word' as const, cardId })) : [];
    case 'frames': {
      if (!ch) return [];
      const prep = new Set(ch.sedia_kelas.frames);
      return [...ch.frames.filter((f) => prep.has(f.id)), ...ch.frames.filter((f) => !prep.has(f.id))].map(frameSlide);
    }
    case 'dialogue':
      return ch ? dialogueSlides(ch.scenario.lines, false) : [];
    case 'xwords':
      return x ? x.cards.map((c) => ({ kind: 'word' as const, cardId: c.id })) : [];
    case 'xframes':
      return x ? x.frames.map(frameSlide) : [];
    case 'xdialogue':
      return x ? dialogueSlides(x.scenario.lines, true) : [];
    case 'cari': {
      const board = chapterBoard(src.chapter);
      return board ? cariSlides(board, cariCards(board).map((c) => c.id)) : [];
    }
    case 'xcari': {
      if (!x?.cari) return [];
      const drawn = x.cards.filter((c) => c.image).map((c) => c.id);
      const core = x.cari.core.filter((id) => content.cards.get(id)?.image);
      return cariSlides(x.cari.scene, drawn, (target) => {
        const others = shuffle(drawn.filter((id) => id !== target)).slice(0, 2);
        return shuffle([target, ...others, ...shuffle(core).slice(0, CARI_BOARD - 1 - others.length)]);
      });
    }
    case 'laju':
      return ch ? lajuSlides([...ch.cards.map((c) => c.id), ...ch.sedia_kelas.cards]) : [];
  }
  return [];
}

/** Tiles in a shuffled order that is never the sentence itself. */
export function bankOrder(example: string, decoys: string[]): string[] {
  const words = example.split(/\s+/).filter(Boolean);
  if (words.length + decoys.length < 2) return [...words, ...decoys];
  for (let i = 0; i < 12; i++) {
    const s = shuffle([...words, ...decoys]);
    if (s.join(' ') !== [...words, ...decoys].join(' ') && s.filter((w) => !decoys.includes(w)).join(' ') !== words.join(' ')) return s;
  }
  return [...words, ...decoys].reverse();
}

/** How many options the number keys can choose on a slide (frames: the tiles in the bank). */
export function optionCount(s: Slide): number {
  switch (s.kind) {
    case 'reply':
      return s.options.length;
    case 'laju':
      return s.options.length;
    case 'cari':
      return s.board.length;
    case 'nm':
      return s.q.dir === 'build' ? s.q.blocks?.length ?? 0 : s.q.options.length;
    case 'frame':
      return s.bank.length;
    default:
      return 0;
  }
}

/** The index of the right option, where a slide has one. */
export function rightOption(s: Slide): number | null {
  switch (s.kind) {
    case 'reply':
      return s.options.findIndex((o) => o.correct);
    case 'laju':
      return s.options.indexOf(s.cardId);
    case 'cari':
      return s.board.indexOf(s.cardId);
    case 'nm':
      return s.q.dir === 'build' ? null : s.q.answer;
    default:
      return null;
  }
}

/**
 * The teacher-paced run: one slide at a time, nothing timed, nothing advances by itself. Next reveals first where a slide has
 * an answer to reveal (so a two-button clicker is enough), then moves on; Back goes to the slide before, unrevealed.
 */
export class ClassRun {
  index = 0;
  revealed = false;
  /** The option the class chose (0-based), shown before the reveal. */
  chosen: number | null = null;
  /** Frames and Nombor build questions: the bank tiles placed, in order (indices into the bank). */
  built: number[] = [];
  /** Laju!: answers right in this run (shown on screen only; never saved). */
  right = 0;
  readonly answered = new Set<number>();

  constructor(readonly slides: Slide[]) {}

  get slide(): Slide | undefined {
    return this.slides[this.index];
  }

  get done(): boolean {
    return this.index >= this.slides.length;
  }

  /** A line of a dialogue and the Nombor explorer have nothing to reveal (R still shows a line's translation). */
  hasAnswer(s: Slide | undefined = this.slide): boolean {
    return !!s && s.kind !== 'line' && s.kind !== 'explore';
  }

  private reset(): void {
    this.revealed = false;
    this.chosen = null;
    this.built = [];
  }

  reveal(): void {
    if (this.done) return;
    this.revealed = true;
  }

  /** Returns what happened: 'revealed' (first press on an unrevealed slide with an answer), 'moved' or 'end'. */
  next(): 'revealed' | 'moved' | 'end' {
    if (this.done) return 'end';
    if (this.hasAnswer() && !this.revealed) {
      this.reveal();
      return 'revealed';
    }
    this.index++;
    this.reset();
    return this.done ? 'end' : 'moved';
  }

  back(): boolean {
    if (this.index === 0) return false;
    this.index = Math.min(this.index, this.slides.length) - 1;
    this.reset();
    return true;
  }

  /** Number key n (1-based). Laju! marks at once; a frame or build question places the nth tile still in the bank. */
  choose(n: number): boolean {
    const s = this.slide;
    if (!s || this.revealed || n < 1 || n > optionCount(s)) return false;
    if (s.kind === 'frame' || (s.kind === 'nm' && s.q.dir === 'build')) {
      const left = [...Array(optionCount(s)).keys()].filter((i) => !this.built.includes(i));
      if (n > left.length) return false;
      this.built.push(left[n - 1]);
      return true;
    }
    this.chosen = n - 1;
    if (s.kind === 'laju') {
      this.revealed = true;
      if (!this.answered.has(this.index)) {
        this.answered.add(this.index);
        if (this.chosen === rightOption(s)) this.right++;
      }
    }
    return true;
  }

  /** Take a placed tile back (frames and build questions). */
  unplace(pos: number): void {
    if (!this.revealed) this.built.splice(pos, 1);
  }
}
