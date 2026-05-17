'use client';

import { Fragment, useMemo, useState } from 'react';
import type { Question } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import { haptic } from '@/Features/Shared/Haptic';
import { playSound, primeAudio } from '@/Features/Shared/Sound';
import styles from './FillBlank.module.css';

interface FillBlankProps {
  question: Question;
  timedOut?: boolean;
  onAnswerStart?: () => boolean;
  onAnswer: (correct: boolean) => void;
}

export default function FillBlank({
  question,
  timedOut = false,
  onAnswerStart,
  onAnswer,
}: FillBlankProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(
    () => shuffleArray(question.options ?? []),
    [question.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
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

  return (
    <div className={styles.container}>
      {question.imageUrl && (
        <SafeImage src={question.imageUrl} alt="" className={styles.image} />
      )}

      <Card color="lavender" className={styles.promptCard}>
        <p className={styles.kicker}>Fill in the blank</p>
        <h2 className={styles.question}>
          {renderPrompt(question.questionText)}
        </h2>
      </Card>

      <div className={styles.options}>
        {options.map((text) => (
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

function renderPrompt(questionText: string) {
  const parts = questionText.split('___');

  if (parts.length === 1) {
    return (
      <>
        {questionText}{' '}
        <span className={styles.blank}>______</span>
      </>
    );
  }

  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 && <span className={styles.blank}>______</span>}
    </Fragment>
  ));
}
