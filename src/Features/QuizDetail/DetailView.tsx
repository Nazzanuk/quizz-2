'use client';

import { useEffect, useState } from 'react';
import Link from '@/Features/Shared/TransitionLink';
import { useSetAtom } from 'jotai';
import { fetchQuizRuns, getResultsSummary } from '@/Lib/Api/Client';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import type { QuizRun, ResultsSummary } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import { addToastAtom } from '@/State/UiAtoms';
import { haptic } from '@/Features/Shared/Haptic';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import styles from './DetailView.module.css';

interface DetailViewProps {
  quizId: string;
}

export default function DetailView({ quizId }: DetailViewProps) {
  const { quiz, questions, imagesPending, patchQuestion } = useQuiz(quizId, { poll: true });
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

  const handleShare = async () => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    addToast({ message: 'Link copied', type: 'success' });
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

        <section className={styles.recentRuns}>
          <div className={styles.questionsHeader}>
            <h2 className={styles.questionsTitle}>
              Recent runs
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

        <Link href={`/quiz/${quizId}/edit`} className={styles.editLink}>
          <Button variant="secondary" fullWidth>Edit quiz</Button>
        </Link>

        <div className={styles.questionsHeader}>
          <h2 className={styles.questionsTitle}>
            Questions
            <span className={styles.count}>{questions.length}</span>
          </h2>
        </div>

        <QuestionList
          questions={questions}
          quizId={quizId}
          editing={false}
          imagesPending={imagesPending}
          onUpdate={patchQuestion}
        />
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
