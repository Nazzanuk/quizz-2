export const QUIZ_FORMATS = [
  'mcq',
  'fill_blank',
  'odd_one_out',
  'jeopardy',
  'true_false',
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

export const QUIZ_VISIBILITIES = [
  'private',
  'unlisted',
  'public',
] as const;

export type QuizVisibility = (typeof QUIZ_VISIBILITIES)[number];

export function isQuizVisibility(value: string): value is QuizVisibility {
  return (QUIZ_VISIBILITIES as readonly string[]).includes(value);
}

// Unlisted is the default for anything missing/unknown: playable by link,
// hidden from feeds. Matches how legacy ownerless quizzes are treated.
export function normalizeQuizVisibility(
  value: string | null | undefined,
): QuizVisibility {
  if (value && isQuizVisibility(value)) return value;
  return 'unlisted';
}

// Moderation state. 'blocked' quizzes are hidden from Discover and unplayable by
// anyone but the owner/admin (used for reported/taken-down content).
export const QUIZ_STATUSES = ['active', 'blocked'] as const;

export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export function isQuizStatus(value: string): value is QuizStatus {
  return (QUIZ_STATUSES as readonly string[]).includes(value);
}

export function normalizeQuizStatus(value: string | null | undefined): QuizStatus {
  if (value && isQuizStatus(value)) return value;
  return 'active';
}

export interface Quiz {
  id: string;
  ownerId: string | null;
  visibility: QuizVisibility;
  // Moderation status; 'active' unless taken down.
  status: QuizStatus;
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

// A quiz in the Discover feed, carrying its total play count for ranking/display.
export interface TopQuiz extends Quiz {
  plays: number;
}

// First-party analytics event types (see src/Lib/Analytics.ts).
export const ANALYTICS_EVENT_TYPES = [
  'sign_in',
  'quiz_created',
  'run_completed',
  'quiz_viewed',
  'quiz_shared',
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value);
}

export interface AnalyticsSummary {
  totals: Record<string, number>;
  daily: { date: string; total: number }[];
  topViewed: { quizId: string; title: string; count: number }[];
  topPlayed: { quizId: string; title: string; count: number }[];
}

// A reported quiz row for the admin moderation view.
export interface ReportedQuiz {
  quizId: string;
  title: string;
  status: QuizStatus;
  visibility: QuizVisibility;
  reportCount: number;
  lastReportedAt: string;
  reasons: string[];
}

// --- Admin dashboard rows (client-safe; do not import from Db/Queries) ------

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  credits: number;
  createdAt: string;
  quizCount: number;
  runCount: number;
}

export interface AdminQuizRow {
  id: string;
  title: string;
  topic: string | null;
  visibility: QuizVisibility;
  status: QuizStatus;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  questionCount: number;
  runCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

// A cluster of duplicate quizzes (same owner + topic, created in a burst).
export interface DedupeBurst {
  topic: string;
  ownerId: string | null;
  keep: { id: string; title: string; createdAt: string; questionCount: number };
  remove: { id: string; title: string; createdAt: string; questionCount: number }[];
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
  // The format the question was actually presented as (mcq questions are shown
  // as jeopardy/true_false at random). Null for runs recorded before this was
  // tracked. Drives correct rendering of the results breakdown.
  playFormat: QuizFormat | null;
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
  quiz?: Pick<Quiz, 'title' | 'topic'>;
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

export interface AccountResponse {
  id: string;
  name: string;
  email: string;
  image: string | null;
  credits: number;
  // Chosen public handle, shown on leaderboards. null until the user sets one.
  username: string | null;
  // True when the signed-in email is an admin (gates the Settings admin entry).
  isAdmin: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  // Display name: the chosen username, falling back to the account name.
  name: string;
  bestPct: number;
  plays: number;
  bestStreak: number;
}

export interface QuizLeaderboard {
  // Average score across all runs, including anonymous plays. null if unplayed.
  averagePct: number | null;
  totalPlays: number;
  entries: LeaderboardEntry[];
  // Rank (1-based) of the requesting user, when signed in and on the board.
  yourRank: number | null;
}

// Username constraints, shared by the client form and the server validator.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

// Substrings blocked in public names (guest names are unauthenticated, so this
// is a light first line of defence — not a complete moderation system).
const BANNED_NAME_SUBSTRINGS = [
  'admin', 'fuck', 'shit', 'cunt', 'nigger', 'faggot', 'rape', 'bitch', 'slut',
];

export function containsBannedWord(value: string): boolean {
  const lower = value.toLowerCase();
  return BANNED_NAME_SUBSTRINGS.some((word) => lower.includes(word));
}

export function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  if (trimmed.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters`;
  if (!USERNAME_PATTERN.test(trimmed)) return 'Letters, numbers, and underscores only';
  if (containsBannedWord(trimmed)) return 'Please choose a different name';
  return null;
}

export interface GenerateQuizRequest {
  topic?: string;
  material?: string;
  count?: number;
  // Stable per-attempt key so a retried generation returns the existing quiz
  // instead of creating a duplicate.
  idempotencyKey?: string;
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
  playFormat: QuizFormat | null;
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
  // Set by signed-out players so the run can be attributed to a stable guest
  // identity on the leaderboard. Ignored when a session is present.
  anonId?: string;
  playerName?: string | null;
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
  // When on, the host reads each question aloud instead of arbitrary banter.
  readQuestionsAloud: boolean;
  // Accessibility: scale the whole UI up for more readable text. Off by default.
  largeText: boolean;
  // Accessibility: disable ambient background drift and other non-essential
  // motion for players who find it distracting. Off by default.
  reduceMotion: boolean;
  selectedHost: HostPersona;
  categories: Record<string, PlayerCategoryProfile>;
  quizzes: Record<string, PlayerQuizProfile>;
  recentRecaps: string[];
  // Stable per-device id used to attribute anonymous runs to a single "guest"
  // on the leaderboard. Empty until the first anonymous run is saved.
  anonId: string;
  // Local public name chosen by a guest. Becomes their account username when
  // they sign in (if still available). null until they pick one. Cleared (along
  // with anonId) once migrated into a signed-in account.
  username: string | null;
  // Bumped when a preference default changes so existing profiles can be
  // migrated once (see migrateProfile). Absent on profiles saved before
  // versioning was introduced — treated as 0.
  prefsVersion?: number;
}
