'use client';

import type { Question } from '@/Lib/Types';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import QuestionItem from './QuestionItem';
import styles from './QuestionList.module.css';

interface QuestionListProps {
  questions: Question[];
  quizId: string;
  editing: boolean;
  imagesPending: boolean;
  onUpdate: (questionId: string, data: Partial<Question>) => void;
  onDelete?: (questionId: string) => void;
}

export default function QuestionList({ questions, quizId, editing, imagesPending, onUpdate, onDelete }: QuestionListProps) {
  if (questions.length === 0) {
    return <p className={styles.empty}>No questions yet.</p>;
  }

  return (
    <div className={styles.list}>
      {questions.map((q, i) => (
        <ScrollReveal key={`${q.id}-${editing ? 'edit' : 'view'}`} delay={i * 0.06}>
          <QuestionItem
            question={q}
            index={i}
            quizId={quizId}
            editing={editing}
            imagesPending={imagesPending}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </ScrollReveal>
      ))}
    </div>
  );
}
