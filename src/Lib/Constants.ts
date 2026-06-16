import type { HostMode, QuizFormat, QuizMilestone } from './Types';

export const FORMAT_LABELS: Record<QuizFormat, string> = {
  mcq: 'Multiple choice',
  fill_blank: 'Fill in the blank',
  odd_one_out: 'Odd one out',
  jeopardy: 'Jeopardy',
  true_false: 'True or false',
};

export const PLAY_TIMER_SECONDS: Record<QuizFormat, number> = {
  mcq: 15,
  fill_blank: 12,
  odd_one_out: 15,
  jeopardy: 20,
  true_false: 10,
};

export const PLAY_TIMINGS = {
  answerRevealDelayMs: 140,
  answerRevealHoldMs: 520,
  timeoutRevealHoldMs: 700,
  // Hold longer when the player got it wrong (or timed out) so they actually
  // have time to read which answer was correct before auto-advancing.
  wrongRevealHoldMs: 1700,
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

// --- Abuse / cost limits ---------------------------------------------------
// Hard ceiling on AI images generated per quiz-generation request (cover +
// per-question + per-option image sets). Without it, one credit could fan out
// to 250+ Replicate calls on a large, image-heavy quiz. The common 20-question
// quiz (cover + one image per question) stays comfortably under this.
export const MAX_IMAGES_PER_GENERATION = 24;

// Max characters accepted for fields forwarded to paid LLM / TTS APIs.
export const MAX_MATERIAL_LENGTH = 20_000;
export const MAX_TOPIC_LENGTH = 300;
export const MAX_HOST_TEXT_LENGTH = 2_000;

// Bounds for user-authored quiz/question text (DB + render safety).
export const MAX_QUIZ_TITLE_LENGTH = 200;
export const MAX_QUIZ_DESCRIPTION_LENGTH = 2_000;
export const MAX_QUESTION_TEXT_LENGTH = 2_000;
export const MAX_ANSWER_TEXT_LENGTH = 1_000;
export const MAX_OPTION_LENGTH = 500;
export const MAX_OPTIONS_COUNT = 8;

// Recap host-line context arrays (strengths/weaknesses) — cap so a crafted
// request can't push a huge prompt into the model.
export const MAX_HOST_LIST_ITEMS = 12;
export const MAX_HOST_LIST_ITEM_LENGTH = 200;

// Upstream API timeouts (ms): fail a hung provider call instead of letting a
// request hang or a background image task run forever.
export const AI_TEXT_TIMEOUT_MS = 30_000;
export const AI_IMAGE_TIMEOUT_MS = 60_000;
export const TTS_TIMEOUT_MS = 20_000;

// --- Legal / contact -------------------------------------------------------
// Shown on the privacy & terms pages. Point SUPPORT_EMAIL at a real, monitored
// inbox before launch (it is the data-controller contact for privacy requests).
export const SUPPORT_EMAIL = 'nazzanuk@gmail.com';
// Effective date shown on the legal pages; bump when the policies change.
export const LEGAL_EFFECTIVE_DATE = 'June 15, 2026';
