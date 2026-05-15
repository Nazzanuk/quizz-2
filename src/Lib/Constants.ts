import type { QuizFormat } from './Types';

export const FORMAT_LABELS: Record<QuizFormat, string> = {
  mcq: 'Multiple choice',
  truefalse: 'True or false',
  fillblank: 'Fill in the blank',
  flashcard: 'Flashcard',
  jeopardy: 'Jeopardy',
};

export const FORMAT_DESCRIPTIONS: Record<QuizFormat, string> = {
  mcq: 'Pick the correct answer from four options',
  truefalse: 'Decide if the statement is true or false',
  fillblank: 'Type the missing word or phrase',
  flashcard: 'Reveal the answer and self-grade',
  jeopardy: 'Match the answer to the right question',
};

export const ALL_FORMATS: QuizFormat[] = [
  'mcq',
  'truefalse',
  'fillblank',
  'flashcard',
  'jeopardy',
];

export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 25;
export const MIN_QUESTION_COUNT = 3;
