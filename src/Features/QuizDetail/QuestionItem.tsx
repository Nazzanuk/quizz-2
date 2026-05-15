'use client';

import type { Question } from '@/Lib/Types';
import Card from '@/Features/Shared/Card';
import styles from './QuestionItem.module.css';

interface QuestionItemProps {
  question: Question;
  index: number;
}

export default function QuestionItem({ question, index }: QuestionItemProps) {
  const color = index % 2 === 0 ? 'sage' : 'lavender';

  return (
    <Card color={color} className={styles.card}>
      <p className={styles.number}>Q{index + 1}</p>
      <p className={styles.text}>{question.questionText}</p>
      <p className={styles.answer}>{question.answerText}</p>
    </Card>
  );
}
