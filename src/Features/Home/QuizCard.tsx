'use client';

import Link from 'next/link';
import type { Quiz } from '@/Lib/Types';
import { FORMAT_LABELS } from '@/Lib/Constants';
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
    <Link href={`/quiz/${quiz.id}`} className={styles.link}>
      <Card color={color} className={styles.card}>
        {quiz.coverImageUrl && (
          <img
            src={quiz.coverImageUrl}
            alt=""
            className={styles.cover}
          />
        )}
        <div className={styles.content}>
          <p className={styles.format}>{FORMAT_LABELS[quiz.format]}</p>
          <h3 className={styles.title}>{quiz.title}</h3>
          <p className={styles.meta}>
            {quiz.questionCount} questions · {formatDate(quiz.createdAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
