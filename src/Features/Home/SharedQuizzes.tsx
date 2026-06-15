'use client';

import { useEffect, useState } from 'react';
import type { Quiz } from '@/Lib/Types';
import { getViewedQuizzes, removeViewedQuiz, type ViewedQuiz } from '@/Lib/ViewedQuizzes';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import QuizCard from './QuizCard';
import styles from './SharedQuizzes.module.css';

// Adapts a locally-stored view record to the Quiz shape QuizCard renders. Only
// the fields the card reads (cover, title, count, date) are meaningful.
function toQuiz(entry: ViewedQuiz): Quiz {
  return {
    id: entry.id,
    ownerId: null,
    visibility: 'unlisted',
    title: entry.title,
    description: null,
    topic: null,
    sourceMaterial: null,
    coverImageUrl: entry.coverImageUrl,
    format: 'mcq',
    questionCount: entry.questionCount,
    questionsPerRun: null,
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
  };
}

interface SharedQuizzesProps {
  // Quizzes already in the user's own library are skipped to avoid duplicates.
  excludeIds: Set<string>;
}

export default function SharedQuizzes({ excludeIds }: SharedQuizzesProps) {
  const [viewed, setViewed] = useState<ViewedQuiz[]>([]);

  useEffect(() => {
    const read = () => setViewed(getViewedQuizzes());
    read();
    window.addEventListener('quizz:viewed-quizzes', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('quizz:viewed-quizzes', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  const items = viewed.filter((entry) => !excludeIds.has(entry.id));
  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.kicker}>Shared with you</span>
        <h2 className={styles.title}>Discovered</h2>
        <p className={styles.sub}>
          Public quizzes you&apos;ve opened from links. Jump back in anytime.
        </p>
      </div>
      <div className={styles.list}>
        {items.map((entry, index) => (
          <ScrollReveal key={entry.id} delay={index * 0.06}>
            <div className={styles.cardWrap}>
              <QuizCard quiz={toQuiz(entry)} index={index} />
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${entry.title} from discovered`}
                onClick={() => removeViewedQuiz(entry.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
