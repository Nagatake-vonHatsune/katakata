// Screen helpers for teacher mode on a TV or projector (Sam, 17 Nov 2026): keep the screen awake, and full screen where the
// browser has it. Every call fails silently where the API is missing (older browsers, iPhone Safari's full screen).

type WakeLockSentinelLike = { release(): Promise<void>; addEventListener?(t: 'release', f: () => void): void };
type NavWithWake = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };

let wanted = false;
let lock: WakeLockSentinelLike | null = null;

async function acquire(): Promise<void> {
  if (!wanted || lock || document.visibilityState !== 'visible') return;
  try {
    const l = await (navigator as NavWithWake).wakeLock?.request('screen');
    if (!l) return;
    lock = l;
    l.addEventListener?.('release', () => {
      if (lock === l) lock = null;
    });
  } catch {
    /* not allowed or not supported: the screen may sleep */
  }
}

function onVisible(): void {
  // The browser drops the lock when the page is hidden; ask again when it comes back.
  if (document.visibilityState === 'visible') void acquire();
}

/** Keep the screen awake (true) or let it sleep again (false). */
export function keepAwake(on: boolean): void {
  if (on === wanted) return;
  wanted = on;
  if (on) {
    document.addEventListener('visibilitychange', onVisible);
    void acquire();
  } else {
    document.removeEventListener('visibilitychange', onVisible);
    const l = lock;
    lock = null;
    void l?.release().catch(() => undefined);
  }
}

export function wakeLockHeld(): boolean {
  return !!lock;
}

type DocFs = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type ElFs = HTMLElement & { webkitRequestFullscreen?: () => void };

/** True where the Fullscreen API exists (not iPhone Safari). */
export function fullscreenSupported(): boolean {
  const d = document as DocFs;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const d = document as DocFs;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
  const d = document as DocFs;
  const el = document.documentElement as ElFs;
  try {
    if (isFullscreen()) await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
    else await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.());
  } catch {
    /* refused: stay as we are */
  }
}
