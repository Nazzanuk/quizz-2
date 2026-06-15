'use client';

import { useSyncExternalStore } from 'react';

// The non-standard event Chromium fires when a PWA is installable. We stash it
// so we can trigger the native install sheet later (e.g. after a finished run)
// instead of at the browser's arbitrary moment.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Snapshot {
  /** Native install sheet is available (Chromium). */
  canInstall: boolean;
  /** Became an installed PWA during this session. */
  installed: boolean;
  /** Already running as an installed PWA. */
  isStandalone: boolean;
  /** iOS Safari, which needs manual Add-to-Home-Screen instructions. */
  isIOS: boolean;
  /** Recently dismissed by the user. */
  dismissed: boolean;
}

const DISMISS_KEY = 'quizz.installPromptDismissedAt';
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// SSR + pre-init value: never offer to install until the client confirms env.
const SERVER_SNAPSHOT: Snapshot = {
  canInstall: false,
  installed: false,
  isStandalone: false,
  isIOS: false,
  dismissed: true,
};

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
let attached = false;

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes standalone on navigator rather than via display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  const ua = navigator.userAgent;
  const isIOSDevice =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as Mac; disambiguate by touch support.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Exclude in-app webviews and non-Safari browsers, which can't add to home.
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIOSDevice && isSafari;
}

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

// Builds the client snapshot the first time it's read (client-only via
// useSyncExternalStore's getSnapshot).
function getSnapshot(): Snapshot {
  if (snapshot === null) {
    snapshot = {
      canInstall: deferred !== null,
      installed: false,
      isStandalone: detectStandalone(),
      isIOS: detectIOS(),
      dismissed: wasRecentlyDismissed(),
    };
  }
  return snapshot;
}

function update(patch: Partial<Snapshot>): void {
  snapshot = { ...getSnapshot(), ...patch };
  listeners.forEach((listener) => listener());
}

// Attach the capture listeners as early as a client component mounts. The
// `beforeinstallprompt` event can fire on the very first page load, well before
// the results screen exists, so this runs from a layout-level mount.
export function ensureInstallListener(): void {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update({ canInstall: false, installed: true });
  });
}

function subscribe(listener: () => void): () => void {
  ensureInstallListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  update({ canInstall: false });
  return choice.outcome;
}

export function dismissInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage unavailable; nothing to persist */
  }
  update({ dismissed: true });
}

export interface InstallPromptState {
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  /** Whether the prompt should be offered at all right now. */
  shouldOffer: boolean;
}

// Reactive view of install eligibility.
export function useInstallPrompt(): InstallPromptState {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const offerable = !state.isStandalone && !state.installed && !state.dismissed;
  return {
    canInstall: state.canInstall,
    isStandalone: state.isStandalone,
    isIOS: state.isIOS,
    shouldOffer: offerable && (state.canInstall || state.isIOS),
  };
}
