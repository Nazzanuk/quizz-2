'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { settingsOpenAtom } from '@/State/SettingsAtoms';
import SettingsControls from './SettingsControls';
import styles from './SettingsPanel.module.css';

const EXIT_DURATION_MS = 240;

export default function SettingsPanel() {
  const [open, setOpen] = useAtom(settingsOpenAtom);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (!open) return null;

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_DURATION_MS);
  };

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ''}`}
      onClick={dismiss}
    >
      <div
        className={`${styles.sheet} ${closing ? styles.sheetClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className={styles.grabber} />
        <h3 className={styles.title}>Settings</h3>
        <SettingsControls />
        <button type="button" className={styles.close} onClick={dismiss}>
          Done
        </button>
      </div>
    </div>
  );
}
