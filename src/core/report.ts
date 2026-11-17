// "Send to teacher" file (spec 9.2): katakata_<name>_<YYYY-MM-DD>.json
import type { MistakeItem } from './mistakes';
import type { ContentReport, Question } from './types';

export const REPORT_KIND = 'katakata-teacher-report';

export interface ChapterProgressRow {
  chapter: number;
  known: number;
  total: number;
  coreKnown: number;
  coreTotal: number;
  ready: boolean;
  /** 🔥 checkpoints lit and their number (added with the ⚡ stage; older files have neither). */
  flames?: number;
  checkpoints?: number;
  /** ⚡ stage: open (every 🔥 lit) or done (the 'stretch' stamp). */
  stretch?: 'open' | 'done';
}

export interface WeakWord {
  id: string;
  term: string;
  gloss_en: string;
  chapter: number;
  lapses: number;
}

export interface TeacherReport {
  app: 'katakata';
  kind: typeof REPORT_KIND;
  version: 1;
  student: string;
  createdAt: string;
  questions?: Question[];
  reports?: ContentReport[];
  progress?: ChapterProgressRow[];
  weakest?: WeakWord[];
  minutesThisWeek?: number;
  /** Added with the progress report (Sam, 17 Nov 2026); older files have none of these. */
  streak?: number;
  knownWords?: number;
  /** "Mistakes to review": wrong answers grouped by word, sentence or line. */
  mistakes?: MistakeItem[];
  /** Nombor & Masa rounds played per part. */
  nombor?: Record<string, { plays: number; best: number; total: number; last?: string }>;
  /** Next steps, in English (the report shows them in its own language). */
  nextSteps?: string[];
  /** Where the Teacher Desk read it from: the send-to-teacher file, a memory card or a progress report (HTML). */
  source?: 'report' | 'card' | 'html';
}

export type Section = 'questions' | 'reports' | 'progress' | 'weakest' | 'minutes';

export function buildReport(
  student: string,
  data: { questions: Question[]; reports: ContentReport[]; progress: ChapterProgressRow[]; weakest: WeakWord[]; minutes: number },
  include: Record<Section, boolean>,
  now = new Date(),
): TeacherReport {
  const r: TeacherReport = { app: 'katakata', kind: REPORT_KIND, version: 1, student, createdAt: now.toISOString() };
  if (include.questions) r.questions = data.questions;
  if (include.reports) r.reports = data.reports;
  if (include.progress) r.progress = data.progress;
  if (include.weakest) r.weakest = data.weakest;
  if (include.minutes) r.minutesThisWeek = data.minutes;
  return r;
}

export function reportFilename(safeStudent: string, now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `katakata_${safeStudent}_${d}.json`;
}

export function isReport(x: unknown): x is TeacherReport {
  return !!x && typeof x === 'object' && (x as TeacherReport).app === 'katakata' && (x as TeacherReport).kind === REPORT_KIND;
}
