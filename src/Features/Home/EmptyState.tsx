'use client';

import Link from '@/Features/Shared/TransitionLink';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './EmptyState.module.css';

export default function EmptyState() {
  return (
    <Card color="lavender" className={styles.card}>
      <div className={styles.spark} aria-hidden="true">*</div>
      <p className={styles.heading}>No quizzes yet</p>
      <p className={styles.body}>
        Create your first quiz from a topic or your own notes.
      </p>
      <Link href="/quiz/new">
        <Button variant="primary">Get started</Button>
      </Link>
    </Card>
  );
}
