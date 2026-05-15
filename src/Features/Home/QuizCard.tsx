'use client';

import Link from 'next/link';
import type { Quiz } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import Card from '@/Features/Shared/Card';
import styles from './QuizCard.module.css';

interface QuizCardProps {
  quiz: Quiz;
  index: number;
}

export default function QuizCard({ quiz, index }: QuizCardProps) {
  const color = index % 2 === 0 ? 'sage' : 'lavender';

  return (
    <Card color={color} className={styles.card}>
      {quiz.coverImageUrl && (
        <img src={quiz.coverImageUrl} alt="" className={styles.cover} />
      )}
      <div className={styles.body}>
        <Link href={`/quiz/${quiz.id}`} className={styles.titleLink}>
          <h3 className={styles.title}>{quiz.title}</h3>
        </Link>
        <p className={styles.meta}>
          {quiz.questionCount} questions · {formatDate(quiz.createdAt)}
        </p>
      </div>
      {quiz.questionCount > 0 && (
        <Link
          href={`/quiz/${quiz.id}/play`}
          className={styles.playBtn}
          aria-label={`Play ${quiz.title}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </Link>
      )}
    </Card>
  );
}
