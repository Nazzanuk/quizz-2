'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { confirmDialogAtom, playExitGuardAtom } from '@/State/UiAtoms';
import { settingsOpenAtom } from '@/State/SettingsAtoms';
import { hasInAppHistory, useTransitionRouter } from '@/Features/Shared/Navigate';

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
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = crypto.randomUUID();
  const pendingRef = useRef<PendingAction | null>(null);
  const setConfirm = useSetAtom(confirmDialogAtom);
  const setRelease = useSetAtom(playExitGuardAtom);
  const { back, replace } = useTransitionRouter();
  const dialogOpen = useAtomValue(confirmDialogAtom) !== null;
  const settingsOpen = useAtomValue(settingsOpenAtom);
  const overlayOpen = dialogOpen || settingsOpen;
  const overlayOpenRef = useRef(overlayOpen);

  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
  }, [overlayOpen]);

  const release = useCallback((action: () => void) => {
    if (armedRef.current) {
      pendingRef.current = action;
      window.history.back();
    } else {
      action();
    }
  }, []);

  useEffect(() => {
    const handlePopstate = () => {
      if (!armedRef.current) return;
      // Judge by the live history.state (popstate events from the Next.js
      // router can carry stale state). If the current entry is still our
      // sentinel, it wasn't popped. While an overlay is open, back belongs
      // to that overlay's own history entry — not to us.
      const current = window.history.state as { playGuard?: string } | null;
      if (current?.playGuard === idRef.current) return;
      const pending = pendingRef.current;
      if (pending) {
        armedRef.current = false;
        pendingRef.current = null;
        if (typeof pending === 'function') pending();
        return;
      }
      if (overlayOpenRef.current) return;
      // User backed out mid-run: restore the sentinel and ask first.
      window.history.pushState({ playGuard: idRef.current }, '');
      setConfirm({
        title: 'Leave this run?',
        message: 'Your current run will stop and any unanswered questions will be left behind.',
        confirmLabel: 'Leave',
        // Return to wherever the user came from; replace() only on cold
        // deep links, so back from there can't re-enter the dead run.
        onConfirm: () => release(() => {
          if (hasInAppHistory()) {
            back();
          } else {
            replace(`/quiz/${quizId}`);
          }
        }),
      });
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [back, quizId, release, replace, setConfirm]);

  useEffect(() => {
    if (enabled && !armedRef.current) {
      window.history.pushState({ playGuard: idRef.current }, '');
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
