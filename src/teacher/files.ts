// Teacher Desk input (Sam, 17 Nov 2026): a student file may be the send-to-teacher report (.json), a memory card (the
// savefile, .json or .katakata), or a progress report (.html, which embeds the report JSON). Each becomes a TeacherReport;
// a memory card's progress, weakest words and mistakes are derived from the learner inside it.
import { extractReport, reportFromState } from '../core/progressreport';
import { isReport, type TeacherReport } from '../core/report';
import { parseSavefile, SAVEFILE_KIND } from '../core/savefile';

export type FileResult = { ok: true; report: TeacherReport } | { ok: false; reason: 'unknown' | 'checksum' | 'too_new' };

export async function readStudentFile(text: string): Promise<FileResult> {
  const trimmed = text.replace(/^﻿/, '').trimStart();
  if (trimmed.startsWith('<')) {
    const r = extractReport(trimmed);
    return r ? { ok: true, report: r } : { ok: false, reason: 'unknown' };
  }
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: 'unknown' };
  }
  if (isReport(data)) return { ok: true, report: { ...data, source: data.source ?? 'report' } };
  if (data && typeof data === 'object' && (data as { kind?: string }).kind === SAVEFILE_KIND) {
    const parsed = await parseSavefile(trimmed);
    if (!parsed.ok) return { ok: false, reason: parsed.reason === 'not_savefile' ? 'unknown' : parsed.reason };
    return { ok: true, report: reportFromState(parsed.file.state, new Date(parsed.file.savedAt), 'card') };
  }
  return { ok: false, reason: 'unknown' };
}
