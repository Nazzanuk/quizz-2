'use client';

import { useState } from 'react';
import type { Question } from '@/Lib/Types';
import styles from './TrueFalse.module.css';

interface TrueFalseProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function TrueFalse({ question, onAnswer }: TrueFalseProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (answer: string) => {
    if (selected) return;
    setSelected(answer);
    setTimeout(() => onAnswer(answer === question.answerText), 800);
  };

  const getClass = (val: string) => {
    if (!selected) return styles.btn;
    if (selected === val) {
      return val === question.answerText
        ? `${styles.btn} ${styles.correct}`
        : `${styles.btn} ${styles.wrong}`;
    }
    if (val === question.answerText) {
      return `${styles.btn} ${styles.correct}`;
    }
    return styles.btn;
  };

  return (
    <div className={styles.container}>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className={styles.image} />
      )}
      <h2 className={styles.question}>{question.questionText}</h2>
      <div className={styles.row}>
        <button
          className={getClass('True')}
          onClick={() => handleSelect('True')}
          disabled={!!selected}
        >
          True
        </button>
        <button
          className={getClass('False')}
          onClick={() => handleSelect('False')}
          disabled={!!selected}
        >
          False
        </button>
      </div>
    </div>
  );
}
