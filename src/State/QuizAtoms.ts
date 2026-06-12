import { atom } from 'jotai';
import type { Quiz, Question } from '@/Lib/Types';

export type LibrarySort = 'recent' | 'az' | 'questions';

export const quizListAtom = atom<Quiz[]>([]);
export const currentQuizAtom = atom<Quiz | null>(null);
export const currentQuestionsAtom = atom<Question[]>([]);
export const isLoadingAtom = atom(false);

export const createTopicAtom = atom('');
export const createMaterialAtom = atom('');
export const librarySearchAtom = atom('');
export const librarySortAtom = atom<LibrarySort>('recent');
export const libraryHasQuestionsAtom = atom(false);

export const sortedQuizListAtom = atom((get) => {
  const list = get(quizListAtom);
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
});

export const filteredQuizListAtom = atom((get) => {
  const search = get(librarySearchAtom).trim().toLowerCase();
  const sort = get(librarySortAtom);
  const hasQuestions = get(libraryHasQuestionsAtom);
  const list = get(quizListAtom).filter((quiz) => {
    if (hasQuestions && quiz.questionCount <= 0) return false;
    if (!search) return true;

    return [
      quiz.title,
      quiz.topic ?? '',
      quiz.description ?? '',
    ].some((value) => value.toLowerCase().includes(search));
  });

  return [...list].sort((a, b) => {
    if (sort === 'az') return a.title.localeCompare(b.title);
    if (sort === 'questions') return b.questionCount - a.questionCount;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
});
