'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import styles from './PlayTimer.module.css';

interface PlayTimerProps {
  seconds: number;
  paused?: boolean;
  onExpire: () => void;
}

export default function PlayTimer({
  seconds,
  paused = false,
  onExpire,
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

  let fillClass = styles.fill;
  if (progress <= 0.15) fillClass = `${styles.fill} ${styles.critical}`;
  else if (progress <= 0.33) fillClass = `${styles.fill} ${styles.warning}`;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.label}>Time</span>
        <span className={styles.value}>{secondsLeft}s</span>
      </div>
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
