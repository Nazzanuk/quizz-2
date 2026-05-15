'use client';

import type { Quiz } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import styles from './QuizHeader.module.css';

interface QuizHeaderProps {
  quiz: Quiz;
}

export default function QuizHeader({ quiz }: QuizHeaderProps) {
  return (
    <header className={styles.header}>
      {quiz.coverImageUrl && (
        <img src={quiz.coverImageUrl} alt="" className={styles.cover} />
      )}
      <h1 className={styles.title}>{quiz.title}</h1>
      {quiz.description && (
        <p className={styles.desc}>{quiz.description}</p>
      )}
      <p className={styles.meta}>
        {quiz.questionCount} questions · {formatDate(quiz.createdAt)}
      </p>
    </header>
  );
}
