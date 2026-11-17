// Student slots (teacher mode, Sam 17 Nov 2026): Sam keeps several learners on one device and switches between them, like
// memory cards in an old console. The active slot is the normal app state (IndexedDB key 'state'); every other slot is kept
// whole under 'slot:<id>', and the list under 'slots'. Sam's own learner is the slot 'me', the default. Switching saves the
// slot being left first. Before any memory card is loaded, the learner it would change is auto-saved ('autosaves').
// Display settings (language, theme, palette, text size) follow the device, not the slot: a student's own settings are kept
// in the slot's list entry and put back in their memory card.
import * as db from './db';
import { content } from './content';
import { currentChapter, knownCount } from './progress';
import { mergeStates } from './savefile';
import { migrate, replaceState, saveNow, state } from './state';
import type { AppState, Settings } from './types';

export const ME = 'me';
const LIST = 'slots';
const slotKey = (id: string) => `slot:${id}`;
const AUTOSAVES = 'autosaves';
export const AUTOSAVE_KEEP = 3;

export interface SlotMeta {
  id: string;
  name: string;
  createdAt: string;
  /** The last practice in this slot (newest review, stamp or study day). */
  lastPlayed?: string;
  chapter: number;
  words: number;
  /** A student's own display settings, kept for their memory card (the device's are used while the slot is active). */
  settings?: Settings;
}

export interface SlotStore {
  active: string;
  list: SlotMeta[];
}

export interface Autosave {
  at: string;
  /** Why: 'load' (before a memory card was loaded) or 'update' (before a slot was updated from a card). */
  reason: 'load' | 'update';
  slot: string;
  name: string;
  state: AppState;
}

/** Names compare without case or surrounding spaces. */
export function normName(n: string | undefined | null): string {
  return (n ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Slots with the same name as a memory card (the name-match prompt: update one of them, or keep both). */
export function matchSlots(list: SlotMeta[], cardName: string): SlotMeta[] {
  const n = normName(cardName);
  return n ? list.filter((x) => normName(x.name) === n) : [];
}

/** Is a card the current learner's? 'same', 'different', or 'unknown' when either has no name. */
export function sameStudent(currentName: string, cardName: string): 'same' | 'different' | 'unknown' {
  const a = normName(currentName);
  const b = normName(cardName);
  if (!a || !b) return 'unknown';
  return a === b ? 'same' : 'different';
}

/** The last time a learner practised: the newest review, stamp or study day. */
export function lastPlayed(s: AppState): string | undefined {
  let t = 0;
  for (const x of Object.values(s.srs)) if (x.last && x.last > t) t = x.last;
  const days = [...Object.keys(s.studySeconds ?? {}), ...s.stamps.map((x) => x.date)].sort();
  const day = days.length ? Date.parse(days[days.length - 1] + 'T12:00:00') : 0;
  const best = Math.max(t, day || 0);
  return best ? new Date(best).toISOString() : undefined;
}

export function metaOf(id: string, s: AppState, prev?: Partial<SlotMeta>): SlotMeta {
  return {
    id,
    name: s.profile.name || prev?.name || (id === ME ? 'Me' : 'Student'),
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    lastPlayed: lastPlayed(s),
    chapter: content.chapters.length ? currentChapter(s) : 1,
    words: knownCount(s),
    ...(prev?.settings ? { settings: prev.settings } : {}),
  };
}

let store: SlotStore | null = null;

export async function loadSlots(): Promise<SlotStore> {
  try {
    store = (await db.get<SlotStore>(LIST)) ?? null;
  } catch {
    store = null;
  }
  if (!store || !store.list?.length) store = { active: ME, list: [metaOf(ME, state)] };
  // The active slot's entry follows the live learner.
  store.list = store.list.map((x) => (x.id === store!.active ? metaOf(x.id, state, x) : x));
  return store;
}

export function slots(): SlotStore {
  return store ?? { active: ME, list: [metaOf(ME, state)] };
}

export function activeSlot(): SlotMeta {
  const s = slots();
  return s.list.find((x) => x.id === s.active) ?? metaOf(ME, state);
}

async function persist(): Promise<void> {
  if (store) await db.set(LIST, JSON.parse(JSON.stringify(store)));
}

/** The learner of a slot, whole, with its own display settings (for its memory card or report). */
export async function slotState(id: string): Promise<AppState | null> {
  const s = slots();
  const meta = s.list.find((x) => x.id === id);
  if (!meta) return null;
  const raw = id === s.active ? JSON.parse(JSON.stringify(state)) : await db.get<AppState>(slotKey(id));
  if (!raw) return null;
  const out = migrate(raw as AppState & Record<string, unknown>);
  if (meta.settings) out.settings = { ...meta.settings };
  return out;
}

/** Save the active slot's learner under its own key and refresh its list entry. */
export async function saveActiveSlot(): Promise<void> {
  await loadSlots();
  await saveNow();
  const s = slots();
  const meta = s.list.find((x) => x.id === s.active)!;
  const copy = JSON.parse(JSON.stringify(state)) as AppState;
  if (meta.settings) copy.settings = { ...meta.settings };
  await db.set(slotKey(s.active), copy);
  Object.assign(meta, metaOf(meta.id, state, meta));
  await persist();
}

/** Switch to another slot: the current one is saved first; the device keeps its display settings. */
export async function switchSlot(id: string): Promise<void> {
  await saveActiveSlot();
  const s = slots();
  if (id === s.active || !s.list.some((x) => x.id === id)) return;
  const next = await db.get<AppState>(slotKey(id));
  if (!next) return;
  const device = state.settings;
  const target = migrate(next as AppState & Record<string, unknown>);
  await replaceState({ ...target, settings: { ...device }, profile: { ...target.profile, onboarded: true } });
  s.active = id;
  await persist();
}

function newId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Plug in a memory card as a new slot (it does not become active). */
export async function addSlot(card: AppState): Promise<SlotMeta> {
  await saveActiveSlot();
  const s = slots();
  const id = newId();
  const st = migrate(JSON.parse(JSON.stringify(card)) as AppState & Record<string, unknown>);
  const meta = metaOf(id, st, { settings: st.settings });
  await db.set(slotKey(id), st);
  s.list.push(meta);
  await persist();
  return meta;
}

/** Update a slot from a memory card: its learner is auto-saved first, then the card is merged in (or replaces it). */
export async function updateSlot(id: string, card: AppState, how: 'merge' | 'replace' = 'merge'): Promise<void> {
  await saveActiveSlot();
  const s = slots();
  const meta = s.list.find((x) => x.id === id);
  if (!meta) return;
  const before = await slotState(id);
  if (before) await autosave('update', id, before);
  const incoming = migrate(JSON.parse(JSON.stringify(card)) as AppState & Record<string, unknown>);
  const next = how === 'merge' && before ? mergeStates({ ...before, profile: { ...before.profile, name: incoming.profile.name || before.profile.name } }, incoming) : incoming;
  meta.settings = { ...(incoming.settings ?? next.settings) };
  if (id === s.active) {
    await replaceState({ ...next, settings: { ...state.settings }, profile: { ...next.profile, onboarded: true } });
  }
  await db.set(slotKey(id), { ...next, settings: meta.settings });
  Object.assign(meta, metaOf(id, next, meta));
  await persist();
}

/** Delete a slot (never Sam's own, never the active one). */
export async function deleteSlot(id: string): Promise<boolean> {
  const s = slots();
  if (id === ME || id === s.active) return false;
  s.list = s.list.filter((x) => x.id !== id);
  await db.del(slotKey(id));
  await persist();
  return true;
}

/** Keep a copy of a learner before a memory card changes it (the newest AUTOSAVE_KEEP are kept). */
export async function autosave(reason: Autosave['reason'], slot: string, s: AppState): Promise<void> {
  let list: Autosave[] = [];
  try {
    list = (await db.get<Autosave[]>(AUTOSAVES)) ?? [];
  } catch {
    list = [];
  }
  list.push({ at: new Date().toISOString(), reason, slot, name: s.profile.name, state: JSON.parse(JSON.stringify(s)) });
  await db.set(AUTOSAVES, list.slice(-AUTOSAVE_KEEP));
}

export async function autosaves(): Promise<Autosave[]> {
  try {
    return (await db.get<Autosave[]>(AUTOSAVES)) ?? [];
  } catch {
    return [];
  }
}

/** Auto-save the current learner, then load a card into it (merge or replace). The learner mode's Load memory card. */
export async function loadIntoCurrent(card: AppState, how: 'merge' | 'replace'): Promise<void> {
  await saveNow();
  await autosave('load', slots().active, JSON.parse(JSON.stringify(state)));
  const next = how === 'merge' ? mergeStates(state, card) : { ...card, profile: { ...card.profile, onboarded: true } };
  await replaceState(next);
  if (store) {
    const meta = store.list.find((x) => x.id === store!.active);
    if (meta) Object.assign(meta, metaOf(meta.id, next, meta));
    await persist();
  }
}

/** Put back the learner from before the last load (the newest autosave of the active slot). */
export async function undoLastLoad(): Promise<boolean> {
  const list = await autosaves();
  const active = slots().active;
  const i = list.map((x) => x.slot).lastIndexOf(active);
  if (i < 0) return false;
  const [a] = list.splice(i, 1);
  await replaceState({ ...migrate(a.state as AppState & Record<string, unknown>), settings: { ...state.settings }, profile: { ...a.state.profile, onboarded: true } });
  await db.set(AUTOSAVES, list);
  return true;
}

/** For tests: forget the cached list. */
export function resetSlotsCache(): void {
  store = null;
}
