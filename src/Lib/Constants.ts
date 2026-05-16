import type { QuizFormat } from './Types';

export const FORMAT_LABELS: Record<QuizFormat, string> = {
  mcq: 'Multiple choice',
  flashcard: 'Flashcard',
  jeopardy: 'Jeopardy',
};

export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 25;
export const MIN_QUESTION_COUNT = 3;
