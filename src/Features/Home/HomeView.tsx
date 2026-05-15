'use client';

import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { sortedQuizListAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { useQuizzes } from '@/Lib/Hooks/UseQuizzes';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import QuizList from './QuizList';
import EmptyState from './EmptyState';
import styles from './HomeView.module.css';

export default function HomeView() {
  useQuizzes();
  const quizzes = useAtomValue(sortedQuizListAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  return (
    <AppShell>
      <BlobField />
      <section className={styles.hero}>
        <ScrollReveal>
          <h1 className={styles.heading}>
            Your <span className={styles.accent}>quizzes</span>
          </h1>
          <Link href="/quiz/new">
            <Button variant="primary">Create a quiz</Button>
          </Link>
        </ScrollReveal>
      </section>

      <section className={styles.list}>
        {isLoading && quizzes.length === 0 ? (
          <div className={styles.center}>
            <LoadingSpinner />
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState />
        ) : (
          <QuizList quizzes={quizzes} />
        )}
      </section>
    </AppShell>
  );
}
