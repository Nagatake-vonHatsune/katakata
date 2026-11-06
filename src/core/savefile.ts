// Savefile (spec 10.2): one .katakata file, JSON inside, with schema version and checksum.
import { emptyRecords, mergeRecords } from './score';
import { migrate } from './state';
import type { AppState, SrsState } from './types';

export const SAVEFILE_KIND = 'katakata-savefile';
export const SAVEFILE_VERSION = 1;

export interface Savefile {
  app: 'katakata';
  kind: typeof SAVEFILE_KIND;
  schemaVersion: number;
  savedAt: string;
  checksum: string;
  state: AppState;
}

/** Stable JSON (sorted keys) so the checksum doesn't depend on key order. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.keys(v as object)
        .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(v);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildSavefile(state: AppState, now = new Date()): Promise<Savefile> {
  const clean = JSON.parse(JSON.stringify(state)) as AppState;
  return {
    app: 'katakata',
    kind: SAVEFILE_KIND,
    schemaVersion: SAVEFILE_VERSION,
    savedAt: now.toISOString(),
    checksum: await sha256(stableStringify(clean)),
    state: clean,
  };
}

export type ParseResult = { ok: true; file: Savefile } | { ok: false; reason: 'not_savefile' | 'checksum' | 'too_new' };

export async function parseSavefile(text: string): Promise<ParseResult> {
  let data: Savefile;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_savefile' };
  }
  if (!data || data.app !== 'katakata' || data.kind !== SAVEFILE_KIND || !data.state) return { ok: false, reason: 'not_savefile' };
  if (data.schemaVersion > SAVEFILE_VERSION) return { ok: false, reason: 'too_new' };
  if ((await sha256(stableStringify(data.state))) !== data.checksum) return { ok: false, reason: 'checksum' };
  return { ok: true, file: { ...data, state: migrate(data.state as AppState & Record<string, unknown>) } };
}

export function summarise(file: Savefile, chapterOf: (cardId: string) => number | undefined) {
  const ids = Object.keys(file.state.srs).filter((id) => file.state.srs[id].reps > 0);
  const chapters = ids.map(chapterOf).filter((c): c is number => typeof c === 'number');
  return { words: ids.length, maxChapter: chapters.length ? Math.max(...chapters) : 0, savedAt: file.savedAt };
}

function later(a?: string, b?: string): boolean {
  return (a ?? '') > (b ?? '');
}

/** Merge: per card keep the more recently reviewed schedule; lists are unioned by id. */
export function mergeStates(local: AppState, incoming: AppState): AppState {
  const srs: Record<string, SrsState> = { ...local.srs };
  for (const [id, s] of Object.entries(incoming.srs)) {
    const mine = srs[id];
    if (!mine || (s.last ?? 0) > (mine.last ?? 0) || (!mine.last && !s.last && s.reps > mine.reps)) srs[id] = s;
  }
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) if (!m.has(x.id)) m.set(x.id, x);
    return [...m.values()];
  };
  const maxRec = (a: Record<string, number>, b: Record<string, number>) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
    return out;
  };
  const frames = { ...local.frames };
  for (const [k, v] of Object.entries(incoming.frames)) {
    const m = frames[k];
    frames[k] = m ? { tries: Math.max(m.tries, v.tries), correct: Math.max(m.correct, v.correct), last: later(v.last, m.last) ? v.last : m.last } : v;
  }
  // Questions: if either copy marks one answered, it is answered.
  const questions = byId(local.questions, incoming.questions).map((q) => {
    const other = incoming.questions.find((x) => x.id === q.id);
    return other ? { ...q, answered: q.answered || other.answered } : q;
  });
  const stamps = byId(local.stamps, incoming.stamps).filter(
    (s, i, all) => all.findIndex((x) => x.kind === s.kind && x.date === s.date && x.chapter === s.chapter) === i,
  );
  return {
    ...local,
    profile: { ...local.profile, name: local.profile.name || incoming.profile.name },
    srs,
    kanaSeen: maxRec(local.kanaSeen, incoming.kanaSeen),
    frames,
    myHooks: { ...incoming.myHooks, ...local.myHooks },
    questions,
    reports: byId(local.reports, incoming.reports),
    stamps,
    studySeconds: maxRec(local.studySeconds, incoming.studySeconds),
    howToSeen: { ...incoming.howToSeen, ...local.howToSeen },
    scores: mergeRecords(local.scores ?? emptyRecords(), incoming.scores ?? emptyRecords()),
    lastBackupAt: later(incoming.lastBackupAt, local.lastBackupAt) ? incoming.lastBackupAt : local.lastBackupAt,
  };
}
