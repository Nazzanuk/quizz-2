'use client';

import type { Question } from '@/Lib/Types';
import MultipleChoice from './Formats/MultipleChoice';
import TrueFalse from './Formats/TrueFalse';
import FillBlank from './Formats/FillBlank';
import Flashcard from './Formats/Flashcard';
import Jeopardy from './Formats/Jeopardy';

interface FormatRendererProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function FormatRenderer({
  question,
  onAnswer,
}: FormatRendererProps) {
  switch (question.format) {
    case 'mcq':
      return <MultipleChoice question={question} onAnswer={onAnswer} />;
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
}
