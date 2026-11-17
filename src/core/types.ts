// Shared data shapes. Card fields match the Hanashishou word-library format (spec 5.5).
import type { ScoreRecords } from './score';

export type LinkType = 'babak' | 'bunyi' | 'kanji' | 'pinjam' | 'keluarga' | 'pasangan' | 'amaran' | 'hook_saya';

export interface Link {
  type: LinkType;
  target?: string;
  text?: string;
}

export interface Card {
  id: string;
  lang: 'ms';
  term: string;
  gloss_en: string;
  gloss_ja: string;
  pos: string;
  affix_tag: string;
  note: string | null;
  /** Japanese version of the note, where the note is written in two languages (shown when the UI is Japanese). */
  note_ja?: string | null;
  /** A register label shown as a chip: 'formal' = formal or written use (speech prefers another word, given in the note). */
  register?: 'formal';
  links: Link[];
  scene: string;
  chapter: number;
  image?: string;
  seen_in_class?: number;
  recognise_only?: boolean;
}

export interface Text3 {
  ms: string;
  en: string;
  ja?: string | null;
}

export interface Frame {
  id: string;
  frame: string;
  example: string;
  meaning_en: string;
  meaning_ja?: string | null;
  /** ⚡ frames: near-miss tiles that must be left out (design note section 4). */
  decoys?: string[];
}

export interface ScenarioLine {
  id: string;
  speaker: string;
  ms: string;
  en: string;
  /** ⚡ dialogue: the line is a reply step; these are the wrong replies (Malay), shown with the line itself. */
  choices?: string[];
  /** English for each wrong reply, in the same order (shown after answering). */
  choices_en?: string[];
  /** ⚡ dialogue: a usage note on this line (Sam, 17 Nov 2026: «bungkus» vs «balut»), shown directly under its own line (B3). */
  note?: string;
  note_ja?: string;
}

export interface KelasPack {
  schema: string;
  lang: 'ms';
  kind: 'kelas';
  id: string;
  chapter: number;
  status: 'live' | 'draft';
  title: Text3;
  cards: Card[];
  frames: Frame[];
  scenario: { title_en: string | null; title_ja?: string | null; lines: ScenarioLine[] };
  sedia_kelas: { cards: string[]; frames: string[]; scene: string | null };
}

export interface DuniaPack {
  schema: string;
  lang: 'ms';
  kind: 'dunia';
  id: string;
  chapter: number;
  status: 'live' | 'draft';
  world: { id: string; ms: string; en: string; ja?: string | null };
  title: Text3;
  setting: { en: string | null; ja?: string | null };
  cards: Card[];
}

/**
 * A chapter's ⚡ stage (content/ms/stretch/xNN.json). Its cards are the chapter's extension rows («ChN (extension)»);
 * they are never added to the chapter pack, so chapter progress, stamps, Sedia Kelas and the learning path do not change.
 */
export interface StretchPack {
  schema: string;
  lang: 'ms';
  kind: 'stretch';
  id: string;
  chapter: number;
  status: 'live' | 'draft';
  title: Text3;
  cards: Card[];
  frames: Frame[];
  scenario: { title_en: string | null; title_ja?: string | null; lines: ScenarioLine[] };
  /**
   * Cari Benda ⚡ (design note section 4), only where the chapter has a picture scene and at least four extension nouns can be
   * drawn: `scene` is that Dunia scene (its world and title frame the board), `core` the drawn core objects mixed in.
   */
  cari?: { scene: string; core: string[] };
}

export type Pack = KelasPack | DuniaPack | StretchPack;

/** SM-2 card state, the same shape as Hanashishou's SrsState (plus `last`, the last review time). */
export interface SrsState {
  ease: number;
  interval: number; // days
  reps: number;
  due: number; // epoch ms
  lapses: number;
  last?: number; // epoch ms
}

export type QuestionType = 'meaning' | 'usage' | 'pronunciation' | 'grammar' | 'other';

export interface ItemContext {
  kind: 'card' | 'frame' | 'line' | 'general';
  id?: string;
  /** The Malay text the question is about, copied so the teacher can read it without the app. */
  text?: string;
  chapter?: number;
}

export interface Question {
  id: string;
  createdAt: string;
  type: QuestionType;
  text: string;
  context: ItemContext;
  answered: boolean;
}

export interface ContentReport {
  id: string;
  createdAt: string;
  kind: 'error' | 'better_example';
  text: string;
  context: ItemContext;
}

export interface Stamp {
  id: string;
  /** ready = class prep, dialogue = the chapter dialogue played once, chapter = every card known, stretch = ⚡ done. */
  kind: 'day' | 'ready' | 'dialogue' | 'chapter' | 'stretch';
  date: string; // YYYY-MM-DD
  chapter?: number;
}

export interface Settings {
  lang: 'ja' | 'en' | 'ms';
  theme: 'auto' | 'light' | 'dark';
  kanaHints: boolean;
  backupReminder: boolean;
  speechRate: number;
  /** Colour palette (light and dark variants each); see styles.css [data-palette]. */
  palette: 'kancil' | 'cyan' | 'royal' | 'rebel';
  /** Text size: sets the root font size, everything else is in rem. */
  textSize: 's' | 'm' | 'l' | 'xl';
  /** Show points, speed bonus and combo during practice (records are kept either way). */
  showPoints: boolean;
}

export interface AppState {
  schemaVersion: 1;
  createdAt: string;
  profile: { name: string; onboarded: boolean; persisted?: boolean; voice?: 'ms' | 'id' | 'none' };
  settings: Settings;
  srs: Record<string, SrsState>;
  /** Times a card's term has been shown, for fading katakana hints. */
  kanaSeen: Record<string, number>;
  frames: Record<string, { tries: number; correct: number; last?: string }>;
  /** Reply steps per dialogue line ID (the line chosen as the reply). Added for the ⚡ stage; migrate() fills it. */
  lines: Record<string, { tries: number; correct: number; last?: string }>;
  /**
   * Full play-throughs per dialogue ('c04' = the chapter 4 dialogue, 'x04' = the ⚡ 4 dialogue): the best score (reply steps
   * right on the first try in one play-through), the number of reply steps, and plays. Sam, 17 Nov 2026: the dialogue 🔥 needs
   * 60 % (rounded up). Added after Build A; migrate() fills it.
   */
  dialogues: Record<string, { best: number; total: number; plays: number; last?: string }>;
  myHooks: Record<string, string>;
  questions: Question[];
  reports: ContentReport[];
  stamps: Stamp[];
  /** Seconds studied per local day (YYYY-MM-DD). */
  studySeconds: Record<string, number>;
  howToSeen: Record<string, boolean>;
  lastBackupAt?: string;
  /** Personal bests for points (src/core/score.ts). */
  scores: ScoreRecords;
  /**
   * Wrong answers in every game (Sam, 17 Nov 2026): the most recent MISTAKE_CAP entries and a count per item. Added with
   * teacher mode; migrate() gives old saves an empty log (schemaVersion unchanged). Class runs never write to it.
   */
  mistakes: MistakeLog;
  /** Nombor & Masa rounds played per part (practice only; for the progress report). Added with teacher mode. */
  nombor: Record<string, { plays: number; best: number; total: number; last?: string }>;
}

export type MistakeGame = 'kad-mc' | 'kad-recall' | 'susun' | 'reply' | 'cari' | 'laju' | 'nombor';

export interface MistakeEntry {
  /** The item: a card ID, a frame ID, a dialogue line ID, or "nombor:<part>:<right answer>". */
  id: string;
  game: MistakeGame;
  /** What the learner answered; null = «わからない» or not recalled. */
  answer: string | null;
  right: string;
  /** ISO time. */
  date: string;
  /** Susun Ayat: the decoy tiles left in the sentence. */
  decoys?: string[];
}

export interface MistakeLog {
  log: MistakeEntry[];
  /** Wrong answers per item ID, over all time (kept when old log entries drop off). */
  counts: Record<string, number>;
}
