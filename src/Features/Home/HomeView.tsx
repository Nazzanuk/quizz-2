'use client';

import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { sortedQuizListAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { useQuizzes } from '@/Lib/Hooks/UseQuizzes';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
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
          <p className={styles.kicker}>Playful study sessions</p>
          <h1 className={styles.heading}>
            Your <span className={styles.accent}>quizzes</span>
          </h1>
          <p className={styles.subhead}>
            Build quick rounds from a topic or your own notes, then chase cleaner streaks in
            short, high-energy sessions.
          </p>
          <div className={styles.actions}>
            <Link href="/quiz/new">
              <Button variant="primary">Create a quiz</Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className={styles.list}>
        {isLoading && quizzes.length === 0 ? (
          <HomeLoadingState />
        ) : quizzes.length === 0 ? (
          <EmptyState />
        ) : (
          <QuizList quizzes={quizzes} />
        )}
      </section>
    </AppShell>
  );
}

function HomeLoadingState() {
  return (
    <div className={styles.loadingList} aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          color={index % 2 === 0 ? 'sage' : 'lavender'}
          className={styles.loadingCard}
        >
          <div className={`uiSkeleton ${styles.loadingCover}`} />
          <div className={styles.loadingBody}>
            <div className={`uiSkeleton ${styles.loadingTitle}`} />
            <div className={`uiSkeleton ${styles.loadingMeta}`} />
          </div>
          <div className={`uiSkeleton ${styles.loadingPlay}`} />
        </Card>
      ))}
    </div>
  );
}
