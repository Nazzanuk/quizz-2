'use client';

import type { Question } from '@/Lib/Types';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import QuestionItem from './QuestionItem';
import styles from './QuestionList.module.css';

interface QuestionListProps {
  questions: Question[];
}

export default function QuestionList({ questions }: QuestionListProps) {
  if (questions.length === 0) {
    return <p className={styles.empty}>No questions yet.</p>;
  }

  return (
    <div className={styles.list}>
      {questions.map((q, i) => (
        <ScrollReveal key={q.id} delay={i * 0.06}>
          <QuestionItem question={q} index={i} />
        </ScrollReveal>
      ))}
    </div>
  );
}
