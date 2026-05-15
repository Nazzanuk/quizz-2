'use client';

import { useState } from 'react';
import type { Question, QuizFormat } from '@/Lib/Types';
import MultipleChoice from './Formats/MultipleChoice';
import TrueFalse from './Formats/TrueFalse';
import FillBlank from './Formats/FillBlank';
import Flashcard from './Formats/Flashcard';
import Jeopardy from './Formats/Jeopardy';
import styles from './FormatRenderer.module.css';

interface FormatRendererProps {
  question: Question;
  format: QuizFormat;
  onAnswer: (correct: boolean) => void;
}

export default function FormatRenderer({ question, format, onAnswer }: FormatRendererProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const inner = (() => {
    switch (format) {
      case 'truefalse':
        return <TrueFalse question={question} onAnswer={onAnswer} />;
      case 'fillblank':
        return <FillBlank question={question} onAnswer={onAnswer} />;
      case 'flashcard':
        return <Flashcard question={question} onAnswer={onAnswer} />;
      case 'jeopardy':
        return <Jeopardy question={question} onAnswer={onAnswer} />;
      default:
        return <MultipleChoice question={question} onAnswer={onAnswer} />;
    }
  })();

  return (
    <div className={styles.wrapper}>
      {question.imageUrl && (
        <img
          src={question.imageUrl}
          alt=""
          className={`${styles.questionImg} ${imgLoaded ? styles.imgLoaded : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      )}
      {inner}
    </div>
  );
}
