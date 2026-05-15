export type QuizFormat =
  | 'mcq'
  | 'truefalse'
  | 'fillblank'
  | 'flashcard'
  | 'jeopardy';

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
  format: QuizFormat;
  order: number;
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[];
}

export interface GenerateQuizRequest {
  topic?: string;
  material?: string;
  format: QuizFormat;
  count?: number;
}

export interface GenerateImageRequest {
  quizId: string;
  topic: string;
}
