'use client';

import { useState, useMemo } from 'react';
import type { Question } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import styles from './MultipleChoice.module.css';

interface MultipleChoiceProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function MultipleChoice({
  question,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = useMemo(
    () => shuffleArray(question.options ?? []),
    [question.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt === question.answerText), 800);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.question}>{question.questionText}</h2>
      <div className={styles.options}>
        {options.map((opt) => {
          let cls = styles.option;
          if (selected === opt) {
            cls += opt === question.answerText
              ? ` ${styles.correct}` : ` ${styles.wrong}`;
          } else if (selected && opt === question.answerText) {
            cls += ` ${styles.correct}`;
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => handleSelect(opt)}
              disabled={!!selected}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
