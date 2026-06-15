'use client';

import { useEffect, useState } from 'react';
import Link from '@/Features/Shared/TransitionLink';
import { useSetAtom } from 'jotai';
import { fetchQuizRuns, getResultsSummary } from '@/Lib/Api/Client';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { useSession } from '@/Lib/Auth/Client';
import { recordViewedQuiz } from '@/Lib/ViewedQuizzes';
import { DEFAULT_QUESTIONS_PER_RUN } from '@/Lib/Constants';
import type { QuizRun, ResultsSummary } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import { addToastAtom } from '@/State/UiAtoms';
import { haptic } from '@/Features/Shared/Haptic';
import { shareLink } from '@/Features/Shared/Share';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import Leaderboard from '@/Features/Shared/Leaderboard';
import QuizHeader from './QuizHeader';
import styles from './DetailView.module.css';

interface DetailViewProps {
  quizId: string;
}

export default function DetailView({ quizId }: DetailViewProps) {
  const { quiz, questions, imagesPending } = useQuiz(quizId, { poll: true });
  const { data: session } = useSession();
  const [stats, setStats] = useState<ResultsSummary | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [runs, setRuns] = useState<QuizRun[]>([]);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const addToast = useSetAtom(addToastAtom);

  useEffect(() => {
    getResultsSummary(quizId)
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoaded(true));
    fetchQuizRuns(quizId, 5)
      .then(setRuns)
      .catch(() => {})
      .finally(() => setRunsLoaded(true));
  }, [quizId]);

  // Quizzes opened from a shared link (i.e. not owned by the viewer) are logged
  // locally so they surface in the home screen's "Discovered" section.
  useEffect(() => {
    if (!quiz) return;
    const userId = session?.user?.id ?? null;
    if (userId && quiz.ownerId === userId) return;
    recordViewedQuiz({
      id: quiz.id,
      title: quiz.title,
      coverImageUrl: quiz.coverImageUrl,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
    });
  }, [quiz, session?.user?.id]);

  const handleShare = async () => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    const result = await shareLink({
      title: `${quiz?.title ?? 'Quiz'} | Quiz Dart`,
      text: quiz?.description ?? 'Take this quiz and compare your score.',
      url,
    }).catch(() => null);
    if (result === 'cancelled') return;

    addToast({
      message: result === null ? 'Could not copy link' : result === 'shared' ? 'Share sheet opened' : 'Link copied',
      type: result === null ? 'error' : 'success',
    });
    haptic('tap');
  };

  if (!quiz) {
    return (
      <AppShell>
        <BlobField />
        <DetailLoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <QuizHeader
          quiz={quiz}
          editing={false}
          onSave={async () => {}}
          imagesPending={imagesPending}
        />

        {questions.length > 0 && (
          <>
            <Link href={`/quiz/${quizId}/play`} className={styles.playLink}>
              <Button variant="primary" fullWidth>Play quiz</Button>
            </Link>
            {(() => {
              const perRun = Math.min(
                quiz.questionsPerRun ?? DEFAULT_QUESTIONS_PER_RUN,
                questions.length,
              );
              return perRun < questions.length ? (
                <p className={styles.runNote}>
                  Each run picks <strong>{perRun}</strong> of {questions.length} questions at random.
                </p>
              ) : null;
            })()}
            <div className={styles.metaRow}>
              {!statsLoaded ? (
                <span className={`uiSkeleton ${styles.loadingStatsText}`} aria-hidden="true" />
              ) : stats && stats.count > 0 ? (
                <span className={styles.statsText}>
                  {stats.count} {stats.count === 1 ? 'play' : 'plays'}
                  {stats.best !== null && ` · Best: ${stats.best}%`}
                </span>
              ) : (
                <span className={styles.statsText}>No runs yet</span>
              )}
              <button className={styles.shareBtn} onClick={handleShare}>
                Share link
              </button>
            </div>
          </>
        )}

        {questions.length > 0 && <Leaderboard quizId={quizId} />}

        <section className={styles.recentRuns}>
          <div className={styles.questionsHeader}>
            <h2 className={styles.questionsTitle}>
              Your runs
              {runsLoaded && <span className={styles.count}>{runs.length}</span>}
            </h2>
          </div>
          {!runsLoaded ? (
            <div className={styles.runList} aria-hidden="true">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className={`uiSkeleton ${styles.loadingRunRow}`} />
              ))}
            </div>
          ) : runs.length > 0 ? (
            <div className={styles.runList}>
              {runs.map((run) => (
                <Link
                  key={run.id}
                  href={`/quiz/${quizId}/results/${run.id}`}
                  className={styles.runLink}
                >
                  <span className={styles.runScore}>{scorePct(run)}%</span>
                  <span className={styles.runMeta}>
                    {run.correct}/{run.total} · {formatDate(run.createdAt)}
                  </span>
                  <span className={styles.runArrow} aria-hidden="true">&gt;</span>
                </Link>
              ))}
            </div>
          ) : (
            <Card color="bg" className={styles.emptyRunCard}>
              <p>No completed runs yet. Play this quiz once and the receipts land here.</p>
            </Card>
          )}
        </section>

        {session?.user?.id === quiz.ownerId && (
          <Link href={`/quiz/${quizId}/edit`} className={styles.editLink}>
            <Button variant="secondary" fullWidth>Edit quiz</Button>
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function scorePct(run: QuizRun): number {
  return run.total > 0 ? Math.round((run.correct / run.total) * 100) : 0;
}

function DetailLoadingState() {
  return (
    <div className={styles.loadingContent} aria-hidden="true">
      <div className={`uiSkeleton ${styles.loadingCover}`} />
      <div className={`uiSkeleton ${styles.loadingTitle}`} />
      <div className={`uiSkeleton ${styles.loadingDesc}`} />
      <div className={styles.loadingMetaRow}>
        <div className={`uiSkeleton ${styles.loadingMeta}`} />
        <div className={`uiSkeleton ${styles.loadingPill}`} />
      </div>
      <div className={`uiSkeleton ${styles.loadingAction}`} />
      <div className={styles.loadingQuestionsHeader}>
        <div className={`uiSkeleton ${styles.loadingQuestionsTitle}`} />
        <div className={`uiSkeleton ${styles.loadingEditToggle}`} />
      </div>
      <div className={styles.loadingQuestionList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={index}
            color={index % 2 === 0 ? 'sage' : 'lavender'}
            className={styles.loadingQuestionCard}
          >
            <div className={`uiSkeleton ${styles.loadingQuestionImage}`} />
            <div className={styles.loadingQuestionTop}>
              <div className={`uiSkeleton ${styles.loadingQuestionNumber}`} />
            </div>
            <div className={`uiSkeleton ${styles.loadingQuestionLineLg}`} />
            <div className={`uiSkeleton ${styles.loadingQuestionLineMd}`} />
            <div className={`uiSkeleton ${styles.loadingQuestionAnswer}`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
