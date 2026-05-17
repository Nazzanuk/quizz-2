'use client';

import { useState, useMemo } from 'react';
import type { Question } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import SafeImage from '@/Features/Shared/SafeImage';
import { playSound, primeAudio } from '@/Features/Shared/Sound';
import { haptic } from '@/Features/Shared/Haptic';
import styles from './MultipleChoice.module.css';

interface MultipleChoiceProps {
  question: Question;
  timedOut?: boolean;
  onAnswerStart?: () => boolean;
  onAnswer: (correct: boolean) => void;
}

export default function MultipleChoice({
  question,
  timedOut = false,
  onAnswerStart,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const pairs = useMemo(() => {
    const raw = (question.options ?? []).map((text, i) => ({
      text,
      imageUrl: question.optionImages?.[i] ?? null,
    }));
    return shuffleArray(raw);
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only enter image mode when every slot has a URL — no partial or skeleton states
  const hasImages = question.optionImages?.every((url) => url != null) ?? false;
  const answered = timedOut || selected !== null;

  const handleSelect = (text: string) => {
    if (answered) return;
    if (onAnswerStart && !onAnswerStart()) return;
    primeAudio();
    setSelected(text);
    const correct = text === question.answerText;
    playSound(correct ? 'correct' : 'wrong');
    haptic(correct ? 'correct' : 'wrong');
    setTimeout(() => onAnswer(correct), 800);
  };

  const stateClass = (text: string) => {
    if (timedOut) return text === question.answerText ? styles.correct : '';
    if (!selected) return '';
    if (selected === text) return text === question.answerText ? styles.correct : styles.wrong;
    if (text === question.answerText) return styles.correct;
    return '';
  };

  if (hasImages) {
    return (
      <div className={styles.container}>
        {question.imageUrl && (
          <SafeImage src={question.imageUrl} alt="" className={styles.image} />
        )}
        <h2 className={styles.question}>{question.questionText}</h2>
        <div className={styles.imageGrid}>
          {pairs.map(({ text, imageUrl }) => (
            <button
              key={text}
              className={`${styles.imageOption} ${stateClass(text)}`}
              onClick={() => handleSelect(text)}
              disabled={answered}
            >
              <div className={styles.imageWrap}>
                {imageUrl && (
                  <SafeImage src={imageUrl} alt={text} className={styles.optionImg} />
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
        <SafeImage src={question.imageUrl} alt="" className={styles.image} />
      )}
      <h2 className={styles.question}>{question.questionText}</h2>
      <div className={styles.options}>
        {pairs.map(({ text }) => (
          <button
            key={text}
            className={`${styles.option} ${stateClass(text)}`}
            onClick={() => handleSelect(text)}
            disabled={answered}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
