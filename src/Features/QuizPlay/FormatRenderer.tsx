'use client';

import type { Question, QuizFormat } from '@/Lib/Types';
import FillBlank from './Formats/FillBlank';
import Jeopardy from './Formats/Jeopardy';
import MultipleChoice from './Formats/MultipleChoice';
import OddOneOut from './Formats/OddOneOut';

interface FormatRendererProps {
  question: Question;
  allQuestions: Question[];
  format: QuizFormat;
  timedOut?: boolean;
  onAnswerStart?: () => boolean;
  onAnswer: (correct: boolean) => void;
}

export default function FormatRenderer({
  question,
  allQuestions,
  format,
  timedOut = false,
  onAnswerStart,
  onAnswer,
}: FormatRendererProps) {
  switch (format) {
    case 'fill_blank':
      return (
        <FillBlank
          question={question}
          timedOut={timedOut}
          onAnswerStart={onAnswerStart}
          onAnswer={onAnswer}
        />
      );
    case 'odd_one_out':
      return (
        <OddOneOut
          question={question}
          timedOut={timedOut}
          onAnswerStart={onAnswerStart}
          onAnswer={onAnswer}
        />
      );
    case 'jeopardy':
      return (
        <Jeopardy
          question={question}
          allQuestions={allQuestions}
          timedOut={timedOut}
          onAnswerStart={onAnswerStart}
          onAnswer={onAnswer}
        />
      );
    default:
      return (
        <MultipleChoice
          question={question}
          timedOut={timedOut}
          onAnswerStart={onAnswerStart}
          onAnswer={onAnswer}
        />
      );
  }
}
