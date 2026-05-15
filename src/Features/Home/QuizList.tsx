'use client';

import type { Quiz } from '@/Lib/Types';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import QuizCard from './QuizCard';
import styles from './QuizList.module.css';

interface QuizListProps {
  quizzes: Quiz[];
}

export default function QuizList({ quizzes }: QuizListProps) {
  return (
    <div className={styles.list}>
      {quizzes.map((quiz, i) => (
        <ScrollReveal key={quiz.id} delay={i * 0.08}>
          <QuizCard quiz={quiz} index={i} />
        </ScrollReveal>
      ))}
    </div>
  );
}
