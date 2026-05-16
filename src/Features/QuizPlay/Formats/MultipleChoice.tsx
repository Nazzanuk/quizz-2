'use client';

import { useState, useMemo } from 'react';
import type { Question } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import styles from './MultipleChoice.module.css';

interface MultipleChoiceProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function MultipleChoice({ question, onAnswer }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Keep option text and its image URL together so shuffle preserves the pairing
  const pairs = useMemo(() => {
    const raw = (question.options ?? []).map((text, i) => ({
      text,
      imageUrl: question.optionImages?.[i] ?? null,
    }));
    return shuffleArray(raw);
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasImages = question.optionImages != null;

  const handleSelect = (text: string) => {
    if (selected) return;
    setSelected(text);
    setTimeout(() => onAnswer(text === question.answerText), 800);
  };

  const stateClass = (text: string) => {
    if (!selected) return '';
    if (selected === text) return text === question.answerText ? styles.correct : styles.wrong;
    if (text === question.answerText) return styles.correct;
    return '';
  };

  if (hasImages) {
    return (
      <div className={styles.container}>
        {question.imageUrl && (
          <img src={question.imageUrl} alt="" className={styles.image} />
        )}
        <h2 className={styles.question}>{question.questionText}</h2>
        <div className={styles.imageGrid}>
          {pairs.map(({ text, imageUrl }) => (
            <button
              key={text}
              className={`${styles.imageOption} ${stateClass(text)}`}
              onClick={() => handleSelect(text)}
              disabled={!!selected}
            >
              <div className={styles.imageWrap}>
                {imageUrl ? (
                  <img src={imageUrl} alt={text} className={styles.optionImg} />
                ) : (
                  <div className={styles.imgSkeleton} />
                )}
              </div>
              <span className={styles.imageLabel}>{text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className={styles.image} />
      )}
      <h2 className={styles.question}>{question.questionText}</h2>
      <div className={styles.options}>
        {pairs.map(({ text }) => (
          <button
            key={text}
            className={`${styles.option} ${stateClass(text)}`}
            onClick={() => handleSelect(text)}
            disabled={!!selected}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
