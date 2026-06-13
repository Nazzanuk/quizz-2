'use client';

import { useCallback, useEffect, useRef } from 'react';

type PendingAction = (() => void) | 'silent';

/**
 * Ties an overlay (sheet/dialog) to a browser history entry so the OS back
 * gesture dismisses it instead of navigating the page underneath.
 *
 * - On open, pushes a same-URL history entry.
 * - Browser/OS back pops the entry and calls `onDismiss`.
 * - UI close buttons should call `requestDismiss()` so back and button share
 *   one code path and the entry never leaks.
 * - If the overlay triggers navigation (e.g. dialog confirm), call
 *   `consumeEntry(action)` first: it pops the entry silently, then runs the
 *   action once the history stack is clean.
 */
export function useHistoryDismiss(open: boolean, onDismiss: () => void) {
  const armedRef = useRef(false);
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = crypto.randomUUID();
  const pendingRef = useRef<PendingAction | null>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const handlePopstate = () => {
      if (!armedRef.current) return;
      // The Next.js router re-dispatches popstate after syncing, and the
      // event's own state can be stale. The reliable signal is the live
      // history.state: if our entry is still the current one, nothing was
      // popped — ignore the event.
      if ((window.history.state as { overlay?: string } | null)?.overlay === idRef.current) return;
      armedRef.current = false;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) {
        if (typeof pending === 'function') pending();
        return;
      }
      onDismissRef.current();
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []);

  useEffect(() => {
    if (open && !armedRef.current) {
      window.history.pushState({ overlay: idRef.current }, '');
      armedRef.current = true;
    } else if (!open && armedRef.current) {
      // Overlay closed programmatically without going through history —
      // pop our entry silently so it doesn't linger under the page.
      pendingRef.current = 'silent';
      window.history.back();
    }
  }, [open]);

  const requestDismiss = useCallback(() => {
    if (armedRef.current) {
      window.history.back();
    } else {
      onDismissRef.current();
    }
  }, []);

  const consumeEntry = useCallback((action: () => void) => {
    if (armedRef.current) {
      pendingRef.current = action;
      window.history.back();
    } else {
      action();
    }
  }, []);

  return { requestDismiss, consumeEntry };
}
