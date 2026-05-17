'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLAY_TIMINGS } from '@/Lib/Constants';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import { useCountUp } from '@/Features/Shared/useCountUp';
import styles from './ResultsView.module.css';

interface ResultsViewProps {
  correct: number;
  total: number;
  quizId: string;
  previousBest: number | null;
  bestStreak: number;
  wrongCount: number;
  recap?: string;
  onRetry: () => void;
  onPracticeWeak?: () => void;
}

export default function ResultsView({
  correct,
  total,
  quizId,
  previousBest,
  bestStreak,
  wrongCount,
  recap,
  onRetry,
  onPracticeWeak,
}: ResultsViewProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const animatedPct = useCountUp(pct, 900);
  const isNewBest = previousBest !== null && pct > previousBest;
  const perfectRound = total > 0 && correct === total;
  const [showSummary, setShowSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const summaryTimer = window.setTimeout(
      () => setShowSummary(true),
      PLAY_TIMINGS.resultsSummaryDelayMs,
    );
    const detailsTimer = window.setTimeout(
      () => setShowDetails(true),
      PLAY_TIMINGS.resultsDetailsDelayMs,
    );
    const actionsTimer = window.setTimeout(
      () => setShowActions(true),
      PLAY_TIMINGS.resultsActionsDelayMs,
    );

    return () => {
      window.clearTimeout(summaryTimer);
      window.clearTimeout(detailsTimer);
      window.clearTimeout(actionsTimer);
    };
  }, []);

  return (
    <Card
      color="lavender"
      className={`${styles.card} ${perfectRound ? styles.cardPerfect : ''}`}
    >
      <div className={styles.hero}>
        <p className={`${styles.score} ${isNewBest ? styles.scoreNewBest : ''}`}>
          {animatedPct}%
        </p>
        <div className={styles.badges}>
          {perfectRound && <span className={styles.achievement}>Perfect round</span>}
          {isNewBest && <span className={styles.achievement}>New best</span>}
        </div>
      </div>

      <div className={`${styles.summary} ${showSummary ? styles.sectionVisible : ''}`}>
        <p className={styles.detail}>{correct} out of {total} correct</p>
        {recap && (
          <p className={styles.recap}>{recap}</p>
        )}
      </div>

      <div className={`${styles.details} ${showDetails ? styles.sectionVisible : ''}`}>
        {previousBest !== null && (
          <p className={`${styles.best} ${isNewBest ? styles.bestNew : ''}`}>
            {isNewBest ? `Beat your previous best of ${previousBest}%` : `Best: ${previousBest}%`}
          </p>
        )}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Longest streak</span>
            <strong className={styles.statValue}>{bestStreak}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Misses</span>
            <strong className={styles.statValue}>{wrongCount}</strong>
          </div>
        </div>
      </div>

      <div className={`${styles.actions} ${showActions ? styles.sectionVisible : ''}`}>
        {onPracticeWeak && (
          <Button variant="primary" onClick={onPracticeWeak}>
            Practice {wrongCount} weak {wrongCount === 1 ? 'spot' : 'spots'}
          </Button>
        )}
        <Button variant={onPracticeWeak ? 'ghost' : 'primary'} onClick={onRetry}>
          Try again
        </Button>
        <Link href={`/quiz/${quizId}`}>
          <Button variant="ghost">Back to quiz</Button>
        </Link>
      </div>
    </Card>
  );
}
