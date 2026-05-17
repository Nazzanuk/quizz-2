'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import Link from 'next/link';
import { PLAY_TIMER_SECONDS } from '@/Lib/Constants';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import type { Question, QuizFormat } from '@/Lib/Types';
import { getResultsSummary, saveResult } from '@/Lib/Api/Client';
import { playSound } from '@/Features/Shared/Sound';
import { haptic } from '@/Features/Shared/Haptic';
import {
  currentIndexAtom,
  userAnswersAtom,
  showResultAtom,
  scoreAtom,
  initPlayAtom,
  questionOrderAtom,
  questionFormatsAtom,
  isPlayableQuestion,
} from '@/State/PlayAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import PlayProgress from './PlayProgress';
import ResultsView from './ResultsView';
import FormatRenderer from './FormatRenderer';
import PlayTimer from './PlayTimer';
import styles from './PlayView.module.css';

interface PlayViewProps {
  quizId: string;
}

export default function PlayView({ quizId }: PlayViewProps) {
  const { quiz, questions } = useQuiz(quizId);
  const [idx, setIdx] = useAtom(currentIndexAtom);
  const [answers, setAnswers] = useAtom(userAnswersAtom);
  const [showResult, setShowResult] = useAtom(showResultAtom);
  const score = useAtomValue(scoreAtom);
  const questionOrder = useAtomValue(questionOrderAtom);
  const questionFormats = useAtomValue(questionFormatsAtom);
  const initPlay = useSetAtom(initPlayAtom);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  useEffect(() => {
    getResultsSummary(quizId)
      .then((s) => setPreviousBest(s.best))
      .catch(() => {});
  }, [quizId]);

  useEffect(() => {
    if (questions.length > 0 && questionOrder.length === 0) {
      initPlay(questions);
    }
  }, [questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitAnswer = useCallback(
    (correct: boolean) => {
      const qId = questionOrder[idx];
      if (!qId) return;

      const next = new Map(answers);
      next.set(qId, correct ? '__correct__' : '__wrong__');
      setAnswers(next);

      if (idx + 1 >= questionOrder.length) {
        const correctCount = [...next.values()].filter((v) => v === '__correct__').length;
        const perQuestion: Record<string, string> = {};
        next.forEach((value, key) => { perQuestion[key] = value; });
        saveResult(quizId, { correct: correctCount, total: next.size, perQuestion }).catch(() => {});
        const pct = next.size > 0 ? Math.round((correctCount / next.size) * 100) : 0;
        const isNewBest = previousBest !== null && pct > previousBest;

        window.setTimeout(() => {
          playSound(isNewBest ? 'newBest' : 'complete');
          haptic('success');
          setShowResult(true);
        }, 400);
      } else {
        window.setTimeout(() => setIdx(idx + 1), 400);
      }
    },
    [answers, idx, previousBest, questionOrder, quizId, setAnswers, setIdx, setShowResult],
  );

  const hasPlayableQuestions = questions.some(isPlayableQuestion);

  if (!quiz || (hasPlayableQuestions && questionOrder.length === 0)) {
    return (
      <AppShell>
        <div className={styles.center}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  if (showResult) {
    const wrongQuestions = questions.filter((q) => answers.get(q.id) === '__wrong__');
    return (
      <AppShell>
        <BlobField />
        <div className={styles.content}>
          <ResultsView
            correct={score.correct}
            total={score.total}
            quizId={quizId}
            previousBest={previousBest}
            wrongCount={wrongQuestions.length}
            onRetry={() => initPlay(questions)}
            onPracticeWeak={wrongQuestions.length > 0 ? () => initPlay(wrongQuestions) : undefined}
          />
        </div>
      </AppShell>
    );
  }

  if (questions.length > 0 && !hasPlayableQuestions) {
    return (
      <AppShell>
        <BlobField />
        <div className={styles.content}>
          <div className={styles.retiredState}>
            <h2 className={styles.retiredTitle}>This quiz uses a retired question mode.</h2>
            <p className={styles.retiredBody}>
              Flashcards are no longer playable here. Add fresh questions to bring this quiz back with the new formats.
            </p>
            <Link href={`/quiz/${quizId}`} className={styles.retiredLink}>
              Back to quiz
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const currentId = questionOrder[idx];
  const current = questions.find((q) => q.id === currentId);
  const format = questionFormats.get(currentId) ?? 'mcq';

  if (!current) return null;

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <PlayProgress current={idx} total={questionOrder.length} />
        <ActiveQuestion
          key={`${current.id}-${format}`}
          current={current}
          questions={questions}
          format={format}
          onAnswer={commitAnswer}
        />
      </div>
    </AppShell>
  );
}

interface ActiveQuestionProps {
  current: Question;
  questions: Question[];
  format: QuizFormat;
  onAnswer: (correct: boolean) => void;
}

function ActiveQuestion({
  current,
  questions,
  format,
  onAnswer,
}: ActiveQuestionProps) {
  const [timedOut, setTimedOut] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const hasResolvedRef = useRef(false);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => () => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    timeoutIdsRef.current.push(id);
  }, []);

  const handleAnswerStart = useCallback(() => {
    if (interactionLocked || hasResolvedRef.current) return false;
    setInteractionLocked(true);
    return true;
  }, [interactionLocked]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (hasResolvedRef.current) return;
      hasResolvedRef.current = true;
      onAnswer(correct);
    },
    [onAnswer],
  );

  const handleTimeout = useCallback(() => {
    if (interactionLocked || hasResolvedRef.current) return;
    hasResolvedRef.current = true;
    setInteractionLocked(true);
    setTimedOut(true);
    playSound('wrong');
    haptic('wrong');
    schedule(() => onAnswer(false), 800);
  }, [interactionLocked, onAnswer, schedule]);

  return (
    <>
      <PlayTimer
        seconds={PLAY_TIMER_SECONDS[format]}
        paused={interactionLocked}
        onExpire={handleTimeout}
      />
      <div className={styles.questionWrap}>
        <FormatRenderer
          question={current}
          allQuestions={questions}
          format={format}
          timedOut={timedOut}
          onAnswerStart={handleAnswerStart}
          onAnswer={handleAnswer}
        />
      </div>
    </>
  );
}
