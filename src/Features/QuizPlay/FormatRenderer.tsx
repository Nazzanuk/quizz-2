'use client';

import type { Question, QuizAnswerPhase, QuizFormat } from '@/Lib/Types';
import FillBlank from './Formats/FillBlank';
import Jeopardy from './Formats/Jeopardy';
import MultipleChoice from './Formats/MultipleChoice';
import OddOneOut from './Formats/OddOneOut';

interface FormatRendererProps {
  question: Question;
  allQuestions: Question[];
  format: QuizFormat;
  answerPhase: QuizAnswerPhase;
  pressedValue: string | null;
  selectedValue: string | null;
  locked: boolean;
  hideTextUi?: boolean;
  onOptionPress: (value: string) => void;
  onOptionCancelPress: (value: string) => void;
  onOptionSelect: (value: string) => void;
}

export default function FormatRenderer({
  question,
  allQuestions,
  format,
  answerPhase,
  pressedValue,
  selectedValue,
  locked,
  hideTextUi = false,
  onOptionPress,
  onOptionCancelPress,
  onOptionSelect,
}: FormatRendererProps) {
  switch (format) {
    case 'fill_blank':
      return (
        <FillBlank
          question={question}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={locked}
          hideTextUi={hideTextUi}
          onOptionPress={onOptionPress}
          onOptionCancelPress={onOptionCancelPress}
          onOptionSelect={onOptionSelect}
        />
      );
    case 'odd_one_out':
      return (
        <OddOneOut
          question={question}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={locked}
          hideTextUi={hideTextUi}
          onOptionPress={onOptionPress}
          onOptionCancelPress={onOptionCancelPress}
          onOptionSelect={onOptionSelect}
        />
      );
    case 'jeopardy':
      return (
        <Jeopardy
          question={question}
          allQuestions={allQuestions}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={locked}
          hideTextUi={hideTextUi}
          onOptionPress={onOptionPress}
          onOptionCancelPress={onOptionCancelPress}
          onOptionSelect={onOptionSelect}
        />
      );
    default:
      return (
        <MultipleChoice
          question={question}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={locked}
          hideTextUi={hideTextUi}
          onOptionPress={onOptionPress}
          onOptionCancelPress={onOptionCancelPress}
          onOptionSelect={onOptionSelect}
        />
      );
  }
}
