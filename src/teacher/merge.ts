// Teacher Desk logic (spec 9.3), kept free of DOM code so it can be tested.
import { isReport, type TeacherReport } from '../core/report';
import type { ContentReport, Question } from '../core/types';

/** One report per student: the newest file wins. */
export function addReports(existing: TeacherReport[], incoming: unknown[]): { reports: TeacherReport[]; rejected: number } {
  const byStudent = new Map(existing.map((r) => [r.student.trim().toLowerCase(), r]));
  let rejected = 0;
  for (const x of incoming) {
    if (!isReport(x)) {
      rejected++;
      continue;
    }
    const key = x.student.trim().toLowerCase();
    const cur = byStudent.get(key);
    if (!cur || x.createdAt > cur.createdAt) byStudent.set(key, x);
  }
  return { reports: [...byStudent.values()].sort((a, b) => a.student.localeCompare(b.student)), rejected };
}

export interface QuestionGroup {
  chapter: number | null;
  about: string;
  students: string[];
  items: Array<Question & { student: string }>;
}

/** Questions grouped by chapter and word, with duplicates counted by student. */
export function groupQuestions(reports: TeacherReport[]): QuestionGroup[] {
  const groups = new Map<string, QuestionGroup>();
  for (const r of reports)
    for (const q of r.questions ?? []) {
      if (q.answered) continue;
      const chapter = q.context?.chapter ?? null;
      const about = (q.context?.text ?? '').trim();
      const key = `${chapter ?? 99}|${about.toLowerCase()}`;
      const g = groups.get(key) ?? { chapter, about, students: [], items: [] };
      if (!g.students.includes(r.student)) g.students.push(r.student);
      g.items.push({ ...q, student: r.student });
      groups.set(key, g);
    }
  return [...groups.values()].sort((a, b) => (a.chapter ?? 99) - (b.chapter ?? 99) || b.students.length - a.students.length || a.about.localeCompare(b.about));
}

export function weakAcrossClass(reports: TeacherReport[]): Array<{ term: string; chapter: number; gloss: string; students: string[] }> {
  const m = new Map<string, { term: string; chapter: number; gloss: string; students: string[] }>();
  for (const r of reports)
    for (const w of r.weakest ?? []) {
      const e = m.get(w.id) ?? { term: w.term, chapter: w.chapter, gloss: w.gloss_en, students: [] };
      if (!e.students.includes(r.student)) e.students.push(r.student);
      m.set(w.id, e);
    }
  return [...m.values()].sort((a, b) => b.students.length - a.students.length || a.chapter - b.chapter);
}

export function allContentReports(reports: TeacherReport[]): Array<ContentReport & { student: string }> {
  return reports.flatMap((r) => (r.reports ?? []).map((x) => ({ ...x, student: r.student })));
}
