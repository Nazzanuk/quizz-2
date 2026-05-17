import type { QuizFormat } from './Types';

export const FORMAT_LABELS: Record<QuizFormat, string> = {
  mcq: 'Multiple choice',
  fill_blank: 'Fill in the blank',
  odd_one_out: 'Odd one out',
  jeopardy: 'Jeopardy',
};

export const PLAY_TIMER_SECONDS: Record<QuizFormat, number> = {
  mcq: 15,
  fill_blank: 12,
  odd_one_out: 15,
  jeopardy: 20,
};

export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 25;
export const MIN_QUESTION_COUNT = 3;
