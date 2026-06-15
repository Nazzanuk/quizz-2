import type { HostMode, QuizFormat, QuizMilestone } from './Types';

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

export const PLAY_TIMINGS = {
  answerRevealDelayMs: 140,
  answerRevealHoldMs: 520,
  timeoutRevealHoldMs: 700,
  milestonePulseMs: 1300,
  resultsSummaryDelayMs: 150,
  resultsDetailsDelayMs: 320,
  resultsActionsDelayMs: 520,
} as const;

export const HOST_MODE_CONFIG: Record<HostMode, {
  answerBeatMs: number;
  showFactDrops: boolean;
  enableQuestionOpeners: boolean;
  enableVoicePrefetch: boolean;
}> = {
  default: {
    answerBeatMs: 1800,
    showFactDrops: true,
    enableQuestionOpeners: true,
    enableVoicePrefetch: true,
  },
  quick: {
    answerBeatMs: 950,
    showFactDrops: false,
    enableQuestionOpeners: true,
    enableVoicePrefetch: false,
  },
};

export const STREAK_MILESTONES: Record<number, QuizMilestone> = {
  3: 'streak3',
  5: 'streak5',
  10: 'streak10',
};

export const DEFAULT_QUESTION_COUNT = 20;
export const MAX_QUESTION_COUNT = 50;
export const MIN_QUESTION_COUNT = 3;

// How many questions a single play run asks (picked at random) when a quiz
// has no explicit per-run preference set.
export const DEFAULT_QUESTIONS_PER_RUN = 20;
// Preset choices offered when generating a quiz or picking questions per run.
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50];

// Credits gate the money-spending Creator actions (AI generation). New users
// get this bundle on first sign-in, and it refreshes back up to this amount
// once per calendar month. One quiz generation (or "generate more" batch)
// costs 1 credit.
export const STARTER_CREDITS = 5;
