'use client';

import { useMemo } from 'react';
import type { Question, QuizAnswerPhase } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './MultipleChoice.module.css';

interface MultipleChoiceProps {
  question: Question;
  answerPhase: QuizAnswerPhase;
  pressedValue: string | null;
  selectedValue: string | null;
  locked: boolean;
  onOptionPress: (value: string) => void;
  onOptionCancelPress: (value: string) => void;
  onOptionSelect: (value: string) => void;
}

export default function MultipleChoice({
  question,
  answerPhase,
  pressedValue,
  selectedValue,
  locked,
  onOptionPress,
  onOptionCancelPress,
  onOptionSelect,
}: MultipleChoiceProps) {
  const pairs = useMemo(() => {
    const raw = (question.options ?? []).map((text, i) => ({
      text,
      imageUrl: question.optionImages?.[i] ?? null,
    }));
    return shuffleArray(raw);
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only enter image mode when every slot has a URL — no partial or skeleton states
  const hasImages = question.optionImages?.every((url) => url != null) ?? false;

  const stateClass = (text: string) => {
    const isCorrect = text === question.answerText;
    const isSelected = selectedValue === text;
    const isPressed = answerPhase === 'pressed' && pressedValue === text;
    const isDimmed = selectedValue !== null && !isSelected && answerPhase === 'selected';
    const isRevealPhase =
      answerPhase === 'revealed-correct'
      || answerPhase === 'revealed-wrong'
      || answerPhase === 'timed-out';

    return [
      isPressed ? styles.pressed : '',
      isSelected && answerPhase === 'selected' ? styles.selected : '',
      isDimmed ? styles.dimmed : '',
      isRevealPhase && isCorrect ? styles.correct : '',
      answerPhase === 'revealed-wrong' && isSelected && !isCorrect ? styles.wrong : '',
      answerPhase === 'timed-out' && !isCorrect ? styles.dimmed : '',
    ].join(' ');
  };

  const stateIcon = (text: string) => {
    const isCorrect = text === question.answerText;
    const isSelected = selectedValue === text;

    if (answerPhase === 'revealed-correct' && isCorrect) return '✓';
    if (answerPhase === 'revealed-wrong' && isSelected && !isCorrect) return '✕';
    if (answerPhase === 'revealed-wrong' && isCorrect) return '✓';
    if (answerPhase === 'timed-out' && isCorrect) return '✓';
    return null;
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
              onPointerDown={() => onOptionPress(text)}
              onPointerLeave={() => onOptionCancelPress(text)}
              onPointerCancel={() => onOptionCancelPress(text)}
              onClick={() => onOptionSelect(text)}
              disabled={locked}
            >
              <span className={styles.imageBadge} aria-hidden="true">
                {stateIcon(text)}
              </span>
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
            onPointerDown={() => onOptionPress(text)}
            onPointerLeave={() => onOptionCancelPress(text)}
            onPointerCancel={() => onOptionCancelPress(text)}
            onClick={() => onOptionSelect(text)}
            disabled={locked}
          >
            <span className={styles.optionInner}>
              <span>{text}</span>
              <span className={styles.stateBadge} aria-hidden="true">
                {stateIcon(text)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
