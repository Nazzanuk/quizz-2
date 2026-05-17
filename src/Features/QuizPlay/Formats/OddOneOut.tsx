'use client';

import { useMemo } from 'react';
import type { Question, QuizAnswerPhase } from '@/Lib/Types';
import { shuffleArraySeeded } from '@/Lib/Utils';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './OddOneOut.module.css';

interface OddOneOutProps {
  question: Question;
  answerPhase: QuizAnswerPhase;
  pressedValue: string | null;
  selectedValue: string | null;
  locked: boolean;
  hideTextUi?: boolean;
  onOptionPress: (value: string) => void;
  onOptionCancelPress: (value: string) => void;
  onOptionSelect: (value: string) => void;
}

export default function OddOneOut({
  question,
  answerPhase,
  pressedValue,
  selectedValue,
  locked,
  hideTextUi = false,
  onOptionPress,
  onOptionCancelPress,
  onOptionSelect,
}: OddOneOutProps) {
  const options = useMemo(
    () => shuffleArraySeeded(question.options ?? [], `odd-one-out-options:${question.id}`),
    [question.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const stateClass = (text: string) => {
    const isCorrect = text === question.answerText;
    const isSelected = selectedValue === text;
    return [
      answerPhase === 'pressed' && pressedValue === text ? styles.pressed : '',
      answerPhase === 'selected' && isSelected ? styles.selected : '',
      answerPhase === 'selected' && selectedValue !== null && !isSelected ? styles.dimmed : '',
      (answerPhase === 'revealed-correct' || answerPhase === 'timed-out') && isCorrect ? styles.correct : '',
      answerPhase === 'revealed-wrong' && isSelected && !isCorrect ? styles.wrong : '',
      answerPhase === 'revealed-wrong' && isCorrect ? styles.correct : '',
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

  return (
    <div className={styles.container}>
      {question.imageUrl && (
        <SafeImage src={question.imageUrl} alt="" className={styles.image} />
      )}

      <Card color="sage" className={styles.promptCard}>
        {!hideTextUi && <p className={styles.kicker}>Odd one out</p>}
        <h2 className={styles.question}>{question.questionText}</h2>
      </Card>

      <div className={styles.grid}>
        {options.map((text) => (
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
