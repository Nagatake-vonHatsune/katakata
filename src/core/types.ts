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
}

export interface ScenarioLine {
  id: string;
  speaker: string;
  ms: string;
  en: string;
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

export type Pack = KelasPack | DuniaPack;

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
  kind: 'day' | 'ready' | 'chapter';
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
}
