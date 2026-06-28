'use client';

import { useEffect } from 'react';

// Keeps the screen awake while `active` is true (e.g. during a slow quiz
// generation, which can take ~35s — long enough for a phone to dim and lock).
//
// The lock is best-effort: unsupported browsers (Wake Lock needs a secure
// context; iOS Safari 16.4+) just no-op. The OS auto-releases the lock whenever
// the page is hidden, so we re-acquire it on visibilitychange while still active.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Rejected (no user activation, low battery, permission) — nothing we
        // can do; the generation still works, the screen just isn't pinned.
      }
    };

    const onVisibility = () => {
      // The lock drops when the tab is backgrounded; re-take it on return.
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
