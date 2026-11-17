import * as db from './db';
import { emptyRecords } from './score';
import { migrateSrs } from './srs';
import type { AppState, SrsState } from './types';

/**
 * Cards whose ID changed (old ID -> new ID). Jambatan words promoted to a chapter's ⚡ stage (chapter 4 on 15 Nov 2026, Build B1 on
 * 17 Nov 2026) got new
 * ⚡ card IDs; migrate() copies the old schedule to the new ID once, if the new ID has none, so a learner who knew «beri»
 * from Jambatan starts ⚡ 4 with «beri» known. The old IDs are in RETIRED_IDS (tools/import_hanashishou_bridge.py).
 */
export const MOVED_CARDS: Record<string, string> = {
  'ms-j-social-22': 'ms-x04-001', // beri (L-1312)
  'ms-j-home-condo-29': 'ms-x04-002', // semula (L-1321)
  'ms-j-daily-life-42': 'ms-x04-003', // bantu (L-1331)
  'ms-j-social-39': 'ms-x04-004', // ulang (L-1342)
  'ms-j-home-condo-30': 'ms-x04-005', // biasa (L-1351)
  'ms-j-social-49': 'ms-x04-006', // hampir (L-1359)
  'ms-j-office-44': 'ms-x04-007', // sejam (L-1399)
  // Build B1 (17 Nov 2026): promoted to the ⚡ stages of chapters 1 to 3 and 5 to 9.
  'ms-j-daily-life-41': 'ms-x02-001', // mana (L-1330)
  'ms-j-office-42': 'ms-x02-002', // kenal (L-1392)
  'ms-j-social-31': 'ms-x03-001', // cuma (L-1325)
  'ms-j-office-32': 'ms-x03-002', // beberapa (L-1343)
  'ms-j-daily-life-71': 'ms-x03-003', // percuma (L-1465)
  'ms-j-social-27': 'ms-x05-001', // salah (L-1319)
  'ms-j-social-30': 'ms-x05-002', // tentang (L-1323)
  'ms-j-office-28': 'ms-x05-003', // nampak (L-1327)
  'ms-j-social-32': 'ms-x05-004', // cara (L-1332)
  'ms-j-social-35': 'ms-x05-005', // bunyi (L-1344)
  'ms-j-daily-life-45': 'ms-x05-006', // tanpa (L-1364)
  'ms-j-office-30': 'ms-x06-001', // pasukan (L-1333)
  'ms-j-social-34': 'ms-x06-002', // betul-betul (L-1337)
  'ms-j-social-52': 'ms-x06-003', // selama (L-1363)
  'ms-j-daily-life-43': 'ms-x07-001', // tunjuk (L-1336)
  'ms-j-social-33': 'ms-x08-001', // seorang (L-1335)
  'ms-j-social-37': 'ms-x08-002', // sendiri (L-1339)
  'ms-j-social-43': 'ms-x09-001', // terima (L-1349)
  // Build B2 (17 Nov 2026): «hebat» promoted to ⚡ 5 (Sam), after ⚡ 5's 31 cards.
  'ms-j-social-54': 'ms-x05-032', // hebat (L-1369)
  // Build B2 (17 Nov 2026): promoted to the ⚡ stages of chapters 10 to 17.
  'ms-j-social-36': 'ms-x10-001', // cerita (L-1338)
  'ms-j-office-34': 'ms-x11-001', // bahagian (L-1346)
  'ms-j-daily-life-38': 'ms-x13-001', // tiada (L-1313)
  'ms-j-social-23': 'ms-x13-002', // mungkin (L-1315)
  'ms-j-social-25': 'ms-x13-003', // dapat (L-1317)
  'ms-j-health-23': 'ms-x13-004', // penting (L-1340)
  'ms-j-office-35': 'ms-x13-005', // langsung (L-1348)
  'ms-j-social-45': 'ms-x13-006', // kena (L-1353)
  'ms-j-office-27': 'ms-x14-001', // memang (L-1326)
  'ms-j-office-31': 'ms-x14-002', // perkara (L-1334)
  'ms-j-social-38': 'ms-x14-003', // sebenarnya (L-1341)
  'ms-j-social-40': 'ms-x14-004', // begitu (L-1350)
  'ms-j-social-46': 'ms-x14-005', // pasti (L-1355)
  'ms-j-home-condo-50': 'ms-x14-006', // sebenar (L-1477)
  'ms-j-social-29': 'ms-x15-001', // sesuatu (L-1322)
  'ms-j-office-26': 'ms-x15-002', // apa-apa (L-1324)
  'ms-j-daily-life-46': 'ms-x16-001', // teruk (L-1365)
  'ms-j-home-condo-26': 'ms-x16-010', // kesan (L-0674; it already had a row, so promoted, not added)
  // Build B3 (17 Nov 2026): L-1638 «satu per satu» merged into L-1532 (now «satu per satu», Sam); its ⚡ 3 card is retired.
  'ms-x03-023': 'ms-x03-022', // satu per satu (L-1638 → L-1532)
  // Build B3: «mengantuk» (L-0768, a Jambatan row) promoted to ⚡ 17, before its spoken partner «ngantuk».
  'ms-j-health-37': 'ms-x17-022', // mengantuk (L-0768)
};

export function moveCards(srs: Record<string, SrsState>, moved: Record<string, string> = MOVED_CARDS): Record<string, SrsState> {
  const out = { ...srs };
  for (const [from, to] of Object.entries(moved)) if (out[from] && !out[to]) out[to] = { ...out[from] };
  return out;
}

const KEY = 'state';

export function defaultState(): AppState {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    profile: { name: '', onboarded: false },
    settings: { lang: 'ja', theme: 'auto', kanaHints: true, backupReminder: true, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true },
    srs: {},
    kanaSeen: {},
    frames: {},
    lines: {},
    dialogues: {},
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [],
    studySeconds: {},
    howToSeen: {},
    scores: emptyRecords(),
  };
}

/** Fill in fields added after a savefile was written, so old files keep loading. */
export function migrate(raw: Partial<AppState> & Record<string, unknown>): AppState {
  const base = defaultState();
  return {
    ...base,
    ...raw,
    schemaVersion: 1,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    scores: { ...base.scores, ...((raw.scores as object) ?? {}) },
    lines: { ...((raw.lines as AppState['lines']) ?? {}) },
    dialogues: { ...((raw.dialogues as AppState['dialogues']) ?? {}) },
    srs: moveCards(Object.fromEntries(Object.entries(raw.srs ?? {}).map(([k, v]) => [k, migrateSrs(v as unknown as Record<string, unknown>)]))),
  } as AppState;
}

export let state: AppState = defaultState();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

export async function loadState(): Promise<AppState> {
  try {
    const saved = await db.get<AppState>(KEY);
    state = saved ? migrate(saved as AppState & Record<string, unknown>) : defaultState();
  } catch (e) {
    console.warn('Could not open storage; progress will not be saved.', e);
    state = defaultState();
  }
  return state;
}

export function replaceState(next: AppState): Promise<void> {
  state = next;
  return saveNow();
}

// ---- Class runs (teacher mode): a separate, in-memory copy of the learner ----
// A class run (the teacher-mode launcher) swaps `state` for a deep copy and never saves it, so nothing it does (a schedule, a
// stamp, points, a mistake, a katakana hint seen) reaches the learner. Ending the run puts the learner's own object back,
// untouched; only the display settings changed during the run (language, theme) are kept, since they are not learner data.
let realState: AppState | null = null;

export function inClassRun(): boolean {
  return realState !== null;
}

/**
 * Start a class run: save the learner first (so no pending write is lost; saveNow copies the state before its first await),
 * then play on a copy that is never saved. Synchronous, so the run's first key press already plays on the copy.
 */
export function beginClassRun(): void {
  if (realState) return;
  void saveNow();
  realState = state;
  state = JSON.parse(JSON.stringify(state)) as AppState;
}

/** End a class run: the learner's own state comes back exactly as it was (plus any display-settings change). */
export function endClassRun(): void {
  if (!realState) return;
  const settings = state.settings;
  state = realState;
  realState = null;
  state.settings = { ...state.settings, ...settings };
  void saveNow();
  listeners.forEach((l) => l());
}

/** Mutate state, then save shortly after (batches rapid changes). In a class run nothing is saved. */
export function update(fn: (s: AppState) => void): void {
  fn(state);
  if (realState) {
    listeners.forEach((l) => l());
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveNow(), 250);
  listeners.forEach((l) => l());
}

export async function saveNow(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  if (realState) return;
  try {
    await db.set(KEY, JSON.parse(JSON.stringify(state)));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void saveNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void saveNow();
  });
}
