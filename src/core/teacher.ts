// Teacher mode (Sam, 17 Nov 2026): a device setting, not learner data. It lives under its own IndexedDB key ('teacher'), never
// in the learner state, so it is never in a savefile or memory card, and switching it never touches the learner.
import * as db from './db';

export interface TeacherPrefs {
  on: boolean;
  /** Class runs: show the English and Japanese glosses (H toggles). Off by default, so the class guesses first. */
  translations: boolean;
  /** Class Laju!: run the 60-second clock (off by default: teacher-paced). */
  lajuTimer: boolean;
  /** Class runs: play a word or line once when it appears (P plays it again). */
  autoplay: boolean;
}

export const TEACHER_KEY = 'teacher';

export function defaultPrefs(): TeacherPrefs {
  return { on: false, translations: false, lajuTimer: false, autoplay: true };
}

export let teacher: TeacherPrefs = defaultPrefs();
const listeners = new Set<() => void>();

export async function loadTeacher(): Promise<TeacherPrefs> {
  try {
    const saved = await db.get<Partial<TeacherPrefs>>(TEACHER_KEY);
    teacher = { ...defaultPrefs(), ...(saved ?? {}) };
  } catch {
    teacher = defaultPrefs();
  }
  return teacher;
}

export async function setTeacher(patch: Partial<TeacherPrefs>): Promise<void> {
  teacher = { ...teacher, ...patch };
  listeners.forEach((l) => l());
  try {
    await db.set(TEACHER_KEY, { ...teacher });
  } catch {
    /* private mode: keep it for this visit */
  }
}

export function isTeacherMode(): boolean {
  return teacher.on;
}

export function onTeacherChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
