import { atom } from 'jotai';
import type { Quiz, Question } from '@/Lib/Types';

export const quizListAtom = atom<Quiz[]>([]);
export const currentQuizAtom = atom<Quiz | null>(null);
export const currentQuestionsAtom = atom<Question[]>([]);
export const isLoadingAtom = atom(false);

export const createTopicAtom = atom('');
export const createMaterialAtom = atom('');

export const sortedQuizListAtom = atom((get) => {
  const list = get(quizListAtom);
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
});
