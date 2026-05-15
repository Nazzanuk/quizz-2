'use client';

import Link from 'next/link';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './ResultsView.module.css';

interface ResultsViewProps {
  correct: number;
  total: number;
  quizId: string;
  onRetry: () => void;
}

export default function ResultsView({
  correct,
  total,
  quizId,
  onRetry,
}: ResultsViewProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <Card color="lavender" className={styles.card}>
      <p className={styles.score}>{pct}%</p>
      <p className={styles.detail}>
        {correct} out of {total} correct
      </p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
        <Link href={`/quiz/${quizId}`}>
          <Button variant="ghost">Back to quiz</Button>
        </Link>
      </div>
    </Card>
  );
}
