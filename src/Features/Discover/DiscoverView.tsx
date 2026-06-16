'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTopQuizzes } from '@/Lib/Api/Client';
import type { TopQuiz } from '@/Lib/Types';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import QuizCard from '@/Features/Home/QuizCard';
import SharedQuizzes from '@/Features/Home/SharedQuizzes';
import styles from './DiscoverView.module.css';

export default function DiscoverView() {
  const [top, setTop] = useState<TopQuiz[] | null>(null);
  const [error, setError] = useState(false);

  const fetchTop = useCallback(() => {
    fetchTopQuizzes(5)
      .then(setTop)
      .catch(() => setError(true));
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setTop(null);
    fetchTop();
  }, [fetchTop]);

  useEffect(() => {
    fetchTop();
  }, [fetchTop]);

  // Skip the shared-with-you list for anything already shown in the top feed.
  const topIds = new Set((top ?? []).map((quiz) => quiz.id));

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <span className="neo-bigtext" aria-hidden="true">Find</span>
        <span className="neo-sticker neo-sticker-pin" aria-hidden="true">Top picks</span>
        <p className={styles.kicker}>Browse the board</p>
        <h1 className={styles.heading}>Discover</h1>
        <p className={styles.subhead}>
          The most-played quizzes right now, plus the ones friends have shared with you.
        </p>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Trending</span>
            <h2 className={styles.sectionTitle}>Top quizzes</h2>
          </div>
          {error ? (
            <Card color="bg" className={styles.empty}>
              <p>Couldn&apos;t load the top quizzes — check your connection.</p>
              <Button variant="secondary" onClick={retry}>Try again</Button>
            </Card>
          ) : top === null ? (
            <TopLoadingState />
          ) : top.length === 0 ? (
            <Card color="bg" className={styles.empty}>
              <p>No quizzes have been played yet. Be the first to set a high score.</p>
            </Card>
          ) : (
            <div className={styles.list}>
              {top.map((quiz, index) => (
                <ScrollReveal key={quiz.id} delay={index * 0.06}>
                  <div className={styles.cardWrap}>
                    <span className={styles.rankPin} aria-hidden="true">#{index + 1}</span>
                    <QuizCard quiz={quiz} index={index} />
                    <span className={styles.playsPin}>
                      {quiz.plays} {quiz.plays === 1 ? 'play' : 'plays'}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </section>

        <SharedQuizzes
          excludeIds={topIds}
          kicker="From your links"
          title="Shared with you"
          subtitle="Quizzes you've opened from a shared link. Jump back in anytime."
        />
      </div>
    </AppShell>
  );
}

function TopLoadingState() {
  return (
    <div className={styles.list} aria-hidden="true">
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
        </Card>
      ))}
    </div>
  );
}
