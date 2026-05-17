import { atom } from 'jotai';
import type { Question, QuizFormat } from '@/Lib/Types';
import { shuffleArray } from '@/Lib/Utils';

export const currentIndexAtom = atom(0);
export const userAnswersAtom = atom<Map<string, string>>(new Map());
export const playActiveAtom = atom(false);
export const showResultAtom = atom(false);

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

const RANDOMISED_MCQ_FORMATS: QuizFormat[] = ['mcq', 'jeopardy'];

export function isPlayableQuestion(question: Question): boolean {
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  return question.format === 'mcq'
    || question.format === 'fill_blank'
    || question.format === 'odd_one_out';
}

function getPlayFormat(question: Question): QuizFormat {
  if (question.format === 'fill_blank' || question.format === 'odd_one_out') {
    return question.format;
  }

  return RANDOMISED_MCQ_FORMATS[Math.floor(Math.random() * RANDOMISED_MCQ_FORMATS.length)];
}

export const initPlayAtom = atom(null, (_get, set, questions: Question[]) => {
  const shuffled = shuffleArray(questions.filter(isPlayableQuestion));
  const order = shuffled.map((q) => q.id);
  const formats = new Map<string, QuizFormat>();
  shuffled.forEach((q) => {
    formats.set(q.id, getPlayFormat(q));
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
