'use client';

import { useEffect, useState } from 'react';
import styles from './GeneratingState.module.css';

interface GeneratingStateProps {
  count: number;
}

// One blocking request powers generation, so progress is simulated: it eases
// toward a cap and never reaches 100% until the overlay unmounts on success.
const PROGRESS_CAP = 94;
const SECONDS_PER_QUESTION = 2.2;
const BASE_SECONDS = 8;

const STAGES = [
  { at: 0, label: 'Reading your topic' },
  { at: 12, label: 'Drafting the questions' },
  { at: 38, label: 'Sharpening the wrong answers' },
  { at: 60, label: 'Briefing the quizmaster' },
  { at: 78, label: 'Sketching the artwork' },
  { at: 90, label: 'Final polish' },
];

export default function GeneratingState({ count }: GeneratingStateProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const tauMs = (BASE_SECONDS + count * SECONDS_PER_QUESTION) * 1000;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(PROGRESS_CAP * (1 - Math.exp(-elapsed / tauMs)));
    }, 180);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const stage = STAGES.reduce(
    (current, candidate) => (progress >= candidate.at ? candidate : current),
    STAGES[0],
  );
  const pct = Math.round(progress);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Generating your quiz"
    >
      <div className={styles.container}>
        <div className={styles.orb} aria-hidden="true">
          <span className={`${styles.ring} ${styles.ringOne}`} />
          <span className={`${styles.ring} ${styles.ringTwo}`} />
          <span className={styles.core} />
        </div>
        <p className={styles.kicker}>Cooking up your round</p>
        <p className={styles.heading}>Generating your quiz</p>

        <div className={styles.progressBlock}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${pct}% — ${stage.label}`}
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span className={styles.stageLabel} key={stage.label}>{stage.label}</span>
            <span className={styles.pct}>{pct}%</span>
          </div>
        </div>

        <div className={styles.dots} aria-hidden="true">
          <span /><span /><span />
        </div>
        <p className={styles.body}>
          {count} questions on the way. Hold tight — leaving now would abandon them mid-thought.
        </p>
      </div>
    </div>
  );
}
