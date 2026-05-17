'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
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
} from '@/State/PlayAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import PlayProgress from './PlayProgress';
import ResultsView from './ResultsView';
import FormatRenderer from './FormatRenderer';
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

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const qId = questionOrder[idx];
      if (!qId) return;
      const next = new Map(answers);
      next.set(qId, correct ? '__correct__' : '__wrong__');
      setAnswers(next);

      if (idx + 1 >= questionOrder.length) {
        const correctCount = [...next.values()].filter((v) => v === '__correct__').length;
        const perQuestion: Record<string, string> = {};
        next.forEach((v, k) => { perQuestion[k] = v; });
        saveResult(quizId, { correct: correctCount, total: next.size, perQuestion }).catch(() => {});
        const pct = next.size > 0 ? Math.round((correctCount / next.size) * 100) : 0;
        const isNewBest = previousBest !== null && pct > previousBest;
        setTimeout(() => {
          playSound(isNewBest ? 'newBest' : 'complete');
          haptic('success');
          setShowResult(true);
        }, 400);
      } else {
        setTimeout(() => setIdx(idx + 1), 400);
      }
    },
    [idx, questionOrder, answers, setAnswers, setIdx, setShowResult, quizId, previousBest],
  );

  if (!quiz || (questions.length > 0 && questionOrder.length === 0)) {
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

  const currentId = questionOrder[idx];
  const current = questions.find((q) => q.id === currentId);
  const format = questionFormats.get(currentId) ?? 'mcq';

  if (!current) return null;

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <PlayProgress current={idx} total={questionOrder.length} />
        <div className={styles.questionWrap} key={`${current.id}-${format}`}>
          <FormatRenderer
            question={current}
            allQuestions={questions}
            format={format}
            onAnswer={handleAnswer}
          />
        </div>
      </div>
    </AppShell>
  );
}
