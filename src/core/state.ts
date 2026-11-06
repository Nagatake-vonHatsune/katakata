import * as db from './db';
import { migrateSrs } from './srs';
import type { AppState } from './types';

const KEY = 'state';

export function defaultState(): AppState {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    profile: { name: '', onboarded: false },
    settings: { lang: 'ja', theme: 'auto', kanaHints: true, backupReminder: true, speechRate: 0.9 },
    srs: {},
    kanaSeen: {},
    frames: {},
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [],
    studySeconds: {},
    howToSeen: {},
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
    srs: Object.fromEntries(Object.entries(raw.srs ?? {}).map(([k, v]) => [k, migrateSrs(v as unknown as Record<string, unknown>)])),
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
