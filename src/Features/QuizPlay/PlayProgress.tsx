'use client';

import type { QuizAnswerPhase, QuizMilestone } from '@/Lib/Types';
import styles from './PlayProgress.module.css';

interface PlayProgressProps {
  current: number;
  total: number;
  correct: number;
  streak: number;
  milestone: QuizMilestone;
  answerPhase: QuizAnswerPhase;
}

export default function PlayProgress({
  current,
  total,
  correct,
  streak,
  milestone,
  answerPhase,
}: PlayProgressProps) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;
  const scoreHot = answerPhase === 'revealed-correct';
  const streakActive = streak > 0;

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <p className={styles.label}>
          Question {current + 1} of {total}
        </p>
        <div className={styles.chips}>
          <div className={`${styles.chip} ${scoreHot ? styles.chipHot : ''}`}>
            <span className={styles.chipLabel}>Correct</span>
            <span className={styles.chipValue}>{correct}</span>
          </div>
          <div
            className={`${styles.chip} ${styles.streakChip} ${streakActive ? styles.streakActive : ''}`}
            data-milestone={milestone}
          >
            <span className={styles.chipLabel}>Streak</span>
            <span className={styles.chipValue}>{streak}</span>
          </div>
        </div>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
