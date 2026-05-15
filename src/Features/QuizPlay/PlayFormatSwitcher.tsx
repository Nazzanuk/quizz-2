'use client';

import { useAtom } from 'jotai';
import { useSetAtom } from 'jotai';
import { playFormatAtom, currentIndexAtom, userAnswersAtom } from '@/State/PlayAtoms';
import { ALL_FORMATS } from '@/Lib/Constants';
import type { QuizFormat } from '@/Lib/Types';
import styles from './PlayFormatSwitcher.module.css';

const SHORT_LABELS: Record<QuizFormat, string> = {
  mcq: 'MCQ',
  truefalse: 'True/False',
  fillblank: 'Fill blank',
  flashcard: 'Flashcard',
  jeopardy: 'Jeopardy',
};

export default function PlayFormatSwitcher() {
  const [format, setFormat] = useAtom(playFormatAtom);
  const setIndex = useSetAtom(currentIndexAtom);
  const setAnswers = useSetAtom(userAnswersAtom);

  const handleSwitch = (next: QuizFormat) => {
    if (next === format) return;
    setFormat(next);
    setIndex(0);
    setAnswers(new Map());
  };

  return (
    <div className={styles.switcher}>
      {ALL_FORMATS.map((f) => (
        <button
          key={f}
          className={`${styles.chip} ${f === format ? styles.active : ''}`}
          onClick={() => handleSwitch(f)}
        >
          {SHORT_LABELS[f]}
        </button>
      ))}
    </div>
  );
}
