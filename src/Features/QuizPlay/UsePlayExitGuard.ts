'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { confirmDialogAtom, playExitGuardAtom } from '@/State/UiAtoms';
import { useTransitionRouter } from '@/Features/Shared/Navigate';

type PendingAction = (() => void) | 'silent';

/**
 * Makes the OS/browser back gesture mid-run behave like the in-app X button:
 * a history sentinel is pushed while the run is active, and popping it shows
 * the leave-run confirm instead of silently exiting.
 *
 * Returns `release(action)`: pops the sentinel (if armed), then runs the
 * action. Every navigation away from the play page must go through it so the
 * play entry — not the sentinel — is what `replace()` overwrites, keeping
 * back-from-destination from re-entering a dead run. The same function is
 * published via `playExitGuardAtom` for the AppShell X button.
 */
export function usePlayExitGuard({ enabled, quizId }: { enabled: boolean; quizId: string }) {
  const armedRef = useRef(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const setConfirm = useSetAtom(confirmDialogAtom);
  const setRelease = useSetAtom(playExitGuardAtom);
  const { replace } = useTransitionRouter();

  const release = useCallback((action: () => void) => {
    if (armedRef.current) {
      pendingRef.current = action;
      window.history.back();
    } else {
      action();
    }
  }, []);

  useEffect(() => {
    const handlePopstate = (event: PopStateEvent) => {
      if (!armedRef.current) return;
      // Landing ON the sentinel means an overlay above it was popped
      // (e.g. the confirm dialog's own history entry) — not our business.
      if ((event.state as { playGuard?: boolean } | null)?.playGuard) return;
      const pending = pendingRef.current;
      if (pending) {
        armedRef.current = false;
        pendingRef.current = null;
        if (typeof pending === 'function') pending();
        return;
      }
      // User backed out mid-run: restore the sentinel and ask first.
      window.history.pushState({ playGuard: true }, '');
      setConfirm({
        title: 'Leave this run?',
        message: 'Your current run will stop and any unanswered questions will be left behind.',
        confirmLabel: 'Leave',
        onConfirm: () => release(() => replace(`/quiz/${quizId}`)),
      });
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [quizId, release, replace, setConfirm]);

  useEffect(() => {
    if (enabled && !armedRef.current) {
      window.history.pushState({ playGuard: true }, '');
      armedRef.current = true;
    } else if (!enabled && armedRef.current) {
      pendingRef.current = 'silent';
      window.history.back();
    }
  }, [enabled]);

  useEffect(() => {
    setRelease(() => release);
    return () => setRelease(null);
  }, [release, setRelease]);

  return release;
}
