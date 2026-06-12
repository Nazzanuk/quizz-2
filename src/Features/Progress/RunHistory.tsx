'use client';

import Link from 'next/link';
import type { QuizRunWithTitle } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import styles from './RunHistory.module.css';

interface RunHistoryProps {
  runs: QuizRunWithTitle[];
}

export default function RunHistory({ runs }: RunHistoryProps) {
  if (runs.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Run history</h2>
        <span>{runs.length}</span>
      </div>
      <div className={styles.list}>
        {runs.map((run) => (
          <Link
            key={run.id}
            href={`/quiz/${run.quizId}/results/${run.id}`}
            className={styles.item}
          >
            <span className={styles.score}>{scorePct(run)}%</span>
            <span className={styles.copy}>
              <strong>{run.quizTitle}</strong>
              <small>{run.correct}/{run.total} · {formatDate(run.createdAt)}</small>
            </span>
            <span className={styles.arrow} aria-hidden="true">&gt;</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function scorePct(run: QuizRunWithTitle): number {
  return run.total > 0 ? Math.round((run.correct / run.total) * 100) : 0;
}
