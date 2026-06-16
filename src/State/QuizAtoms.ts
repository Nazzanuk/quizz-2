import { atom } from 'jotai';
import type { Quiz, Question } from '@/Lib/Types';

export const quizListAtom = atom<Quiz[]>([]);
export const currentQuizAtom = atom<Quiz | null>(null);
export const currentQuestionsAtom = atom<Question[]>([]);
export const isLoadingAtom = atom(false);

export const createTopicAtom = atom('');
export const createMaterialAtom = atom('');
export const librarySearchAtom = atom('');

// Library list: text search only, always newest-first.
export const filteredQuizListAtom = atom((get) => {
  const search = get(librarySearchAtom).trim().toLowerCase();
  const list = get(quizListAtom).filter((quiz) => {
    if (!search) return true;
    return [
      quiz.title,
      quiz.topic ?? '',
      quiz.description ?? '',
    ].some((value) => value.toLowerCase().includes(search));
  });

  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
});
