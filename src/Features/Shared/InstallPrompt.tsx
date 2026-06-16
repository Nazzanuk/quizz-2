'use client';

import { useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import { addToastAtom } from '@/State/UiAtoms';
import { haptic } from './Haptic';
import Button from './Button';
import {
  dismissInstallPrompt,
  promptInstall,
  useInstallPrompt,
} from './UseInstallPrompt';
import styles from './InstallPrompt.module.css';

// A2HS interstitial shown shortly after a run completes (so the player sees
// their score first). Uses the native install sheet on Chromium; falls back to
// manual Share-sheet instructions on iOS Safari.
const SHOW_DELAY_MS = 700;

export default function InstallPrompt() {
  const { shouldOffer, canInstall, isIOS } = useInstallPrompt();
  const addToast = useSetAtom(addToastAtom);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  // Reveal after a beat so it reads as an interstitial, not a flash on load.
  useEffect(() => {
    if (!shouldOffer) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldOffer]);

  if (!shouldOffer || dismissed || !visible) return null;

  const handleDismiss = () => {
    dismissInstallPrompt();
    setDismissed(true);
    haptic('tap');
  };

  const handleInstall = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        addToast({ message: 'Adding Quiz Dart to your home screen', type: 'success' });
        setDismissed(true);
      } else if (outcome === 'unavailable') {
        setShowIOSHelp(true);
      }
      // 'dismissed' leaves the popup up so they can try again.
      return;
    }
    // iOS: no programmatic prompt, reveal the manual steps.
    setShowIOSHelp(true);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Install Quiz Dart"
      onClick={handleDismiss}
    >
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="178" fill="#000000" />
            <circle cx="256" cy="256" r="160" fill="#FFFDF5" />
            <circle cx="256" cy="256" r="128" fill="#000000" />
            <circle cx="256" cy="256" r="110" fill="#FF5A5F" />
            <circle cx="256" cy="256" r="66" fill="#FFFDF5" />
            <circle cx="256" cy="256" r="46" fill="#000000" />
            <circle cx="256" cy="256" r="30" fill="#FF5A5F" />
          </svg>
        </span>
        <p className={styles.kicker}>Play faster next time</p>
        <h2 className={styles.title}>Add Quiz Dart to your home screen</h2>
        {isIOS && showIOSHelp ? (
          <p className={styles.help}>
            Tap the <strong>Share</strong> button in Safari, then choose{' '}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className={styles.sub}>
            Launch straight into your quizzes — full screen, no browser bar, works offline.
          </p>
        )}
        <div className={styles.actions}>
          {!(isIOS && showIOSHelp) && (
            <Button variant="primary" fullWidth onClick={handleInstall}>
              {isIOS ? 'How to install' : 'Install app'}
            </Button>
          )}
          <button type="button" className={styles.dismiss} onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
