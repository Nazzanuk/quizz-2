'use client';

import Link from '@/Features/Shared/TransitionLink';
import { useAtomValue } from 'jotai';
import { filteredQuizListAtom, isLoadingAtom, quizListAtom } from '@/State/QuizAtoms';
import { useQuizzes } from '@/Lib/Hooks/UseQuizzes';
import { useSession } from '@/Lib/Auth/Client';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SignInButton from '@/Features/Shared/SignInButton';
import QuizList from './QuizList';
import EmptyState from './EmptyState';
import LibraryControls from './LibraryControls';
import SharedQuizzes from './SharedQuizzes';
import styles from './HomeView.module.css';

export default function HomeView() {
  const { data: session, isPending } = useSession();
  const allQuizzes = useAtomValue(quizListAtom);
  const ownedIds = new Set(allQuizzes.map((quiz) => quiz.id));

  return (
    <AppShell>
      <BlobField />
      <section className={styles.hero}>
        <span className="neo-bigtext" aria-hidden="true">Play</span>
        <span className="neo-sticker neo-sticker-pin" aria-hidden="true">Fast rounds</span>
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
            {session?.user ? (
              <Link href="/create">
                <Button variant="primary">Create a quiz</Button>
              </Link>
            ) : (
              <SignInButton callbackURL="/" label="Sign in to build quizzes" />
            )}
          </div>
          {!session?.user && (
            <p className={styles.legal}>
              By signing in you agree to our <Link href="/terms">Terms</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          )}
        </ScrollReveal>
        <div className="neo-marquee" aria-hidden="true">
          <span>quizzes * streaks * recall * questions * </span>
          <span>quizzes * streaks * recall * questions * </span>
        </div>
      </section>

      {isPending ? (
        <section className={styles.list}>
          <HomeLoadingState />
        </section>
      ) : session?.user ? (
        <SignedInLibrary />
      ) : (
        <section className={styles.list}>
          <SignedOutPrompt />
        </section>
      )}

      {/* Anonymous visitors have no library, so surface the quizzes they've
          opened from shared links right here. Signed-in users browse these
          (and the trending feed) from the Discover tab instead. */}
      {!isPending && !session?.user && <SharedQuizzes excludeIds={ownedIds} />}
    </AppShell>
  );
}

function SignedInLibrary() {
  useQuizzes();
  const quizzes = useAtomValue(filteredQuizListAtom);
  const allQuizzes = useAtomValue(quizListAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  return (
    <section className={styles.list}>
      {allQuizzes.length > 0 && <LibraryControls />}
      {isLoading && allQuizzes.length === 0 ? (
        <HomeLoadingState />
      ) : allQuizzes.length === 0 ? (
        <EmptyState />
      ) : quizzes.length === 0 ? (
        <p className={styles.noMatches}>No quizzes match that filter yet.</p>
      ) : (
        <QuizList quizzes={quizzes} />
      )}
    </section>
  );
}

function SignedOutPrompt() {
  return (
    <Card color="lavender">
      <p className={styles.kicker}>Free to play, sign in to create</p>
      <p>
        Anyone can play a shared quiz link — no account needed. Sign in with Google
        (above) to generate your own quizzes and keep them in your library.
      </p>
    </Card>
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
