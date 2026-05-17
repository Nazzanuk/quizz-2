export const QUIZ_FORMATS = [
  'mcq',
  'fill_blank',
  'odd_one_out',
  'jeopardy',
] as const;

export type QuizFormat = (typeof QUIZ_FORMATS)[number];

export const QUIZ_ANSWER_PHASES = [
  'idle',
  'pressed',
  'selected',
  'revealed-correct',
  'revealed-wrong',
  'timed-out',
] as const;

export type QuizAnswerPhase = (typeof QUIZ_ANSWER_PHASES)[number];

export const QUIZ_MILESTONES = [
  'none',
  'streak3',
  'streak5',
  'streak10',
  'perfect',
  'newBest',
] as const;

export type QuizMilestone = (typeof QUIZ_MILESTONES)[number];

export function isQuizFormat(value: string): value is QuizFormat {
  return (QUIZ_FORMATS as readonly string[]).includes(value);
}

export function normalizeQuizFormat(value: string | null | undefined): QuizFormat {
  if (value && isQuizFormat(value)) return value;
  return 'mcq';
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  sourceMaterial: string | null;
  coverImageUrl: string | null;
  format: QuizFormat;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  answerText: string;
  options: string[] | null;
  optionImages: (string | null)[] | null;
  imageUrl: string | null;
  format: QuizFormat;
  order: number;
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[];
}

export interface QuizResult {
  id: string;
  quizId: string;
  correct: number;
  total: number;
  perQuestion: Record<string, string>;
  createdAt: string;
}

export interface ResultsSummary {
  count: number;
  best: number | null;
  last: number | null;
}

export interface GenerateQuizRequest {
  topic?: string;
  material?: string;
  count?: number;
}

export interface GenerateImageRequest {
  quizId: string;
  topic: string;
}
