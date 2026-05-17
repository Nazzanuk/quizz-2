'use client';

import Link from 'next/link';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import { useCountUp } from '@/Features/Shared/useCountUp';
import styles from './ResultsView.module.css';

interface ResultsViewProps {
  correct: number;
  total: number;
  quizId: string;
  previousBest: number | null;
  wrongCount: number;
  onRetry: () => void;
  onPracticeWeak?: () => void;
}

export default function ResultsView({
  correct,
  total,
  quizId,
  previousBest,
  wrongCount,
  onRetry,
  onPracticeWeak,
}: ResultsViewProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const animatedPct = useCountUp(pct, 900);
  const isNewBest = previousBest !== null && pct > previousBest;

  return (
    <Card color="lavender" className={styles.card}>
      <p className={`${styles.score} ${isNewBest ? styles.scoreNewBest : ''}`}>
        {animatedPct}%
      </p>
      <p className={styles.detail}>{correct} out of {total} correct</p>

      {previousBest !== null && (
        <p className={`${styles.best} ${isNewBest ? styles.bestNew : ''}`}>
          {isNewBest ? `New best! (was ${previousBest}%)` : `Best: ${previousBest}%`}
        </p>
      )}

      <div className={styles.actions}>
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
