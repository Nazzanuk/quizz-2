'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import {
  soundMutedAtom,
  hapticEnabledAtom,
  hostModeAtom,
  hideTextUiAtom,
  hostVoiceEnabledAtom,
  readQuestionsAloudAtom,
} from '@/State/SettingsAtoms';
import { useAudioIssues } from '@/Lib/Hooks/UseAudioIssues';
import { notifyHostAudioInteraction, playHostVoicePreview } from '@/Features/QuizPlay/HostVoice';
import { haptic } from './Haptic';
import { playSound, primeAudio } from './Sound';
import styles from './SettingsControls.module.css';

const HOST_PERSONA = 'sarcastic_pub_host' as const;

interface SettingsControlsProps {
  className?: string;
}

export default function SettingsControls({ className = '' }: SettingsControlsProps) {
  const [muted, setMuted] = useAtom(soundMutedAtom);
  const [hapticOn, setHapticOn] = useAtom(hapticEnabledAtom);
  const [hostVoiceEnabled, setHostVoiceEnabled] = useAtom(hostVoiceEnabledAtom);
  const [readQuestionsAloud, setReadQuestionsAloud] = useAtom(readQuestionsAloudAtom);
  const [hideTextUi, setHideTextUi] = useAtom(hideTextUiAtom);
  const [hostMode, setHostMode] = useAtom(hostModeAtom);
  const audioIssues = useAudioIssues();
  const [testingVoice, setTestingVoice] = useState(false);

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
    primeAudio();
    notifyHostAudioInteraction();
    setHostVoiceEnabled(next);
    if (next) haptic('tap');
  };

  const toggleHideTextUi = () => {
    const next = !hideTextUi;
    setHideTextUi(next);
    if (next) haptic('tap');
  };

  const toggleReadQuestionsAloud = () => {
    const next = !readQuestionsAloud;
    setReadQuestionsAloud(next);
    if (next) haptic('tap');
  };

  const testHostVoice = async () => {
    if (testingVoice) return;
    setTestingVoice(true);
    primeAudio();
    notifyHostAudioInteraction();
    try {
      await playHostVoicePreview(HOST_PERSONA);
    } finally {
      setTestingVoice(false);
    }
  };

  return (
    <div className={`${styles.controls} ${className}`}>
      <button type="button" className={styles.row} onClick={toggleSound}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Sound effects</span>
          <span className={styles.rowSub}>Tap, answer, completion sounds</span>
        </div>
        <span className={`${styles.toggle} ${!muted ? styles.toggleOn : ''}`}>
          <span className={styles.toggleKnob} />
        </span>
      </button>

      <button type="button" className={styles.row} onClick={toggleHaptic}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Vibration</span>
          <span className={styles.rowSub}>Android only; iOS Safari ignores it</span>
        </div>
        <span className={`${styles.toggle} ${hapticOn ? styles.toggleOn : ''}`}>
          <span className={styles.toggleKnob} />
        </span>
      </button>

      <button type="button" className={styles.row} onClick={toggleHostVoice}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Host voice</span>
          <span className={styles.rowSub}>ElevenLabs narration for intros, recaps, and bigger beats</span>
        </div>
        <span className={`${styles.toggle} ${hostVoiceEnabled ? styles.toggleOn : ''}`}>
          <span className={styles.toggleKnob} />
        </span>
      </button>

      <button type="button" className={styles.row} onClick={toggleReadQuestionsAloud}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Read questions aloud</span>
          <span className={styles.rowSub}>Host reads each question instead of banter. Needs host voice on.</span>
        </div>
        <span className={`${styles.toggle} ${readQuestionsAloud ? styles.toggleOn : ''}`}>
          <span className={styles.toggleKnob} />
        </span>
      </button>

      <button type="button" className={styles.row} onClick={toggleHideTextUi}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Hide text UI</span>
          <span className={styles.rowSub}>Quiz play only. Keeps the screen focused on prompt and answers.</span>
        </div>
        <span className={`${styles.toggle} ${hideTextUi ? styles.toggleOn : ''}`}>
          <span className={styles.toggleKnob} />
        </span>
      </button>

      {hostVoiceEnabled && (
        <button
          type="button"
          className={styles.voiceTest}
          onClick={testHostVoice}
          disabled={testingVoice}
        >
          <span className={styles.voiceTestLabel}>
            {testingVoice ? 'Testing host voice...' : 'Test host voice'}
          </span>
          <span className={styles.voiceTestSub}>
            Plays a short line locally so you can verify voice output.
          </span>
        </button>
      )}

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
              <span>{issue.message}</span>
              {issue.detail && (
                <span className={styles.audioStatusDetail}>{issue.detail}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
