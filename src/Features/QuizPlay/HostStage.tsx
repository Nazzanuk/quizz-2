'use client';

import { useEffect, useRef, useState } from 'react';
import { useAudioIssues } from '@/Lib/Hooks/UseAudioIssues';
import { playHostVoice, stopHostVoice } from './HostVoice';
import type {
  HostConfidenceLevel,
  HostMode,
  HostPersona,
  QuestionDifficulty,
} from '@/Lib/Types';
import styles from './HostStage.module.css';

export interface HostCue {
  id: string;
  text: string;
  kind: 'intro' | 'question' | 'answer' | 'recap';
  audioPrefetch?: boolean;
}

interface HostStageProps {
  cue: HostCue | null;
  mode: HostMode;
  hostPersona: HostPersona;
  voiceEnabled: boolean;
  category?: string | null;
  difficulty?: QuestionDifficulty | null;
  showConfidencePrompt?: boolean;
  confidence?: HostConfidenceLevel | null;
  onConfidenceChange?: (value: HostConfidenceLevel) => void;
  hideTextUi?: boolean;
}

export default function HostStage({
  cue,
  mode,
  hostPersona,
  voiceEnabled,
  category,
  difficulty,
  showConfidencePrompt = false,
  confidence = null,
  onConfidenceChange,
  hideTextUi = false,
}: HostStageProps) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const voiceIssues = useAudioIssues('voice');
  const topVoiceIssue = voiceIssues[0];
  const lastPlaybackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!voiceEnabled || !cue || dismissedId === cue.id) return;
    const playbackKey = cue.kind === 'recap' ? `${cue.id}:${cue.text}` : cue.id;
    if (lastPlaybackKeyRef.current === playbackKey) return;
    lastPlaybackKeyRef.current = playbackKey;
    playHostVoice({
      text: cue.text,
      hostPersona,
      prefetch: cue.audioPrefetch,
    });
    return () => stopHostVoice();
  }, [cue, dismissedId, hostPersona, voiceEnabled]);

  const hidden = !cue || dismissedId === cue.id;

  if (hideTextUi) return null;

  return (
    <section className={styles.stage}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Quizmaster</p>
          <h2 className={styles.title}>The Dog & Brain</h2>
        </div>
        <div className={styles.meta}>
          <span className={styles.modeChip}>{mode}</span>
          {difficulty && <span className={styles.metaChip}>{difficulty}</span>}
          {category && <span className={styles.metaChip}>{category}</span>}
        </div>
      </div>

      {!hidden ? (
        <div className={styles.body}>
          <p className={styles.line}>{cue.text}</p>
          {topVoiceIssue && (
            <p className={`${styles.audioIssue} ${styles[`audioIssue${topVoiceIssue.level[0].toUpperCase()}${topVoiceIssue.level.slice(1)}`]}`}>
              {topVoiceIssue.message}
            </p>
          )}
          <button
            type="button"
            className={styles.skip}
            onClick={() => {
              stopHostVoice();
              setDismissedId(cue.id);
            }}
          >
            Skip host
          </button>
        </div>
      ) : (
        <div className={styles.bodyHidden}>
          <p className={styles.placeholder}>Host standing by.</p>
          {topVoiceIssue && (
            <p className={`${styles.audioIssue} ${styles[`audioIssue${topVoiceIssue.level[0].toUpperCase()}${topVoiceIssue.level.slice(1)}`]}`}>
              {topVoiceIssue.message}
            </p>
          )}
        </div>
      )}

      {showConfidencePrompt && onConfidenceChange && (
        <div className={styles.confidence}>
          <span className={styles.confidenceLabel}>How sure are you?</span>
          <div className={styles.confidencePills}>
            {(['safe', 'confident', 'arrogant'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.confidencePill} ${confidence === value ? styles.confidencePillActive : ''}`}
                onClick={() => onConfidenceChange(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
