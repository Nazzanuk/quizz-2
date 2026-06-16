'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { fetchQuiz, fetchRun, generateHostRecap, trackShare } from '@/Lib/Api/Client';
import { getPlayerProfile } from '@/Lib/PlayerProfile';
import type {
  LastRunSnapshot,
  Question,
  QuestionAttempt,
  QuizRunDetail,
  SaveResultAttemptInput,
} from '@/Lib/Types';
import { lastRunAtom } from '@/State/PlayAtoms';
import { hostVoiceEnabledAtom } from '@/State/SettingsAtoms';
import { addToastAtom } from '@/State/UiAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Card from '@/Features/Shared/Card';
import InstallPrompt from '@/Features/Shared/InstallPrompt';
import Leaderboard from '@/Features/Shared/Leaderboard';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import { haptic } from '@/Features/Shared/Haptic';
import { shareLink } from '@/Features/Shared/Share';
import ResultsView from '@/Features/QuizPlay/ResultsView';
import HostStage, { type HostCue } from '@/Features/QuizPlay/HostStage';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import {
  averageResponseMs,
  fastestResponseMs,
  getRunInsights,
} from '@/Features/QuizPlay/HostScript';
import styles from './ResultsPage.module.css';

interface ResultsPageProps {
  quizId: string;
  runId: string;
}

export default function ResultsPage({ quizId, runId }: ResultsPageProps) {
  const lastRun = useAtomValue(lastRunAtom);
  const hostVoiceEnabled = useAtomValue(hostVoiceEnabledAtom);
  const addToast = useSetAtom(addToastAtom);
  const { navigate } = useTransitionRouter();
  const freshDetail = useMemo(
    () => snapshotToDetail(lastRun, quizId, runId),
    [lastRun, quizId, runId],
  );
  const routeKey = `${quizId}:${runId}`;
  const [fetchedState, setFetchedState] = useState<{
    key: string;
    detail: QuizRunDetail;
  } | null>(null);
  const [quizMeta, setQuizMeta] = useState<{ title: string; topic: string | null } | null>(null);
  const [upgradedRecap, setUpgradedRecap] = useState<{ runId: string; text: string } | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const fetchedDetail = fetchedState?.key === routeKey ? fetchedState.detail : null;
  const error = errorState?.key === routeKey ? errorState.message : '';
  const detail = freshDetail ?? fetchedDetail;
  const fresh = freshDetail != null;
  const recap = upgradedRecap?.runId === runId
    ? upgradedRecap.text
    : detail?.run.recap ?? '';

  useEffect(() => {
    if (!fresh) {
      return;
    }

    let cancelled = false;
    fetchQuiz(quizId)
      .then((quiz) => {
        if (!cancelled) setQuizMeta({ title: quiz.title, topic: quiz.topic });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fresh, quizId]);

  useEffect(() => {
    if (freshDetail) {
      return;
    }

    let cancelled = false;
    fetchRun(quizId, runId)
      .then((data) => {
        if (cancelled) return;
        if (data.quiz) setQuizMeta(data.quiz);
        setFetchedState({ key: routeKey, detail: data });
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorState({
            key: routeKey,
            message: err instanceof Error ? err.message : 'Could not load results',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [freshDetail, quizId, routeKey, runId]);

  const recapRequestedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fresh || !detail || !quizMeta) return;
    // The upgraded recap is an LLM call; only request it once per run, even
    // across re-renders or StrictMode effect replays.
    if (recapRequestedForRef.current === runId) return;
    recapRequestedForRef.current = runId;

    const attempts = toSaveAttempts(detail.attempts);
    const insights = getRunInsights({ questions: detail.questions, attempts });
    const wrongCount = detail.attempts.filter((attempt) => !attempt.correct).length;
    const previousBest = freshDetail?.run ? lastRun?.previousBest ?? null : null;
    const pct = detail.run.total > 0
      ? Math.round((detail.run.correct / detail.run.total) * 100)
      : 0;

    generateHostRecap(quizId, {
      mode: detail.run.mode,
      hostPersona: detail.run.hostPersona,
      summary: {
        correct: detail.run.correct,
        total: detail.run.total,
        bestStreak: detail.run.bestStreak,
        wrongCount,
        fastestAnswerMs: fastestResponseMs(attempts),
        averageAnswerMs: averageResponseMs(attempts),
        previousBest,
        isNewBest: previousBest !== null && pct > previousBest,
        quizBest: previousBest,
        quizPlays: 0,
      },
      profile: getPlayerProfile(),
      quiz: {
        id: quizId,
        title: quizMeta.title,
        topic: quizMeta.topic,
      },
      strengths: insights.strengths,
      weaknesses: insights.weaknesses,
    })
      .then((response) => setUpgradedRecap({ runId, text: response.recap }))
      .catch(() => {});
  }, [detail, fresh, freshDetail?.run, lastRun?.previousBest, quizId, quizMeta, runId]);

  const hostCue: HostCue | null = fresh && recap
    ? {
      id: `${runId}:results-recap`,
      text: recap,
      kind: 'recap',
      audioPrefetch: true,
    }
    : null;

  if (error) {
    return (
      <AppShell>
        <BlobField />
        <div className={styles.centerState}>
          <Card color="lavender" className={styles.stateCard}>
            <h1 className={styles.stateTitle}>Results missing</h1>
            <p className={styles.stateText}>{error}</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell>
        <div className={styles.centerState}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  const wrongCount = fresh
    ? detail.attempts.filter((attempt) => !attempt.correct).length
    : Math.max(detail.run.total - detail.run.correct, 0);
  const pct = detail.run.total > 0
    ? Math.round((detail.run.correct / detail.run.total) * 100)
    : 0;
  const quizTitle = quizMeta?.title ?? 'this quiz';

  const handleShareResult = async () => {
    const result = await shareLink({
      title: `${pct}% on ${quizTitle}`,
      text: `${detail.run.correct}/${detail.run.total} correct. Try the quiz and compare your score.`,
      url: window.location.href,
    }).catch(() => null);
    if (result === 'cancelled') return;

    if (result !== null) trackShare(quizId);
    addToast({
      message: result === null ? 'Could not copy score link' : result === 'shared' ? 'Share sheet opened' : 'Score link copied',
      type: result === null ? 'error' : 'success',
    });
    haptic('tap');
  };

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <span className="neo-bigtext" aria-hidden="true">Score</span>
        <p className={styles.kicker}>Run complete</p>
        {hostCue && (
          <HostStage
            cue={hostCue}
            mode={detail.run.mode}
            hostPersona={detail.run.hostPersona}
            voiceEnabled={hostVoiceEnabled}
          />
        )}
        <ResultsView
          correct={detail.run.correct}
          total={detail.run.total}
          previousBest={freshDetail ? lastRun?.previousBest ?? null : null}
          bestStreak={detail.run.bestStreak}
          wrongCount={wrongCount}
          recap={recap}
          onShare={handleShareResult}
          onRetry={() => navigate(`/quiz/${quizId}/play`)}
          onPracticeWeak={fresh && wrongCount > 0
            ? () => navigate(`/quiz/${quizId}/play?practice=${runId}`)
            : undefined}
          onBack={() => navigate(`/quiz/${quizId}`)}
        />
        <Leaderboard quizId={quizId} compact />
        {fresh && <InstallPrompt />}
        {fresh && (
          <AttemptBreakdown
            attempts={detail.attempts}
            questions={detail.questions}
          />
        )}
      </div>
    </AppShell>
  );
}

function snapshotToDetail(
  snapshot: LastRunSnapshot | null,
  quizId: string,
  runId: string,
): QuizRunDetail | null {
  if (!snapshot || snapshot.quizId !== quizId || snapshot.runId !== runId) return null;
  return {
    run: {
      id: snapshot.runId,
      quizId: snapshot.quizId,
      mode: snapshot.mode,
      hostPersona: snapshot.hostPersona,
      correct: snapshot.correct,
      total: snapshot.total,
      bestStreak: snapshot.bestStreak,
      elapsedMs: snapshot.elapsedMs,
      recap: snapshot.recap,
      createdAt: snapshot.createdAt,
    },
    attempts: snapshot.attempts,
    questions: snapshot.questions,
  };
}

function AttemptBreakdown({
  attempts,
  questions,
}: {
  attempts: QuestionAttempt[];
  questions: Question[];
}) {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return (
    <section className={styles.breakdown}>
      <div className={styles.sectionHeader}>
        <h2>Question breakdown</h2>
        <span>{attempts.length}</span>
      </div>
      {attempts.map((attempt) => {
        const question = questionById.get(attempt.questionId);
        return (
          <Card
            key={attempt.id}
            color={attempt.correct ? 'sage' : 'lavender'}
            className={styles.attemptCard}
          >
            <div className={styles.attemptTop}>
              <span className={styles.attemptNumber}>Q{attempt.orderIndex + 1}</span>
              <span className={`${styles.resultPill} ${attempt.correct ? styles.resultCorrect : styles.resultWrong}`}>
                {attempt.correct ? 'Correct' : attempt.timedOut ? 'Timed out' : 'Missed'}
              </span>
            </div>
            <h3 className={styles.question}>{question?.questionText ?? 'Question unavailable'}</h3>
            <dl className={styles.detailGrid}>
              <div>
                <dt>Your answer</dt>
                <dd>{attempt.selectedAnswer ?? 'No answer'}</dd>
              </div>
              <div>
                <dt>Correct answer</dt>
                <dd>{question?.answerText ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt>Response</dt>
                <dd>{formatMs(attempt.responseMs)}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{attempt.confidence ?? 'Not asked'}</dd>
              </div>
            </dl>
          </Card>
        );
      })}
    </section>
  );
}

function toSaveAttempts(attempts: QuestionAttempt[]): SaveResultAttemptInput[] {
  return attempts.map((attempt) => ({
    questionId: attempt.questionId,
    orderIndex: attempt.orderIndex,
    selectedAnswer: attempt.selectedAnswer,
    confidence: attempt.confidence,
    correct: attempt.correct,
    timedOut: attempt.timedOut,
    responseMs: attempt.responseMs,
    streakBefore: attempt.streakBefore,
    streakAfter: attempt.streakAfter,
    wasFinalQuestion: attempt.wasFinalQuestion,
  }));
}

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(1)}s`;
}
