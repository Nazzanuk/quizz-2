'use client';

import type { Quiz } from '@/Lib/Types';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './CreatedState.module.css';

interface CreatedStateProps {
  quiz: Quiz;
  onPlay: () => void;
  onEdit: () => void;
  onCreateAnother: () => void;
}

export default function CreatedState({
  quiz,
  onPlay,
  onEdit,
  onCreateAnother,
}: CreatedStateProps) {
  return (
    <Card color="lavender" className={styles.card}>
      <span className="neo-sticker" aria-hidden="true">Created</span>
      <h1 className={styles.title}>{quiz.title}</h1>
      <p className={styles.meta}>{quiz.questionCount} questions ready</p>
      <p className={styles.note}>
        Images may still be cooking in the background. You can play now or tune the deck first.
      </p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onPlay}>Play now</Button>
        <Button variant="secondary" onClick={onEdit}>View & edit</Button>
        <Button variant="ghost" onClick={onCreateAnother}>Create another</Button>
      </div>
    </Card>
  );
}
