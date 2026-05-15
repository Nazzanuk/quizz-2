'use client';

import { useState } from 'react';
import type { Question } from '@/Lib/Types';
import Button from '@/Features/Shared/Button';
import styles from './FillBlank.module.css';

interface FillBlankProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function FillBlank({ question, onAnswer }: FillBlankProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = input.trim().toLowerCase() ===
    question.answerText.trim().toLowerCase();

  const handleSubmit = () => {
    if (submitted || !input.trim()) return;
    setSubmitted(true);
    setTimeout(() => onAnswer(isCorrect), 1200);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.question}>{question.questionText}</h2>
      <input
        className={`${styles.input} ${submitted ? (isCorrect ? styles.correct : styles.wrong) : ''}`}
        type="text"
        placeholder="Type your answer..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={submitted}
        autoFocus
      />
      {submitted && !isCorrect && (
        <p className={styles.answer}>{question.answerText}</p>
      )}
      {!submitted && (
        <Button
          variant="primary"
          fullWidth
          disabled={!input.trim()}
          onClick={handleSubmit}
        >
          Check
        </Button>
      )}
    </div>
  );
}
