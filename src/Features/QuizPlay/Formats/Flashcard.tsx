'use client';

import type { Question } from '@/Lib/Types';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './Flashcard.module.css';

interface FlashcardProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function Flashcard({ question, onAnswer }: FlashcardProps) {
  return (
    <div className={styles.container}>
      <Card color="sage" className={`${styles.card} ${question.imageUrl ? styles.cardWithImage : ''}`}>
        {question.imageUrl && (
          <SafeImage src={question.imageUrl} alt="" className={styles.image} />
        )}
        <div className={styles.cardBody}>
          <h2 className={styles.question}>{question.questionText}</h2>
          <p className={styles.answer}>{question.answerText}</p>
        </div>
      </Card>

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
    </div>
  );
}
