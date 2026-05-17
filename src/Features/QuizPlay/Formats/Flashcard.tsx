'use client';

import { useEffect, useState } from 'react';
import type { Question } from '@/Lib/Types';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import { playSound, primeAudio } from '@/Features/Shared/Sound';
import { haptic } from '@/Features/Shared/Haptic';
import styles from './Flashcard.module.css';

interface FlashcardProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function Flashcard({ question, onAnswer }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [question.id]);

  const handleReveal = () => {
    primeAudio();
    playSound('tap');
    haptic('tap');
    setRevealed(true);
  };

  const handleGrade = (correct: boolean) => {
    playSound(correct ? 'correct' : 'wrong');
    haptic(correct ? 'correct' : 'wrong');
    onAnswer(correct);
  };

  return (
    <div className={styles.container}>
      <div className={styles.flipScene}>
        <div className={`${styles.flipCard} ${revealed ? styles.flipped : ''}`}>
          <button
            type="button"
            className={`${styles.face} ${styles.front}`}
            onClick={!revealed ? handleReveal : undefined}
            disabled={revealed}
            aria-label="Reveal answer"
          >
            <Card color="sage" className={styles.cardSurface}>
              <div className={styles.cardBody}>
                <h2 className={styles.question}>{question.questionText}</h2>
                <p className={styles.hint}>Tap to reveal</p>
              </div>
            </Card>
          </button>

          <div className={`${styles.face} ${styles.back}`} aria-hidden={!revealed}>
            <Card color="sage" className={`${styles.cardSurface} ${question.imageUrl ? styles.cardWithImage : ''}`}>
              {question.imageUrl && (
                <SafeImage src={question.imageUrl} alt="" className={styles.image} />
              )}
              <div className={styles.cardBody}>
                <p className={styles.label}>Answer</p>
                <p className={styles.answer}>{question.answerText}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className={`${styles.grading} ${revealed ? styles.gradingVisible : ''}`}>
        <p className={styles.prompt}>Did you know it?</p>
        <div className={styles.row}>
          <Button variant="ghost" onClick={() => handleGrade(false)} disabled={!revealed}>
            Nope
          </Button>
          <Button variant="primary" onClick={() => handleGrade(true)} disabled={!revealed}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
