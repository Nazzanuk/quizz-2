import { atom } from 'jotai';
import type { LastRunSnapshot, Question, QuizFormat } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';

export const currentIndexAtom = atom(0);
export const userAnswersAtom = atom<Map<string, string>>(new Map());
export const playActiveAtom = atom(false);
export const showResultAtom = atom(false);
export const lastRunAtom = atom<LastRunSnapshot | null>(null);

// Per-question randomised state — set by initPlayAtom on session start / retry
export const questionOrderAtom = atom<string[]>([]);
export const questionFormatsAtom = atom<Map<string, QuizFormat>>(new Map());

export const scoreAtom = atom((get) => {
  const answers = get(userAnswersAtom);
  let correct = 0;
  answers.forEach((value) => {
    if (value === '__correct__') correct++;
  });
  return { correct, total: answers.size };
});

// mcq-format questions are presented at play time as one of these, at random,
// for variety. jeopardy and true_false reuse the same question data.
const RANDOMISED_MCQ_FORMATS: QuizFormat[] = ['mcq', 'jeopardy', 'true_false'];
// Jeopardy builds its 3 wrong options from OTHER mcq questions' stems, so it
// needs at least 4 mcq questions in the pool to form a plausible option set.
const RANDOMISED_MCQ_FORMATS_NO_JEOPARDY: QuizFormat[] = ['mcq', 'true_false'];
const MIN_MCQ_FOR_JEOPARDY = 4;

export function isPlayableQuestion(question: Question): boolean {
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  return question.format === 'mcq'
    || question.format === 'fill_blank'
    || question.format === 'odd_one_out';
}

function getPlayFormat(question: Question, mcqFormats: QuizFormat[]): QuizFormat {
  if (question.format === 'fill_blank' || question.format === 'odd_one_out') {
    return question.format;
  }

  return mcqFormats[Math.floor(Math.random() * mcqFormats.length)];
}

export const initPlayAtom = atom(
  null,
  (_get, set, payload: { questions: Question[]; limit?: number | null }) => {
  const shuffled = shuffleArray(payload.questions.filter(isPlayableQuestion));
  // Pick `limit` at random (already shuffled) when set; otherwise ask them all.
  const limited = payload.limit != null && payload.limit > 0
    ? shuffled.slice(0, payload.limit)
    : shuffled;
  const order = limited.map((q) => q.id);
  // Jeopardy distractors come from the whole playable pool's mcq stems, so gate
  // it on that count — not the per-run subset.
  const mcqPoolCount = payload.questions.filter(
    (q) => isPlayableQuestion(q) && q.format === 'mcq',
  ).length;
  const mcqFormats = mcqPoolCount >= MIN_MCQ_FOR_JEOPARDY
    ? RANDOMISED_MCQ_FORMATS
    : RANDOMISED_MCQ_FORMATS_NO_JEOPARDY;
  const formats = new Map<string, QuizFormat>();
  limited.forEach((q) => {
    formats.set(q.id, getPlayFormat(q, mcqFormats));
  });
  set(questionOrderAtom, order);
  set(questionFormatsAtom, formats);
  set(currentIndexAtom, 0);
  set(userAnswersAtom, new Map());
  set(showResultAtom, false);
});

export const resetPlayAtom = atom(null, (_get, set) => {
  set(currentIndexAtom, 0);
  set(userAnswersAtom, new Map());
  set(playActiveAtom, false);
  set(showResultAtom, false);
  set(questionOrderAtom, []);
  set(questionFormatsAtom, new Map());
});
