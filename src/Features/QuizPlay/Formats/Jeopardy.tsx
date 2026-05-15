'use client';

import { useState, useMemo } from 'react';
import type { Question } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import Card from '@/Features/Shared/Card';
import styles from './Jeopardy.module.css';

interface JeopardyProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function Jeopardy({ question, onAnswer }: JeopardyProps) {
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
      <Card color="lavender" className={styles.answerCard}>
        <p className={styles.label}>The answer is:</p>
        <h2 className={styles.answerText}>{question.questionText}</h2>
      </Card>

      <p className={styles.prompt}>What is the question?</p>

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
