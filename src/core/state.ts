import * as db from './db';
import { emptyRecords } from './score';
import { migrateSrs } from './srs';
import type { AppState, SrsState } from './types';

/**
 * Cards whose ID changed (old ID -> new ID). The 7 Jambatan words promoted to the chapter 4 ⚡ stage (15 Nov 2026) got new
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

/** Mutate state, then save shortly after (batches rapid changes). */
export function update(fn: (s: AppState) => void): void {
  fn(state);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveNow(), 250);
  listeners.forEach((l) => l());
}

export async function saveNow(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
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
