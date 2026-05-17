'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import Link from 'next/link';
import { PLAY_TIMER_SECONDS, PLAY_TIMINGS, STREAK_MILESTONES } from '@/Lib/Constants';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import type { Question, QuizAnswerPhase, QuizFormat, QuizMilestone } from '@/Lib/Types';
import { getResultsSummary, saveResult } from '@/Lib/Api/Client';
import { playSound, primeAudio } from '@/Features/Shared/Sound';
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
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerPhase, setAnswerPhase] = useState<QuizAnswerPhase>('idle');
  const [milestone, setMilestone] = useState<QuizMilestone>('none');
  const uiTimersRef = useRef<number[]>([]);
  const milestoneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    getResultsSummary(quizId)
      .then((s) => setPreviousBest(s.best))
      .catch(() => {});
  }, [quizId]);

  const clearUiTimers = useCallback(() => {
    uiTimersRef.current.forEach((id) => window.clearTimeout(id));
    uiTimersRef.current = [];
    if (milestoneTimerRef.current) {
      window.clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearUiTimers, [clearUiTimers]);

  const scheduleUi = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      uiTimersRef.current = uiTimersRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    uiTimersRef.current.push(id);
  }, []);

  const resetRunState = useCallback(() => {
    clearUiTimers();
    setAnswerPhase('idle');
    setMilestone('none');
    setStreak(0);
    setBestStreak(0);
  }, [clearUiTimers]);

  const startRun = useCallback((items: Question[]) => {
    resetRunState();
    initPlay(items);
  }, [initPlay, resetRunState]);

  useEffect(() => {
    if (questions.length > 0 && questionOrder.length === 0) {
      initPlay(questions);
    }
  }, [questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitAnswer = useCallback(
    (correct: boolean, phase: QuizAnswerPhase) => {
      const qId = questionOrder[idx];
      if (!qId) return;

      setAnswerPhase(phase);

      const next = new Map(answers);
      next.set(qId, correct ? '__correct__' : '__wrong__');
      setAnswers(next);

      const nextStreak = correct ? streak + 1 : 0;
      const nextBestStreak = correct ? Math.max(bestStreak, nextStreak) : bestStreak;
      const nextMilestone = correct ? (STREAK_MILESTONES[nextStreak] ?? 'none') : 'none';
      const revealHoldMs = phase === 'timed-out'
        ? PLAY_TIMINGS.timeoutRevealHoldMs
        : PLAY_TIMINGS.answerRevealHoldMs;

      setStreak(nextStreak);
      setBestStreak(nextBestStreak);

      if (nextMilestone !== 'none') {
        setMilestone(nextMilestone);
        if (milestoneTimerRef.current) window.clearTimeout(milestoneTimerRef.current);
        milestoneTimerRef.current = window.setTimeout(() => {
          setMilestone('none');
          milestoneTimerRef.current = null;
        }, PLAY_TIMINGS.milestonePulseMs);
      } else if (!correct) {
        setMilestone('none');
      }

      if (idx + 1 >= questionOrder.length) {
        const correctCount = [...next.values()].filter((v) => v === '__correct__').length;
        const perQuestion: Record<string, string> = {};
        next.forEach((value, key) => { perQuestion[key] = value; });
        saveResult(quizId, { correct: correctCount, total: next.size, perQuestion }).catch(() => {});
        const pct = next.size > 0 ? Math.round((correctCount / next.size) * 100) : 0;
        const isNewBest = previousBest !== null && pct > previousBest;

        scheduleUi(() => {
          setAnswerPhase('idle');
          playSound(isNewBest ? 'newBest' : 'complete');
          haptic('success');
          setShowResult(true);
        }, revealHoldMs);
      } else {
        scheduleUi(() => {
          setAnswerPhase('idle');
          setIdx(idx + 1);
        }, revealHoldMs);
      }
    },
    [
      answers,
      bestStreak,
      idx,
      previousBest,
      questionOrder,
      quizId,
      scheduleUi,
      setAnswers,
      setIdx,
      setShowResult,
      streak,
    ],
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
            bestStreak={bestStreak}
            wrongCount={wrongQuestions.length}
            onRetry={() => startRun(questions)}
            onPracticeWeak={wrongQuestions.length > 0 ? () => startRun(wrongQuestions) : undefined}
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
        <PlayProgress
          current={idx}
          total={questionOrder.length}
          correct={score.correct}
          streak={streak}
          milestone={milestone}
          answerPhase={answerPhase}
        />
        <ActiveQuestion
          key={`${current.id}-${format}`}
          current={current}
          questions={questions}
          format={format}
          answerPhase={answerPhase}
          setAnswerPhase={setAnswerPhase}
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
  answerPhase: QuizAnswerPhase;
  setAnswerPhase: (phase: QuizAnswerPhase) => void;
  onAnswer: (correct: boolean, phase: QuizAnswerPhase) => void;
}

function ActiveQuestion({
  current,
  questions,
  format,
  answerPhase,
  setAnswerPhase,
  onAnswer,
}: ActiveQuestionProps) {
  const [interactionLocked, setInteractionLocked] = useState(false);
  const [pressedValue, setPressedValue] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const transitionIdsRef = useRef<number[]>([]);
  const correctValue = format === 'jeopardy' ? current.questionText : current.answerText;

  useEffect(() => () => {
    transitionIdsRef.current.forEach((id) => window.clearTimeout(id));
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      transitionIdsRef.current = transitionIdsRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    transitionIdsRef.current.push(id);
  }, []);

  const handleOptionPress = useCallback((value: string) => {
    if (interactionLocked || answerPhase !== 'idle') return;
    primeAudio();
    setPressedValue(value);
    setAnswerPhase('pressed');
  }, [answerPhase, interactionLocked, setAnswerPhase]);

  const handleOptionCancelPress = useCallback((value: string) => {
    if (interactionLocked) return;
    if (answerPhase !== 'pressed' || pressedValue !== value) return;
    setPressedValue(null);
    setAnswerPhase('idle');
  }, [answerPhase, interactionLocked, pressedValue, setAnswerPhase]);

  const handleOptionSelect = useCallback((value: string) => {
    if (interactionLocked) return;

    setInteractionLocked(true);
    setPressedValue(null);
    setSelectedValue(value);
    setAnswerPhase('selected');

    const correct = value === correctValue;
    schedule(() => {
      const revealPhase: QuizAnswerPhase = correct
        ? 'revealed-correct'
        : 'revealed-wrong';
      setAnswerPhase(revealPhase);
      playSound(correct ? 'correct' : 'wrong');
      haptic(correct ? 'correct' : 'wrong');
      onAnswer(correct, revealPhase);
    }, PLAY_TIMINGS.answerRevealDelayMs);
  }, [correctValue, interactionLocked, onAnswer, schedule, setAnswerPhase]);

  const handleTimeout = useCallback(() => {
    if (interactionLocked) return;
    setInteractionLocked(true);
    setPressedValue(null);
    playSound('wrong');
    haptic('wrong');
    setAnswerPhase('timed-out');
    onAnswer(false, 'timed-out');
  }, [interactionLocked, onAnswer, setAnswerPhase]);

  return (
    <>
      <PlayTimer
        seconds={PLAY_TIMER_SECONDS[format]}
        phase={answerPhase}
        paused={interactionLocked}
        onExpire={handleTimeout}
      />
      <div className={styles.questionWrap}>
        <FormatRenderer
          question={current}
          allQuestions={questions}
          format={format}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={interactionLocked}
          onOptionPress={handleOptionPress}
          onOptionCancelPress={handleOptionCancelPress}
          onOptionSelect={handleOptionSelect}
        />
      </div>
    </>
  );
}
