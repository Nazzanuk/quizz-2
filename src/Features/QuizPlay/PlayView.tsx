'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import {
  currentIndexAtom,
  userAnswersAtom,
  showResultAtom,
  scoreAtom,
  resetPlayAtom,
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
  const reset = useSetAtom(resetPlayAtom);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const q = questions[idx];
      if (!q) return;
      const next = new Map(answers);
      next.set(q.id, correct ? '__correct__' : '__wrong__');
      setAnswers(next);

      if (idx + 1 >= questions.length) {
        setTimeout(() => setShowResult(true), 400);
      } else {
        setTimeout(() => setIdx(idx + 1), 400);
      }
    },
    [idx, questions, answers, setAnswers, setIdx, setShowResult],
  );

  if (!quiz) {
    return (
      <AppShell>
        <div className={styles.center}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  if (showResult) {
    return (
      <AppShell>
        <BlobField />
        <div className={styles.content}>
          <ResultsView
            correct={score.correct}
            total={score.total}
            quizId={quizId}
            onRetry={reset}
          />
        </div>
      </AppShell>
    );
  }

  const current = questions[idx];
  if (!current) return null;

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <PlayProgress current={idx} total={questions.length} />
        <FormatRenderer
          key={current.id}
          question={current}
          onAnswer={handleAnswer}
        />
      </div>
    </AppShell>
  );
}
