'use client';

import { useMemo } from 'react';
import type { Question, QuizAnswerPhase } from '@/Lib/Types';
import { shuffleArraySeeded } from '@/Lib/Utils';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './Jeopardy.module.css';

interface JeopardyProps {
  question: Question;
  allQuestions: Question[];
  answerPhase: QuizAnswerPhase;
  pressedValue: string | null;
  selectedValue: string | null;
  locked: boolean;
  hideTextUi?: boolean;
  onOptionPress: (value: string) => void;
  onOptionCancelPress: (value: string) => void;
  onOptionSelect: (value: string) => void;
}

export default function Jeopardy({
  question,
  allQuestions,
  answerPhase,
  pressedValue,
  selectedValue,
  locked,
  hideTextUi = false,
  onOptionPress,
  onOptionCancelPress,
  onOptionSelect,
}: JeopardyProps) {
  const options = useMemo(() => {
    const distractors = shuffleArraySeeded(
      allQuestions.filter((q) => q.id !== question.id).map((q) => q.questionText),
      `jeopardy-distractors:${question.id}`,
    ).slice(0, 3);
    return shuffleArraySeeded(
      [question.questionText, ...distractors],
      `jeopardy-options:${question.id}`,
    );
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stateClass = (opt: string) => {
    const isCorrect = opt === question.questionText;
    const isSelected = selectedValue === opt;
    return [
      answerPhase === 'pressed' && pressedValue === opt ? styles.pressed : '',
      answerPhase === 'selected' && isSelected ? styles.selected : '',
      answerPhase === 'selected' && selectedValue !== null && !isSelected ? styles.dimmed : '',
      (answerPhase === 'revealed-correct' || answerPhase === 'timed-out') && isCorrect ? styles.correct : '',
      answerPhase === 'revealed-wrong' && isSelected && !isCorrect ? styles.wrong : '',
      answerPhase === 'revealed-wrong' && isCorrect ? styles.correct : '',
      answerPhase === 'timed-out' && !isCorrect ? styles.dimmed : '',
    ].join(' ');
  };

  const stateIcon = (opt: string) => {
    const isCorrect = opt === question.questionText;
    const isSelected = selectedValue === opt;

    if (answerPhase === 'revealed-correct' && isCorrect) return '✓';
    if (answerPhase === 'revealed-wrong' && isSelected && !isCorrect) return '✕';
    if (answerPhase === 'revealed-wrong' && isCorrect) return '✓';
    if (answerPhase === 'timed-out' && isCorrect) return '✓';
    return null;
  };

  return (
    <div className={styles.container}>
      <Card color="lavender" className={`${styles.answerCard} ${question.imageUrl ? styles.answerCardWithImage : ''}`}>
        {question.imageUrl && (
          <SafeImage src={question.imageUrl} alt="" className={styles.image} />
        )}
        <div className={styles.answerBody}>
          {!hideTextUi && <p className={styles.label}>The answer is:</p>}
          <h2 className={styles.answerText}>{question.answerText}</h2>
        </div>
      </Card>

      {!hideTextUi && <p className={styles.prompt}>What is the question?</p>}

      <div className={styles.options}>
        {options.map((opt) => {
          return (
            <button
              key={opt}
              className={`${styles.option} ${stateClass(opt)}`}
              onPointerDown={() => onOptionPress(opt)}
              onPointerLeave={() => onOptionCancelPress(opt)}
              onPointerCancel={() => onOptionCancelPress(opt)}
              onClick={() => onOptionSelect(opt)}
              disabled={locked}
            >
              <span className={styles.optionInner}>
                <span>{opt}</span>
                <span className={styles.stateBadge} aria-hidden="true">
                  {stateIcon(opt)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
