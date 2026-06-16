'use client';

import type { Question, QuizAnswerPhase } from '@/Lib/Types';
import SafeImage from '@/Features/Shared/SafeImage';
import { getTrueFalseClaim } from './trueFalseClaim';
import mcq from './MultipleChoice.module.css';
import styles from './TrueFalse.module.css';

interface TrueFalseProps {
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

const OPTIONS = ['True', 'False'] as const;

export default function TrueFalse({
  question,
  answerPhase,
  pressedValue,
  selectedValue,
  locked,
  hideTextUi = false,
  onOptionPress,
  onOptionCancelPress,
  onOptionSelect,
}: TrueFalseProps) {
  // The claim must always be visible — you can't answer true/false without it.
  void hideTextUi;
  const { claim, isTrue } = getTrueFalseClaim(question);
  const correctOption = isTrue ? 'True' : 'False';

  const stateClass = (opt: string) => {
    const isCorrect = opt === correctOption;
    const isSelected = selectedValue === opt;
    const isRevealPhase =
      answerPhase === 'revealed-correct'
      || answerPhase === 'revealed-wrong'
      || answerPhase === 'timed-out';

    return [
      answerPhase === 'pressed' && pressedValue === opt ? mcq.pressed : '',
      answerPhase === 'selected' && isSelected ? mcq.selected : '',
      answerPhase === 'selected' && selectedValue !== null && !isSelected ? mcq.dimmed : '',
      isRevealPhase && isCorrect ? mcq.correct : '',
      answerPhase === 'revealed-wrong' && isSelected && !isCorrect ? mcq.wrong : '',
      answerPhase === 'timed-out' && !isCorrect ? mcq.dimmed : '',
    ].join(' ');
  };

  const stateIcon = (opt: string) => {
    const isCorrect = opt === correctOption;
    const isSelected = selectedValue === opt;
    if (answerPhase === 'revealed-correct' && isCorrect) return '✓';
    if (answerPhase === 'revealed-wrong' && isSelected && !isCorrect) return '✕';
    if (answerPhase === 'revealed-wrong' && isCorrect) return '✓';
    if (answerPhase === 'timed-out' && isCorrect) return '✓';
    return null;
  };

  return (
    <div className={mcq.container}>
      {question.imageUrl && (
        <SafeImage src={question.imageUrl} alt="" className={mcq.image} />
      )}
      <h2 className={mcq.question}>{question.questionText}</h2>
      <div className={styles.claimCard}>
        <p className={styles.claimLabel}>Is this the correct answer?</p>
        <p className={styles.claim}>{claim}</p>
      </div>
      <div className={styles.options}>
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`${mcq.option} ${styles.tfOption} ${stateClass(opt)}`}
            onPointerDown={() => onOptionPress(opt)}
            onPointerLeave={() => onOptionCancelPress(opt)}
            onPointerCancel={() => onOptionCancelPress(opt)}
            onClick={() => onOptionSelect(opt)}
            disabled={locked}
          >
            <span className={mcq.optionInner}>
              <span>{opt}</span>
              <span className={mcq.stateBadge} aria-hidden="true">
                {stateIcon(opt)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
