'use client';

import Link from 'next/link';
import Button from '@/Features/Shared/Button';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  quizId: string;
  hasQuestions: boolean;
  onDelete: () => void;
}

export default function ActionBar({
  quizId,
  hasQuestions,
  onDelete,
}: ActionBarProps) {
  return (
    <div className={styles.bar}>
      {hasQuestions && (
        <Link href={`/quiz/${quizId}/play`} className={styles.playLink}>
          <Button variant="primary" fullWidth>
            Play quiz
          </Button>
        </Link>
      )}
      <Button variant="ghost" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
