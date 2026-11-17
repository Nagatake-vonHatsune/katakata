// Teacher-mode keys (Sam, 17 Nov 2026), for a laptop keyboard or a presenter clicker (clickers send PageDown / PageUp).
// → / Space / PageDown = next, ← / PageUp = back, 1 to 4 = choose an option (up to 9 on a bigger board), R = reveal,
// H = hide or show translations, P = play audio. Kept free of DOM code so the mapping can be tested.

export type KeyAction =
  | { kind: 'next' }
  | { kind: 'back' }
  | { kind: 'choose'; n: number }
  | { kind: 'reveal' }
  | { kind: 'translations' }
  | { kind: 'audio' };

export interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** The element with focus: typing in a text field is never a command. */
  target?: EventTarget | { tagName?: string; isContentEditable?: boolean } | null;
}

/** The keys as shown in the key card and the report: [keys, what they do]. */
export const KEY_MAP: Array<[string, string]> = [
  ['→  Space  PageDown', 'next'],
  ['←  PageUp', 'back'],
  ['1 2 3 4', 'choose'],
  ['R', 'reveal'],
  ['H', 'translations'],
  ['P', 'audio'],
];

export function keyAction(e: KeyLike): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const target = (e.target ?? null) as { tagName?: string; isContentEditable?: boolean } | null;
  const tag = target?.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return null;
  switch (e.key) {
    case 'ArrowRight':
    case ' ':
    case 'Spacebar':
    case 'PageDown':
      return { kind: 'next' };
    case 'ArrowLeft':
    case 'PageUp':
      return { kind: 'back' };
    case 'r':
    case 'R':
      return { kind: 'reveal' };
    case 'h':
    case 'H':
      return { kind: 'translations' };
    case 'p':
    case 'P':
      return { kind: 'audio' };
  }
  if (/^[1-9]$/.test(e.key)) return { kind: 'choose', n: Number(e.key) };
  return null;
}
