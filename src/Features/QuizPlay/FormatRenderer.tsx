'use client';

import type { Question, QuizFormat } from '@/Lib/Types';
import MultipleChoice from './Formats/MultipleChoice';
import Flashcard from './Formats/Flashcard';
import Jeopardy from './Formats/Jeopardy';

interface FormatRendererProps {
  question: Question;
  format: QuizFormat;
  onAnswer: (correct: boolean) => void;
}

export default function FormatRenderer({ question, format, onAnswer }: FormatRendererProps) {
  switch (format) {
    case 'flashcard':
      return <Flashcard question={question} onAnswer={onAnswer} />;
    case 'jeopardy':
      return <Jeopardy question={question} onAnswer={onAnswer} />;
    default:
      return <MultipleChoice question={question} onAnswer={onAnswer} />;
  }
}
