'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { QuizAnswerPhase } from '@/Lib/Types';
import styles from './PlayTimer.module.css';

interface PlayTimerProps {
  seconds: number;
  phase: QuizAnswerPhase;
  paused?: boolean;
  onExpire: () => void;
  hideTextUi?: boolean;
}

export default function PlayTimer({
  seconds,
  phase,
  paused = false,
  onExpire,
  hideTextUi = false,
}: PlayTimerProps) {
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const remainingMsRef = useRef(remainingMs);
  const fireExpire = useEffectEvent(() => onExpire());

  useEffect(() => {
    remainingMsRef.current = remainingMs;
  }, [remainingMs]);

  useEffect(() => {
    if (paused) return undefined;

    const startedAt = Date.now();
    const startingRemaining = remainingMsRef.current;

    const interval = window.setInterval(() => {
      const next = Math.max(0, startingRemaining - (Date.now() - startedAt));
      remainingMsRef.current = next;
      setRemainingMs(next);

      if (next === 0) {
        window.clearInterval(interval);
        fireExpire();
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [paused]);

  const progress = seconds > 0 ? Math.max(0, remainingMs / (seconds * 1000)) : 0;
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const isTimedOut = phase === 'timed-out';

  // Trigger on whichever comes first: a fraction of the bar OR an absolute
  // number of seconds left. On short timers (10s true/false) the percentage
  // alone leaves almost no runway, so the absolute floor gives a real warning.
  const isCritical = !isTimedOut && (progress <= 0.15 || secondsLeft <= 3);
  const isWarning = !isTimedOut && !isCritical && (progress <= 0.33 || secondsLeft <= 6);

  let fillClass = styles.fill;
  if (isTimedOut) fillClass = `${styles.fill} ${styles.timedOut}`;
  else if (isCritical) fillClass = `${styles.fill} ${styles.critical}`;
  else if (isWarning) fillClass = `${styles.fill} ${styles.warning}`;

  const valueClass = [
    styles.value,
    isCritical ? styles.valueCritical : '',
    isCritical ? styles.valuePulse : '',
  ].join(' ');

  return (
    <div className={`${styles.container} ${isTimedOut ? styles.containerTimedOut : ''}`}>
      {!hideTextUi && (
        <div className={styles.row}>
          <span className={styles.label}>{isTimedOut ? 'Round' : 'Time'}</span>
          <span className={valueClass}>{isTimedOut ? "Time's up" : `${secondsLeft}s`}</span>
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Question timer"
        aria-valuemin={0}
        aria-valuemax={seconds}
        aria-valuenow={secondsLeft}
      >
        <div className={fillClass} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
