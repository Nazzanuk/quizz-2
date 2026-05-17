'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import {
  settingsOpenAtom,
  soundMutedAtom,
  hapticEnabledAtom,
  hostModeAtom,
  hostVoiceEnabledAtom,
} from '@/State/SettingsAtoms';
import { useAudioIssues } from '@/Lib/Hooks/UseAudioIssues';
import { playSound, primeAudio } from './Sound';
import { haptic } from './Haptic';
import styles from './SettingsPanel.module.css';

const EXIT_DURATION_MS = 240;

export default function SettingsPanel() {
  const [open, setOpen] = useAtom(settingsOpenAtom);
  const [muted, setMuted] = useAtom(soundMutedAtom);
  const [hapticOn, setHapticOn] = useAtom(hapticEnabledAtom);
  const [hostVoiceEnabled, setHostVoiceEnabled] = useAtom(hostVoiceEnabledAtom);
  const [hostMode, setHostMode] = useAtom(hostModeAtom);
  const audioIssues = useAudioIssues();
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

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    if (!next) {
      primeAudio();
      playSound('tap');
    }
  };

  const toggleHaptic = () => {
    const next = !hapticOn;
    setHapticOn(next);
    if (next) haptic('tap');
  };

  const toggleHostVoice = () => {
    const next = !hostVoiceEnabled;
    setHostVoiceEnabled(next);
    if (next) haptic('tap');
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

        <button
          type="button"
          className={styles.row}
          onClick={toggleSound}
        >
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Sound effects</span>
            <span className={styles.rowSub}>Tap, answer, completion sounds</span>
          </div>
          <span className={`${styles.toggle} ${!muted ? styles.toggleOn : ''}`}>
            <span className={styles.toggleKnob} />
          </span>
        </button>

        <button
          type="button"
          className={styles.row}
          onClick={toggleHaptic}
        >
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Vibration</span>
            <span className={styles.rowSub}>Android only — iOS Safari ignores</span>
          </div>
          <span className={`${styles.toggle} ${hapticOn ? styles.toggleOn : ''}`}>
            <span className={styles.toggleKnob} />
          </span>
        </button>

        <button
          type="button"
          className={styles.row}
          onClick={toggleHostVoice}
        >
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Host voice</span>
            <span className={styles.rowSub}>ElevenLabs narration for intros, recaps, and bigger beats</span>
          </div>
          <span className={`${styles.toggle} ${hostVoiceEnabled ? styles.toggleOn : ''}`}>
            <span className={styles.toggleKnob} />
          </span>
        </button>

        <div className={styles.modeSection}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Host mode</span>
            <span className={styles.rowSub}>Default leans theatrical. Quick trims the banter.</span>
          </div>
          <div className={styles.modePills}>
            <button
              type="button"
              className={`${styles.modePill} ${hostMode === 'default' ? styles.modePillActive : ''}`}
              onClick={() => setHostMode('default')}
            >
              Default
            </button>
            <button
              type="button"
              className={`${styles.modePill} ${hostMode === 'quick' ? styles.modePillActive : ''}`}
              onClick={() => setHostMode('quick')}
            >
              Quick
            </button>
          </div>
        </div>

        {audioIssues.length > 0 && (
          <div className={styles.audioStatus}>
            <span className={styles.audioStatusLabel}>Audio status</span>
            {audioIssues.map((issue) => (
              <p
                key={issue.code}
                className={`${styles.audioStatusItem} ${styles[`audioStatus${issue.level[0].toUpperCase()}${issue.level.slice(1)}`]}`}
              >
                {issue.message}
              </p>
            ))}
          </div>
        )}

        <button type="button" className={styles.close} onClick={dismiss}>
          Done
        </button>
      </div>
    </div>
  );
}
