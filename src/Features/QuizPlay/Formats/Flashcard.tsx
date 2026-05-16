'use client';

import { useState } from 'react';
import type { Question } from '@/Lib/Types';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import styles from './Flashcard.module.css';

interface FlashcardProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function Flashcard({ question, onAnswer }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={styles.container}>
      <Card color="sage" className={`${styles.card} ${question.imageUrl ? styles.cardWithImage : ''}`}>
        {question.imageUrl && (
          <img src={question.imageUrl} alt="" className={styles.image} />
        )}
        <div className={styles.cardBody}>
          <h2 className={styles.question}>{question.questionText}</h2>
          {revealed && (
            <p className={styles.answer}>{question.answerText}</p>
          )}
        </div>
      </Card>

      {!revealed ? (
        <Button variant="primary" fullWidth onClick={() => setRevealed(true)}>
          Reveal answer
        </Button>
      ) : (
        <div className={styles.grading}>
          <p className={styles.prompt}>Did you know it?</p>
          <div className={styles.row}>
            <Button variant="ghost" onClick={() => onAnswer(false)}>
              Nope
            </Button>
            <Button variant="primary" onClick={() => onAnswer(true)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
