export const QUIZ_FORMATS = [
  'mcq',
  'fill_blank',
  'odd_one_out',
  'jeopardy',
] as const;

export type QuizFormat = (typeof QUIZ_FORMATS)[number];

export const QUESTION_DIFFICULTIES = [
  'easy',
  'medium',
  'hard',
] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

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

export const HOST_MODES = [
  'default',
  'quick',
] as const;

export type HostMode = (typeof HOST_MODES)[number];

export const HOST_PERSONAS = [
  'sarcastic_pub_host',
] as const;

export type HostPersona = (typeof HOST_PERSONAS)[number];

export const HOST_CONFIDENCE_LEVELS = [
  'safe',
  'confident',
  'arrogant',
] as const;

export type HostConfidenceLevel = (typeof HOST_CONFIDENCE_LEVELS)[number];

export function isQuizFormat(value: string): value is QuizFormat {
  return (QUIZ_FORMATS as readonly string[]).includes(value);
}

export function normalizeQuizFormat(value: string | null | undefined): QuizFormat {
  if (value && isQuizFormat(value)) return value;
  return 'mcq';
}

export function isQuestionDifficulty(value: string): value is QuestionDifficulty {
  return (QUESTION_DIFFICULTIES as readonly string[]).includes(value);
}

export function normalizeQuestionDifficulty(
  value: string | null | undefined,
): QuestionDifficulty | null {
  if (value && isQuestionDifficulty(value)) return value;
  return null;
}

export function isHostMode(value: string): value is HostMode {
  return (HOST_MODES as readonly string[]).includes(value);
}

export function normalizeHostMode(value: string | null | undefined): HostMode {
  if (value && isHostMode(value)) return value;
  return 'default';
}

export function isHostPersona(value: string): value is HostPersona {
  return (HOST_PERSONAS as readonly string[]).includes(value);
}

export function normalizeHostPersona(value: string | null | undefined): HostPersona {
  if (value && isHostPersona(value)) return value;
  return 'sarcastic_pub_host';
}

export function isHostConfidenceLevel(value: string): value is HostConfidenceLevel {
  return (HOST_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export function normalizeHostConfidenceLevel(
  value: string | null | undefined,
): HostConfidenceLevel | null {
  if (value && isHostConfidenceLevel(value)) return value;
  return null;
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
  // How many questions to ask per run, chosen at random. null = ask all.
  questionsPerRun: number | null;
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
  imagePrompt: string | null;
  format: QuizFormat;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  explanation: string | null;
  factText: string | null;
  tags: string[] | null;
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

export interface QuizRun {
  id: string;
  quizId: string;
  mode: HostMode;
  hostPersona: HostPersona;
  correct: number;
  total: number;
  bestStreak: number;
  elapsedMs: number;
  recap: string | null;
  createdAt: string;
}

export interface QuestionAttempt {
  id: string;
  runId: string;
  quizId: string;
  questionId: string;
  orderIndex: number;
  selectedAnswer: string | null;
  confidence: HostConfidenceLevel | null;
  correct: boolean;
  timedOut: boolean;
  responseMs: number;
  streakBefore: number;
  streakAfter: number;
  wasFinalQuestion: boolean;
  hostMode: HostMode;
  createdAt: string;
}

export interface QuizRunWithTitle extends QuizRun {
  quizTitle: string;
  quizTopic: string | null;
}

export interface QuizRunDetail {
  run: QuizRun;
  attempts: QuestionAttempt[];
  questions: Question[];
}

export interface LastRunSnapshot {
  runId: string;
  quizId: string;
  mode: HostMode;
  hostPersona: HostPersona;
  correct: number;
  total: number;
  bestStreak: number;
  wrongQuestionIds: string[];
  recap: string | null;
  previousBest: number | null;
  elapsedMs: number;
  createdAt: string;
  attempts: QuestionAttempt[];
  questions: Question[];
}

export interface StatsTotals {
  runs: number;
  questions: number;
  correct: number;
  bestPct: number | null;
  averagePct: number | null;
  bestStreak: number;
  fastestMs: number | null;
}

export interface StatsResponse {
  runs: QuizRunWithTitle[];
  totals: StatsTotals;
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

export interface QuestionAggregateStats {
  attempts: number;
  correctPct: number | null;
  averageResponseMs: number | null;
  fastestResponseMs: number | null;
}

export interface QuizAggregateStats {
  plays: number;
  bestPct: number | null;
  averagePct: number | null;
}

export interface HostSessionResponse {
  intro: string;
  questionStats: Record<string, QuestionAggregateStats>;
  quizStats: QuizAggregateStats;
  questions: Array<
    Pick<Question, 'id' | 'category' | 'difficulty' | 'explanation' | 'factText' | 'tags'>
  >;
}

export interface SaveResultAttemptInput {
  questionId: string;
  orderIndex: number;
  selectedAnswer: string | null;
  confidence: HostConfidenceLevel | null;
  correct: boolean;
  timedOut: boolean;
  responseMs: number;
  streakBefore: number;
  streakAfter: number;
  wasFinalQuestion: boolean;
}

export interface SaveResultRequest {
  runId: string;
  mode: HostMode;
  hostPersona: HostPersona;
  correct: number;
  total: number;
  bestStreak: number;
  elapsedMs: number;
  recap: string | null;
  perQuestion: Record<string, string>;
  attempts: SaveResultAttemptInput[];
}

export interface HostRecapRequest {
  mode: HostMode;
  hostPersona: HostPersona;
  summary: {
    correct: number;
    total: number;
    bestStreak: number;
    wrongCount: number;
    fastestAnswerMs: number | null;
    averageAnswerMs: number | null;
    previousBest: number | null;
    isNewBest: boolean;
    quizBest: number | null;
    quizPlays: number;
  };
  profile: PlayerProfile;
  quiz: Pick<Quiz, 'id' | 'title' | 'topic'>;
  strengths: string[];
  weaknesses: string[];
}

export interface HostRecapResponse {
  recap: string;
}

export interface PlayerCategoryProfile {
  seen: number;
  correct: number;
  fastestMs: number | null;
  lastSeenAt: string | null;
}

export interface PlayerQuizProfile {
  plays: number;
  bestPct: number | null;
  lastPct: number | null;
  bestStreak: number;
  fastestMs: number | null;
  lastPlayedAt: string | null;
  categories: Record<string, PlayerCategoryProfile>;
}

export interface PlayerProfile {
  totalRuns: number;
  totalQuestions: number;
  totalCorrect: number;
  bestPct: number | null;
  bestStreak: number;
  fastestMs: number | null;
  lastPlayedAt: string | null;
  preferredMode: HostMode;
  hostVoiceEnabled: boolean;
  hideTextUi: boolean;
  selectedHost: HostPersona;
  categories: Record<string, PlayerCategoryProfile>;
  quizzes: Record<string, PlayerQuizProfile>;
  recentRecaps: string[];
}
